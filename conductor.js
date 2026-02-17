import { CARDS }                             from './data.js';
import { G, rand, living, activeRule }       from './state.js';
import { render }                            from './render.js';
import { resolve, stopTimer, clearTick }     from './combat.js';

// ── CONDUCT ───────────────────────────────────────────────────
export function conduct(cardId, targetUid) {
  // Block if card spent or if Hold has locked this window
  if (G.cused || G.cb.interventionLocked) return;

  const card = CARDS.find(c => c.id === cardId);
  if (!card) return;

  const pb = G.cb.pb;
  const eb = G.cb.eb;

  // ── Redirect ────────────────────────────────────────────────
  if (card.id === 'redirect') {
    if (!G.cb.window || !G.cb.pturn || !G.cb.attacker) {
      G.cb.log = 'Redirect only works during your attack window.';
      G.csel = null; render(); return;
    }
    const nt = eb.find(u => u.uid === targetUid && !u.dead);
    if (!nt) return;

    clearTick();
    stopTimer();
    G.cb.target = nt;
    G.cb.window = false;

    // Flux: first redirect is free of Heat, but card is still consumed.
    // "Free" = no Heat penalty, not free of cost. (#6 fix)
    const free = activeRule(G.pboard) === 'flux' && !G._fluxRedirectUsed;
    if (free) {
      G._fluxRedirectUsed = true;
      G.cb.log = `Redirected — ${G.cb.attacker.name} now strikes ${nt.name}… [free — no Heat]`;
    } else {
      G.heat   = Math.min(3, G.heat + 1);
      G.cb.log = `Redirected — ${G.cb.attacker.name} now strikes ${nt.name}…`;
    }
    G.cused = true;   // card always spent on use
    G.csel  = null;
    render();
    setTimeout(resolve, 800);
    return;
  }

  // ── Targeting friction: front two slots only ─────────────────
  if (card.id === 'bulwark' || card.id === 'surge') {
    const frontUids = pb.slice(0, 2).map(u => u.uid);
    if (!frontUids.includes(targetUid)) {
      G.cb.log = `${card.name} only reaches the front two units.`;
      G.csel = null; render(); return;
    }
  }

  if (card.id === 'bulwark') {
    const u = pb.find(u => u.uid === targetUid && !u.dead);
    if (u) { u.chp += 3; u.maxhp += 3; G.cb.log = `Bulwark — ${u.name} +3 HP.`; }
  }
  if (card.id === 'surge') {
    const u = pb.find(u => u.uid === targetUid && !u.dead);
    if (u) { u.atk += 2; G.cb.log = `Surge — ${u.name} +2 ATK.`; }
  }
  if (card.id === 'drain') {
    let rem = 3;
    while (rem > 0 && living(eb).length) {
      const t = rand(living(eb));
      const d = Math.min(2, rem);
      t.chp -= d; rem -= d;
      if (t.chp <= 0) t.dead = true;
    }
    G.cb.log = 'Drain — 3 damage scattered among enemies.';
  }
  if (card.id === 'unravel') {
    const pu = G.pboard.find(u => u.uid === targetUid);
    if (pu) {
      pu.entropy = Math.max(0, pu.entropy - 3);
      G.cb.log   = `Unravel — entropy cleared from ${pu.name}.`;
    }
  }

  G.cused = true;
  G.heat  = Math.min(3, G.heat + 1);
  G.csel  = null;
  render();
}

// ── FLUX STATE RESET ──────────────────────────────────────────
export function resetFluxState() { G._fluxRedirectUsed = false; }

// ── CARD SELECTION ────────────────────────────────────────────
export function selectCard(cardId) {
  if (G.cused || G.cb.interventionLocked) return;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return;
  if (card.tgt === null) { conduct(cardId, null); return; }
  G.csel = G.csel?.id === cardId ? null : card;
  render();
}

// ── TARGET CLICK ──────────────────────────────────────────────
export function targetClick(uid, isEnemy) {
  if (!G.csel || G.cused || G.cb.interventionLocked) return;
  const ok = (G.csel.tgt === 'enemy' && isEnemy) || (G.csel.tgt === 'friendly' && !isEnemy);
  if (ok) conduct(G.csel.id, uid);
}