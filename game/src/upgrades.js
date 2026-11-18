// The boons offered between waves: three cards drawn from those the player can still take. Each
// changes the player's stats or the hearth; picking one is the choice that shapes a run.
import { HEARTH } from './config.js';

export const UPGRADES = [
  { id: 'twin', name: 'Twin Flame', icon: '✦', text: '+1 ember per shot, fanned', max: 3, apply: (s) => { s.player.shots += 1; } },
  { id: 'kindling', name: 'Kindling', icon: '≫', text: 'Fire 22% faster', max: 4, apply: (s) => { s.player.fireDelay *= 0.78; } },
  { id: 'whiteheat', name: 'White Heat', icon: '☀', text: '+1 damage per ember', max: 3, apply: (s) => { s.player.damage += 1; } },
  { id: 'cinder', name: 'Piercing Cinder', icon: '➶', text: 'Embers pass through +1 foe', max: 3, apply: (s) => { s.player.pierce += 1; } },
  { id: 'quickstep', name: 'Quickstep', icon: '»', text: '+12% speed, dash recharges faster', max: 3, apply: (s) => { s.player.speed *= 1.12; s.player.dashCooldown *= 0.78; } },
  { id: 'warmheart', name: 'Warm Heart', icon: '♥', text: '+1 max flame, fully healed', max: 3, apply: (s) => { s.player.maxHp += 1; s.player.hp = s.player.maxHp; } },
  { id: 'hearthstone', name: 'Hearthstone', icon: '◆', text: 'Hearth regains 35 heat', max: 9, apply: (s) => { s.heat = Math.min(HEARTH.maxHeat, s.heat + 35); } },
  { id: 'wildfire', name: 'Wildfire', icon: '✺', text: 'Slain foes burst into flame', max: 3, apply: (s) => { s.player.burst += 1; } },
  { id: 'bigflare', name: 'Bonfire Flare', icon: '◎', text: 'Flare is wider and recharges faster', max: 3, apply: (s) => { s.player.flareRadius += 45; s.player.flareCooldown *= 0.75; } },
  { id: 'magnet', name: 'Ember Pull', icon: '⊕', text: 'Embers fly to you from afar', max: 2, apply: (s) => { s.player.magnet *= 2; } },
  { id: 'scorch', name: 'Scorched Path', icon: '≈', text: 'Dashing leaves burning ground', max: 2, apply: (s) => { s.player.trail += 1; } },
  { id: 'spark', name: 'Spark of Luck', icon: '✧', text: '18% chance an ember deals triple', max: 2, apply: (s) => { s.player.crit += 0.18; } },
];

/** Three different cards the player has not maxed out, drawn with `random`. */
export function drawCards(random, taken) {
  const open = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const cards = [];
  while (cards.length < 3 && open.length > 0) cards.push(open.splice(Math.floor(random.next() * open.length), 1)[0]);
  return cards;
}
