const express = require('express');
const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');

const router = express.Router();
const isValidDate = require('../utils/isValidDate');

router.get('/day', async (req, res) => {
    try {
        const { date } = req.query;
        if (!isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

        const sessions = await StudySession.find({ user: req.userId, date });
        const totalSeconds = sessions.reduce((sum, s) => sum + s.seconds, 0);

        res.json({ date, totalSeconds, sessions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/range', async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!isValidDate(from) || !isValidDate(to)) {
            return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
        }

        const match = {
            user: new mongoose.Types.ObjectId(req.userId),
            date: { $gte: from, $lte: to },
        };

        const [days, subjects] = await Promise.all([
            StudySession.aggregate([
                { $match: match },
                { $group: { _id: '$date', totalSeconds: { $sum: '$seconds' } } },
                { $sort: { _id: 1 } },
            ]),
            StudySession.aggregate([
                { $match: match },
                { $group: { _id: '$subject', totalSeconds: { $sum: '$seconds' } } },
                { $sort: { totalSeconds: -1 } },
            ]),
        ]);

        res.json({
            from,
            to,
            totalSeconds: days.reduce((sum, d) => sum + d.totalSeconds, 0),
            days: days.map((d) => ({ date: d._id, totalSeconds: d.totalSeconds })),
            subjects: subjects.map((s) => ({ subject: s._id, totalSeconds: s.totalSeconds })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Данные для линейного графика: время занятий по корзинам (часы, дни или месяцы).
// period=day|week|month|year, date=YYYY-MM-DD (последний день периода), tz=getTimezoneOffset() браузера,
// subjects=id1,id2 (необязательно: считать только эти предметы)
router.get('/series', async (req, res) => {
    try {
        const { period, date } = req.query;
        const tz = Number.parseInt(req.query.tz, 10) || 0;
        if (!['day', 'week', 'month', 'year'].includes(period) || !isValidDate(date)) {
            return res.status(400).json({ error: 'period and date (YYYY-MM-DD) are required' });
        }

        const subjectIds = String(req.query.subjects || '')
            .split(',')
            .filter((id) => mongoose.isValidObjectId(id));
        const filtered = req.query.subjects !== undefined;
        // subjects передали, но ни одного валидного id нет: график пустой
        if (filtered && subjectIds.length === 0) {
            return res.json({ period, total: 0, buckets: [] });
        }

        const [y, m, d] = date.split('-').map(Number);
        const dayStr = (t) => new Date(t).toISOString().slice(0, 10);
        const end = Date.UTC(y, m - 1, d);
        const DAY = 86400000;

        // корзины: key совпадает с тем, как мы потом разложим занятия
        let keys;
        let keyOf;
        let from;
        if (period === 'day') {
            keys = Array.from({ length: 24 }, (_, h) => String(h));
            from = date;
        } else if (period === 'year') {
            keys = Array.from({ length: 12 }, (_, i) => {
                const t = new Date(Date.UTC(y, m - 1 - (11 - i), 1));
                return t.toISOString().slice(0, 7);
            });
            keyOf = (s) => s.date.slice(0, 7);
            from = `${keys[0]}-01`;
        } else {
            const n = period === 'week' ? 7 : 30;
            keys = Array.from({ length: n }, (_, i) => dayStr(end - (n - 1 - i) * DAY));
            keyOf = (s) => s.date;
            from = keys[0];
        }

        const query = { user: req.userId, date: { $gte: from, $lte: date } };
        if (filtered) query.subject = { $in: subjectIds };
        const sessions = await StudySession.find(query);

        const sums = Object.fromEntries(keys.map((k) => [k, 0]));
        for (const s of sessions) {
            // для дня раскладываем по часам окончания сессии в часовом поясе пользователя
            const key = period === 'day'
                ? String(new Date(s.createdAt.getTime() - tz * 60000).getUTCHours())
                : keyOf(s);
            if (key in sums) sums[key] += s.seconds;
        }

        const buckets = keys.map((key) => ({ key, seconds: sums[key] }));
        res.json({ period, total: buckets.reduce((sum, b) => sum + b.seconds, 0), buckets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;