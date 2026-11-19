const { Schema, model } = require('mongoose');

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        avatar: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        code: String,
        codeExpires: Date,
        codeSentAt: Date,
        codeAttempts: { type: Number, default: 0 },
        settings: {
            language: { type: String, enum: ['en', 'tr', 'ru', 'ua'], default: 'en' },
            focusMinutes: { type: Number, default: 25, min: 1, max: 180 },
            shortBreakMinutes: { type: Number, default: 5, min: 1, max: 60 },
            longBreakMinutes: { type: Number, default: 15, min: 1, max: 120 },
            setsBeforeLongBreak: { type: Number, default: 4, min: 1, max: 12 },
        },
    },
    { timestamps: true }
);

module.exports = model('User', userSchema);