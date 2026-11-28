const { Schema, model } = require('mongoose');

const activityLogSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, enum: ['login', 'logout'], required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);
// записи старше 180 дней удаляются сами, чтобы журнал не рос бесконечно
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = model('ActivityLog', activityLogSchema);