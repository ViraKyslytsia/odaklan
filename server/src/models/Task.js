const { Schema, model } = require('mongoose');

const taskSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true },
        subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
        date: { type: String, required: true, index: true, match: /^\d{4}-\d{2}-\d{2}$/ },
        completed: { type: Boolean, default: false },
    },
    { timestamps: true }
);
taskSchema.index({ user: 1, date: 1 });
module.exports = model('Task', taskSchema);