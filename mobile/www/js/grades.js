(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Grades = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const round1 = (n) => Math.round(n * 10) / 10;

  function bandFor(pct) {
    if (pct === null || pct === undefined) return null;
    if (pct >= 80) return 'HD';
    if (pct >= 70) return 'D';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'P';
    return 'N';
  }

  // assessments: [{ weighting, maxMark, markReceived }]; targetGrade: 0-100
  function unitSummary(assessments, targetGrade) {
    let earned = 0;
    let completed = 0;
    let totalWeight = 0;
    for (const a of assessments) {
      totalWeight += a.weighting;
      if (a.markReceived !== null && a.markReceived !== undefined) {
        earned += (a.markReceived / (a.maxMark || 100)) * a.weighting;
        completed += a.weighting;
      }
    }
    const remaining = Math.max(0, 100 - completed);
    const currentAverage = completed > 0 ? (earned / completed) * 100 : null;
    const required = remaining > 0 ? ((targetGrade - earned) / remaining) * 100 : null;
    const maxPossible = earned + remaining;

    return {
      earned: round1(earned),
      completedWeight: round1(completed),
      remainingWeight: round1(remaining),
      totalWeight: round1(totalWeight),
      weightingComplete: Math.abs(totalWeight - 100) < 0.01,
      currentAverage: currentAverage === null ? null : round1(currentAverage),
      currentBand: bandFor(currentAverage),
      targetGrade,
      requiredOnRemaining: required === null ? null : round1(Math.max(0, required)),
      maxPossible: round1(maxPossible),
      targetReachable: maxPossible + 1e-9 >= targetGrade,
      targetSecured: earned >= targetGrade,
    };
  }

  return { unitSummary, bandFor };
});