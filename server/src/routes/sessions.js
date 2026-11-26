const express = require('express');
const StudySession = require('../models/StudySession');
const Subject = require('../models/Subject');
const ownsSubject = require('../utils/ownsSubject');
const isValidDate = require('../utils/isValidDate');
const { sendError } = require('../utils/crud');
const router = express.Router();
const MAX_DAILY_SECONDS = 16 * 60 * 60; // больше 16 часов учёбы в день не засчитываем
router.post('/', async (req, res) => {
    try {
        const { date, seconds, subject } = req.body;
        if (!isValidDate(date) || !Number.isInteger(seconds) || seconds < 1) {
            return res.status(400).json({ error: 'date and seconds (> 0) are required' });
        }
        if (!(await ownsSubject(req.userId, subject))) {
            return res.status(400).json({ error: 'Subject not found' });
        }
        // защита от накрутки рейтинга: сумма за день ограничена
        const today = await StudySession.find({ user: req.userId, date }).select('seconds');
        const total = today.reduce((sum, s) => sum + s.seconds, 0);
        if (total + seconds > MAX_DAILY_SECONDS) {
            return res.status(400).json({ error: 'Daily study limit exceeded' });
        }
        const session = await StudySession.create({ user: req.userId, date, seconds, subject });

        if (subject) {
            try {
                await Subject.updateOne(
                    { _id: subject, user: req.userId },
                    { $inc: { studiedSeconds: seconds } }
                );
            } catch (err) {
                await StudySession.deleteOne({ _id: session._id });
                throw err;
            }
        }

        res.status(201).json(session);
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;