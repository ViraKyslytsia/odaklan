require('dotenv').config();
const ensureAdmin = require('./utils/ensureAdmin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const connectDB = require('./config/db');
const auth = require('./middleware/auth');
const requireAdmin = require('./middleware/requireAdmin');
const rateKey = require('./utils/rateKey');
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in .env');
    process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
    req.body ??= {};
    next();
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true });
});
// общий лимит на все запросы к API (у входа и регистрации есть ещё свой, строже)
app.use(
    '/api',
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 3000,
        skip: (req) => req.path === '/social/presence',
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests, try again later' },
        keyGenerator: rateKey,
    })
);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', auth, require('./routes/users'));
app.use('/api/subjects', auth, require('./routes/subjects'));
app.use('/api/tasks', auth, require('./routes/tasks'));
app.use('/api/exams', auth, require('./routes/exams'));
app.use('/api/sessions', auth, require('./routes/sessions'));
app.use('/api/stats', auth, require('./routes/stats'));
app.use('/api/schedule', auth, require('./routes/schedule'));
app.use('/api/social', auth, require('./routes/social'));
app.use('/api/announcements', auth, require('./routes/announcements'));
app.use('/api/admin', auth, requireAdmin, require('./routes/admin'));
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;

connectDB().then(async () => {
    await ensureAdmin().catch((err) => console.error('ensureAdmin failed:', err.message));
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});