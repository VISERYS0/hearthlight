// Every tuning number and colour of Hearthlight in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const HEARTH = { x: 640, y: 380, radius: 30, maxHeat: 100, lightBase: 110, lightPerHeat: 1.9 };

export const PLAYER = {
  radius: 12,
  speed: 250,
  maxHp: 5,
  hurtGrace: 1.1,
  fireDelay: 0.19,
  boltSpeed: 640,
  boltLife: 0.9,
  boltRadius: 5,
  damage: 1,
  dashSpeed: 820,
  dashTime: 0.16,
  dashCooldown: 1.3,
  flareCooldown: 9,
  flareRadius: 150,
  flareDamage: 3,
  magnet: 80,
};

export const COMBO = { window: 2.2, step: 8, bonus: 0.5, maxMultiplier: 4 };

export const WAVES_TO_WIN = 10;
export const INTERMISSION_MIN = 0.6;

export const PICKUP = { emberHeat: 2, emberScore: 5, emberChance: 0.4, heartChance: 0.05, life: 9 };

export const PALETTE = {
  night: '#070b18',
  ground: '#121a2e',
  groundEdge: '#0a0f1e',
  snow: '#cfe0ff',
  ember: '#ffb347',
  emberHot: '#fff1c1',
  flame: '#ff6a3d',
  frost: '#86e3ff',
  frostDeep: '#3a8fd6',
  rime: '#b9c8ff',
  boss: '#c9a6ff',
  danger: '#ff4d6d',
  text: '#f4efe6',
  muted: '#9aa6c2',
  panel: 'rgba(14,20,38,0.86)',
  panelEdge: '#ffb34766',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'hearthlight.best';
