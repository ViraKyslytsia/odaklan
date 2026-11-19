const { Schema, model } = require('mongoose');

const subjectSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true },
        color: {
            type: String,
            default: '#6D5BFF',
            match: [/^#[0-9A-Fa-f]{6}$/, 'color must be a hex like #6D5BFF'],
        },
        studiedSeconds: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = model('Subject', subjectSchema);