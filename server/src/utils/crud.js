const express = require('express');

function pick(source, fields) {
    const result = {};
    for (const field of fields) {
        if (source[field] !== undefined) result[field] = source[field];
    }
    return result;
}

// не показываем клиенту внутренний текст ошибок базы
function sendError(res, err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid data' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}

function createCrudRouter(Model, { fields, listFilter = () => ({}), validate, afterDelete, sort = { createdAt: 1 } } = {}) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const items = await Model.find({ user: req.userId, ...listFilter(req.query) }).sort(sort);
            res.json(items);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    router.post('/', async (req, res) => {
        try {
            if (validate) {
                const message = await validate(req);
                if (message) return res.status(400).json({ error: message });
            }
            const item = await Model.create({ ...pick(req.body, fields), user: req.userId });
            res.status(201).json(item);
        } catch (err) {
            sendError(res, err);
        }
    });

    const update = async (req, res) => {
        try {
            if (validate) {
                const message = await validate(req);
                if (message) return res.status(400).json({ error: message });
            }
            const item = await Model.findOneAndUpdate(
                { _id: req.params.id, user: req.userId },
                pick(req.body, fields),
                { returnDocument: 'after', runValidators: true }
            );
            if (!item) return res.status(404).json({ error: 'Not found' });
            res.json(item);
        } catch (err) {
            sendError(res, err);
        }
    };

    router.patch('/:id', update);
    router.put('/:id', update);

    router.delete('/:id', async (req, res) => {
        try {
            const item = await Model.findOneAndDelete({ _id: req.params.id, user: req.userId });
            if (!item) return res.status(404).json({ error: 'Not found' });
            if (afterDelete) await afterDelete(item);
            res.json({ ok: true });
        } catch (err) {
            sendError(res, err);
        }
    });

    return router;
}

module.exports = createCrudRouter;
module.exports.sendError = sendError;