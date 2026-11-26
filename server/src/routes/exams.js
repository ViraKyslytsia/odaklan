const Exam = require('../models/Exam');
const createCrudRouter = require('../utils/crud');
const { sendError } = createCrudRouter;
const ownsSubject = require('../utils/ownsSubject');
const isValidDate = require('../utils/isValidDate');

const router = createCrudRouter(Exam, {
    fields: ['title', 'date', 'color', 'subject', 'subtasks'],
    sort: { date: 1 },
    validate: async (req) => {
        const { date, subtasks } = req.body;
        if (date !== undefined && Number.isNaN(new Date(date).getTime())) {
            return 'date must be a valid date and time';
        }
        if (Array.isArray(subtasks) && subtasks.some((s) => s.date && !isValidDate(s.date))) {
            return 'subtask date must be YYYY-MM-DD';
        }
        return (await ownsSubject(req.userId, req.body.subject)) ? null : 'Subject not found';
    },
});

// достаёт экзамен текущего пользователя; если не нашёл, сам отвечает 404 и возвращает null
async function loadExam(req, res) {
    const exam = await Exam.findOne({ _id: req.params.id, user: req.userId });
    if (!exam) res.status(404).json({ error: 'Not found' });
    return exam;
}

// Добавить пункт в чек-лист: { title, date? }
router.post('/:id/subtasks', async (req, res) => {
    try {
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        if (!title) return res.status(400).json({ error: 'title is required' });
        const date = req.body.date || null;
        if (date && !isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

        const exam = await loadExam(req, res);
        if (!exam) return;
        exam.subtasks.push({ title, date });
        await exam.save();
        res.status(201).json(exam);
    } catch (err) {
        sendError(res, err);
    }
});

// Изменить пункт: { title?, date? } (date: null убирает дату)
router.patch('/:id/subtasks/:subId', async (req, res) => {
    try {
        const { title, date } = req.body;
        if (date && !isValidDate(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

        const exam = await loadExam(req, res);
        if (!exam) return;
        const subtask = exam.subtasks.id(req.params.subId);
        if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

        if (typeof title === 'string' && title.trim()) subtask.title = title.trim();
        if (date !== undefined) subtask.date = date || null;
        await exam.save();
        res.json(exam);
    } catch (err) {
        sendError(res, err);
    }
});

router.patch('/:id/subtasks/:subId/toggle', async (req, res) => {
    try {
        const exam = await loadExam(req, res);
        if (!exam) return;
        const subtask = exam.subtasks.id(req.params.subId);
        if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

        subtask.done = !subtask.done;
        await exam.save();
        res.json(exam);
    } catch (err) {
        sendError(res, err);
    }
});

router.delete('/:id/subtasks/:subId', async (req, res) => {
    try {
        const exam = await loadExam(req, res);
        if (!exam) return;
        const subtask = exam.subtasks.id(req.params.subId);
        if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

        subtask.deleteOne();
        await exam.save();
        res.json(exam);
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;