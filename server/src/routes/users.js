const express = require('express');
const User = require('../models/User');

const router = express.Router();
const publicFields = 'name email avatar';

router.get('/me', async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(publicFields);
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/me', async (req, res) => {
    try {
        const updates = {};
        for (const field of ['name', 'email', 'avatar']) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }
        const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select(publicFields);
        res.json(user);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email is already used' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;