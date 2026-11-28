const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// пишем вход или выход; ошибка журнала не должна ломать сам вход
async function logActivity(userId, type) {
    try {
        await ActivityLog.create({ user: userId, type });
        const field = type === 'login' ? 'lastLoginAt' : 'lastLogoutAt';
        await User.updateOne({ _id: userId }, { [field]: new Date() });
    } catch (err) {
        console.error('activity log failed:', err.message);
    }
}

module.exports = { logActivity };