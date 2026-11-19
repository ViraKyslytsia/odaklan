const ScheduleItem = require('../models/ScheduleItem');
const createCrudRouter = require('../utils/crud');
const ownsSubject = require('../utils/ownsSubject');

module.exports = createCrudRouter(ScheduleItem, {
    fields: ['title', 'subject', 'dayOfWeek', 'startTime', 'endTime', 'place'],
    listFilter: (query) => (query.day ? { dayOfWeek: Number(query.day) } : {}),
    validate: async (req) => {
        const { subject, startTime, endTime } = req.body;
        if (startTime && endTime && endTime <= startTime) {
            return 'endTime must be later than startTime';
        }
        return (await ownsSubject(req.userId, subject)) ? null : 'Subject not found';
    },
});