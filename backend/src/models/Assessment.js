const { Schema, model } = require('mongoose');

const TYPES = ['assignment', 'quiz', 'exam', 'lab', 'presentation', 'participation', 'other'];
const STATUSES = ['todo', 'in-progress', 'submitted', 'graded'];

const assessmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: TYPES, required: true },
    dueAt: { type: Date, required: true },
    weighting: { type: Number, required: true, min: 0.1, max: 100 },
    maxMark: { type: Number, default: 100, min: 0.1, max: 1000 },
    markReceived: { type: Number, default: null, min: 0 },
    status: { type: String, enum: STATUSES, default: 'todo' },
    notes: { type: String, maxlength: 1000, default: '' },
    clientId: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

assessmentSchema.index({ userId: 1, dueAt: 1 });
assessmentSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } },
);

module.exports = model('Assessment', assessmentSchema);
module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;