const Unit = require('../models/Unit');
const Assessment = require('../models/Assessment');
const StudySession = require('../models/StudySession');
const { unitSummary } = require('../services/grades');
const AppError = require('../utils/AppError');

async function findOwnedUnit(userId, id) {
  const unit = await Unit.findOne({ _id: id, userId });
  if (!unit) throw new AppError(404, 'NOT_FOUND', 'Unit not found.'); // also for other users' units
  return unit;
}
exports.findOwnedUnit = findOwnedUnit;

exports.list = async (req, res) => {
  const filter = { userId: req.user.id };
  if (req.valid.query.semester) filter.semester = req.valid.query.semester;
  const units = await Unit.find(filter).sort({ semester: -1, code: 1 }).lean();
  const assessments = await Assessment.find({ userId: req.user.id, unitId: { $in: units.map((u) => u._id) } }).lean();
  res.json(units.map((u) => ({
    ...u,
    summary: unitSummary(assessments.filter((a) => String(a.unitId) === String(u._id)), u.targetGrade),
  })));
};

exports.create = async (req, res) => {
  const data = req.valid.body;
  if (data.clientId) {
    const existing = await Unit.findOne({ userId: req.user.id, clientId: data.clientId });
    if (existing) return res.status(200).json({ unit: existing }); // duplicate submit
  }
  const unit = await Unit.create({ ...data, userId: req.user.id });
  res.status(201).json({ unit });
};

exports.get = async (req, res) => {
  const unit = await findOwnedUnit(req.user.id, req.valid.params.id);
  const assessments = await Assessment.find({ userId: req.user.id, unitId: unit._id }).sort({ dueAt: 1 }).lean();
  res.json({ unit, assessments, summary: unitSummary(assessments, unit.targetGrade) });
};

exports.update = async (req, res) => {
  const unit = await findOwnedUnit(req.user.id, req.valid.params.id);
  unit.set(req.valid.body);
  await unit.save();
  res.json({ unit });
};

exports.remove = async (req, res) => {
  const unit = await findOwnedUnit(req.user.id, req.valid.params.id);
  const filter = { userId: req.user.id, unitId: unit._id };
  await Promise.all([Assessment.deleteMany(filter), StudySession.deleteMany(filter)]);
  await unit.deleteOne();
  res.status(204).end();
};