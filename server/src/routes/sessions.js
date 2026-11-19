const express = require('express');
const StudySession = require('../models/StudySession');
const Subject = require('../models/Subject');
const ownsSubject = require('../utils/ownsSubject');
const isValidDate = require('../utils/isValidDate');

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { date, seconds, subject } = req.body;
        if (!isValidDate(date) || !Number.isInteger(seconds) || seconds < 1) {
            return res.status(400).json({ error: 'date and seconds (> 0) are required' });
        }
        if (!(await ownsSubject(req.userId, subject))) {
            return res.status(400).json({ error: 'Subject not found' });
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
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;