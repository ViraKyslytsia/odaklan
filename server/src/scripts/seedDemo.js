// Демо-данные для показа админ-панели.
//   npm run seed:demo            создать (или пересоздать) демо-данные
//   npm run seed:demo -- --clear удалить все демо-данные
// Демо-пользователи узнаются по почте @demo.odaklan.test, остальные данные скрипт не трогает.
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const ScheduleItem = require('../models/ScheduleItem');
const StudySession = require('../models/StudySession');
const ActivityLog = require('../models/ActivityLog');
const AdminLog = require('../models/AdminLog');
const Friendship = require('../models/Friendship');
const Block = require('../models/Block');
const Group = require('../models/Group');

const DEMO_DOMAIN = '@demo.odaklan.test';
const DEMO_RX = /@demo\.odaklan\.test$/;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;
const TZ_H = 3; // Турция: UTC+3

// (name, nickname, язык, страна, код страны, город, часовой пояс, активность 0..1, последний активный день (дней назад))
const STUDENTS = [
    ['Ayşe Demir', 'ayse_d', 'tr', 'Türkiye Cumhuriyeti', 'TR', 'Denizli', 'Europe/Istanbul', 0.92, 0],
    ['Mehmet Kaya', 'mehmet_k', 'tr', 'Türkiye Cumhuriyeti', 'TR', 'İzmir', 'Europe/Istanbul', 0.78, 0],
    ['Elif Şahin', 'elif_s', 'tr', 'Türkiye Cumhuriyeti', 'TR', 'Ankara', 'Europe/Istanbul', 0.62, 0],
    ['Can Yılmaz', 'can_y', 'en', 'Türkiye Cumhuriyeti', 'TR', 'İstanbul', 'Europe/Istanbul', 0.55, 1],
    ['Olena Kovalenko', 'olena_k', 'uk', 'Ukrayna', 'UA', 'Kyiv', '', 0.85, 0],
    ['Dmytro Shevchenko', 'dmytro_s', 'uk', 'Ukrayna', 'UA', 'Lviv', '', 0.7, 0],
    ['Anna Petrova', 'anna_p', 'ru', 'Kazakistan', 'KZ', 'Almatı', '', 0.65, 1],
    ['Ivan Sidorov', 'ivan_s', 'ru', 'Kazakistan', 'KZ', 'Astana', '', 0.45, 2],
    ['Leyla Aliyeva', 'leyla_a', 'en', 'Azerbaycan', 'AZ', 'Bakü', '', 0.7, 0],
    ['Giorgi Beridze', 'giorgi_b', 'en', 'Gürcistan', 'GE', 'Tiflis', '', 0.5, 3],
    ['Aziz Karimov', 'aziz_k', 'ru', 'Özbekistan', 'UZ', 'Taşkent', '', 0.6, 4],
    ['Chidi Okafor', 'chidi_o', 'en', 'Nijerya', 'NG', 'Lagos', '', 0.58, 1],
    ['Zeynep Arslan', 'zeynep_a', 'tr', 'Türkiye Cumhuriyeti', 'TR', 'Denizli', 'Europe/Istanbul', 0.3, 12],
    ['Maksym Bondar', 'maksym_b', 'uk', 'Ukrayna', 'UA', 'Odesa', '', 0.35, 22],
    ['Selin Aydın', 'selin_a', 'tr', 'Türkiye Cumhuriyeti', 'TR', 'İzmir', 'Europe/Istanbul', 0, 0],
];
const BLOCKED_NICK = 'maksym_b';

const SUBJECTS = [
    ['Mathematics', '#6D5BFF'], ['Physics', '#2DD4BF'], ['Programming', '#F97316'],
    ['Data Structures', '#A78BFA'], ['Electronics', '#22C55E'], ['English', '#EC4899'], ['Digital Logic', '#38BDF8'],
];
const TASK_TITLES = [
    'Finish lab report', 'Solve problem set', 'Read chapter 4', 'Prepare presentation',
    'Review lecture notes', 'Practice past exam', 'Write code for assignment', 'Memorize formulas',
];
const CHECKLIST = ['Review lecture notes', 'Solve past papers', 'Make a formula sheet', 'Group study session', 'Summarize chapters'];
const PLACES = ['A-204', 'B-12', 'Lab 3', 'Amphi 1'];
const SESSION_SECONDS = [1500, 1500, 1500, 3000, 3000, 4500, 5400, 7200];
const HOUR_WEIGHTS = { 9: 2, 10: 3, 11: 3, 12: 1, 13: 3, 14: 3, 15: 2, 16: 2, 17: 1, 18: 1, 19: 2, 20: 3, 21: 3, 22: 2, 23: 1 };

// предсказуемый «случайный» генератор: при повторном запуске данные те же
function makeRng(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const oid = () => new mongoose.Types.ObjectId();
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, '0');

