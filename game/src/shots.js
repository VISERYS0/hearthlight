// The screenshot scenes behind ?shot=title|play|boons|end. Each plays the real rules forward
// from a fresh, seeded world under the autopilot for a fixed number of steps, so every frame is
// what a real game looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { autopilotControls } from './autopilot.js';
import { PHASE_CHOOSE, PHASE_FIGHT, PHASE_LOST, PHASE_WON } from './world.js';

function run(world, seconds, until, skill = 1) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const s = world.state;
    if (s.phase === PHASE_CHOOSE) {
      if (until(s)) return;
      if (s.chooseTime > 1.5) world.choose(i % s.cards.length);
    } else if (until(s)) return;
    world.step(STEP, autopilotControls(s, skill));
  }
}

/** Set `world` to the named scene and return the screen to show over it. */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    run(world, 600, (s) => s.wave === 10 && s.phase === PHASE_FIGHT && s.waveTime > 9.3 && s.shards.length > 12 && s.enemies.length > 6);
    return 'play';
  }
  if (name === 'boons') {
    run(world, 400, (s) => s.wave === 3 && s.phase === PHASE_CHOOSE && s.chooseTime > 1);
    return 'choose';
  }
  if (name === 'end') {
    run(world, 900, (s) => (s.phase === PHASE_LOST || s.phase === PHASE_WON) && s.texts.length === 0, 0.6);
    return 'end';
  }
  run(world, 6, () => false);
  return 'title';
}
