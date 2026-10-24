const { Schema, model } = require('mongoose');

const unitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, minlength: 3, maxlength: 12 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    semester: { type: String, required: true, trim: true, maxlength: 20 },
    creditPoints: { type: Number, min: 0, max: 50, default: 0 },
    targetGrade: { type: Number, min: 0, max: 100, default: 65 },
    colour: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#2563eb' },
    clientId: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

// One unit code per user per semester
unitSchema.index({ userId: 1, code: 1, semester: 1 }, { unique: true });
// Idempotency key: the same form submitted twice creates one unit
unitSchema.index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } },
);

module.exports = model('Unit', unitSchema);