function build(passwordHash, now = Date.now(), adminEmail = 'admin@example.com') {
    const rnd = makeRng(20261128);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const shuffle = (arr) => arr.map((v) => [rnd(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const pickHour = () => {
        const total = Object.values(HOUR_WEIGHTS).reduce((s, w) => s + w, 0);
        let r = rnd() * total;
        for (const [h, w] of Object.entries(HOUR_WEIGHTS)) {
            r -= w;
            if (r <= 0) return Number(h);
        }
        return 20;
    };

    const n = new Date(now);
    const todayStart = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()); // 00:00 UTC сегодняшнего дня
    const out = { users: [], subjects: [], tasks: [], exams: [], schedule: [], sessions: [], activity: [], groups: [], adminLogs: [] };
    const students = [];

    STUDENTS.forEach(([name, nick, lang, country, code, city, tz, activity, activeUntil], i) => {
        const userId = oid();
        // давно неактивные регистрировались заранее, остальные приходят постепенно в течение месяца
        const regDaysAgo = activeUntil > 5 ? Math.min(29, activeUntil + 6) : Math.max(1, 29 - Math.round(i * 1.9));
        const createdAt = new Date(todayStart - regDaysAgo * DAY + between(8, 22) * HOUR + between(0, 59) * MIN);
        const email = `${nick}${DEMO_DOMAIN}`;

        const mySubjects = shuffle(SUBJECTS).slice(0, 4).map(([sname, color]) => ({
            _id: oid(), user: userId, name: sname, color, studiedSeconds: 0, createdAt, updatedAt: createdAt,
        }));

        const events = []; // моменты активности для lastSeen
        const logins = [];
        const logouts = [];

        // учебные сессии и входы по дням
        for (let daysAgo = 29; daysAgo >= activeUntil; daysAgo--) {
            const base = todayStart - daysAgo * DAY; // полночь этого дня (по местному, т.к. час в 9..23 не уходит за сутки)
            if (base + 23 * HOUR < createdAt.getTime() - DAY) continue;
            const weekday = new Date(base).getUTCDay();
            const factor = weekday === 0 || weekday === 6 ? 0.6 : 1;
            const daySessions = [];
            if (rnd() < activity * factor) {
                const count = 1 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.2 ? 1 : 0);
                for (let k = 0; k < count; k++) {
                    const hour = pickHour();
                    const endUtc = base + (hour - TZ_H) * HOUR + between(0, 59) * MIN;
                    const seconds = pick(SESSION_SECONDS);
                    if (endUtc > now || endUtc - seconds * 1000 < createdAt.getTime()) continue;
                    const subject = rnd() < 0.4 ? mySubjects[0] : pick(mySubjects);
                    subject.studiedSeconds += seconds;
                    const end = new Date(endUtc);
                    out.sessions.push({ _id: oid(), user: userId, subject: subject._id, date: dayKey(base), seconds, createdAt: end, updatedAt: end });
                    daySessions.push({ start: endUtc - seconds * 1000, end: endUtc });
                    events.push(endUtc);
                }
            }
            const wantsLogin = daySessions.length > 0 || rnd() < activity * 0.25;
            if (!wantsLogin) continue;
            let loginAt;
            let logoutAt;
            if (daySessions.length) {
                loginAt = Math.min(...daySessions.map((s) => s.start)) - between(3, 20) * MIN;
                logoutAt = Math.max(...daySessions.map((s) => s.end)) + between(5, 30) * MIN;
            } else {
                loginAt = base + (between(9, 22) - TZ_H) * HOUR + between(0, 59) * MIN;
                logoutAt = loginAt + between(10, 40) * MIN;
            }
            if (loginAt > now || loginAt < createdAt.getTime()) continue;
            logins.push(loginAt);
            events.push(loginAt);
            out.activity.push({ _id: oid(), user: userId, type: 'login', createdAt: new Date(loginAt) });
            // у части заходов выхода нет: человек просто закрыл вкладку
            if (rnd() < 0.75 && logoutAt < now) {
                logouts.push(logoutAt);
                out.activity.push({ _id: oid(), user: userId, type: 'logout', createdAt: new Date(logoutAt) });
            }
        }

        // задачи
        for (let k = 0; k < 10 && activity > 0; k++) {
            const offset = between(-9, 6);
            const dateMs = todayStart + offset * DAY;
            const completed = offset < 0 ? rnd() < 0.8 : offset === 0 ? rnd() < 0.4 : false;
            out.tasks.push({
                _id: oid(), user: userId, title: pick(TASK_TITLES), subject: pick(mySubjects)._id,
                date: dayKey(dateMs), completed, createdAt, updatedAt: createdAt,
            });
        }

        // экзамены
        for (let k = 0; k < 2 && activity > 0; k++) {
            const subject = pick(mySubjects);
            const hour = pick([10, 13, 15]);
            const examAt = new Date(todayStart + between(4, 25) * DAY + (hour - TZ_H) * HOUR);
            const subtasks = shuffle(CHECKLIST).slice(0, between(3, 4)).map((title) => ({
                _id: oid(), title, done: rnd() < 0.4, date: null,
            }));
            out.exams.push({
                _id: oid(), user: userId, title: `${subject.name} ${k === 0 ? 'midterm' : 'final'}`, date: examAt,
                color: subject.color, subject: subject._id, subtasks, createdAt, updatedAt: createdAt,
            });
        }

        // расписание
        const used = new Set();
        for (let k = 0; k < 5 && activity > 0; k++) {
            const dayOfWeek = between(1, 5);
            const startH = pick([8, 9, 10, 11, 13, 14, 15]);
            const slot = `${dayOfWeek}-${startH}`;
            if (used.has(slot)) continue;
            used.add(slot);
            const subject = pick(mySubjects);
            out.schedule.push({
                _id: oid(), user: userId, subject: subject._id, title: `${subject.name} ${k % 2 ? 'Lab' : 'Lecture'}`,
                dayOfWeek, startTime: `${pad(startH)}:00`, endTime: `${pad(startH + 1)}:30`, place: pick(PLACES),
                createdAt, updatedAt: createdAt,
            });
        }

        const lastEvent = events.length ? Math.max(...events) : null;
        const blocked = nick === BLOCKED_NICK;
        const blockedAt = blocked ? new Date(now - 3 * DAY) : null;
        out.users.push({
            _id: userId, name, email, nickname: nick, nicknameKey: nick, passwordHash, verified: true,
            lastSeen: lastEvent ? new Date(lastEvent + between(0, 10) * MIN) : null,
            studyingUntil: null, codeAttempts: 0, resetAttempts: 0,
            settings: { region: { countryCode: code, countryName: country, city, latitude: null, longitude: null, timezone: tz } },
            role: 'user', isBlocked: blocked, blockedAt, blockedReason: blocked ? 'Spam in group chat' : '',
            lastLoginAt: logins.length ? new Date(Math.max(...logins)) : null,
            lastLogoutAt: logouts.length ? new Date(Math.max(...logouts)) : null,
            language: lang, createdAt, updatedAt: createdAt,
        });
        out.subjects.push(...mySubjects);
        students.push({ id: userId, nick, name, email });

        if (blocked) {
            out.adminLogs.push({
                _id: oid(), adminEmail, action: 'block', targetEmail: email, targetName: name,
                reason: 'Spam in group chat', createdAt: blockedAt,
            });
        }
    });

    // две группы только из демо-пользователей
    const byNick = (nick) => students.find((s) => s.nick === nick).id;
    const groupDefs = [
        ['Computer Eng 3rd year', ['ayse_d', 'mehmet_k', 'elif_s', 'can_y', 'olena_k', 'dmytro_s'], 'ayse_d', 'mehmet_k'],
        ['Study Buddies', ['olena_k', 'anna_p', 'leyla_a', 'chidi_o'], 'olena_k', 'leyla_a'],
    ];
    for (const [name, members, owner, deputy] of groupDefs) {
        const createdAt = new Date(now - 14 * DAY);
        out.groups.push({
            _id: oid(), name, owner: byNick(owner), deputy: byNick(deputy), members: members.map(byNick),
            code: crypto.randomBytes(4).toString('hex').toUpperCase(), createdAt, updatedAt: createdAt,
        });
    }
    return out;
}

async function clearDemo() {
    const users = await User.find({ email: DEMO_RX }).select('_id').lean();
    const ids = users.map((u) => u._id);
    if (ids.length === 0) return 0;
    const own = { user: { $in: ids } };
    await Promise.all([
        StudySession.deleteMany(own), Task.deleteMany(own), Exam.deleteMany(own), ScheduleItem.deleteMany(own),
        Subject.deleteMany(own), ActivityLog.deleteMany(own),
        Friendship.deleteMany({ $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }] }),
        Block.deleteMany({ $or: [{ blocker: { $in: ids } }, { blocked: { $in: ids } }] }),
        Group.deleteMany({ owner: { $in: ids } }),
        AdminLog.deleteMany({ targetEmail: DEMO_RX }),
    ]);
    await User.deleteMany({ _id: { $in: ids } });
    return ids.length;
}

async function main() {
    await connectDB();
    const removed = await clearDemo();
    if (removed) console.log(`Removed ${removed} old demo users with their data`);
    if (process.argv.includes('--clear')) return;

    // пароль случайный и нигде не сохраняется: войти под демо-пользователями нельзя, они нужны только для показа
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 4);
    const data = build(passwordHash, Date.now(), (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase());

    await User.collection.insertMany(data.users);
    await Subject.collection.insertMany(data.subjects);
    await StudySession.collection.insertMany(data.sessions);
    await Task.collection.insertMany(data.tasks);
    await Exam.collection.insertMany(data.exams);
    await ScheduleItem.collection.insertMany(data.schedule);
    await ActivityLog.collection.insertMany(data.activity);
    await Group.collection.insertMany(data.groups);
    await AdminLog.collection.insertMany(data.adminLogs);

    console.log(
        `Created ${data.users.length} demo users, ${data.sessions.length} study sessions, ${data.activity.length} login/logout events, ` +
            `${data.tasks.length} tasks, ${data.exams.length} exams, ${data.groups.length} groups`
    );
}

if (require.main === module) {
    main()
        .catch((err) => {
            console.error('Seed failed:', err.message);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}

module.exports = { build };
