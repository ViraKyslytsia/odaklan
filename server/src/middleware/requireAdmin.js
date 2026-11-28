// двойной замок: роль в базе И почта из ADMIN_EMAIL
module.exports = function requireAdmin(req, res, next) {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (req.userRole !== 'admin' || !adminEmail || req.userEmail !== adminEmail) {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
};