const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Block = require('../models/Block');
const Group = require('../models/Group');
const StudySession = require('../models/StudySession');
const isValidDate = require('../utils/isValidDate');

const router = express.Router();

const PUBLIC_FIELDS = 'nickname name lastSeen studyingUntil'; // email и прочее наружу не отдаём
const PRESENCE_TTL_MS = 100 * 1000; // клиент шлёт «я тут» раз в ~30 секунд (фоновые вкладки браузер притормаживает)
const MAX_OUTGOING_REQUESTS = 50;
const MAX_FRIENDS = 200;
const MAX_GROUPS_PER_USER = 10;
const MAX_GROUP_MEMBERS = 50;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const oid = (id) => new mongoose.Types.ObjectId(id);
const same = (a, b) => String(a) === String(b);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function presenceOf(user) {
    const now = Date.now();
    const seen = user.lastSeen ? user.lastSeen.getTime() : 0;
    let status = 'offline';
    if (user.studyingUntil && user.studyingUntil.getTime() > now) status = 'studying';
    else if (now - seen < PRESENCE_TTL_MS) status = 'online';
    return { status, lastSeen: user.lastSeen };
}

function toPublic(user) {
    return {
        id: String(user._id),
        nickname: user.nickname || user.name,
        ...presenceOf(user),
    };
}

// все, с кем у меня блокировка в любую сторону
async function blockRelations(me) {
    const blocks = await Block.find({ $or: [{ blocker: me }, { blocked: me }] });
    const byMe = new Set();
    const hidden = new Set(); // заблокированные мной + заблокировавшие меня
    for (const b of blocks) {
        if (same(b.blocker, me)) {
            byMe.add(String(b.blocked));
            hidden.add(String(b.blocked));
        } else {
            hidden.add(String(b.blocker));
        }
    }
    return { byMe, hidden };
}

async function friendshipsOf(me) {
    return Friendship.find({ $or: [{ requester: me }, { recipient: me }] });
}

const otherSide = (f, me) => (same(f.requester, me) ? f.recipient : f.requester);

async function areFriends(a, b) {
    return Boolean(
        await Friendship.exists({
            status: 'accepted',
            $or: [
                { requester: a, recipient: b },
                { requester: b, recipient: a },
            ],
        })
    );
}

async function findBetween(a, b) {
    return Friendship.findOne({
        $or: [
            { requester: a, recipient: b },
            { requester: b, recipient: a },
        ],
    });
}

function userIdFrom(req, res, value) {
    if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
        res.status(400).json({ error: 'Invalid user id' });
        return null;
    }
    if (same(value, req.userId)) {
        res.status(400).json({ error: 'You cannot do this with yourself' });
        return null;
    }
    return value;
}

function fail(res, err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}

// ---------- Присутствие ----------

