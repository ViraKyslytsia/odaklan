const { Schema, model } = require('mongoose');

// объявление от админа: его видят все пользователи, пока оно не истекло или не удалено
const announcementSchema = new Schema(
    {
        text: { type: String, required: true, trim: true, maxlength: 500 },
        createdBy: { type: String, default: '' }, // email админа
        expiresAt: { type: Date, default: null }, // null: без срока
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);
// просроченные объявления MongoDB удаляет сама
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Announcement', announcementSchema);