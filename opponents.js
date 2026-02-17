import { POOL }                  from './data.js';
import { G, newUnit, shuffle }  from './state.js';
import { render }               from './render.js';

// ── BOSS DEFINITIONS ──────────────────────────────────────────
// Each boss has a hand-authored unit roster and a pre-combat effect
// telegraphed one round in advance via G.upcomingBoss.
// The effect fn receives (G.cb.pb) and mutates it before tick() starts.
const BOSSES = {
  5: {
    name:    'The Iron Conductor',
    warning: 'Boss incoming — opens with Drain (3 dmg to all your units).',
    roster:  ['ironwarden', 'stoneguard', 'prismcore', 'voltspawn'],
    effect(pb) {
      pb.forEach(u => {
        u.chp = Math.max(1, u.chp - 3);
      });
    },
    effectLog: 'The Iron Conductor opens — Drain strikes all your units for 3.',
  },
  9: {
    name:    'The Void Engine',
    warning: 'Boss incoming — opens with Surge on its strongest unit.',
    roster:  ['voidmaw', 'nullspike', 'wraithclaw', 'soulbinder'],
    effect(pb, eb) {
      // Surge the highest-ATK enemy unit
      const strongest = [...eb].sort((a, b) => b.atk - a.atk)[0];
      if (strongest) strongest.atk += 2;
    },
    effectLog: 'The Void Engine opens — its strongest unit surges to +2 ATK.',
  },
};

// ── BOSS CHECK ────────────────────────────────────────────────
export function isBossRound(round) {
  return round in BOSSES;
}

export function getBoss(round) {
  return BOSSES[round] ?? null;
}

// ── GHOST BOARD GENERATOR ─────────────────────────────────────
// Builds a procedural enemy board weighted by a gold budget.
// Rounds 5–8 may also draw from the player's own past board snapshots,
// creating "haunted" opponents from earlier decisions.
// For now only the procedural path is implemented; snapshot ghosts
// are flagged for the next feature pass.

const BUDGET_PER_ROUND = 2.5;  // gold budget scales with round

export function buildGhostBoard(round) {
  // Boss rounds use hand-authored rosters
  const boss = getBoss(round);
  if (boss) {
    return boss.roster.map(id => scaledUnit(POOL.find(u => u.id === id), round));
  }

  const budget    = Math.round(round * BUDGET_PER_ROUND);
  const tierLimit = round >= 4 ? 2 : 1;
  const pool      = shuffle(POOL.filter(u => u.tier <= tierLimit));
  const roster    = [];
  let   spent     = 0;

  for (const template of pool) {
    if (roster.length >= 4) break;
    if (spent + template.cost <= budget) {
      roster.push(scaledUnit(template, round));
      spent += template.cost;
    }
  }

  // Guarantee at least one unit if budget was too tight
  if (!roster.length) {
    roster.push(scaledUnit(pool[0], round));
  }

  return roster;
}

// Apply per-round ATK/HP scaling on top of base stats.
function scaledUnit(template, round) {
  const atkBon = Math.max(0, round - 1);
  const hpBon  = Math.floor(atkBon / 2);
  return newUnit({
    ...template,
    atk: template.atk + atkBon,
    hp:  template.hp  + hpBon,
  });
}

// ── SCOUTING ──────────────────────────────────────────────────
// Costs 1 gold. Reveals one random unit slot from the upcoming
// enemy board and stores it in G.scoutedUnit for render.js to display.
// Scouting is limited to once per shop phase (G.scouted flag).

export function scout() {
  if (G.gold < 1 || G.scouted || G.phase !== 'shop') return;
  G.gold   -= 1;
  G.scouted = true;

  const board = G.eboard;
  if (!board.length) return;

  const revealed = board[Math.floor(Math.random() * board.length)];
  G.scoutedUnit  = revealed;

  render();
}

// ── ROUND INIT HOOK ───────────────────────────────────────────
// Called by shop.js:startRound() to reset scouting state
// and wire up the enemy roster for the new round.
export function initRoundOpponents(round) {
  G.scouted     = false;
  G.scoutedUnit = null;

  // Warn player one round before a boss arrives
  const nextBoss = getBoss(round + 1);
  G.upcomingBoss = nextBoss ? nextBoss.warning : null;

  G.eboard = buildGhostBoard(round);
}

// ── BOSS PRE-COMBAT EFFECT ────────────────────────────────────
// Called by combat.js:startCombat() after combat copies are built,
// before the first tick. Mutates G.cb.pb / G.cb.eb in place.
export function applyBossEffect(round) {
  const boss = getBoss(round);
  if (!boss) return null;
  boss.effect(G.cb.pb, G.cb.eb);
  return boss.effectLog;
}