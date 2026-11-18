// The HUD and every screen drawn over the world: the title, the in-play HUD (flames, hearth heat,
// wave and foes left, score and combo, dash and flare charge), the boon cards between waves, the
// pause screen, and the dawn (win) and cold (loss) result screens with their restart prompt.
import { FIELD, FONT, HEARTH, PALETTE, WAVES_TO_WIN } from './config.js';
import { ENEMY_KINDS } from './enemies.js';

const CARD = { w: 260, h: 250, gap: 36, y: 250 };

/** Where card `i` of `count` sits on screen, for drawing and for clicks. */
export function cardRect(i, count) {
  const total = count * CARD.w + (count - 1) * CARD.gap;
  return { x: (FIELD.width - total) / 2 + i * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

function text(ctx, value, x, y, size, color = PALETTE.text, align = 'center', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(value, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h, edge = PALETTE.panelEdge) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
}

function flameIcon(ctx, x, y, s, lit) {
  ctx.fillStyle = lit ? '#ff7a3a' : 'rgba(120,130,160,0.35)';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y + 4 * s);
  ctx.quadraticCurveTo(x - 9 * s, y - 8 * s, x, y - 17 * s);
  ctx.quadraticCurveTo(x + 9 * s, y - 8 * s, x + 8 * s, y + 4 * s);
  ctx.arc(x, y + 4 * s, 8 * s, 0, Math.PI);
  ctx.fill();
  if (lit) {
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(x, y + 3 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function meter(ctx, x, y, w, h, share, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (share > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(h, w * share), h, h / 2);
    ctx.fill();
  }
  if (label) text(ctx, label, x + w / 2, y + h - 4, h - 6, '#1a0f08', 'center');
}

function chargeDial(ctx, x, y, share, key, label) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = share >= 1 ? '#ffd27a' : '#a86a3a';
  ctx.beginPath();
  ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share);
  ctx.stroke();
  text(ctx, key, x, y + 5, 13, share >= 1 ? '#fff4d6' : PALETTE.muted);
  text(ctx, label, x, y + 36, 11, PALETTE.muted, 'center', 'normal');
}

export function drawHud(ctx, state, info) {
  const p = state.player;
  // Flames (lives).
  panel(ctx, 16, 14, 52 + p.maxHp * 26, 46);
  for (let i = 0; i < p.maxHp; i += 1) flameIcon(ctx, 40 + i * 26, 42, 1, i < p.hp);
  // Dash and flare.
  panel(ctx, 16, 66, 116, 70);
  chargeDial(ctx, 46, 92, 1 - p.dashTimer / p.dashCooldown, 'SPC', 'DASH');
  chargeDial(ctx, 102, 92, 1 - p.flareTimer / p.flareCooldown, 'RMB', 'FLARE');
  // Wave and foes left.
  panel(ctx, FIELD.width / 2 - 150, 12, 300, 52);
  text(ctx, `WAVE ${state.wave} / ${WAVES_TO_WIN}`, FIELD.width / 2, 36, 20, '#ffe2b0');
  const left = state.enemies.length + state.schedule.length;
  text(ctx, state.phase === 'choose' ? 'Wave cleared' : `${left} frost foe${left === 1 ? '' : 's'} remain`, FIELD.width / 2, 56, 13, PALETTE.muted, 'center', 'normal');
  // Score and combo.
  panel(ctx, FIELD.width - 226, 14, 210, 72);
  text(ctx, state.score.toLocaleString('en-US'), FIELD.width - 30, 48, 28, '#fff4d6', 'right');
  text(ctx, `BEST ${Math.max(info.best, state.score).toLocaleString('en-US')}`, FIELD.width - 30, 72, 12, PALETTE.muted, 'right', 'normal');
  if (state.combo >= 3) {
    const mult = Math.min(4, 1 + Math.floor(state.combo / 8) * 0.5);
    text(ctx, `${state.combo} combo  x${mult}`, FIELD.width - 30, 112, 18, mult > 1 ? '#ffd27a' : '#ffffff', 'right');
    meter(ctx, FIELD.width - 160, 120, 130, 5, state.comboTimer / 2.2, '#ffb347');
  }
  // Hearth heat.
  const heatShare = state.heat / HEARTH.maxHeat;
  panel(ctx, FIELD.width / 2 - 230, FIELD.height - 58, 460, 44, heatShare < 0.3 ? '#ff4d6dcc' : PALETTE.panelEdge);
  text(ctx, 'HEARTH', FIELD.width / 2 - 170, FIELD.height - 29, 15, '#ffe2b0');
  const heatColor = heatShare < 0.3 ? (Math.floor(state.time * 4) % 2 ? '#ff4d6d' : '#ff9a5c') : '#ff9a3a';
  meter(ctx, FIELD.width / 2 - 110, FIELD.height - 46, 320, 20, heatShare, heatColor, `${Math.ceil(state.heat)} heat`);
  // Boss bar.
  if (state.boss) {
    const b = state.boss;
    text(ctx, ENEMY_KINDS.matron.name.toUpperCase(), FIELD.width / 2, 92, 16, PALETTE.boss);
    meter(ctx, FIELD.width / 2 - 260, 100, 520, 12, b.hp / b.maxHp, b.hp < b.maxHp / 2 ? '#ff7ad9' : PALETTE.boss);
  }
  // Wave banner.
  if (state.banner > 0 && state.phase === 'fight') {
    const a = Math.min(1, state.banner, (2.6 - state.banner) * 3);
    ctx.globalAlpha = a;
    const boss = state.wave === WAVES_TO_WIN;
    text(ctx, boss ? 'THE PALE MATRON RISES' : `WAVE ${state.wave}`, FIELD.width / 2, 210, boss ? 46 : 54, boss ? PALETTE.boss : '#ffe2b0');
    text(ctx, boss ? 'Last wave. Hold until dawn.' : waveHint(state.wave), FIELD.width / 2, 246, 18, PALETTE.text, 'center', 'normal');
    ctx.globalAlpha = 1;
  }
  if (info.muted) text(ctx, 'SOUND OFF (M)', 24, FIELD.height - 24, 12, PALETTE.muted, 'left', 'normal');
}

function waveHint(wave) {
  return [
    'Frost wisps creep toward the hearth. Burn them.',
    'Sleet Darters weave fast. Lead your shots.',
    'A Rime Brute lumbers in. It hits the hearth hard.',
    'Hoarfrost Seers hurl ice at you. Dash through it.',
    'Snow Mothers burst into darters when slain.',
    'The cold deepens.',
    'Embers you gather warm the hearth.',
    'Use your Flare to clear a crowd.',
    'One more wave before the Matron comes.',
  ][wave - 1] ?? '';
}

export function drawCards(ctx, state, hover) {
  ctx.fillStyle = 'rgba(4,6,16,0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, `WAVE ${state.wave} HELD`, FIELD.width / 2, 160, 44, '#ffe2b0');
  text(ctx, 'Choose a boon for the next wave  ·  click a card or press 1, 2, 3', FIELD.width / 2, 198, 18, PALETTE.text, 'center', 'normal');
  state.cards.forEach((card, i) => {
    const r = cardRect(i, state.cards.length);
    const lift = hover === i ? -8 : 0;
    panel(ctx, r.x, r.y + lift, r.w, r.h, hover === i ? '#ffd27a' : '#ffb34788');
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + 80 + lift, 0, r.x + r.w / 2, r.y + 80 + lift, 70);
    g.addColorStop(0, 'rgba(255,150,60,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y + lift, r.w, 160);
    ctx.globalCompositeOperation = 'source-over';
    text(ctx, card.icon, r.x + r.w / 2, r.y + 100 + lift, 56, '#ffd27a');
    text(ctx, card.name, r.x + r.w / 2, r.y + 160 + lift, 22, '#fff4d6');
    text(ctx, card.text, r.x + r.w / 2, r.y + 192 + lift, 14, PALETTE.muted, 'center', 'normal');
    const owned = state.taken[card.id] ?? 0;
    text(ctx, `[${i + 1}]   ${owned}/${card.max}`, r.x + r.w / 2, r.y + 230 + lift, 13, '#c08850', 'center', 'normal');
  });
  text(ctx, `Hearth ${Math.ceil(state.heat)} heat  ·  Flames ${state.player.hp}/${state.player.maxHp}  ·  Score ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 560, 16, '#ffe2b0', 'center', 'normal');
}

export function drawTitle(ctx, state, info) {
  ctx.fillStyle = 'rgba(4,6,16,0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const pulse = 0.85 + Math.sin(state.time * 2) * 0.15;
  ctx.save();
  ctx.shadowColor = '#ff8a3a';
  ctx.shadowBlur = 30 * pulse;
  text(ctx, 'HEARTHLIGHT', FIELD.width / 2, 170, 96, '#ffd9a0');
  ctx.restore();
  text(ctx, 'THE LONG NIGHT OF VELLMOOR', FIELD.width / 2, 212, 22, '#ff9a5c');
  text(ctx, 'You are the last ember of the village hearth. Ten waves of frost are coming.', FIELD.width / 2, 252, 17, PALETTE.text, 'center', 'normal');
  text(ctx, 'Keep the fire alive until dawn.', FIELD.width / 2, 276, 17, PALETTE.text, 'center', 'normal');
  panel(ctx, FIELD.width / 2 - 250, 476, 500, 150);
  const rows = [['WASD / Arrows', 'move'], ['Mouse + hold left button', 'cast embers'], ['Space / Shift', 'dash (pass through frost)'], ['Right click / E', 'flare: burst that freezes foes'], ['P  ·  M', 'pause  ·  sound']];
  rows.forEach(([k, v], i) => {
    text(ctx, k, FIELD.width / 2 - 20, 506 + i * 25, 15, '#ffd27a', 'right');
    text(ctx, v, FIELD.width / 2 + 0, 506 + i * 25, 15, PALETTE.text, 'left', 'normal');
  });
  ctx.globalAlpha = 0.8 + Math.sin(state.time * 4) * 0.2;
  text(ctx, 'Click or press Enter to light the hearth', FIELD.width / 2, 664, 24, '#fff4d6');
  ctx.globalAlpha = 1;
  if (info.best > 0) text(ctx, `Best ${info.best.toLocaleString('en-US')}`, FIELD.width / 2, 700, 14, PALETTE.muted, 'center', 'normal');
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4,6,16,0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'PAUSED', FIELD.width / 2, FIELD.height / 2 - 10, 60, '#ffe2b0');
  text(ctx, 'Press P or Esc to return to the fire', FIELD.width / 2, FIELD.height / 2 + 30, 18, PALETTE.text, 'center', 'normal');
}

export function drawEnd(ctx, state, info) {
  const won = state.phase === 'won';
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  if (won) { g.addColorStop(0, 'rgba(255,170,110,0.55)'); g.addColorStop(1, 'rgba(40,20,60,0.55)'); }
  else { g.addColorStop(0, 'rgba(10,20,50,0.75)'); g.addColorStop(1, 'rgba(0,0,10,0.85)'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, won ? 'DAWN BREAKS OVER VELLMOOR' : state.endReason.toUpperCase(), FIELD.width / 2, 170, won ? 54 : 58, won ? '#fff0c8' : '#9fe6ff');
  text(ctx, won ? 'The hearth survived the Long Night. The village wakes warm.' : `The frost took Vellmoor on wave ${state.wave} of ${WAVES_TO_WIN}.`, FIELD.width / 2, 212, 20, PALETTE.text, 'center', 'normal');
  panel(ctx, FIELD.width / 2 - 220, 250, 440, 230);
  const newBest = state.score >= info.best && state.score > 0;
  text(ctx, state.score.toLocaleString('en-US'), FIELD.width / 2, 320, 56, '#ffd27a');
  text(ctx, newBest ? 'NEW BEST SCORE' : `Best ${info.best.toLocaleString('en-US')}`, FIELD.width / 2, 348, 15, newBest ? '#ff9a5c' : PALETTE.muted);
  const stats = [['Waves held', `${won ? WAVES_TO_WIN : state.wave - 1} / ${WAVES_TO_WIN}`], ['Frost slain', String(state.kills)], ['Best combo', String(state.bestCombo)], ['Boons taken', String(Object.values(state.taken).reduce((a, b) => a + b, 0))]];
  stats.forEach(([k, v], i) => {
    text(ctx, k, FIELD.width / 2 - 20, 386 + i * 24, 16, PALETTE.muted, 'right', 'normal');
    text(ctx, v, FIELD.width / 2 + 10, 386 + i * 24, 16, '#fff4d6', 'left');
  });
  ctx.globalAlpha = 0.8 + Math.sin(state.time * 4) * 0.2;
  text(ctx, 'Click or press Enter to rekindle and play again', FIELD.width / 2, 540, 24, '#fff4d6');
  ctx.globalAlpha = 1;
}
