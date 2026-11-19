const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const express = require('express');
const User = require('../models/User');

const router = express.Router();
const publicFields = 'name email avatar settings';
const SETTINGS_KEYS = ['language', 'focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'setsBeforeLongBreak'];

router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(publicFields);
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

async function updateProfile(req, res) {
    try {
        const updates = {};
        for (const field of ['name', 'email', 'avatar']) {
            const value = req.body[field];
            if (value === undefined) continue;
            if (typeof value !== 'string') {
                return res.status(400).json({ error: `${field} must be a string` });
            }
            updates[field] = value.trim();
        }
        if (updates.email !== undefined && !EMAIL_RE.test(updates.email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (updates.avatar && !/^(data:image\/|https?:\/\/)/.test(updates.avatar)) {
            return res.status(400).json({ error: 'avatar must be an image data URL or http(s) link' });
        }

        const settings = req.body.settings;
        if (settings && typeof settings === 'object') {
            for (const key of SETTINGS_KEYS) {
                if (settings[key] !== undefined) updates[`settings.${key}`] = settings[key];
            }
        }

        const user = await User.findByIdAndUpdate(req.userId, updates, {
            returnDocument: 'after',
            runValidators: true,
        }).select(publicFields);

        res.json(user);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email is already used' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

router.patch('/', updateProfile);
router.put('/', updateProfile);

module.exports = router;