const { Schema, model } = require('mongoose');

const examSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        subtasks: [
            {
                title: { type: String, required: true },
                done: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true }
);

module.exports = model('Exam', examSchema);