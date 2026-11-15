const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendCode } = require('../utils/mailer');

const router = express.Router();

function createToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

async function issueCode(user) {
    user.code = String(crypto.randomInt(100000, 1000000));
    user.codeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendCode(user.email, user.code);
}

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Name, email and password (6+ characters) are required' });
        }

        const emailLower = email.toLowerCase();
        let user = await User.findOne({ email: emailLower });
        if (user && user.verified) {
            return res.status(409).json({ error: 'Email is already registered' });
        }

        if (!user) user = new User({ email: emailLower });
        user.name = name;
        user.passwordHash = await bcrypt.hash(password, 10);
        await issueCode(user);

        res.status(201).json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
        if (user && !user.verified) await issueCode(user);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email: (email || '').toLowerCase() });

        if (!user || user.code !== String(code) || !user.codeExpires || user.codeExpires < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        user.verified = true;
        user.code = undefined;
        user.codeExpires = undefined;
        await user.save();

        res.json({ token: createToken(user.id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: (email || '').toLowerCase() });

        if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
            return res.status(401).json({ error: 'Wrong email or password' });
        }
        if (!user.verified) {
            return res.status(403).json({ error: 'Email is not verified' });
        }

        res.json({ token: createToken(user.id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;