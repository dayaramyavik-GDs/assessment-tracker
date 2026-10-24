const { Schema, model } = require('mongoose');

const studySessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', default: null },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 720 },
    mode: { type: String, enum: ['stopwatch', 'pomodoro'], default: 'stopwatch' },
    clientId: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: true },
);

studySessionSchema.index({ userId: 1, startedAt: -1 });
studySessionSchema.index({ userId: 1, clientId: 1 }, { unique: true });

module.exports = model('StudySession', studySessionSchema);
