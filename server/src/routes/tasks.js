const Task = require('../models/Task');
const createCrudRouter = require('../utils/crud');
const ownsSubject = require('../utils/ownsSubject');

const router = createCrudRouter(Task, {
    fields: ['title', 'subject', 'date', 'completed'],
    listFilter: (query) => (query.date ? { date: query.date } : {}),
    validate: async (req) =>
        (await ownsSubject(req.userId, req.body.subject)) ? null : 'Subject not found',
});

router.patch('/:id/toggle', async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, user: req.userId });
        if (!task) return res.status(404).json({ error: 'Not found' });

        task.completed = !task.completed;
        await task.save();

        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;