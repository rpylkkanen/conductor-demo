import { POOL }                              from './data.js';
import { G, newUnit, shuffle, goldForRound } from './state.js';
import { registerStartRound }               from './flow.js';
import { initRoundOpponents }               from './opponents.js';
import { render }                           from './render.js';
import { ensureCardOptions }                from './intervention.js';

export function buildShop() {
  const pool = POOL.filter(u => u.tier <= G.tavernTier);
  const size = G.tavernTier === 1 ? 4 : 5;
  G.shop = shuffle(pool).slice(0, size);
}

export function startRound() {
  initRoundOpponents(G.round);
  G.heat        = Math.max(0, G.heat - 1);   // heat decays after enemies built
  G.gold        = goldForRound(G.round) + G.pendingGold;
  G.pendingGold = 0;
  G.phase       = 'shop';
  G.csel        = null;
  G.reorderSel  = null;
  ensureCardOptions();
  buildShop();
  render();
}

registerStartRound(startRound);

export function buyUnit(i) {
  const u = G.shop[i];
  if (!u || G.gold < u.cost || G.pboard.length >= G.maxBoard) return;
  G.gold -= u.cost;
  G.pboard.push(newUnit(u));
  G.shop.splice(i, 1);
  render();
}

export function sellUnit(uid) {
  const i = G.pboard.findIndex(u => u.uid === uid);
  if (i < 0) return;
  G.pboard.splice(i, 1);
  G.gold++;
  G.reorderSel = null;
  render();
}

export function reroll() {
  if (G.gold < 1) return;
  G.gold--;
  buildShop();
  render();
}

export function insightReroll() {
  if (G.insight < 1) return;
  G.insight--;
  buildShop();
  render();
}

export function upgradeTavern() {
  if (G.gold < 4 || G.tavernTier >= 2) return;
  G.gold -= 4; G.tavernTier = 2; G.maxBoard = 5;
  buildShop();
  render();
}