const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureAdmin() {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || password.length < 8) {
        console.warn('Admin is not configured (ADMIN_EMAIL / ADMIN_PASSWORD)');
        return;
    }

    let user = await User.findOne({ email });
    if (!user) user = new User({ email, name: 'Admin' });

    const samePassword = user.passwordHash
        ? await bcrypt.compare(password, user.passwordHash)
        : false;
    if (!samePassword) user.passwordHash = await bcrypt.hash(password, 10);

    user.role = 'admin';
    user.verified = true;
    user.isBlocked = false;
    await user.save();

    await User.updateMany({ role: 'admin', email: { $ne: email } }, { role: 'user' });
}

module.exports = ensureAdmin;