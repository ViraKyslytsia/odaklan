const Group = require('../models/Group');

const same = (a, b) => String(a) === String(b);

// убирает участника из одной группы: пустая группа удаляется;
// ушёл владелец: группу получает зам, а если зама нет, следующий участник
async function removeMemberFromGroup(group, userId) {
    const rest = group.members.filter((m) => !same(m, userId));
    if (rest.length === 0) {
        await Group.deleteOne({ _id: group._id });
        return { groupDeleted: true };
    }
    group.members = rest;
    if (group.deputy && same(group.deputy, userId)) group.deputy = null;
    if (same(group.owner, userId)) {
        group.owner = group.deputy || rest[0];
        if (group.deputy && same(group.deputy, group.owner)) group.deputy = null;
    }
    await group.save();
    return { groupDeleted: false };
}

// все группы пользователя (нужно при удалении аккаунта)
async function removeUserFromGroups(userId) {
    const groups = await Group.find({ members: userId });
    for (const group of groups) await removeMemberFromGroup(group, userId);
}

module.exports = removeUserFromGroups;
module.exports.removeMemberFromGroup = removeMemberFromGroup;