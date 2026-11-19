const express = require('express');
const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');

const router = express.Router();

router.get('/day', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'date is required' });

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
        if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

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

module.exports = router;