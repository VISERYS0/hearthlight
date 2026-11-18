// The ten waves of the Long Night. Each wave is a list of spawn groups: which kind, how many, and
// when (seconds after the wave starts). Later waves mix more kinds, faster, and the tenth brings
// the Pale Matron herself.

const PLAN = [
  [['wisp', 6, 0], ['wisp', 6, 6]],
  [['wisp', 8, 0], ['darter', 5, 5], ['wisp', 6, 10]],
  [['wisp', 8, 0], ['brute', 1, 4], ['darter', 8, 8], ['wisp', 6, 14]],
  [['seer', 2, 0], ['wisp', 10, 2], ['darter', 8, 9], ['brute', 1, 14]],
  [['mother', 3, 0], ['darter', 10, 4], ['seer', 2, 9], ['wisp', 12, 13]],
  [['brute', 2, 0], ['wisp', 14, 3], ['mother', 3, 9], ['seer', 3, 14], ['darter', 10, 18]],
  [['darter', 16, 0], ['seer', 3, 5], ['brute', 2, 10], ['mother', 4, 15], ['wisp', 14, 20]],
  [['mother', 5, 0], ['brute', 3, 5], ['seer', 4, 10], ['darter', 18, 14], ['wisp', 16, 20]],
  [['brute', 4, 0], ['seer', 5, 4], ['darter', 20, 9], ['mother', 6, 14], ['wisp', 20, 19], ['brute', 2, 24]],
  [['matron', 1, 0], ['wisp', 10, 6], ['darter', 10, 16], ['seer', 3, 26]],
];

/** The spawn schedule for wave `number` (1-based), each entry {kind, at}, sorted by time. */
export function waveSchedule(number) {
  const groups = PLAN[Math.min(number, PLAN.length) - 1];
  const schedule = [];
  for (const [kind, base, start] of groups) {
    const count = kind === 'matron' ? 1 : Math.round(base * (1 + (number - 1) * 0.1));
    for (let i = 0; i < count; i += 1) schedule.push({ kind, at: start + i * (kind === 'darter' ? 0.35 : 0.8) });
  }
  return schedule.sort((a, b) => a.at - b.at);
}

/** Enemies grow a little faster each wave. */
export function waveSpeedScale(number) {
  return 1 + (number - 1) * 0.06;
}
