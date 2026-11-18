// The rules of Hearthlight: the hearth, the ember spirit the player steers, the frost creatures,
// bolts, shards and pickups, the waves and the boons between them. `step` advances everything by
// one fixed tick from the player's controls and records what happened in `state.events`.
import { COMBO, FIELD, HEARTH, INTERMISSION_MIN, PICKUP, PLAYER, WAVES_TO_WIN } from './config.js';
import { ENEMY_KINDS, thinkEnemy } from './enemies.js';
import { waveSchedule, waveSpeedScale } from './waves.js';
import { drawCards, UPGRADES } from './upgrades.js';
import { spawnBurst, spawnEmbers, spawnText, stepParticles } from './particles.js';

export const PHASE_FIGHT = 'fight';
export const PHASE_CHOOSE = 'choose';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

function freshPlayer() {
  return {
    x: HEARTH.x, y: HEARTH.y + 90, vx: 0, vy: 0, aim: -Math.PI / 2,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, speed: PLAYER.speed, grace: 0,
    fireDelay: PLAYER.fireDelay, fireTimer: 0, shots: 1, damage: PLAYER.damage, pierce: 0, crit: 0, burst: 0, trail: 0,
    dashCooldown: PLAYER.dashCooldown, dashTimer: 0, dashLeft: 0, dashX: 0, dashY: 0,
    flareCooldown: PLAYER.flareCooldown, flareTimer: 2, flareRadius: PLAYER.flareRadius, magnet: PLAYER.magnet,
  };
}

