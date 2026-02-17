import { POOL } from './data.js';

// ── UID counter ───────────────────────────────────────────────
let _uid = 0;

// ── UNIT FACTORY ──────────────────────────────────────────────
// Creates a live unit instance from a template in POOL.
// All mutable runtime fields are added here; POOL entries stay pure.
export function newUnit(template) {
  return {
    ...template,
    uid:    _uid++,
    chp:    template.hp,   // current HP
    maxhp:  template.hp,
    entropy: 0,
    dead:   false,
    xp:     0,
    lv:     1,
  };
}

// ── GENERAL HELPERS ───────────────────────────────────────────
export const rand    = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => [...a].sort(() => Math.random() - 0.5);
export const living  = b => b.filter(u => !u.dead && u.chp > 0);
export const tauntOf = b => living(b).find(u => u.kw === 'taunt');

// ── POLARITY HELPERS ──────────────────────────────────────────
export function polAvg(board) {
  if (!board.length) return 50;
  return board.reduce((s, u) => s + u.pol, 0) / board.length;
}

// Returns the CSS colour for a polarity value 0–100.
export function polColor(p) {
  const r = Math.round(58  + (255 - 58)  * (p / 100));
  const g = Math.round(112 - 74          * (p / 100));
  const b = Math.round(255 - (255 - 80)  * (p / 100));
  return `rgb(${r},${g},${b})`;
}

export function polLabel(p) {
  return p > 65 ? 'Chaos' : p < 35 ? 'Order' : 'Flux';
}

// Passive stat bonus applied to the whole board before combat.
// Intended to be replaced by rule-change system in a future pass.
export function polBonus(board) {
  if (!board.length) return { atk: 0, hp: 0, note: null };
  const avg = polAvg(board);
  if (avg >= 40 && avg <= 60) return { atk: 2, hp: 0, note: '+2 ATK' };
  if (avg  < 30 || avg  > 70) return { atk: 0, hp: 2, note: '+2 HP'  };
  return { atk: 0, hp: 0, note: null };
}

// ── GLOBAL STATE ──────────────────────────────────────────────
// Single source of truth for the running game.
// Mutated directly by shop.js, combat.js, conductor.js.
// render.js reads it; never writes to it.
export const G = {
  phase:      'shop',   // 'shop' | 'combat' | 'result'
  round:      1,
  hp:         30,
  gold:       3,
  tavernTier: 1,
  maxBoard:   4,

  pboard: [],           // player's live units
  eboard: [],           // current enemy roster

  shop:   [],           // units currently for sale
  chand:  [],           // conductor cards drawn for this fight
  cused:  false,        // whether the intervention has been spent
  csel:   null,         // currently selected conductor card object

  pboardSnapshot: [],   // copy taken before combat (restored on draw)
  levelQueue:     [],   // units pending a level-up choice

  // Combat sub-state — only meaningful during phase === 'combat'
  cb: {
    pb:         [],     // player combat copies (mutated during fight)
    eb:         [],     // enemy combat copies
    log:        '',
    tag:        '',
    attacker:   null,
    target:     null,
    pturn:      false,
    tickIdx:    0,
    over:       false,
    result:     null,   // 'win' | 'loss' | 'draw'
    flashUids:  [],
    window:     false,  // true during the intervention pause
  },
};

// ── STATE HELPERS ─────────────────────────────────────────────
// Convenience used by multiple modules.

// Shallow-clone a live unit (preserves all runtime fields).
export const cloneUnit = u => ({ ...u });

// Total ATK of all living enemies — shown as threat in the topbar.
export function enemyThreat() {
  return G.eboard.reduce((s, u) => s + u.atk, 0);
}

// Gold ramp: base 3 + 1 per round, capped at +7.
export function goldForRound(round) {
  return 3 + Math.min(round - 1, 7);
}

// Reset only the combat sub-state, leaving board and economy intact.
export function resetCombatState() {
  Object.assign(G.cb, {
    pb: [], eb: [], log: '', tag: '',
    attacker: null, target: null, pturn: false,
    tickIdx: 0, over: false, result: null,
    flashUids: [], window: false,
  });
  G._fluxRedirectUsed = false;
}

// Initialise the two starter units (called once on page load).
export function initStarterBoard() {
  G.pboard.push(newUnit(POOL.find(u => u.id === 'rifter')));
  G.pboard.push(newUnit(POOL.find(u => u.id === 'tendril')));
}