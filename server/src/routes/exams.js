const Exam = require('../models/Exam');
const createCrudRouter = require('../utils/crud');

module.exports = createCrudRouter(Exam, {
    fields: ['title', 'date', 'subtasks'],
});