export function createWorld(random) {
  const state = { random };

  function reset() {
    Object.assign(state, {
      time: 0, phase: PHASE_FIGHT, wave: 0, waveTime: 0, schedule: [], heat: HEARTH.maxHeat,
      player: freshPlayer(), enemies: [], bolts: [], shards: [], pickups: [], flames: [], flares: [], particles: [], texts: [],
      score: 0, kills: 0, combo: 0, comboTimer: 0, bestCombo: 0, shake: 0, banner: 0, cards: [], taken: {}, chooseTime: 0,
      events: [], boss: null, endReason: '',
    });
    startWave(1);
  }

  function startWave(number) {
    state.wave = number;
    state.waveTime = 0;
    state.schedule = waveSchedule(number);
    state.phase = PHASE_FIGHT;
    state.banner = 2.6;
    state.events.push(number === WAVES_TO_WIN ? 'boss' : 'wave');
  }

  function multiplier() {
    return Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.step) * COMBO.bonus);
  }

  function spawnEnemy(kind, x, y) {
    const k = ENEMY_KINDS[kind];
    const hp = kind === 'matron' ? k.hp : Math.round(k.hp * (1 + (state.wave - 1) * 0.11));
    const enemy = { kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, age: 0, timer: 1.5, phase: random.next() * 6.28, flash: 0, chill: 0, pattern: 0, speedScale: waveSpeedScale(state.wave), radius: k.radius };
    state.enemies.push(enemy);
    if (kind === 'matron') state.boss = enemy;
    return enemy;
  }

  function spawnAtEdge(kind) {
    const angle = random.next() * Math.PI * 2;
    const x = HEARTH.x + Math.cos(angle) * (FIELD.width * 0.58);
    const y = HEARTH.y + Math.sin(angle) * (FIELD.height * 0.64);
    spawnEnemy(kind, x, y);
  }

  const api = {
    state,
    reset,
    fireShard(x, y, angle, speed) {
      state.shards.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 6 });
    },
    summon(kind, x, y) {
      const e = spawnEnemy(kind, x + (random.next() - 0.5) * 40, y + (random.next() - 0.5) * 40);
      e.vx = (random.next() - 0.5) * 200;
      e.vy = (random.next() - 0.5) * 200;
    },
    /** Take card `index` (0-2) while choosing; the next wave starts. */
    choose(index) {
      if (state.phase !== PHASE_CHOOSE || state.chooseTime < INTERMISSION_MIN) return false;
      const card = state.cards[index];
      if (!card) return false;
      card.apply(state);
      state.taken[card.id] = (state.taken[card.id] ?? 0) + 1;
      state.events.push('upgrade');
      spawnText(state, state.player.x, state.player.y - 30, card.name, '#ffd27a', 22);
      startWave(state.wave + 1);
      return true;
    },
    step,
  };

  function hurtPlayer(amount) {
    const p = state.player;
    if (p.grace > 0 || p.dashLeft > 0 || state.phase !== PHASE_FIGHT) return;
    p.hp -= amount;
    p.grace = PLAYER.hurtGrace;
    state.shake = Math.max(state.shake, 10);
    state.combo = 0;
    state.events.push('hurt');
    spawnBurst(state, p.x, p.y, '#ff8a5c', 24, 260, 0.7, 3);
    if (p.hp <= 0) lose('Your flame went out');
  }

  function lose(reason) {
    state.phase = PHASE_LOST;
    state.endReason = reason;
    state.events.push('lose');
    spawnBurst(state, state.player.x, state.player.y, '#ffb347', 60, 340, 1.2, 4);
  }

  function killEnemy(enemy, index) {
    const k = ENEMY_KINDS[enemy.kind];
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const points = Math.round(k.points * multiplier());
    state.score += points;
    spawnText(state, enemy.x, enemy.y - enemy.radius, `+${points}`, multiplier() > 1 ? '#ffd27a' : '#ffffff', enemy.kind === 'matron' ? 34 : 16);
    spawnBurst(state, enemy.x, enemy.y, k.color, enemy.kind === 'matron' ? 160 : 14 + enemy.radius, 180 + enemy.radius * 6, 0.8, 3);
    state.events.push(enemy.radius > 20 ? 'shatter' : 'kill');
    if (enemy.kind === 'mother') for (let i = 0; i < 3; i += 1) api.summon('darter', enemy.x, enemy.y);
    if (enemy.kind === 'matron') { state.boss = null; state.shake = 24; state.shards.length = 0; }
    if (state.player.burst > 0) {
      state.flares.push({ x: enemy.x, y: enemy.y, radius: 34 + state.player.burst * 16, life: 0.3, max: 0.3, damage: state.player.burst, hit: new Set([enemy]), small: true });
    }
    const drops = enemy.kind === 'brute' ? 3 : enemy.kind === 'matron' ? 12 : random.chance(PICKUP.emberChance) ? 1 : 0;
    for (let i = 0; i < drops; i += 1) {
      state.pickups.push({ kind: 'ember', x: enemy.x + (random.next() - 0.5) * 30, y: enemy.y + (random.next() - 0.5) * 30, life: PICKUP.life, bob: random.next() * 6 });
    }
    if (random.chance(PICKUP.heartChance)) state.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, life: PICKUP.life, bob: 0 });
  }

  function damageEnemy(enemy, amount, fromX, fromY, push) {
    enemy.hp -= amount;
    enemy.flash = 0.08;
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    const weight = enemy.kind === 'matron' ? 0.05 : enemy.kind === 'brute' ? 0.3 : 1;
    enemy.vx += (dx / d) * push * weight;
    enemy.vy += (dy / d) * push * weight;
    if (enemy.hp <= 0) {
      const index = state.enemies.indexOf(enemy);
      if (index >= 0) killEnemy(enemy, index);
      return true;
    }
    state.events.push('hit');
    return false;
  }

  function stepPlayer(dt, controls) {
    const p = state.player;
    p.grace = Math.max(0, p.grace - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.flareTimer = Math.max(0, p.flareTimer - dt);
    p.fireTimer = Math.max(0, p.fireTimer - dt);
    p.aim = Math.atan2(controls.aimY - p.y, controls.aimX - p.x);
    let mx = controls.moveX;
    let my = controls.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (controls.dash && p.dashTimer <= 0 && state.phase === PHASE_FIGHT) {
      const dirX = len > 0 ? mx : Math.cos(p.aim);
      const dirY = len > 0 ? my : Math.sin(p.aim);
      p.dashX = dirX; p.dashY = dirY;
      p.dashLeft = PLAYER.dashTime;
      p.dashTimer = p.dashCooldown;
      state.events.push('dash');
    }
    if (p.dashLeft > 0) {
      p.dashLeft -= dt;
      p.vx = p.dashX * PLAYER.dashSpeed;
      p.vy = p.dashY * PLAYER.dashSpeed;
      spawnBurst(state, p.x, p.y, '#ffcf8a', 3, 60, 0.35, 3);
      if (p.trail > 0) state.flames.push({ x: p.x, y: p.y, life: 1.6 + p.trail * 0.8, max: 1.6 + p.trail * 0.8, radius: 18, tick: 0 });
    } else {
      p.vx += (mx * p.speed - p.vx) * Math.min(1, dt * 14);
      p.vy += (my * p.speed - p.vy) * Math.min(1, dt * 14);
    }
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - 12, p.x + p.vx * dt));
    p.y = Math.max(12, Math.min(FIELD.height - 12, p.y + p.vy * dt));
    if (state.time % 0.05 < dt) spawnEmbers(state, p.x, p.y - 6, 1);

    if (controls.fire && p.fireTimer <= 0 && state.phase === PHASE_FIGHT) {
      p.fireTimer = p.fireDelay;
      const spread = 0.13;
      for (let i = 0; i < p.shots; i += 1) {
        const a = p.aim + (i - (p.shots - 1) / 2) * spread;
        const crit = random.chance(p.crit);
        state.bolts.push({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * PLAYER.boltSpeed, vy: Math.sin(a) * PLAYER.boltSpeed, life: PLAYER.boltLife, damage: p.damage * (crit ? 3 : 1), pierce: p.pierce, hit: new Set(), crit });
      }
      state.events.push('shoot');
    }
    if (controls.flare && p.flareTimer <= 0 && state.phase === PHASE_FIGHT) {
      p.flareTimer = p.flareCooldown;
      state.flares.push({ x: p.x, y: p.y, radius: p.flareRadius, life: 0.45, max: 0.45, damage: PLAYER.flareDamage + p.damage - 1, hit: new Set(), small: false });
      state.shake = Math.max(state.shake, 8);
      state.shards = state.shards.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) > p.flareRadius);
      state.events.push('flare');
    }
  }

  function stepBolts(dt) {
    state.bolts = state.bolts.filter((b) => {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) return false;
      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const e = state.enemies[i];
        if (b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + PLAYER.boltRadius) {
          b.hit.add(e);
          spawnBurst(state, b.x, b.y, b.crit ? '#fff1c1' : '#ffb347', b.crit ? 10 : 5, 160, 0.3, 2);
          if (b.crit) spawnText(state, e.x, e.y - e.radius - 8, 'CRIT', '#fff1c1', 14);
          damageEnemy(e, b.damage, b.x - b.vx, b.y - b.vy, 70);
          if (b.pierce <= 0) return false;
          b.pierce -= 1;
        }
      }
      return true;
    });
  }

  function stepAreaFire(dt) {
    state.flares = state.flares.filter((f) => {
      f.life -= dt;
      const reach = f.radius * (1 - f.life / f.max) ** 0.5;
      for (const e of [...state.enemies]) {
        if (f.hit.has(e)) continue;
        if (Math.hypot(e.x - f.x, e.y - f.y) < reach + e.radius) {
          f.hit.add(e);
          if (!f.small) e.chill = 2.5;
          damageEnemy(e, f.damage, f.x, f.y, f.small ? 120 : 420);
        }
      }
      return f.life > 0;
    });
    state.flames = state.flames.filter((fl) => {
      fl.life -= dt;
      fl.tick -= dt;
      if (fl.tick <= 0) {
        fl.tick = 0.3;
        for (const e of [...state.enemies]) if (Math.hypot(e.x - fl.x, e.y - fl.y) < fl.radius + e.radius) damageEnemy(e, 1, fl.x, fl.y, 10);
      }
      if (random.chance(0.15)) spawnEmbers(state, fl.x, fl.y, 1);
      return fl.life > 0;
    });
  }

  function stepEnemies(dt) {
    const p = state.player;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      thinkEnemy(e, api, dt);
      const k = ENEMY_KINDS[e.kind];
      if (Math.hypot(e.x - HEARTH.x, e.y - HEARTH.y) < e.radius + HEARTH.radius) {
        state.heat -= k.hearthDamage;
        state.shake = Math.max(state.shake, 6 + k.hearthDamage / 3);
        state.events.push('hearthHit');
        spawnBurst(state, e.x, e.y, k.color, 30, 260, 0.7, 3);
        spawnText(state, HEARTH.x, HEARTH.y - 50, `-${k.hearthDamage} heat`, '#86e3ff', 18);
        if (e.kind === 'matron') { e.vx = (e.x - HEARTH.x) * 3; e.vy = (e.y - HEARTH.y) * 3; }
        else { state.enemies.splice(i, 1); if (e === state.boss) state.boss = null; }
        if (state.heat <= 0) { state.heat = 0; lose('The hearth went cold'); return; }
        continue;
      }
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 10) {
        if (p.dashLeft > 0) { damageEnemy(e, 1, p.x, p.y, 200); continue; }
        if (p.grace <= 0) {
          hurtPlayer(1);
          if (e.kind !== 'matron' && e.kind !== 'brute') { const idx = state.enemies.indexOf(e); if (idx >= 0) state.enemies.splice(idx, 1); spawnBurst(state, e.x, e.y, k.color, 16, 200); }
          if (state.phase !== PHASE_FIGHT) return;
        }
      }
    }
  }

  function stepShards(dt) {
    const p = state.player;
    state.shards = state.shards.filter((s) => {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.life <= 0 || s.x < -30 || s.x > FIELD.width + 30 || s.y < -30 || s.y > FIELD.height + 30) return false;
      if (Math.hypot(s.x - p.x, s.y - p.y) < 14 && p.grace <= 0 && p.dashLeft <= 0) { hurtPlayer(1); return false; }
      if (Math.hypot(s.x - HEARTH.x, s.y - HEARTH.y) < HEARTH.radius) { spawnBurst(state, s.x, s.y, '#86e3ff', 6, 120, 0.3, 2); return false; }
      return true;
    });
  }

  function stepPickups(dt) {
    const p = state.player;
    state.pickups = state.pickups.filter((it) => {
      it.life -= dt;
      it.bob += dt * 4;
      const d = Math.hypot(p.x - it.x, p.y - it.y);
      if (d < p.magnet) {
        const pull = 520 * (1 - d / p.magnet) + 140;
        it.x += ((p.x - it.x) / (d || 1)) * pull * dt;
        it.y += ((p.y - it.y) / (d || 1)) * pull * dt;
      }
      if (d < 18) {
        if (it.kind === 'ember') {
          state.heat = Math.min(HEARTH.maxHeat, state.heat + PICKUP.emberHeat);
          state.score += PICKUP.emberScore;
          state.events.push('pickup');
        } else {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          spawnText(state, p.x, p.y - 24, '+1 flame', '#ff9a8a', 16);
          state.events.push('heart');
        }
        return false;
      }
      return it.life > 0;
    });
  }

  function step(dt, controls) {
    state.events.length = 0;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 30);
    state.banner = Math.max(0, state.banner - dt);
    if (random.chance(dt * 12)) spawnEmbers(state, HEARTH.x + (random.next() - 0.5) * 30, HEARTH.y - 10, 1);
    stepParticles(state, dt);
    if (state.phase === PHASE_CHOOSE) {
      state.chooseTime += dt;
      stepPlayer(dt, { ...controls, fire: false, dash: false, flare: false });
      stepPickups(dt);
      return state.events;
    }
    if (state.phase !== PHASE_FIGHT) return state.events;
    state.waveTime += dt;
    while (state.schedule.length > 0 && state.schedule[0].at <= state.waveTime) spawnAtEdge(state.schedule.shift().kind);
    if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }
    stepPlayer(dt, controls);
    stepBolts(dt);
    stepAreaFire(dt);
    stepEnemies(dt);
    if (state.phase !== PHASE_FIGHT) return state.events;
    stepShards(dt);
    stepPickups(dt);
    if (state.phase === PHASE_FIGHT && state.schedule.length === 0 && state.enemies.length === 0) finishWave();
    return state.events;
  }

  function finishWave() {
    const bonus = Math.round(state.heat) * 5 * state.wave;
    state.score += bonus;
    spawnText(state, HEARTH.x, HEARTH.y - 70, `Hearth bonus +${bonus}`, '#ffd27a', 24);
    state.shards.length = 0;
    if (state.wave >= WAVES_TO_WIN) {
      state.phase = PHASE_WON;
      state.score += state.player.hp * 500;
      state.events.push('win');
      return;
    }
    state.heat = Math.min(HEARTH.maxHeat, state.heat + 15);
    spawnText(state, HEARTH.x, HEARTH.y - 96, 'The hearth recovers +15 heat', '#ffb347', 18);
    state.phase = PHASE_CHOOSE;
    state.chooseTime = 0;
    state.cards = drawCards(random, state.taken);
  }

  reset();
  return api;
}

export { UPGRADES };
