// Paints the world of Hearthlight: a snowbound clearing in the pines of Vellmoor at night, the
// hearth's warm light pushing back the dark, the ember spirit, the frost creatures, and every
// spark. The HUD and screens on top are drawn by hud.js.
import { FIELD, HEARTH, PALETTE } from './config.js';
import { ENEMY_KINDS } from './enemies.js';
import { createRandom } from './random.js';

/** Fits the 1280x720 field in the window, letterboxed, and maps pointer positions back to it. */
export function createView(canvas) {
  const view = { scale: 1, ox: 0, oy: 0 };
  view.resize = () => {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.ox = (canvas.width - FIELD.width * view.scale) / 2;
    view.oy = (canvas.height - FIELD.height * view.scale) / 2;
    view.ratio = ratio;
  };
  view.toField = (cx, cy) => ({ x: (cx * view.ratio - view.ox) / view.scale, y: (cy * view.ratio - view.oy) / view.scale });
  return view;
}

function paintBackdrop() {
  const c = document.createElement('canvas');
  c.width = FIELD.width;
  c.height = FIELD.height;
  const g = c.getContext('2d');
  const rand = createRandom(1337);
  const sky = g.createRadialGradient(HEARTH.x, HEARTH.y, 40, HEARTH.x, HEARTH.y, 820);
  sky.addColorStop(0, '#2a3354');
  sky.addColorStop(0.5, PALETTE.ground);
  sky.addColorStop(1, PALETTE.groundEdge);
  g.fillStyle = sky;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  // Snow drifts.
  for (let i = 0; i < 70; i += 1) {
    const x = rand.range(0, FIELD.width);
    const y = rand.range(0, FIELD.height);
    const r = rand.range(30, 120);
    g.fillStyle = `rgba(200,220,255,${rand.range(0.02, 0.06)})`;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Footprints of frost: small glints.
  for (let i = 0; i < 400; i += 1) {
    g.fillStyle = `rgba(220,235,255,${rand.range(0.05, 0.35)})`;
    g.fillRect(rand.range(0, FIELD.width), rand.range(0, FIELD.height), 1.5, 1.5);
  }
  // The ring of standing stones around the hearth.
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    const x = HEARTH.x + Math.cos(a) * 92;
    const y = HEARTH.y + Math.sin(a) * 60;
    g.fillStyle = '#1c2236';
    g.beginPath();
    g.ellipse(x, y + 6, 13, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4a5374';
    g.beginPath();
    g.moveTo(x - 9, y + 6); g.lineTo(x - 6, y - 16); g.lineTo(x + 5, y - 19); g.lineTo(x + 9, y + 6);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(230,240,255,0.5)';
    g.fillRect(x - 6, y - 17, 10, 3);
  }
  // Pines crowding the edge of the clearing.
  const trees = [];
  for (let i = 0; i < 90; i += 1) {
    const edge = rand.int(0, 3);
    const t = rand.next();
    const depth = rand.range(0, 70);
    const x = edge === 0 ? t * FIELD.width : edge === 1 ? FIELD.width - depth : edge === 2 ? t * FIELD.width : depth;
    const y = edge === 0 ? depth - 20 : edge === 1 ? t * FIELD.height : edge === 2 ? FIELD.height - depth + 30 : t * FIELD.height;
    trees.push({ x, y, h: rand.range(50, 110) });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const tr of trees) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(tr.x, tr.y + 4, tr.h * 0.3, tr.h * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    for (let layer = 0; layer < 3; layer += 1) {
      const w = tr.h * (0.42 - layer * 0.1);
      const top = tr.y - tr.h * (0.45 + layer * 0.25);
      const base = tr.y - tr.h * layer * 0.22;
      g.fillStyle = ['#0e1f26', '#12282f', '#173238'][layer];
      g.beginPath();
      g.moveTo(tr.x - w, base); g.lineTo(tr.x, top); g.lineTo(tr.x + w, base);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(215,232,255,0.55)';
      g.beginPath();
      g.moveTo(tr.x - w * 0.35, top + (base - top) * 0.35); g.lineTo(tr.x, top); g.lineTo(tr.x + w * 0.2, top + (base - top) * 0.3);
      g.closePath();
      g.fill();
    }
  }
  return c;
}

export function createRenderer(canvas, view) {
  const ctx = canvas.getContext('2d');
  const backdrop = paintBackdrop();
  const dark = document.createElement('canvas');
  dark.width = FIELD.width;
  dark.height = FIELD.height;
  const dctx = dark.getContext('2d');

  function glow(g, x, y, r, inner, outer = 'rgba(0,0,0,0)') {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  function drawHearth(state, t) {
    const heatShare = state.heat / HEARTH.maxHeat;
    ctx.fillStyle = '#2a2230';
    ctx.beginPath();
    ctx.ellipse(HEARTH.x, HEARTH.y + 10, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      ctx.fillStyle = '#5a5060';
      ctx.beginPath();
      ctx.arc(HEARTH.x + Math.cos(a) * 28, HEARTH.y + 8 + Math.sin(a) * 11, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    const flick = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05;
    const size = (14 + heatShare * 26) * flick;
    glow(ctx, HEARTH.x, HEARTH.y - 6, size * 3.2, `rgba(255,120,40,${0.25 + heatShare * 0.3})`);
    for (let i = 0; i < 3; i += 1) {
      const h = size * (1.6 - i * 0.35);
      const w = size * (0.7 - i * 0.15);
      ctx.fillStyle = ['#ff5a2a', '#ffa23a', '#fff0b0'][i];
      ctx.beginPath();
      ctx.moveTo(HEARTH.x - w, HEARTH.y);
      ctx.quadraticCurveTo(HEARTH.x - w * 0.8 + Math.sin(t * 9 + i) * 3, HEARTH.y - h * 0.6, HEARTH.x + Math.sin(t * 6 + i) * 4, HEARTH.y - h);
      ctx.quadraticCurveTo(HEARTH.x + w * 0.8, HEARTH.y - h * 0.5, HEARTH.x + w, HEARTH.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawEnemy(e, t) {
    const k = ENEMY_KINDS[e.kind];
    const flash = e.flash > 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, e.radius * 0.9, e.radius * 0.9, e.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, e.radius * 2.2, e.kind === 'matron' ? 'rgba(180,140,255,0.35)' : 'rgba(110,200,255,0.28)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = flash ? '#ffffff' : k.color;
    ctx.strokeStyle = flash ? '#ffffff' : PALETTE.frostDeep;
    ctx.lineWidth = 2;
    const wob = Math.sin(t * 5 + e.phase);
    switch (e.kind) {
      case 'wisp': {
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, Math.PI, 0);
        for (let i = 0; i <= 4; i += 1) ctx.lineTo(e.radius - (i * e.radius) / 2, e.radius * 0.6 + (i % 2 ? 6 : 0) + wob * 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'darter': {
        ctx.rotate(Math.atan2(e.vy, e.vx));
        ctx.beginPath();
        ctx.moveTo(e.radius * 1.8, 0); ctx.lineTo(-e.radius, e.radius); ctx.lineTo(-e.radius * 0.4, 0); ctx.lineTo(-e.radius, -e.radius);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'brute': {
        ctx.beginPath();
        for (let i = 0; i < 7; i += 1) {
          const a = (i / 7) * Math.PI * 2 + 0.3;
          const r = e.radius * (i % 2 ? 0.85 : 1.1);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'seer': {
        ctx.beginPath();
        ctx.moveTo(0, -e.radius * 1.5); ctx.lineTo(e.radius, e.radius); ctx.lineTo(-e.radius, e.radius);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = flash ? '#fff' : '#3c5cff';
        ctx.beginPath();
        ctx.arc(0, -e.radius * 0.1, 4 + Math.max(0, 1.2 - e.timer) * 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'mother': {
        for (let i = 0; i < 6; i += 1) {
          ctx.rotate(Math.PI / 3);
          ctx.fillRect(-2, 0, 4, e.radius * 1.2);
          ctx.fillRect(-6, e.radius * 0.7, 12, 3);
        }
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'matron': {
        ctx.beginPath();
        ctx.moveTo(-e.radius, e.radius);
        ctx.quadraticCurveTo(-e.radius * 1.2, -e.radius * 0.3, 0, -e.radius * 1.1);
        ctx.quadraticCurveTo(e.radius * 1.2, -e.radius * 0.3, e.radius, e.radius);
        for (let i = 0; i <= 6; i += 1) ctx.lineTo(e.radius - (i * e.radius) / 3, e.radius + (i % 2 ? 14 : 0) + wob * 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8dcff';
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.moveTo(i * 12 - 5, -e.radius * 0.9); ctx.lineTo(i * 12, -e.radius * 1.45 - Math.abs(2 - Math.abs(i)) * 8); ctx.lineTo(i * 12 + 5, -e.radius * 0.9);
          ctx.fill();
        }
        break;
      }
      default:
        break;
    }
    if (e.kind !== 'darter') {
      ctx.fillStyle = e.kind === 'matron' ? '#3a1060' : '#0a1a3a';
      const ey = e.kind === 'seer' ? e.radius * 0.45 : -e.radius * 0.15;
      const ex = e.radius * 0.32;
      ctx.beginPath();
      ctx.arc(-ex, ey, Math.max(2, e.radius * 0.14), 0, Math.PI * 2);
      ctx.arc(ex, ey, Math.max(2, e.radius * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.chill > 0) {
      ctx.strokeStyle = 'rgba(255,190,120,0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (e.hp < e.maxHp && e.kind !== 'matron') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 4);
      ctx.fillStyle = '#9fe6ff';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, (e.radius * 2 * e.hp) / e.maxHp, 4);
    }
  }

  function drawPlayer(p, t) {
    const blink = p.grace > 0 && Math.floor(t * 20) % 2 === 0;
    if (blink) return;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, p.x, p.y, 46, 'rgba(255,150,60,0.45)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(p.x, p.y);
    const s = 1 + Math.sin(t * 10) * 0.05;
    ctx.fillStyle = '#ff7a3a';
    ctx.beginPath();
    ctx.moveTo(-11 * s, 4);
    ctx.quadraticCurveTo(-12, -12, 0, -24 * s);
    ctx.quadraticCurveTo(12, -12, 11 * s, 4);
    ctx.arc(0, 4, 11 * s, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(-6, -6, 0, -14 * s);
    ctx.quadraticCurveTo(6, -6, 6, 4);
    ctx.arc(0, 4, 6, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#3a1a10';
    ctx.fillRect(-4, -1, 2.5, 4);
    ctx.fillRect(2, -1, 2.5, 4);
    // Aim marker.
    ctx.rotate(p.aim);
    ctx.fillStyle = 'rgba(255,230,180,0.85)';
    ctx.beginPath();
    ctx.moveTo(26, 0); ctx.lineTo(18, -5); ctx.lineTo(18, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawDarkness(state, t) {
    const heatShare = state.heat / HEARTH.maxHeat;
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, FIELD.width, FIELD.height);
    dctx.fillStyle = 'rgba(4,6,20,0.7)';
    dctx.fillRect(0, 0, FIELD.width, FIELD.height);
    dctx.globalCompositeOperation = 'destination-out';
    const light = (HEARTH.lightBase + state.heat * HEARTH.lightPerHeat) * (1 + Math.sin(t * 11) * 0.015);
    glow(dctx, HEARTH.x, HEARTH.y, light, `rgba(0,0,0,${0.7 + heatShare * 0.3})`);
    if (state.phase !== 'lost' || state.endReason !== 'Your flame went out') glow(dctx, state.player.x, state.player.y, 120, 'rgba(0,0,0,0.85)');
    for (const b of state.bolts) glow(dctx, b.x, b.y, 34, 'rgba(0,0,0,0.5)');
    for (const f of state.flares) glow(dctx, f.x, f.y, f.radius * 1.4, `rgba(0,0,0,${f.life / f.max})`);
    for (const fl of state.flames) glow(dctx, fl.x, fl.y, 40, 'rgba(0,0,0,0.4)');
    for (const it of state.pickups) glow(dctx, it.x, it.y, 30, 'rgba(0,0,0,0.5)');
    for (const e of state.enemies) glow(dctx, e.x, e.y, e.radius * 2.4, 'rgba(0,0,0,0.45)');
    ctx.drawImage(dark, 0, 0);
  }

  function drawSnow(t) {
    ctx.fillStyle = 'rgba(230,240,255,0.7)';
    for (let i = 0; i < 120; i += 1) {
      const sx = ((i * 97.3 + t * (14 + (i % 5) * 6)) % (FIELD.width + 40)) - 20;
      const sy = ((i * 53.9 + t * (30 + (i % 7) * 8)) % (FIELD.height + 40)) - 20;
      const r = 0.8 + (i % 3) * 0.6;
      ctx.fillRect(sx + Math.sin(t + i) * 6, sy, r, r);
    }
  }

  function drawWorld(state) {
    const t = state.time;
    ctx.drawImage(backdrop, 0, 0);
    for (const fl of state.flames) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, fl.x, fl.y, fl.radius * 1.4, `rgba(255,110,40,${0.5 * (fl.life / fl.max)})`);
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const it of state.pickups) {
      const y = it.y + Math.sin(it.bob) * 3;
      const fade = it.life < 2 ? (Math.floor(it.life * 8) % 2 ? 0.3 : 1) : 1;
      ctx.globalAlpha = fade;
      if (it.kind === 'ember') {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, it.x, y, 16, 'rgba(255,170,60,0.8)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff0c0';
        ctx.beginPath();
        ctx.moveTo(it.x, y - 6); ctx.lineTo(it.x + 4, y); ctx.lineTo(it.x, y + 6); ctx.lineTo(it.x - 4, y);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ff6b7a';
        ctx.font = `bold 22px ${'serif'}`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', it.x, y + 7);
      }
      ctx.globalAlpha = 1;
    }
    drawHearth(state, t);
    const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e, t);
    if (state.phase !== 'lost' || state.endReason !== 'Your flame went out') drawPlayer(state.player, t);
    ctx.fillStyle = '#d8f3ff';
    for (const s of state.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 14, 'rgba(120,200,255,0.6)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#e8f8ff';
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(-6, 4); ctx.lineTo(-6, -4);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bolts) {
      glow(ctx, b.x, b.y, b.crit ? 18 : 12, b.crit ? 'rgba(255,250,210,0.95)' : 'rgba(255,170,70,0.9)');
      ctx.strokeStyle = b.crit ? 'rgba(255,255,220,0.8)' : 'rgba(255,120,40,0.6)';
      ctx.lineWidth = b.crit ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
      ctx.stroke();
    }
    for (const f of state.flares) {
      const k = 1 - f.life / f.max;
      const r = f.radius * k ** 0.5;
      ctx.strokeStyle = `rgba(255,190,90,${1 - k})`;
      ctx.lineWidth = f.small ? 4 : 10 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.stroke();
      glow(ctx, f.x, f.y, r, `rgba(255,120,40,${0.35 * (1 - k)})`);
    }
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawDarkness(state, t);
    drawSnow(t);
    ctx.textAlign = 'center';
    for (const tx of state.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      ctx.font = `bold ${tx.size}px "Trebuchet MS", sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(tx.text, tx.x + 1.5, tx.y + 1.5);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
  }

  return {
    ctx,
    /** Paint the world, then call `overlay(ctx)` to draw the HUD and screens in field units. */
    draw(state, overlay) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PALETTE.night;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shakeX = state.shake ? (Math.sin(state.time * 91) * state.shake) / 2 : 0;
      const shakeY = state.shake ? (Math.cos(state.time * 77) * state.shake) / 2 : 0;
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shakeX * view.scale, view.oy + shakeY * view.scale);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();
      drawWorld(state);
      ctx.restore();
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
      overlay(ctx);
    },
  };
}
