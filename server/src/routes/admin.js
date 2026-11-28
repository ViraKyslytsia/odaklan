const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const StudySession = require('../models/StudySession');
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');
const Exam = require('../models/Exam'); 
const ScheduleItem = require('../models/ScheduleItem');
const Subject = require('../models/Subject');
const Group = require('../models/Group');
const AdminLog = require('../models/AdminLog');
const Announcement = require('../models/Announcement');
const Friendship = require('../models/Friendship');
const Block = require('../models/Block');
const removeUserFromGroups = require('../utils/removeUserFromGroups');
const { removeMemberFromGroup } = require('../utils/removeUserFromGroups');
const router = express.Router();

const DAY = 24 * 60 * 60 * 1000;
const ONLINE_MS = 100 * 1000; // то же правило, что «онлайн» в social.js
const PAGE_SIZE = 20;
// настоящие пользователи: подтверждённые и не админ (у старых записей поля role нет, поэтому $ne)
const REAL_USERS = { verified: true, role: { $ne: 'admin' } };
// только эти поля отдаём админу; хеш пароля и коды сюда не попадают
const USER_FIELDS =
    'name email nickname role verified isBlocked blockedReason createdAt lastSeen studyingUntil lastLoginAt lastLogoutAt language settings.region';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const oid = (id) => new mongoose.Types.ObjectId(id);
const nameOf = (u) => (u ? u.nickname || u.name || '' : '');

function pageOf(req, size) {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    return { page, size, skip: (page - 1) * size };
}

