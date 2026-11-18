// Sparks, frost shards, smoke and floating score text: short-lived bits of feedback that the world
// spawns on every hit, kill and pickup, and that move on their own until they fade.

const MAX_PARTICLES = 900;

export function spawnBurst(state, x, y, color, count, speed, life = 0.6, size = 3) {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i += 1) {
    const angle = state.random.next() * Math.PI * 2;
    const v = speed * (0.3 + state.random.next() * 0.7);
    state.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life, max: life, color, size: size * (0.5 + state.random.next()), drag: 2.5, rise: 0 });
  }
}

export function spawnEmbers(state, x, y, count) {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i += 1) {
    const life = 0.5 + state.random.next() * 0.6;
    state.particles.push({ x: x + (state.random.next() - 0.5) * 10, y, vx: (state.random.next() - 0.5) * 30, vy: -20 - state.random.next() * 40, life, max: life, color: state.random.chance(0.5) ? '#ffb347' : '#ff6a3d', size: 2 + state.random.next() * 2, drag: 0.5, rise: -30 });
  }
}

export function spawnText(state, x, y, text, color, size = 18) {
  state.texts.push({ x, y, text, color, size, life: 1, max: 1 });
}

export function stepParticles(state, dt) {
  const list = state.particles;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    const drag = Math.exp(-p.drag * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + p.rise * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    list[write++] = p;
  }
  list.length = write;
  state.texts = state.texts.filter((t) => { t.life -= dt; t.y -= 34 * dt; return t.life > 0; });
}
