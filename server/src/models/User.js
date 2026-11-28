const { Schema, model } = require('mongoose');

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        nickname: { type: String, trim: true, minlength: 3, maxlength: 20 },
        // то же самое в нижнем регистре: по нему проверяем уникальность, чтобы «Vira» и «vira» были одним именем
        nicknameKey: { type: String, unique: true, sparse: true },
        passwordHash: { type: String, required: true },
        verified: { type: Boolean, default: false },
        // присутствие: когда последний раз был в приложении и до какого момента считается, что учится
        lastSeen: { type: Date, default: null },
        studyingUntil: { type: Date, default: null },
        code: String,
        codeExpires: Date,
        codeSentAt: Date,
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        isBlocked: { type: Boolean, default: false },
        blockedAt: { type: Date, default: null },
        blockedReason: { type: String, default: '', maxlength: 200 },
        lastLoginAt: { type: Date, default: null },
        lastLogoutAt: { type: Date, default: null },
        language: { type: String, enum: ['', 'en', 'tr', 'ru', 'uk'], default: '' },
        codeAttempts: { type: Number, default: 0 },
        // код для сброса пароля (отдельно от кода подтверждения почты)
        resetCode: String,
        resetExpires: Date,
        resetSentAt: Date,
        resetAttempts: { type: Number, default: 0 },
        settings: {
            region: {
                countryCode: { type: String, default: '' },
                countryName: { type: String, default: '' },
                city: { type: String, default: '' },
                latitude: { type: Number, default: null },
                longitude: { type: Number, default: null },
                timezone: { type: String, default: '' },
            },
        },
    },
    { timestamps: true }
);

// неподтверждённые аккаунты удаляются через сутки
userSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 24 * 60 * 60, partialFilterExpression: { verified: false } }
);

module.exports = model('User', userSchema);