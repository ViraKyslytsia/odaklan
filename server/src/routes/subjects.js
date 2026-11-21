const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Task = require('../models/Task');
const StudySession = require('../models/StudySession');
const ScheduleItem = require('../models/ScheduleItem');
const createCrudRouter = require('../utils/crud');

module.exports = createCrudRouter(Subject, {
    fields: ['name', 'color'],
    afterDelete: async (subject) => {
        await Task.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
        await StudySession.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
        await ScheduleItem.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
    },
    afterDelete: async (subject) => {
        await Task.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
        await StudySession.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
        await ScheduleItem.updateMany({ subject: subject._id }, { $unset: { subject: '' } });
        await Exam.updateMany({ subject: subject._id }, { $set: { subject: null } });
    },
});