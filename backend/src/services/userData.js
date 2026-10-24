const { Types } = require('mongoose');
const Unit = require('../models/Unit');
const Assessment = require('../models/Assessment');
const StudySession = require('../models/StudySession');

function attachUnits(assessments, units) {
  const byId = new Map(units.map((u) => [String(u._id), u]));
  return assessments.map((a) => {
    const u = byId.get(String(a.unitId));
    return { ...a, unit: u ? { code: u.code, name: u.name, colour: u.colour } : null };
  });
}

async function loadUserData(userId) {
  const [units, assessments, minutes] = await Promise.all([
    Unit.find({ userId }).lean(),
    Assessment.find({ userId }).sort({ dueAt: 1 }).lean(),
    StudySession.aggregate([
      { $match: { userId: new Types.ObjectId(userId), assessmentId: { $ne: null } } },
      { $group: { _id: '$assessmentId', minutes: { $sum: '$durationMinutes' } } },
    ]),
  ]);
  const minutesByAssessment = Object.fromEntries(minutes.map((m) => [String(m._id), m.minutes]));
  return { units, assessments: attachUnits(assessments, units), minutesByAssessment };
}

module.exports = { loadUserData, attachUnits };