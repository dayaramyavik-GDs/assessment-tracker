const { unitSummary, bandFor } = require('../src/services/grades');

describe('unitSummary', () => {
  test('matches the worked example in the plan', () => {
    const s = unitSummary([
      { weighting: 30, maxMark: 100, markReceived: 62 },
      { weighting: 10, maxMark: 20, markReceived: 18 },
      { weighting: 60, maxMark: 100, markReceived: null },
    ], 70);
    expect(s.earned).toBe(27.6);
    expect(s.completedWeight).toBe(40);
    expect(s.currentAverage).toBe(69);
    expect(s.requiredOnRemaining).toBe(70.7);
    expect(s.weightingComplete).toBe(true);
    expect(s.targetReachable).toBe(true);
  });

  test('flags an unreachable target', () => {
    const s = unitSummary([{ weighting: 50, maxMark: 100, markReceived: 20 }], 65);
    expect(s.maxPossible).toBe(60);
    expect(s.targetReachable).toBe(false);
    expect(s.requiredOnRemaining).toBe(110);
  });

  test('no marks yet: required equals target', () => {
    const s = unitSummary([{ weighting: 100, maxMark: 100, markReceived: null }], 75);
    expect(s.currentAverage).toBeNull();
    expect(s.requiredOnRemaining).toBe(75);
  });
});

test('bandFor uses Australian bands', () => {
  expect(bandFor(80)).toBe('HD');
  expect(bandFor(79.9)).toBe('D');
  expect(bandFor(50)).toBe('P');
  expect(bandFor(49.9)).toBe('N');
  expect(bandFor(null)).toBeNull();
});