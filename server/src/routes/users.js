const NICKNAME_RE = /^[\p{L}\p{N}_.]{3,20}$/u; // 3–20 символов: буквы, цифры, _ и точка
const express = require('express');
const User = require('../models/User');

const router = express.Router();
const publicFields = 'name email nickname settings';

function isValidTimezone(tz) {
    if (typeof tz !== 'string' || !tz) return false;
    try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(publicFields);
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
// свободен ли никнейм (регистр не важен); свой текущий никнейм не считается занятым
router.get('/nickname-check', async (req, res) => {
    try {
        const nickname = String(req.query.nickname || '').trim();
        if (!NICKNAME_RE.test(nickname)) {
            return res.status(400).json({ error: 'Nickname must be 3-20 characters: letters, digits, _ or .' });
        }
        const taken = await User.exists({
            nicknameKey: nickname.toLowerCase(),
            _id: { $ne: req.userId },
        });
        res.json({ available: !taken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
async function updateProfile(req, res) {
    try {
        const updates = {};
        for (const field of ['name']) {
            const value = req.body[field];
            if (value === undefined) continue;
            if (typeof value !== 'string') {
                return res.status(400).json({ error: `${field} must be a string` });
            }
            updates[field] = value.trim();
        }
        if (req.body.nickname !== undefined) {
            const nickname = typeof req.body.nickname === 'string' ? req.body.nickname.trim() : '';
            if (!NICKNAME_RE.test(nickname)) {
                return res.status(400).json({ error: 'Nickname must be 3-20 characters: letters, digits, _ or .' });
            }
            updates.nickname = nickname;
            updates.nicknameKey = nickname.toLowerCase();
        }
        const settings = req.body.settings;
        if (settings && typeof settings === 'object') {
            const region = settings.region;
            if (region && typeof region === 'object') {
                const { countryCode, countryName, city, latitude, longitude, timezone } = region;
                if (typeof countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(countryCode)) {
                    return res.status(400).json({ error: 'Invalid country code' });
                }
                if (typeof city !== 'string' || !city.trim() || city.length > 100) {
                    return res.status(400).json({ error: 'Invalid city' });
                }
                if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
                    !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
                    return res.status(400).json({ error: 'Invalid coordinates' });
                }
                if (!isValidTimezone(timezone)) {
                    return res.status(400).json({ error: 'Invalid timezone' });
                }
                updates['settings.region'] = {
                    countryCode: countryCode.toUpperCase(),
                    countryName: String(countryName || '').slice(0, 100),
                    city: city.trim(),
                    latitude,
                    longitude,
                    timezone,
                };
            }
        }

        const user = await User.findByIdAndUpdate(req.userId, updates, {
            returnDocument: 'after',
            runValidators: true,
        }).select(publicFields);

        res.json(user);
    } catch (err) {
        if (err.code === 11000) {
            const nicknameTaken = err.keyPattern && err.keyPattern.nicknameKey;
            return res.status(409).json({
                error: nicknameTaken ? 'Nickname is already taken' : 'Email is already used',
            });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: 'Invalid data' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}

router.patch('/', updateProfile);
router.put('/', updateProfile);

module.exports = router;