const { Schema, model } = require('mongoose');

const subtaskSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    // день, когда пункт нужно сделать (YYYY-MM-DD). Если он совпал с сегодняшним, пункт попадает в «Задачи на сегодня»
    date: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
});

const examSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true, maxlength: 80 },
        // точные день и время экзамена (хранится в UTC, показывается в часовом поясе пользователя)
        date: { type: Date, required: true },
        color: {
            type: String,
            default: '#A78BFA',
            match: [/^#[0-9A-Fa-f]{6}$/, 'color must be a hex like #A78BFA'],
        },
        // предмет нужен, чтобы считать часы подготовки из таймера
        subject: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
        subtasks: [subtaskSchema],
    },
    { timestamps: true }
);

module.exports = model('Exam', examSchema);