// «я в приложении» (studying = true: сейчас идёт таймер фокуса)
router.post('/presence', async (req, res) => {
    try {
        const now = Date.now();
        await User.updateOne(
            { _id: req.userId },
            {
                lastSeen: new Date(now),
                studyingUntil: req.body.studying === true ? new Date(now + PRESENCE_TTL_MS) : null,
            }
        );
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Обзор: друзья, заявки, блокировки, группы ----------

router.get('/overview', async (req, res) => {
    try {
        const me = req.userId;
        const [friendships, blocks, groups] = await Promise.all([
            friendshipsOf(me),
            Block.find({ blocker: me }),
            Group.find({ members: me }).sort({ createdAt: 1 }),
        ]);
        const { hidden } = await blockRelations(me);

        const friendIds = [];
        const incomingIds = [];
        const outgoingIds = [];
        for (const f of friendships) {
            const other = otherSide(f, me);
            if (hidden.has(String(other))) continue;
            if (f.status === 'accepted') friendIds.push(other);
            else if (same(f.recipient, me)) incomingIds.push(other);
            else outgoingIds.push(other);
        }
        const blockedIds = blocks.map((b) => b.blocked);

        const users = await User.find({
            _id: { $in: [...friendIds, ...incomingIds, ...outgoingIds, ...blockedIds] },
        }).select(PUBLIC_FIELDS);
        const byId = new Map(users.map((u) => [String(u._id), u]));
        const pick = (ids) => ids.map((id) => byId.get(String(id))).filter(Boolean).map(toPublic);

        res.json({
            friends: pick(friendIds).sort((a, b) => a.nickname.localeCompare(b.nickname)),
            incoming: pick(incomingIds),
            outgoing: pick(outgoingIds),
            blocked: pick(blockedIds).map(({ id, nickname }) => ({ id, nickname })),
            groups: groups.map((g) => ({
                id: String(g._id),
                name: g.name,
                code: g.code,
                membersCount: g.members.length,
                isOwner: same(g.owner, me),
            })),
        });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Поиск ----------

router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().toLowerCase();
        if (q.length < 2 || q.length > 20) return res.json([]);

        const me = req.userId;
        const { hidden } = await blockRelations(me);

        const found = await User.find({
            nicknameKey: { $regex: `^${escapeRegex(q)}` },
            verified: true,
            _id: { $ne: me, $nin: [...hidden] },
        })
            .select(PUBLIC_FIELDS)
            .sort({ nicknameKey: 1 })
            .limit(10);

        const friendships = await friendshipsOf(me);
        const relation = new Map();
        for (const f of friendships) {
            const other = String(otherSide(f, me));
            if (f.status === 'accepted') relation.set(other, 'friend');
            else relation.set(other, same(f.requester, me) ? 'outgoing' : 'incoming');
        }

        res.json(
            found.map((u) => ({
                id: String(u._id),
                nickname: u.nickname || u.name,
                relation: relation.get(String(u._id)) || 'none',
            }))
        );
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Друзья ----------

router.post('/requests', async (req, res) => {
    try {
        const me = req.userId;
        const target = userIdFrom(req, res, req.body.userId);
        if (!target) return;

        if (!(await User.exists({ _id: target }))) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { hidden } = await blockRelations(me);
        if (hidden.has(target)) return res.status(403).json({ error: 'Not available' });

        const existing = await findBetween(me, target);
        if (existing) {
            if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
            if (same(existing.requester, me)) return res.json({ status: 'pending' });
            // он уже звал нас в друзья: встречная заявка = принятие
            existing.status = 'accepted';
            await existing.save();
            return res.json({ status: 'accepted' });
        }

        const [outgoing, friends] = await Promise.all([
            Friendship.countDocuments({ requester: me, status: 'pending' }),
            Friendship.countDocuments({
                status: 'accepted',
                $or: [{ requester: me }, { recipient: me }],
            }),
        ]);
        if (outgoing >= MAX_OUTGOING_REQUESTS) {
            return res.status(429).json({ error: 'Too many pending requests' });
        }
        if (friends >= MAX_FRIENDS) return res.status(400).json({ error: 'Friend limit reached' });

        await Friendship.create({ requester: me, recipient: target });
        res.status(201).json({ status: 'pending' });
    } catch (err) {
        if (err.code === 11000) return res.json({ status: 'pending' });
        fail(res, err);
    }
});

router.post('/requests/:userId/accept', async (req, res) => {
    try {
        const other = userIdFrom(req, res, req.params.userId);
        if (!other) return;
        const { hidden } = await blockRelations(req.userId);
        if (hidden.has(other)) return res.status(403).json({ error: 'Not available' });

        const f = await Friendship.findOneAndUpdate(
            { requester: other, recipient: req.userId, status: 'pending' },
            { status: 'accepted' }
        );
        if (!f) return res.status(404).json({ error: 'Request not found' });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// отклонить входящую заявку или отозвать свою исходящую
router.delete('/requests/:userId', async (req, res) => {
    try {
        const other = userIdFrom(req, res, req.params.userId);
        if (!other) return;
        await Friendship.deleteOne({
            status: 'pending',
            $or: [
                { requester: req.userId, recipient: other },
                { requester: other, recipient: req.userId },
            ],
        });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

router.delete('/friends/:userId', async (req, res) => {
    try {
        const other = userIdFrom(req, res, req.params.userId);
        if (!other) return;
        await Friendship.deleteOne({
            status: 'accepted',
            $or: [
                { requester: req.userId, recipient: other },
                { requester: other, recipient: req.userId },
            ],
        });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Блокировки ----------

router.post('/blocks', async (req, res) => {
    try {
        const me = req.userId;
        const target = userIdFrom(req, res, req.body.userId);
        if (!target) return;
        if (!(await User.exists({ _id: target }))) {
            return res.status(404).json({ error: 'User not found' });
        }

        await Block.updateOne(
            { blocker: me, blocked: target },
            { $setOnInsert: { blocker: me, blocked: target } },
            { upsert: true }
        );
        // блокировка разрывает дружбу и снимает заявки
        await Friendship.deleteMany({
            $or: [
                { requester: me, recipient: target },
                { requester: target, recipient: me },
            ],
        });
        res.status(201).json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

router.delete('/blocks/:userId', async (req, res) => {
    try {
        const other = userIdFrom(req, res, req.params.userId);
        if (!other) return;
        await Block.deleteOne({ blocker: req.userId, blocked: other });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Группы ----------

async function uniqueCode() {
    for (let i = 0; i < 5; i += 1) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        if (!(await Group.exists({ code }))) return code;
    }
    throw new Error('Could not generate group code');
}

router.post('/groups', async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        if (name.length < 2 || name.length > 40) {
            return res.status(400).json({ error: 'Group name must be 2-40 characters' });
        }
        if ((await Group.countDocuments({ members: req.userId })) >= MAX_GROUPS_PER_USER) {
            return res.status(400).json({ error: 'Group limit reached' });
        }

        const group = await Group.create({
            name,
            owner: req.userId,
            members: [req.userId],
            code: await uniqueCode(),
        });
        res.status(201).json({ id: String(group._id), name: group.name, code: group.code });
    } catch (err) {
        fail(res, err);
    }
});

router.post('/groups/join', async (req, res) => {
    try {
        const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
        if (!/^[0-9A-F]{8}$/.test(code)) return res.status(404).json({ error: 'Group not found' });

        const group = await Group.findOne({ code });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (group.members.some((m) => same(m, req.userId))) {
            return res.json({ id: String(group._id), name: group.name });
        }
        if (group.members.length >= MAX_GROUP_MEMBERS) {
            return res.status(400).json({ error: 'Group is full' });
        }
        if ((await Group.countDocuments({ members: req.userId })) >= MAX_GROUPS_PER_USER) {
            return res.status(400).json({ error: 'Group limit reached' });
        }

        await Group.updateOne({ _id: group._id }, { $addToSet: { members: req.userId } });
        res.json({ id: String(group._id), name: group.name });
    } catch (err) {
        fail(res, err);
    }
});

router.post('/groups/:id/leave', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Group not found' });
        const group = await Group.findOne({ _id: req.params.id, members: req.userId });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const rest = group.members.filter((m) => !same(m, req.userId));
        if (rest.length === 0) {
            await Group.deleteOne({ _id: group._id });
        } else {
            group.members = rest;
            // владелец ушёл: группа переходит к следующему участнику
            if (same(group.owner, req.userId)) group.owner = rest[0];
            await group.save();
        }
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

router.delete('/groups/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Group not found' });
        const result = await Group.deleteOne({ _id: req.params.id, owner: req.userId });
        if (!result.deletedCount) return res.status(404).json({ error: 'Group not found' });
        res.json({ ok: true });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Рейтинг за день ----------

// scope=friends (я + друзья) или scope=group&group=<id>
router.get('/leaderboard', async (req, res) => {
    try {
        const me = req.userId;
        const { date, scope } = req.query;
        if (!isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

        const { hidden } = await blockRelations(me);
        let ids;
        let group = null;

        if (scope === 'group') {
            if (!mongoose.isValidObjectId(req.query.group)) {
                return res.status(404).json({ error: 'Group not found' });
            }
            const g = await Group.findOne({ _id: req.query.group, members: me });
            if (!g) return res.status(404).json({ error: 'Group not found' });
            group = { id: String(g._id), name: g.name, code: g.code };
            ids = g.members.map(String);
        } else {
            const friendships = await friendshipsOf(me);
            ids = [
                String(me),
                ...friendships.filter((f) => f.status === 'accepted').map((f) => String(otherSide(f, me))),
            ];
        }
        ids = [...new Set(ids)].filter((id) => same(id, me) || !hidden.has(id));

        const [users, totals] = await Promise.all([
            User.find({ _id: { $in: ids } }).select(PUBLIC_FIELDS),
            StudySession.aggregate([
                { $match: { user: { $in: ids.map(oid) }, date } },
                { $group: { _id: '$user', seconds: { $sum: '$seconds' } } },
            ]),
        ]);
        const secondsOf = new Map(totals.map((t) => [String(t._id), t.seconds]));

        const entries = users
            .map((u) => ({
                ...toPublic(u),
                seconds: secondsOf.get(String(u._id)) || 0,
                isMe: same(u._id, me),
            }))
            .sort((a, b) => b.seconds - a.seconds || a.nickname.localeCompare(b.nickname));

        res.json({ date, group, entries });
    } catch (err) {
        fail(res, err);
    }
});

// ---------- Статистика другого участника за месяц ----------

router.get('/users/:id/month', async (req, res) => {
    try {
        const me = req.userId;
        const { month } = req.query;
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
        if (typeof month !== 'string' || !MONTH_RE.test(month)) {
            return res.status(400).json({ error: 'month must be YYYY-MM' });
        }

        const target = req.params.id;
        if (!same(target, me)) {
            const { hidden } = await blockRelations(me);
            if (hidden.has(target)) return res.status(403).json({ error: 'Not available' });
            const allowed =
                (await areFriends(me, target)) ||
                Boolean(await Group.exists({ members: { $all: [me, target] } }));
            if (!allowed) return res.status(403).json({ error: 'Not available' });
        }

        const user = await User.findById(target).select(PUBLIC_FIELDS);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const days = await StudySession.aggregate([
            { $match: { user: oid(target), date: { $gte: `${month}-01`, $lte: `${month}-31` } } },
            { $group: { _id: '$date', totalSeconds: { $sum: '$seconds' } } },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            user: toPublic(user),
            month,
            totalSeconds: days.reduce((sum, d) => sum + d.totalSeconds, 0),
            activeDays: days.length,
            days: days.map((d) => ({ date: d._id, totalSeconds: d.totalSeconds })),
        });
    } catch (err) {
        fail(res, err);
    }
});

module.exports = router;
