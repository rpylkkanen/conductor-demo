import { CARDS }                        from './data.js';
import { G, rand, living }             from './state.js';
import { render }                      from './render.js';
import { resolve, stopTimer, clearTick,
         activeRule, WINDOW_MS }       from './combat.js';

// ── CONDUCT ───────────────────────────────────────────────────
// Applies a selected Conductor card. Called when the player clicks
// a card (and optionally a target unit).
// FLUX rule: the first Redirect this combat is free (cused stays false).
export function conduct(cardId, targetUid) {
  if (G.cused) return;

  const card = CARDS.find(c => c.id === cardId);
  if (!card) return;

  const pb = G.cb.pb;
  const eb = G.cb.eb;

  // ── Redirect ────────────────────────────────────────────────
  if (card.id === 'redirect') {
    if (!G.cb.window || !G.cb.pturn || !G.cb.attacker) {
      G.cb.log = 'Redirect only works during your attack window.';
      G.csel = null;
      render();
      return;
    }
    const nt = eb.find(u => u.uid === targetUid && !u.dead);
    if (!nt) return;

    // Clear the running window timer before we take over
    clearTick();
    stopTimer();

    G.cb.target = nt;
    G.cb.log    = `Redirected — ${G.cb.attacker.name} now strikes ${nt.name}…`;
    G.cb.window = false;

    // FLUX: first redirect is free — do not mark cused
    const free = (activeRule(G.pboard) === 'flux' && !G._fluxRedirectUsed);
    if (free) {
      G._fluxRedirectUsed = true;
      G.cb.log += ' [free — Flux]';
    } else {
      G.cused = true;
    }

    G.csel = null;
    render();
    setTimeout(resolve, 800);
    return;
  }

  // ── Bulwark ─────────────────────────────────────────────────
  if (card.id === 'bulwark') {
    const u = pb.find(u => u.uid === targetUid && !u.dead);
    if (u) { u.chp += 3; u.maxhp += 3; G.cb.log = `Bulwark — ${u.name} +3 HP.`; }
  }

  // ── Surge ────────────────────────────────────────────────────
  if (card.id === 'surge') {
    const u = pb.find(u => u.uid === targetUid && !u.dead);
    if (u) { u.atk += 2; G.cb.log = `Surge — ${u.name} +2 ATK.`; }
  }

  // ── Drain ────────────────────────────────────────────────────
  if (card.id === 'drain') {
    let rem = 3;
    while (rem > 0 && living(eb).length) {
      const t = rand(living(eb));
      const d = Math.min(2, rem);
      t.chp -= d;
      rem   -= d;
      if (t.chp <= 0) t.dead = true;
    }
    G.cb.log = 'Drain — 3 damage scattered among enemies.';
  }

  // ── Unravel ──────────────────────────────────────────────────
  if (card.id === 'unravel') {
    // Unravel affects the persistent board unit, not the combat copy
    const pu = G.pboard.find(u => u.uid === targetUid);
    if (pu) {
      pu.entropy  = Math.max(0, pu.entropy - 3);
      G.cb.log    = `Unravel — entropy cleared from ${pu.name}.`;
    }
  }

  G.cused = true;
  G.csel  = null;
  render();
}

// ── FLUX STATE RESET ──────────────────────────────────────────
// Called by startCombat (combat.js) before each fight.
export function resetFluxState() {
  G._fluxRedirectUsed = false;
}

// ── CARD SELECTION ────────────────────────────────────────────
// Toggles the currently selected conductor card.
// Called by the click handler in index.html.
export function selectCard(cardId) {
  if (G.cused) return;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return;

  if (card.tgt === null) {
    // No target required — fire immediately
    conduct(cardId, null);
    return;
  }

  // Toggle selection so the player can deselect by clicking again
  G.csel = G.csel?.id === cardId ? null : card;
  render();
}

// ── TARGET CLICK ──────────────────────────────────────────────
// Called when the player clicks a unit card while a conductor
// card is selected. Validates polarity (enemy vs friendly) then fires.
export function targetClick(uid, isEnemy) {
  if (!G.csel || G.cused) return;
  const validEnemy    = G.csel.tgt === 'enemy'    &&  isEnemy;
  const validFriendly = G.csel.tgt === 'friendly' && !isEnemy;
  if (validEnemy || validFriendly) conduct(G.csel.id, uid);
}