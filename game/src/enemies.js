// The frost creatures of the Long Night: their stats and how each one moves and attacks. Each
// kind has a `think` that steers it a step; the world handles hits, deaths and drops.
import { HEARTH, PALETTE } from './config.js';

export const ENEMY_KINDS = {
  wisp: { name: 'Frost Wisp', hp: 2, speed: 62, radius: 11, hearthDamage: 9, points: 10, color: PALETTE.frost },
  darter: { name: 'Sleet Darter', hp: 1, speed: 135, radius: 8, hearthDamage: 5, points: 15, color: '#e4f7ff' },
  brute: { name: 'Rime Brute', hp: 14, speed: 30, radius: 23, hearthDamage: 25, points: 60, color: PALETTE.rime },
  seer: { name: 'Hoarfrost Seer', hp: 5, speed: 55, radius: 13, hearthDamage: 6, points: 40, color: '#9fb4ff' },
  mother: { name: 'Snow Mother', hp: 7, speed: 42, radius: 17, hearthDamage: 10, points: 35, color: '#d6f2ff' },
  matron: { name: 'The Pale Matron', hp: 420, speed: 40, radius: 46, hearthDamage: 40, points: 2500, color: PALETTE.boss },
};

function towards(enemy, x, y, speed, dt) {
  const dx = x - enemy.x;
  const dy = y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  enemy.vx += ((dx / d) * speed - enemy.vx) * Math.min(1, dt * 4);
  enemy.vy += ((dy / d) * speed - enemy.vy) * Math.min(1, dt * 4);
  return d;
}

/** Steer `enemy` one step. `world` gives the player, the hearth and ways to fire or summon. */
export function thinkEnemy(enemy, world, dt) {
  const kind = ENEMY_KINDS[enemy.kind];
  const speed = kind.speed * enemy.speedScale * (enemy.chill > 0 ? 0.5 : 1);
  enemy.age += dt;
  enemy.timer -= dt;
  const player = world.state.player;
  switch (enemy.kind) {
    case 'darter': {
      const d = towards(enemy, HEARTH.x, HEARTH.y, speed, dt);
      const nx = -(HEARTH.y - enemy.y) / d;
      const ny = (HEARTH.x - enemy.x) / d;
      const weave = Math.sin(enemy.age * 6 + enemy.phase) * 120;
      enemy.vx += nx * weave * dt * 4;
      enemy.vy += ny * weave * dt * 4;
      break;
    }
    case 'seer': {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      const want = d > 300 ? 1 : d < 220 ? -1 : 0;
      const side = Math.sin(enemy.age * 0.8 + enemy.phase);
      enemy.vx += (((dx / d) * want - (dy / d) * side) * speed - enemy.vx) * Math.min(1, dt * 3);
      enemy.vy += (((dy / d) * want + (dx / d) * side) * speed - enemy.vy) * Math.min(1, dt * 3);
      if (enemy.timer <= 0 && enemy.age > 1.2) {
        enemy.timer = 2.4 - Math.min(0.9, world.state.wave * 0.08);
        world.fireShard(enemy.x, enemy.y, Math.atan2(dy, dx), 260);
      }
      break;
    }
    case 'matron': {
      const angle = enemy.age * 0.22 + enemy.phase;
      const enraged = enemy.hp < enemy.maxHp / 2;
      const orbit = enraged ? 230 : 290;
      towards(enemy, HEARTH.x + Math.cos(angle) * orbit, HEARTH.y + Math.sin(angle) * orbit * 0.62, speed * (enraged ? 1.6 : 1), dt);
      if (enemy.timer <= 0) {
        enemy.pattern += 1;
        if (enemy.pattern % 3 === 0) {
          for (let i = 0; i < 4 + (enraged ? 2 : 0); i += 1) world.summon('wisp', enemy.x, enemy.y);
          enemy.timer = 2.2;
        } else {
          const count = enraged ? 22 : 16;
          const twist = enemy.pattern * 0.37;
          for (let i = 0; i < count; i += 1) world.fireShard(enemy.x, enemy.y, twist + (i / count) * Math.PI * 2, enraged ? 190 : 160);
          enemy.timer = enraged ? 1.4 : 2.1;
        }
      }
      break;
    }
    default:
      towards(enemy, HEARTH.x, HEARTH.y, speed, dt);
  }
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  if (enemy.chill > 0) enemy.chill -= dt;
  if (enemy.flash > 0) enemy.flash -= dt;
}
