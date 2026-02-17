// ── INTERVENTION ECONOMY ──────────────────────────────────────
// Single owner of the armed-card lifecycle and Hold rewards.
// Does not import render.js — callers render after calling these.

import { CARDS }         from './data.js';
import { G, shuffle }   from './state.js';

// ── CARD OPTIONS ──────────────────────────────────────────────
// Generates 3 arm choices if needed. Idempotent.
export function ensureCardOptions() {
  if (!G.armedCard && !G.cardOptions.length) {
    G.cardOptions = shuffle(CARDS).slice(0, 3);
  }
}

// ── ARM ───────────────────────────────────────────────────────
export function armCard(cardId) {
  if (G.phase !== 'shop' || G.armedCard) return false;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return false;
  G.armedCard   = card;
  G.cardOptions = [];
  return true;
}

// ── COMBAT HAND ───────────────────────────────────────────────
// Called by startCombat to populate G.chand.
export function getCombatHand() {
  return G.armedCard ? [G.armedCard] : [shuffle(CARDS)[0]];
}

// ── DISCARD OR RETAIN ─────────────────────────────────────────
// Called at endCombat. Discards if card was played; retains if held.
export function consumeArmed() {
  if (G.cused) G.armedCard = null;
  // Not cused = held = card persists into next round.
}

// ── HOLD ACTION ───────────────────────────────────────────────
// Banks a reward and locks this window against intervention.
// "Free" in Flux means no Heat — not free of the armed card.
export function holdAction(choice) {
  if (!G.cb.window || G.cused || G.cb.interventionLocked) return false;
  if (choice === 'gold')    G.pendingGold += 1;
  if (choice === 'insight') G.insight = Math.min(2, G.insight + 1);
  G.cb.interventionLocked = true;
  G.cb.holdUsed           = true;
  G.cb.log = choice === 'gold'
    ? 'Held — +1 Gold banked for next round.'
    : 'Held — +1 Insight stored.';
  return true;
}