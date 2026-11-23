const { Schema, model } = require('mongoose');

const groupSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
        owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        // код приглашения: по нему можно вступить в группу
        code: { type: String, required: true, unique: true },
    },
    { timestamps: true }
);
groupSchema.index({ members: 1 });

module.exports = model('Group', groupSchema);
