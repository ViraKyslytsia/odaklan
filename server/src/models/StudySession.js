const { Schema, model } = require('mongoose');

const studySessionSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
        date: { type: String, required: true, index: true },
        seconds: { type: Number, required: true, min: 1 },
    },
    { timestamps: true }
);

module.exports = model('StudySession', studySessionSchema);