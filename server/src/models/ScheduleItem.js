const { Schema, model } = require('mongoose');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleItemSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
        title: { type: String, required: true, trim: true },
        dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
        startTime: { type: String, required: true, match: TIME },
        endTime: { type: String, required: true, match: TIME },
        place: { type: String, default: '', trim: true },
    },
    { timestamps: true }
);

module.exports = model('ScheduleItem', scheduleItemSchema);