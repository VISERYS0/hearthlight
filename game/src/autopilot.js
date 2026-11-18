// A simple computer player: it circles the hearth, aims at whichever frost creature is nearest the
// fire, steps away from ice shards, and flares when crowded. It plays the title screen's attract
// mode and the staged screenshot scenes, through exactly the same controls a person uses.
import { HEARTH } from './config.js';

export function autopilotControls(state, skill = 1) {
  const p = state.player;
  let target = null;
  let targetScore = Infinity;
  for (const e of state.enemies) {
    const score = Math.hypot(e.x - HEARTH.x, e.y - HEARTH.y) * 0.7 + Math.hypot(e.x - p.x, e.y - p.y) * 0.3 - (e.kind === 'matron' ? 200 : 0);
    if (score < targetScore) { targetScore = score; target = e; }
  }
  const orbit = state.time * 0.6;
  let gx = HEARTH.x + Math.cos(orbit) * 150 - p.x;
  let gy = HEARTH.y + Math.sin(orbit) * 105 - p.y;
  let crowd = 0;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 140) crowd += 1;
    if (d < 90 * skill) { gx += ((p.x - e.x) / d) * 260; gy += ((p.y - e.y) / d) * 260; }
  }
  let danger = false;
  for (const s of state.shards) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < 70 * skill) { gx += ((p.x - s.x) / d) * 200; gy += ((p.y - s.y) / d) * 200; if (d < 35) danger = true; }
  }
  const len = Math.hypot(gx, gy);
  const moveX = len > 12 ? gx / len : 0;
  const moveY = len > 12 ? gy / len : 0;
  const lead = target ? Math.hypot(target.x - p.x, target.y - p.y) / 640 : 0;
  return {
    moveX, moveY,
    aimX: target ? target.x + target.vx * lead : p.x + 100,
    aimY: target ? target.y + target.vy * lead : p.y,
    fire: Boolean(target),
    dash: danger && skill >= 1,
    flare: crowd >= 4,
  };
}
