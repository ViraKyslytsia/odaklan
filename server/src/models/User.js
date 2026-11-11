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
    },
    { timestamps: true }
);

module.exports = model('User', userSchema);