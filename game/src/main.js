// Boot and the one loop of Hearthlight: input is read every frame, the world advances in fixed
// 1/60 s steps, sounds and screen shake answer each event, and the renderer paints the result.
// Screens: title (with an attract-mode demo behind it), play, paused, boons and the end screen.
//
// ?seed=N fixes the night. ?shot=title|play|boons|end stages that scene for a screenshot and sets
// window.__shotReady once it is painted.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_CHOOSE, PHASE_FIGHT } from './world.js';
import { createInput } from './input.js';
import { createRenderer, createView } from './render.js';
import { cardRect, drawCards, drawEnd, drawHud, drawPause, drawTitle } from './hud.js';
import { createAudio } from './audio.js';
import { autopilotControls } from './autopilot.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const view = createView(canvas);
view.resize();
window.addEventListener('resize', view.resize);
const renderer = createRenderer(canvas, view);
const world = createWorld(createRandom(seed));
const audio = createAudio();

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage off: best lasts this visit */ }
}

function paintScreen(screen, info, hover = -1) {
  const state = world.state;
  renderer.draw(state, (ctx) => {
    if (screen === 'title') drawTitle(ctx, state, info);
    else if (state.phase === PHASE_CHOOSE) { drawHud(ctx, state, info); drawCards(ctx, state, hover); }
    else if (state.phase === PHASE_FIGHT) { drawHud(ctx, state, info); if (screen === 'paused') drawPause(ctx); }
    else drawEnd(ctx, state, info);
  });
}

function runShot(name) {
  const screen = stageShot(name, world);
  const info = { best: name === 'end' ? Math.max(world.state.score, 48210) : 48210, muted: false };
  let painted = 0;
  function paint() {
    paintScreen(screen, info, screen === 'choose' ? 1 : -1);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, view);
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let ended = false;

  const announce = (message) => { status.textContent = message; };

  function startGame() {
    world.reset();
    screen = 'play';
    ended = false;
    audio.setIntensity(1);
    announce('Wave 1. Keep the hearth burning.');
  }

  function hoveredCard() {
    const s = world.state;
    if (s.phase !== PHASE_CHOOSE) return -1;
    for (let i = 0; i < s.cards.length; i += 1) {
      const r = cardRect(i, s.cards.length);
      if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) return i;
    }
    return -1;
  }

  function react(events) {
    for (const name of events) {
      audio.play(name);
      if (name === 'wave' || name === 'boss') { audio.setIntensity(world.state.wave); announce(`Wave ${world.state.wave}.`); }
      if (name === 'hurt') announce(`Hit. ${world.state.player.hp} flames left.`);
    }
  }

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const presses = input.takePresses();
    if (presses.size > 0) audio.unlock();
    if (presses.has('mute')) audio.toggleMute();
    const s = world.state;

    if (screen === 'title') {
      if (presses.has('confirm') || presses.has('click')) { audio.play('click'); startGame(); }
    } else if (screen === 'paused') {
      if (presses.has('pause')) screen = 'play';
    } else if (s.phase === PHASE_FIGHT) {
      if (presses.has('pause')) screen = 'paused';
    } else if (s.phase === PHASE_CHOOSE) {
      const hover = hoveredCard();
      const pick = presses.has('pick1') ? 0 : presses.has('pick2') ? 1 : presses.has('pick3') ? 2 : presses.has('click') ? hover : -1;
      if (pick >= 0 && world.choose(pick)) react(world.state.events);
    } else if (ended && (presses.has('confirm') || presses.has('click')) && s.time > 0) {
      audio.play('click');
      startGame();
    }

    if (screen !== 'paused') {
      accumulator += dt;
      const move = input.move();
      let controls = {
        moveX: move.x, moveY: move.y, aimX: input.mouse.x, aimY: input.mouse.y,
        fire: input.mouse.down, dash: presses.has('dash'), flare: presses.has('flare'),
      };
      while (accumulator >= STEP) {
        if (screen === 'title') {
          controls = autopilotControls(world.state);
          if (world.state.phase === PHASE_CHOOSE) world.state.chooseTime < 1 ? null : world.choose(0);
          else if (world.state.phase !== PHASE_FIGHT) world.reset();
          world.step(STEP, controls);
        } else {
          react(world.step(STEP, controls));
          controls = { ...controls, dash: false, flare: false };
        }
        accumulator -= STEP;
      }
    }
    if (screen === 'play' && !ended && (world.state.phase === 'won' || world.state.phase === 'lost')) {
      ended = true;
      announce(world.state.phase === 'won' ? 'Dawn breaks. You won.' : `${world.state.endReason}. Click to play again.`);
      if (world.state.score > best) { best = world.state.score; saveBest(best); }
    }
    audio.update(dt);
    paintScreen(screen, { best, muted: audio.muted }, hoveredCard());
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
