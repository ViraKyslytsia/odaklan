const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'No token' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        // смотрим в базу на каждом запросе: пользователя могли удалить или заблокировать
        const user = await User.findById(payload.id).select('isBlocked role email');
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.isBlocked) {
            return res.status(403).json({ error: 'Account is blocked', code: 'blocked' });
        }
        req.userId = payload.id;
        req.userRole = user.role;
        req.userEmail = user.email;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};