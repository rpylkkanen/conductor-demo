import { POOL } from './data.js';
// data.js is imported here only for POOL — TUTORIAL lives in data.js for tutorial.js to read.

let _uid = 0;

export function newUnit(template) {
  return { ...template, uid: _uid++, chp: template.hp, maxhp: template.hp,
           entropy: 0, dead: false, xp: 0, lv: 1 };
}

export const rand    = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => [...a].sort(() => Math.random() - 0.5);
export const living  = b => b.filter(u => !u.dead && u.chp > 0);
export const tauntOf = b => living(b).find(u => u.kw === 'taunt');

export function polAvg(board) {
  if (!board.length) return 50;
  return board.reduce((s, u) => s + u.pol, 0) / board.length;
}
export function polColor(p) {
  const r = Math.round(58  + (255 - 58)  * (p / 100));
  const g = Math.round(112 - 74          * (p / 100));
  const b = Math.round(255 - (255 - 80)  * (p / 100));
  return `rgb(${r},${g},${b})`;
}
export function polLabel(p) { return p > 65 ? 'Chaos' : p < 35 ? 'Order' : 'Flux'; }
export function polBonus(board) {
  if (!board.length) return { atk: 0, hp: 0, note: null };
  const avg = polAvg(board);
  if (avg >= 40 && avg <= 60) return { atk: 2, hp: 0, note: '+2 ATK' };
  if (avg  < 30 || avg  > 70) return { atk: 0, hp: 2, note: '+2 HP'  };
  return { atk: 0, hp: 0, note: null };
}

// ── POLARITY RULE ─────────────────────────────────────────────
// Moved here from combat.js so intervention.js and conductor.js
// can import it without creating a circular dependency.
export function activeRule(board) {
  const avg = polAvg(board);
  if (avg < 35) return 'order';
  if (avg > 65) return 'chaos';
  return 'flux';
}

// ── FRESH COMBAT STATE ────────────────────────────────────────
const freshCb = () => ({
  pb: [], eb: [], log: '', tag: '',
  attacker: null, target: null, pturn: false,
  tickIdx: 0, over: false, result: null,
  flashUids: [], window: false,
  holdUsed: false, interventionLocked: false,
});

// ── GLOBAL STATE ──────────────────────────────────────────────
export const G = {
  phase: 'shop', round: 1, hp: 30, gold: 3, tavernTier: 1, maxBoard: 4,
  pboard: [], eboard: [], shop: [],
  armedCard: null, cardOptions: [], chand: [], cused: false, csel: null,
  pendingGold: 0, insight: 0, heat: 0,
  reorderSel: null, currentBossName: null,
  pboardSnapshot: [], levelQueue: [],
  upcomingBoss: null, scouted: false, scoutedUnit: null,
  _fluxRedirectUsed: false,
  cb: freshCb(),
};

export const cloneUnit    = u => ({ ...u });
export const enemyThreat  = () => G.eboard.reduce((s, u) => s + u.atk, 0);
export const goldForRound = r  => 3 + Math.min(r - 1, 7);

export function resetCombatState() {
  Object.assign(G.cb, freshCb());
  G._fluxRedirectUsed = false;
}

export function initStarterBoard() {
  G.pboard.push(newUnit(POOL.find(u => u.id === 'rifter')));
  G.pboard.push(newUnit(POOL.find(u => u.id === 'tendril')));
}

// ── FULL RESET (restart without page reload) ──────────────────
export function resetGame() {
  _uid = 0;
  Object.assign(G, {
    phase: 'shop', round: 1, hp: 30, gold: 3, tavernTier: 1, maxBoard: 4,
    pboard: [], eboard: [], shop: [],
    armedCard: null, cardOptions: [], chand: [], cused: false, csel: null,
    pendingGold: 0, insight: 0, heat: 0,
    reorderSel: null, currentBossName: null,
    pboardSnapshot: [], levelQueue: [],
    upcomingBoss: null, scouted: false, scoutedUnit: null,
    _fluxRedirectUsed: false,
    cb: freshCb(),
  });
  initStarterBoard();
}