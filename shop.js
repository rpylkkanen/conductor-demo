import { POOL }                          from './data.js';
import { G, newUnit, shuffle,
         goldForRound }                 from './state.js';
import { registerStartRound }          from './flow.js';
import { initRoundOpponents }          from './opponents.js';
import { render }                      from './render.js';

// ── SHOP BUILDER ──────────────────────────────────────────────
// Fills G.shop with units drawn from the tier-appropriate pool.
// Pool split will be 3 units + 2 modules once modules land;
// for now the full slot count is units.
export function buildShop() {
  const pool = POOL.filter(u => u.tier <= G.tavernTier);
  const size = G.tavernTier === 1 ? 4 : 5;
  G.shop = shuffle(pool).slice(0, size);
}

// ── ROUND START ───────────────────────────────────────────────
// Resets shop-phase state and builds a fresh enemy roster.
// Registered with flow.js so it can be called after level-ups
// without flow.js needing to import shop.js directly.
export function startRound() {
  initRoundOpponents(G.round);
  G.gold  = goldForRound(G.round);
  G.phase = 'shop';
  G.csel  = null;
  buildShop();
  render();
}

// Register with the flow coordinator immediately on module load.
registerStartRound(startRound);

// ── BUY ───────────────────────────────────────────────────────
export function buyUnit(i) {
  const u = G.shop[i];
  if (!u) return;
  if (G.gold < u.cost || G.pboard.length >= G.maxBoard) return;
  G.gold -= u.cost;
  G.pboard.push(newUnit(u));
  G.shop.splice(i, 1);
  render();
}

// ── SELL ──────────────────────────────────────────────────────
export function sellUnit(uid) {
  const i = G.pboard.findIndex(u => u.uid === uid);
  if (i < 0) return;
  G.pboard.splice(i, 1);
  G.gold += 1;
  render();
}

// ── REROLL ────────────────────────────────────────────────────
export function reroll() {
  if (G.gold < 1) return;
  G.gold--;
  buildShop();
  render();
}

// ── TAVERN UPGRADE ────────────────────────────────────────────
// One-time purchase. Increases board cap and unlocks tier-2 pool.
export function upgradeTavern() {
  if (G.gold < 4 || G.tavernTier >= 2) return;
  G.gold      -= 4;
  G.tavernTier = 2;
  G.maxBoard   = 5;
  buildShop();
  render();
}