const Assessment = require('../models/Assessment');
const Unit = require('../models/Unit');
const StudySession = require('../models/StudySession');
const { findOwnedUnit } = require('./unitController');
const { attachUnits } = require('../services/userData');
const AppError = require('../utils/AppError');

async function findOwned(userId, id) {
  const a = await Assessment.findOne({ _id: id, userId });
  if (!a) throw new AppError(404, 'NOT_FOUND', 'Assessment not found.');
  return a;
}

async function assertWeighting(userId, unitId, weighting, excludeId) {
  const filter = { userId, unitId };
  if (excludeId) filter._id = { $ne: excludeId };
  const others = await Assessment.find(filter, 'weighting').lean();
  const total = others.reduce((sum, a) => sum + a.weighting, 0) + weighting;
  if (total > 100.0001) {
    const message = `This would make the unit total ${Math.round(total * 10) / 10}%. The maximum is 100%.`;
    throw new AppError(400, 'WEIGHTING_EXCEEDED', message, [{ field: 'weighting', message }]);
  }
}

function assertMark(markReceived, maxMark) {
  if (markReceived !== null && markReceived !== undefined && markReceived > maxMark) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Mark cannot be more than the max mark.',
      [{ field: 'markReceived', message: 'Mark cannot be more than the max mark.' }]);
  }
}

exports.list = async (req, res) => {
  const { unitId, from, to, status } = req.valid.query;
  const filter = { userId: req.user.id };
  if (unitId) filter.unitId = unitId;
  if (status) filter.status = status;
  if (from || to) filter.dueAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  const [assessments, units] = await Promise.all([
    Assessment.find(filter).sort({ dueAt: 1 }).lean(),
    Unit.find({ userId: req.user.id }).lean(),
  ]);
  res.json(attachUnits(assessments, units));
};

exports.create = async (req, res) => {
  const data = req.valid.body;
  if (data.clientId) {
    const existing = await Assessment.findOne({ userId: req.user.id, clientId: data.clientId });
    if (existing) return res.status(200).json({ assessment: existing });
  }
  await findOwnedUnit(req.user.id, data.unitId);
  await assertWeighting(req.user.id, data.unitId, data.weighting);
  assertMark(data.markReceived, data.maxMark ?? 100);
  if (data.markReceived != null && !data.status) data.status = 'graded';
  const assessment = await Assessment.create({ ...data, userId: req.user.id });
  res.status(201).json({ assessment });
};

exports.get = async (req, res) => {
  res.json({ assessment: await findOwned(req.user.id, req.valid.params.id) });
};

exports.update = async (req, res) => {
  const a = await findOwned(req.user.id, req.valid.params.id);
  const changes = req.valid.body;
  const unitId = changes.unitId ?? a.unitId;
  if (changes.unitId) await findOwnedUnit(req.user.id, changes.unitId);
  if (changes.weighting !== undefined || changes.unitId) {
    await assertWeighting(req.user.id, unitId, changes.weighting ?? a.weighting, a._id);
  }
  assertMark(changes.markReceived ?? a.markReceived, changes.maxMark ?? a.maxMark);
  if (changes.markReceived != null && !changes.status) changes.status = 'graded';
  a.set(changes);
  await a.save();
  res.json({ assessment: a });
};

exports.remove = async (req, res) => {
  const a = await findOwned(req.user.id, req.valid.params.id);
  await StudySession.updateMany({ userId: req.user.id, assessmentId: a._id }, { assessmentId: null });
  await a.deleteOne();
  res.status(204).end();
};
