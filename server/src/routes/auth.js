const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const { sendCode } = require('../utils/mailer');

const router = express.Router();
const MAX_CODE_ATTEMPTS = 5;
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, try again later' },
    })
);

const isStr = (v) => typeof v === 'string';
const normEmail = (v) => (isStr(v) ? v.trim().toLowerCase() : '');

function sentRecently(user) {
    return Boolean(user.codeSentAt) && Date.now() - user.codeSentAt.getTime() < RESEND_COOLDOWN_MS;
}

function createToken(userId, expiresIn = '30d') {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
}

async function issueCode(user) {
    user.code = String(crypto.randomInt(100000, 1000000));
    user.codeExpires = new Date(Date.now() + CODE_TTL_MS);
    user.codeSentAt = new Date();
    user.codeAttempts = 0;
    await user.save();
    await sendCode(user.email, user.code);
}

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!isStr(name) || !isStr(email) || !isStr(password) || !name.trim() || password.length < 6) {
            return res.status(400).json({ error: 'Name, email and password (6+ characters) are required' });
        }

        const emailLower = normEmail(email);
        if (!EMAIL_RE.test(emailLower)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        let user = await User.findOne({ email: emailLower });
        if (user && user.verified) {
            return res.status(409).json({ error: 'Email is already registered' });
        }

        if (!user) user = new User({ email: emailLower });
        user.name = name.trim();
        user.passwordHash = await bcrypt.hash(password, 10);

        if (sentRecently(user)) {
            await user.save();
        } else {
            await issueCode(user);
        }

        res.status(201).json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/resend', async (req, res) => {
    try {
        const user = await User.findOne({ email: normEmail(req.body.email) });
        if (user && !user.verified && !sentRecently(user)) await issueCode(user);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ email: normEmail(email) });

        if (!user || !user.code || !user.codeExpires || user.codeExpires < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        if (user.code !== String(code)) {
            user.codeAttempts += 1;
            if (user.codeAttempts >= MAX_CODE_ATTEMPTS) {
                user.code = undefined;
                user.codeExpires = undefined;
                user.codeAttempts = 0;
                await user.save();
                return res.status(400).json({ error: 'Too many wrong attempts. Request a new code' });
            }
            await user.save();
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        user.verified = true;
        user.code = undefined;
        user.codeExpires = undefined;
        user.codeAttempts = 0;
        await user.save();

        res.json({ token: createToken(user.id) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// забыли пароль: шлём код на почту (всегда отвечаем «ок», чтобы нельзя было узнать, есть ли такая почта)
router.post('/forgot', async (req, res) => {
    try {
        const user = await User.findOne({ email: normEmail(req.body.email) });
        const recently =
            user && user.resetSentAt && Date.now() - user.resetSentAt.getTime() < RESEND_COOLDOWN_MS;
        if (user && user.verified && !recently) {
            user.resetCode = String(crypto.randomInt(100000, 1000000));
            user.resetExpires = new Date(Date.now() + CODE_TTL_MS);
            user.resetSentAt = new Date();
            user.resetAttempts = 0;
            await user.save();
            await sendCode(user.email, user.resetCode, 'reset');
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// новый пароль по коду из письма; после смены сразу входим
router.post('/reset', async (req, res) => {
    try {
        const { email, code, password } = req.body;
        if (!isStr(password) || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ email: normEmail(email) });
        if (!user || !user.verified || !user.resetCode || !user.resetExpires || user.resetExpires < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        if (user.resetCode !== String(code)) {
            user.resetAttempts += 1;
            if (user.resetAttempts >= MAX_CODE_ATTEMPTS) {
                user.resetCode = undefined;
                user.resetExpires = undefined;
                user.resetAttempts = 0;
                await user.save();
                return res.status(400).json({ error: 'Too many wrong attempts. Request a new code' });
            }
            await user.save();
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        // новый пароль не должен совпадать со старым
        if (await bcrypt.compare(password, user.passwordHash)) {
            return res.status(422).json({ error: 'New password must be different from the old one' });
        }

        user.passwordHash = await bcrypt.hash(password, 10);
        user.resetCode = undefined;
        user.resetExpires = undefined;
        user.resetAttempts = 0;
        await user.save();

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password, remember } = req.body;
        if (!isStr(email) || !isStr(password)) {
            return res.status(401).json({ error: 'Wrong email or password' });
        }

        const user = await User.findOne({ email: normEmail(email) });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Wrong email or password' });
        }
        if (!user.verified) {
            return res.status(403).json({ error: 'Email is not verified' });
        }

        const expiresIn = remember === false ? '1d' : '30d';
        res.json({ token: createToken(user.id, expiresIn) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;