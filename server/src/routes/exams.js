const Exam = require('../models/Exam');
const createCrudRouter = require('../utils/crud');

const router = createCrudRouter(Exam, {
    fields: ['title', 'date', 'subtasks'],
    sort: { date: 1 },
});

router.patch('/:id/subtasks/:subId/toggle', async (req, res) => {
    try {
        const exam = await Exam.findOne({ _id: req.params.id, user: req.userId });
        if (!exam) return res.status(404).json({ error: 'Not found' });

        const subtask = exam.subtasks.id(req.params.subId);
        if (!subtask) return res.status(404).json({ error: 'Subtask not found' });

        subtask.done = !subtask.done;
        await exam.save();
        res.json(exam);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;