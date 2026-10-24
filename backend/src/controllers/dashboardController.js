const User = require('../models/User');
const { loadUserData } = require('../services/userData');
const { classify, isDone, DAY } = require('../services/atRisk');

async function build(userId) {
  const [data, user] = await Promise.all([loadUserData(userId), User.findById(userId).lean()]);
  const risk = classify({ ...data, passMark: user ? user.settings.passMark : 50 });
  return { ...data, risk };
}

exports.dashboard = async (req, res) => {
  const now = Date.now();
  const { assessments, risk } = await build(req.user.id);
  const open = assessments.filter((a) => !isDone(a));
  const dueIn = (a) => new Date(a.dueAt).getTime() - now;
  res.json({
    upcoming: open.filter((a) => dueIn(a) >= 0 && dueIn(a) <= 14 * DAY),
    overdue: risk.overdue,
    dueThisWeek: open.filter((a) => dueIn(a) >= 0 && dueIn(a) <= 7 * DAY).length,
    overdueCount: risk.overdue.length,
    atRiskCount: risk.unreachable.length + risk.atRisk.length + risk.deadlineRisk.length,
  });
};

exports.atRisk = async (req, res) => {
  const { risk } = await build(req.user.id);
  res.json(risk);
};
