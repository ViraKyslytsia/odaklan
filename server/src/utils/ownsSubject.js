const Subject = require('../models/Subject');

async function ownsSubject(userId, subjectId) {
    if (!subjectId) return true;
    const found = await Subject.exists({ _id: subjectId, user: userId });
    return Boolean(found);
}

module.exports = ownsSubject;