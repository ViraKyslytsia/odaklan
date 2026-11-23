const { Schema, model } = require('mongoose');

// Заявка в друзья: пока status = 'pending', друзьями ещё не являются
const friendshipSchema = new Schema(
    {
        requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    },
    { timestamps: true }
);
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = model('Friendship', friendshipSchema);
