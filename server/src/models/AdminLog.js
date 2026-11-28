const { Schema, model } = require('mongoose');

// журнал действий админа; email и имя цели хранятся копией, потому что пользователя могут удалить
const adminLogSchema = new Schema(
    {
        adminEmail: { type: String, required: true },
        action: { type: String, enum: ['block', 'unblock', 'delete', 'delete_group', 'remove_member', 'announce', 'delete_announcement'], required: true },
        targetEmail: { type: String, default: '' },
        targetName: { type: String, default: '' },
        reason: { type: String, default: '', maxlength: 200 },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = model('AdminLog', adminLogSchema);