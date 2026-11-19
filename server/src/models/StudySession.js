const { Schema, model } = require('mongoose');

const studySessionSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
        date: { type: String, required: true, index: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        seconds: { type: Number, required: true, min: 1, max: 86400 }
    },
    { timestamps: true }
);
studySessionSchema.index({ user: 1, date: 1 });
module.exports = model('StudySession', studySessionSchema);