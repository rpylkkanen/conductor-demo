import { POOL }                  from './data.js';
import { G, newUnit, shuffle }  from './state.js';
import { render }               from './render.js';

const BOSSES = {
  5: {
    name:    'The Iron Conductor',
    warning: 'Boss incoming — opens with Drain (3 dmg to all your units).',
    roster:  ['ironwarden', 'stoneguard', 'prismcore', 'voltspawn'],
    effect(pb) { pb.forEach(u => { u.chp = Math.max(1, u.chp - 3); }); },
    effectLog: 'The Iron Conductor opens — Drain strikes all your units for 3.',
  },
  9: {
    name:    'The Void Engine',
    warning: 'Boss incoming — opens with Surge on its strongest unit.',
    roster:  ['voidmaw', 'nullspike', 'wraithclaw', 'soulbinder'],
    effect(pb, eb) {
      const s = [...eb].sort((a, b) => b.atk - a.atk)[0];
      if (s) s.atk += 2;
    },
    effectLog: 'The Void Engine opens — its strongest unit surges to +2 ATK.',
  },
};

export function isBossRound(round) { return round in BOSSES; }
export function getBoss(round)     { return BOSSES[round] ?? null; }

const BUDGET_PER_ROUND = 2.5;

export function buildGhostBoard(round) {
  const boss = getBoss(round);
  if (boss) return boss.roster.map(id => scaledUnit(POOL.find(u => u.id === id), round));

  const budget    = Math.round(round * BUDGET_PER_ROUND);
  const tierLimit = round >= 4 ? 2 : 1;
  const pool      = shuffle(POOL.filter(u => u.tier <= tierLimit));
  const roster    = [];
  let   spent     = 0;

  for (const t of pool) {
    if (roster.length >= 4) break;
    if (spent + t.cost <= budget) { roster.push(scaledUnit(t, round)); spent += t.cost; }
  }
  if (!roster.length) roster.push(scaledUnit(pool[0], round));
  return roster;
}

// Heat is factored in at build time — enemies are built at round start,
// after the previous combat's interventions have already raised G.heat.
function scaledUnit(template, round) {
  const baseAtk = Math.max(0, round - 1);
  return newUnit({
    ...template,
    atk: template.atk + baseAtk + (G.heat || 0),
    hp:  template.hp  + Math.floor(baseAtk / 2),
  });
}

export function scout() {
  if (G.gold < 1 || G.scouted || G.phase !== 'shop') return;
  G.gold--; G.scouted = true;
  const board = G.eboard;
  if (board.length) G.scoutedUnit = board[Math.floor(Math.random() * board.length)];
  render();
}

export function initRoundOpponents(round) {
  G.scouted       = false;
  G.scoutedUnit   = null;
  // Warn one round ahead; record current boss name for the board label
  G.upcomingBoss    = getBoss(round + 1)?.warning ?? null;
  G.currentBossName = getBoss(round)?.name ?? null;
  G.eboard = buildGhostBoard(round);
}

export function applyBossEffect(round) {
  const boss = getBoss(round);
  if (!boss) return null;
  boss.effect(G.cb.pb, G.cb.eb);
  return boss.effectLog;
}