const express = require('express');
const Announcement = require('../models/Announcement');

const router = express.Router();

// объявления для всех пользователей: только действующие, свежие первыми
router.get('/', async (req, res) => {
    try {
        const items = await Announcement.find({
            $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();
        res.json(items.map((a) => ({ id: String(a._id), text: a.text, at: a.createdAt })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;