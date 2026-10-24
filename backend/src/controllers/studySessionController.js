const StudySession = require('../models/StudySession');
const Assessment = require('../models/Assessment');
const { findOwnedUnit } = require('./unitController');
const AppError = require('../utils/AppError');

exports.list = async (req, res) => {
  const { unitId, from, to } = req.valid.query;
  const filter = { userId: req.user.id };
  if (unitId) filter.unitId = unitId;
  if (from || to) filter.startedAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  res.json(await StudySession.find(filter).sort({ startedAt: -1 }).limit(200).lean());
};

exports.create = async (req, res) => {
  const data = req.valid.body;
  const existing = await StudySession.findOne({ userId: req.user.id, clientId: data.clientId });
  if (existing) return res.status(200).json({ session: existing }); // retry of the same session
  await findOwnedUnit(req.user.id, data.unitId);
  if (data.assessmentId) {
    const ok = await Assessment.exists({ _id: data.assessmentId, userId: req.user.id, unitId: data.unitId });
    if (!ok) throw new AppError(404, 'NOT_FOUND', 'Assessment not found in this unit.');
  }
  const session = await StudySession.create({ ...data, userId: req.user.id });
  res.status(201).json({ session });
};

exports.remove = async (req, res) => {
  const result = await StudySession.deleteOne({ _id: req.valid.params.id, userId: req.user.id });
  if (result.deletedCount === 0) throw new AppError(404, 'NOT_FOUND', 'Session not found.');
  res.status(204).end();
};
