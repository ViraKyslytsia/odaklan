const { Schema, model } = require('mongoose');

const blockSchema = new Schema(
    {
        blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    },
    { timestamps: true }
);
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

module.exports = model('Block', blockSchema);
