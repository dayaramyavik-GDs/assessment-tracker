const { unitSummary } = require('./grades');

const DAY = 24 * 60 * 60 * 1000;
const isDone = (a) => a.status === 'submitted' || a.status === 'graded';

function classify({ units, assessments, minutesByAssessment, passMark = 50, now = new Date() }) {
  const result = { unreachable: [], atRisk: [], deadlineRisk: [], overdue: [] };

  for (const unit of units) {
    const list = assessments.filter((a) => String(a.unitId) === String(unit._id));
    const s = unitSummary(list, unit.targetGrade);
    const item = { unitId: unit._id, code: unit.code, name: unit.name, colour: unit.colour, summary: s };

    if (!s.targetReachable) {
      result.unreachable.push({ ...item, reason: `Max possible is ${s.maxPossible}%, below your ${unit.targetGrade}% target.` });
    } else if (s.requiredOnRemaining !== null && s.requiredOnRemaining > 85) {
      result.atRisk.push({ ...item, reason: `You need ${s.requiredOnRemaining}% on the remaining ${s.remainingWeight}%.` });
    } else if (s.currentAverage !== null && s.currentAverage < passMark) {
      result.atRisk.push({ ...item, reason: `Current average ${s.currentAverage}% is below the pass mark.` });
    }
  }

  for (const a of assessments) {
    if (isDone(a)) continue;
    const msLeft = new Date(a.dueAt).getTime() - now.getTime();
    const minutes = minutesByAssessment[String(a._id)] || 0;
    if (msLeft < 0) result.overdue.push(a);
    else if (msLeft <= 3 * DAY && minutes < 60) result.deadlineRisk.push({ ...a, minutesStudied: minutes });
  }
  return result;
}

module.exports = { classify, isDone, DAY };