// tz = getTimezoneOffset() браузера (минуты), превращаем в «+03:00» для MongoDB
function tzOf(req) {
    const mins = Number.parseInt(req.query.tz, 10);
    if (!Number.isFinite(mins) || Math.abs(mins) > 14 * 60) return '+00:00';
    const off = -mins;
    const a = Math.abs(off);
    return `${off >= 0 ? '+' : '-'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}


function fail(res, err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}

function statusOf(user) {
    const now = Date.now();
    if (user.studyingUntil && user.studyingUntil.getTime() > now) return 'studying';
    if (user.lastSeen && now - user.lastSeen.getTime() < ONLINE_MS) return 'online';
    return 'offline';
}

function toRow(user, totals = {}) {
    const region = user.settings?.region || {};
    return {
        id: String(user._id),
        name: user.name,
        nickname: user.nickname || '',
        email: user.email,
        role: user.role || 'user',
        verified: Boolean(user.verified),
        isBlocked: Boolean(user.isBlocked),
        blockedReason: user.blockedReason || '',
        createdAt: user.createdAt,
        lastSeen: user.lastSeen || null,
        lastLoginAt: user.lastLoginAt || null,
        lastLogoutAt: user.lastLogoutAt || null,
        language: user.language || '',
        country: region.countryName || '',
        city: region.city || '',
        status: statusOf(user),
        totalSeconds: totals.seconds || 0,
        sessionsCount: totals.sessions || 0,
    };
}

// суммарное время и число сессий по каждому пользователю
async function totalsByUser() {
    const rows = await StudySession.aggregate([
        { $group: { _id: '$user', seconds: { $sum: '$seconds' }, sessions: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r]));
}

// ---------- Обзор сайта ----------
router.get('/overview', async (req, res) => {
    try {
        const now = Date.now();
        const ago = (ms) => new Date(now - ms);

        const [total, new7, new30, onlineNow, studyingNow, active24h, active7d, blocked, sumRows, top] =
            await Promise.all([
                User.countDocuments(REAL_USERS),
                User.countDocuments({ ...REAL_USERS, createdAt: { $gte: ago(7 * DAY) } }),
                User.countDocuments({ ...REAL_USERS, createdAt: { $gte: ago(30 * DAY) } }),
                User.countDocuments({ ...REAL_USERS, lastSeen: { $gte: ago(ONLINE_MS) } }),
                User.countDocuments({ ...REAL_USERS, studyingUntil: { $gt: new Date(now) } }),
                User.countDocuments({ ...REAL_USERS, lastSeen: { $gte: ago(DAY) } }),
                User.countDocuments({ ...REAL_USERS, lastSeen: { $gte: ago(7 * DAY) } }),
                User.countDocuments({ ...REAL_USERS, isBlocked: true }),
                StudySession.aggregate([
                    { $group: { _id: null, seconds: { $sum: '$seconds' }, sessions: { $sum: 1 } } },
                ]),
                StudySession.aggregate([
                    { $group: { _id: '$user', seconds: { $sum: '$seconds' } } },
                    { $sort: { seconds: -1 } },
                    { $limit: 50},
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
                    {
                        $project: {
                            seconds: 1,
                            name: { $arrayElemAt: ['$u.name', 0] },
                            nickname: { $arrayElemAt: ['$u.nickname', 0] },
                            email: { $arrayElemAt: ['$u.email', 0] },
                        },
                    },
                ]),
            ]);

        res.json({
            users: { total, new7, new30, onlineNow, studyingNow, active24h, active7d, blocked },
            study: { totalSeconds: sumRows[0]?.seconds || 0, sessions: sumRows[0]?.sessions || 0 },
            top: top.map((t) => ({
                id: String(t._id),
                name: t.nickname || t.name || '?',
                email: t.email || '',
                seconds: t.seconds,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Графики: учёба по дням и регистрации по дням ----------
router.get('/charts', async (req, res) => {
    try {
        const days = Math.min(90, Math.max(7, Number.parseInt(req.query.days, 10) || 30));
        const keys = Array.from({ length: days }, (_, i) =>
            new Date(Date.now() - (days - 1 - i) * DAY).toISOString().slice(0, 10)
        );

        const [study, signups] = await Promise.all([
            StudySession.aggregate([
                { $match: { date: { $gte: keys[0], $lte: keys[keys.length - 1] } } },
                { $group: { _id: '$date', seconds: { $sum: '$seconds' } } },
            ]),
            User.aggregate([
                { $match: { ...REAL_USERS, createdAt: { $gte: new Date(`${keys[0]}T00:00:00Z`) } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const studyMap = new Map(study.map((r) => [r._id, r.seconds]));
        const signupMap = new Map(signups.map((r) => [r._id, r.count]));
        res.json({
            days,
            study: keys.map((date) => ({ date, seconds: studyMap.get(date) || 0 })),
            signups: keys.map((date) => ({ date, count: signupMap.get(date) || 0 })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Пользователи: ?search=&sort=studyTime|lastSeen|createdAt&page= ----------
router.get('/users', async (req, res) => {
    try {
        const filter = { ...REAL_USERS };
        const search = String(req.query.search || '').trim().slice(0, 50);
        if (search) {
            const rx = new RegExp(escapeRegex(search), 'i');
            filter.$or = [{ name: rx }, { email: rx }, { nickname: rx }];
        }
        // ?inactive=7 : не заходили 7 и больше дней (или не заходили ни разу)
        const inactive = Number.parseInt(req.query.inactive, 10);
        if (inactive > 0) {
            filter.$and = [
                { $or: [{ lastSeen: null }, { lastSeen: { $lt: new Date(Date.now() - inactive * DAY) } }] },
            ];
        }

        const [users, totals] = await Promise.all([
            User.find(filter).select(USER_FIELDS).lean(),
            totalsByUser(),
        ]);
        const rows = users.map((u) => toRow(u, totals.get(String(u._id))));

        const sorters = {
            studyTime: (a, b) => b.totalSeconds - a.totalSeconds,
            lastSeen: (a, b) => (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0),
            createdAt: (a, b) => b.createdAt - a.createdAt,
        };
        rows.sort(sorters[req.query.sort] || sorters.createdAt);

        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        res.json({
            total: rows.length,
            page,
            pages: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)),
            users: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Карточка пользователя ----------
router.get('/users/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
        const user = await User.findById(req.params.id).select(USER_FIELDS).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [totals] = await StudySession.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(req.params.id) } },
            { $group: { _id: null, seconds: { $sum: '$seconds' }, sessions: { $sum: 1 } } },
        ]);
        res.json(toRow(user, totals));
    } catch (err) {
        fail(res, err);
    }
});
// ---------- Учёба: все сессии (?user=&page=) ----------
router.get('/sessions', async (req, res) => {
    try {
        const filter = {};
        if (req.query.user) {
            if (!mongoose.isValidObjectId(req.query.user)) return res.status(400).json({ error: 'Invalid user id' });
            filter.user = req.query.user;
        }
        const { page, size, skip } = pageOf(req, 30);
        const [total, items] = await Promise.all([
            StudySession.countDocuments(filter),
            StudySession.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size)
                .populate('user', 'name nickname email')
                .populate('subject', 'name')
                .lean(),
        ]);
        res.json({
            total,
            page,
            pages: Math.max(1, Math.ceil(total / size)),
            sessions: items.map((s) => ({
                id: String(s._id),
                date: s.date,
                seconds: s.seconds,
                endedAt: s.createdAt,
                user: s.user ? { id: String(s.user._id), name: nameOf(s.user), email: s.user.email } : null,
                subject: s.subject?.name || '',
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Учёба одного пользователя: по дням и по предметам (?days=30) ----------
router.get('/users/:id/study', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
        const days = Math.min(365, Math.max(7, Number.parseInt(req.query.days, 10) || 30));
        const keys = Array.from({ length: days }, (_, i) =>
            new Date(Date.now() - (days - 1 - i) * DAY).toISOString().slice(0, 10)
        );
        const match = { user: oid(req.params.id), date: { $gte: keys[0], $lte: keys[keys.length - 1] } };

        const [byDay, bySubject] = await Promise.all([
            StudySession.aggregate([
                { $match: match },
                { $group: { _id: '$date', seconds: { $sum: '$seconds' } } },
            ]),
            StudySession.aggregate([
                { $match: match },
                { $group: { _id: '$subject', seconds: { $sum: '$seconds' } } },
                { $sort: { seconds: -1 } },
                { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 's' } },
                { $project: { seconds: 1, name: { $arrayElemAt: ['$s.name', 0] } } },
            ]),
        ]);
        const map = new Map(byDay.map((r) => [r._id, r.seconds]));
        res.json({
            days,
            byDay: keys.map((date) => ({ date, seconds: map.get(date) || 0 })),
            bySubject: bySubject.map((r) => ({ name: r.name || '', seconds: r.seconds })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Учёба по сайту: средняя сессия и самый активный час (?tz=) ----------
router.get('/study-summary', async (req, res) => {
    try {
        const tz = tzOf(req);
        const [avgRows, hourRows] = await Promise.all([
            StudySession.aggregate([
                { $group: { _id: null, avg: { $avg: '$seconds' }, count: { $sum: 1 } } },
            ]),
            StudySession.aggregate([
                {
                    $group: {
                        _id: { $hour: { date: '$createdAt', timezone: tz } },
                        seconds: { $sum: '$seconds' },
                        sessions: { $sum: 1 },
                    },
                },
            ]),
        ]);
        const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, seconds: 0, sessions: 0 }));
        for (const r of hourRows) hours[r._id] = { hour: r._id, seconds: r.seconds, sessions: r.sessions };
        const best = hours.reduce((b, h) => (h.seconds > b.seconds ? h : b), hours[0]);

        res.json({
            sessions: avgRows[0]?.count || 0,
            avgSeconds: Math.round(avgRows[0]?.avg || 0),
            bestHour: best.seconds > 0 ? best.hour : null,
            hours,
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Входы и выходы (?user=&type=login|logout&page=) ----------
router.get('/activity', async (req, res) => {
    try {
        const filter = {};
        if (req.query.user) {
            if (!mongoose.isValidObjectId(req.query.user)) return res.status(400).json({ error: 'Invalid user id' });
            filter.user = req.query.user;
        }
        if (['login', 'logout'].includes(req.query.type)) filter.type = req.query.type;

        const { page, size, skip } = pageOf(req, 30);
        const [total, items] = await Promise.all([
            ActivityLog.countDocuments(filter),
            ActivityLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size)
                .populate('user', 'name nickname email')
                .lean(),
        ]);
        res.json({
            total,
            page,
            pages: Math.max(1, Math.ceil(total / size)),
            events: items.map((e) => ({
                id: String(e._id),
                type: e.type,
                at: e.createdAt,
                user: e.user ? { id: String(e.user._id), name: nameOf(e.user), email: e.user.email } : null,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Контент: сводка по всем пользователям ----------
router.get('/content-summary', async (req, res) => {
    try {
        const [users, tasks, exams] = await Promise.all([
            User.find(REAL_USERS).select('name nickname email').lean(),
            Task.aggregate([
                {
                    $group: {
                        _id: '$user',
                        total: { $sum: 1 },
                        done: { $sum: { $cond: ['$completed', 1, 0] } },
                    },
                },
            ]),
            Exam.aggregate([{ $group: { _id: '$user', count: { $sum: 1 } } }]),
        ]);
        const taskMap = new Map(tasks.map((t) => [String(t._id), t]));
        const examMap = new Map(exams.map((e) => [String(e._id), e.count]));

        const rows = users
            .map((u) => {
                const t = taskMap.get(String(u._id));
                return {
                    id: String(u._id),
                    name: nameOf(u),
                    email: u.email,
                    tasksTotal: t?.total || 0,
                    tasksDone: t?.done || 0,
                    tasksOpen: (t?.total || 0) - (t?.done || 0),
                    exams: examMap.get(String(u._id)) || 0,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json({ users: rows });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Контент одного пользователя (только чтение) ----------
router.get('/users/:id/content', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
        const id = req.params.id;
        const [subjects, tasks, exams, schedule] = await Promise.all([
            Subject.find({ user: id }).select('name color studiedSeconds').lean(),
            Task.find({ user: id }).sort({ date: -1 }).limit(200).populate('subject', 'name').lean(),
            Exam.find({ user: id }).sort({ date: 1 }).populate('subject', 'name').lean(),
            ScheduleItem.find({ user: id }).sort({ dayOfWeek: 1, startTime: 1 }).populate('subject', 'name').lean(),
        ]);
        res.json({
            subjects: subjects.map((s) => ({ name: s.name, color: s.color, studiedSeconds: s.studiedSeconds })),
            tasks: tasks.map((t) => ({
                title: t.title,
                date: t.date,
                completed: t.completed,
                subject: t.subject?.name || '',
            })),
            exams: exams.map((e) => ({
                title: e.title,
                date: e.date,
                subject: e.subject?.name || '',
                subtasksTotal: e.subtasks.length,
                subtasksDone: e.subtasks.filter((x) => x.done).length,
            })),
            schedule: schedule.map((s) => ({
                title: s.title,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                place: s.place,
                subject: s.subject?.name || '',
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Группы ----------
router.get('/groups', async (req, res) => {
    try {
        const [groups, totals] = await Promise.all([
            Group.find()
                .sort({ createdAt: -1 })
                .populate('owner', 'name nickname')
                .populate('deputy', 'name nickname')
                .lean(),
            totalsByUser(),
        ]);
        res.json({
            groups: groups.map((g) => ({
                id: String(g._id),
                name: g.name,
                owner: nameOf(g.owner),
                deputy: nameOf(g.deputy),
                membersCount: g.members.length,
                totalSeconds: g.members.reduce((sum, m) => sum + (totals.get(String(m))?.seconds || 0), 0),
                createdAt: g.createdAt,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

router.get('/groups/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Group not found' });
        const [group, totals] = await Promise.all([
            Group.findById(req.params.id)
                .populate('members', 'name nickname email lastSeen studyingUntil')
                .lean(),
            totalsByUser(),
        ]);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const roleOf = (id) =>
            String(id) === String(group.owner) ? 'owner' : group.deputy && String(id) === String(group.deputy) ? 'deputy' : 'member';
        const order = { owner: 0, deputy: 1, member: 2 };
        const members = group.members
            .map((m) => ({
                id: String(m._id),
                name: nameOf(m),
                email: m.email,
                role: roleOf(m._id),
                status: statusOf(m),
                totalSeconds: totals.get(String(m._id))?.seconds || 0,
            }))
            .sort((a, b) => order[a.role] - order[b.role] || b.totalSeconds - a.totalSeconds);

        res.json({
            id: String(group._id),
            name: group.name,
            createdAt: group.createdAt,
            totalSeconds: members.reduce((sum, m) => sum + m.totalSeconds, 0),
            members,
        });
    } catch (err) {
        fail(res, err);
    }
});
// ---------- Управление пользователями ----------
// находит цель и защищает: нельзя трогать себя и других админов
async function findTarget(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ error: 'User not found' });
        return null;
    }
    if (String(req.params.id) === String(req.userId)) {
        res.status(400).json({ error: 'You cannot do this to yourself' });
        return null;
    }
    const user = await User.findById(req.params.id).select('email name role');
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return null;
    }
    if (user.role === 'admin') {
        res.status(403).json({ error: 'Admins cannot be changed' });
        return null;
    }
    return user;
}

router.patch('/users/:id/block', async (req, res) => {
    try {
        const user = await findTarget(req, res);
        if (!user) return;
        const reason = String(req.body?.reason || '').trim().slice(0, 200);
        // сначала запись в журнал, потом действие
        await AdminLog.create({ adminEmail: req.userEmail, action: 'block', targetEmail: user.email, targetName: user.name, reason });
        await User.updateOne({ _id: user._id }, { isBlocked: true, blockedAt: new Date(), blockedReason: reason });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

router.patch('/users/:id/unblock', async (req, res) => {
    try {
        const user = await findTarget(req, res);
        if (!user) return;
        await AdminLog.create({ adminEmail: req.userEmail, action: 'unblock', targetEmail: user.email, targetName: user.name });
        await User.updateOne({ _id: user._id }, { isBlocked: false, blockedAt: null, blockedReason: '' });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// удаление навсегда: сначала связанные данные, сам пользователь последним,
// тогда при сбое посередине действие можно просто повторить
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await findTarget(req, res);
        if (!user) return;
        const id = user._id;
        // причина обязательна: после удаления это единственное, что останется о пользователе
        const reason = String(req.body?.reason || '').trim().slice(0, 200);
        if (!reason) return res.status(400).json({ error: 'Reason is required' });
        await AdminLog.create({ adminEmail: req.userEmail, action: 'delete', targetEmail: user.email, targetName: user.name, reason });

        await removeUserFromGroups(id);
        await Promise.all([
            StudySession.deleteMany({ user: id }),
            Task.deleteMany({ user: id }),
            Exam.deleteMany({ user: id }),
            ScheduleItem.deleteMany({ user: id }),
            Subject.deleteMany({ user: id }),
            ActivityLog.deleteMany({ user: id }),
            Friendship.deleteMany({ $or: [{ requester: id }, { recipient: id }] }),
            Block.deleteMany({ $or: [{ blocker: id }, { blocked: id }] }),
        ]);
        await User.deleteOne({ _id: id });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Журнал действий админа ----------
router.get('/logs', async (req, res) => {
    try {
        const { page, size, skip } = pageOf(req, 30);
        const [total, items] = await Promise.all([
            AdminLog.countDocuments(),
            AdminLog.find().sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
        ]);
        res.json({
            total,
            page,
            pages: Math.max(1, Math.ceil(total / size)),
            logs: items.map((l) => ({
                id: String(l._id),
                action: l.action,
                adminEmail: l.adminEmail,
                targetEmail: l.targetEmail,
                targetName: l.targetName,
                reason: l.reason,
                at: l.createdAt,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});
// ---------- Статистика по языкам и странам ----------
router.get('/stats/languages-regions', async (req, res) => {
    try {
        const [languages, countries] = await Promise.all([
            User.aggregate([
                { $match: REAL_USERS },
                { $group: { _id: '$language', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            User.aggregate([
                { $match: REAL_USERS },
                { $group: { _id: '$settings.region.countryName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);
        res.json({
            languages: languages.map((l) => ({ code: l._id || '', count: l.count })),
            countries: countries.map((c) => ({ name: c._id || '', count: c.count })),
        });
    } catch (err) {
        fail(res, err);
    }
});
// ---------- Тепловая карта: день недели × час (?tz=) ----------
router.get('/heatmap', async (req, res) => {
    try {
        const tz = tzOf(req);
        const rows = await StudySession.aggregate([
            {
                $group: {
                    _id: {
                        d: { $dayOfWeek: { date: '$createdAt', timezone: tz } },
                        h: { $hour: { date: '$createdAt', timezone: tz } },
                    },
                    seconds: { $sum: '$seconds' },
                },
            },
        ]);
        // MongoDB считает воскресенье днём 1, а нам нужен понедельник первым
        const cells = Array.from({ length: 7 }, () => Array(24).fill(0));
        for (const r of rows) cells[(r._id.d + 5) % 7][r._id.h] = r.seconds;
        res.json({ cells, max: Math.max(...cells.flat(), 0) });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Экспорт в CSV (сервер отдаёт текст, браузер сохраняет файл) ----------
function csvCell(value) {
    let s = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
    // защита от инъекции формул: ячейка, начинающаяся с = + - @, в Excel сработала бы как формула
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
}

// BOM в начале нужен, чтобы Excel правильно показал кириллицу и турецкие буквы
const toCsv = (header, rows) =>
    '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');

const today = () => new Date().toISOString().slice(0, 10);

router.get('/export/users', async (req, res) => {
    try {
        const [users, totals] = await Promise.all([
            User.find(REAL_USERS).select(USER_FIELDS).sort({ createdAt: 1 }).lean(),
            totalsByUser(),
        ]);
        const rows = users.map((u) => {
            const r = toRow(u, totals.get(String(u._id)));
            return [
                r.name, r.nickname, r.email, r.createdAt, r.verified ? 'yes' : 'no', r.isBlocked ? 'yes' : 'no',
                r.country, r.city, r.language, r.lastLoginAt, r.lastLogoutAt, r.lastSeen,
                r.totalSeconds, Math.round(r.totalSeconds / 60), r.sessionsCount,
            ];
        });
        const header = [
            'Name', 'Nickname', 'Email', 'Registered', 'Email verified', 'Blocked',
            'Country', 'City', 'Language', 'Last login', 'Last logout', 'Last seen',
            'Study seconds', 'Study minutes', 'Sessions',
        ];
        res.json({ filename: `odaklan-users-${today()}.csv`, csv: toCsv(header, rows) });
    } catch (err) {
        fail(res, err);
    }
});

router.get('/export/sessions', async (req, res) => {
    try {
        const items = await StudySession.find()
            .sort({ createdAt: -1 })
            .limit(50000)
            .populate('user', 'name email')
            .populate('subject', 'name')
            .lean();
        const rows = items.map((s) => [
            s.date, s.createdAt, s.user?.name || '', s.user?.email || '', s.subject?.name || '',
            s.seconds, Math.round(s.seconds / 60),
        ]);
        const header = ['Day', 'Ended at', 'User', 'Email', 'Subject', 'Seconds', 'Minutes'];
        res.json({ filename: `odaklan-sessions-${today()}.csv`, csv: toCsv(header, rows) });
    } catch (err) {
        fail(res, err);
    }
});
// удаление группы: участники и их данные не затрагиваются, исчезает только сама группа
router.delete('/groups/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Group not found' });
        const group = await Group.findById(req.params.id).select('name members');
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // причина обязательна; число участников дописываем в конец (лимит поля 200 символов)
        const reason = String(req.body?.reason || '').trim().slice(0, 170);
        if (!reason) return res.status(400).json({ error: 'Reason is required' });

        await AdminLog.create({
            adminEmail: req.userEmail,
            action: 'delete_group',
            targetName: group.name,
            reason: `${reason} (${group.members.length} members)`,
        });
        await Group.deleteOne({ _id: group._id });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});
// убрать одного участника из группы (например, за спам); его аккаунт и данные не затрагиваются
router.delete('/groups/:id/members/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(userId)) {
            return res.status(404).json({ error: 'Not found' });
        }
        const group = await Group.findOne({ _id: id, members: userId });
        if (!group) return res.status(404).json({ error: 'Member not found in this group' });
        const user = await User.findById(userId).select('name email');

        // причина обязательна; название группы дописываем в конец (лимит поля 200 символов)
        const reason = String(req.body?.reason || '').trim().slice(0, 140);
        if (!reason) return res.status(400).json({ error: 'Reason is required' });

        await AdminLog.create({
            adminEmail: req.userEmail,
            action: 'remove_member',
            targetEmail: user?.email || '',
            targetName: user?.name || '',
            reason: `${reason} (from group "${group.name}")`,
        });
        const { groupDeleted } = await removeMemberFromGroup(group, userId);
        res.json({ ok: true, groupDeleted });
    } catch (err) {
        fail(res, err);
    }
});
// ---------- Объявления для всех пользователей ----------
router.get('/announcements', async (req, res) => {
    try {
        const items = await Announcement.find().sort({ createdAt: -1 }).limit(50).lean();
        res.json({
            announcements: items.map((a) => ({
                id: String(a._id),
                text: a.text,
                createdBy: a.createdBy,
                createdAt: a.createdAt,
                expiresAt: a.expiresAt,
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

router.post('/announcements', async (req, res) => {
    try {
        const text = String(req.body?.text || '').trim().slice(0, 500);
        if (!text) return res.status(400).json({ error: 'Text is required' });
        // days: сколько дней показывать; 0 или пусто: пока не удалят
        const days = Number(req.body?.days) || 0;
        if (!Number.isInteger(days) || days < 0 || days > 365) {
            return res.status(400).json({ error: 'Invalid duration' });
        }
        const expiresAt = days ? new Date(Date.now() + days * DAY) : null;
        await AdminLog.create({ adminEmail: req.userEmail, action: 'announce', targetName: 'Announcement', reason: text.slice(0, 200) });
        const item = await Announcement.create({ text, createdBy: req.userEmail, expiresAt });
        res.status(201).json({ id: String(item._id) });
    } catch (err) {
        fail(res, err);
    }
});

router.delete('/announcements/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
        const item = await Announcement.findById(req.params.id);
        if (!item) return res.status(404).json({ error: 'Not found' });
        await AdminLog.create({ adminEmail: req.userEmail, action: 'delete_announcement', targetName: 'Announcement', reason: item.text.slice(0, 200) });
        await Announcement.deleteOne({ _id: item._id });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});


module.exports = router;