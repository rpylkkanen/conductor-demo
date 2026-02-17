import { G } from './state.js';

// startRound is registered here by shop.js on init,
// avoiding a circular dep (flow → shop → flow).
let _startRound = null;
export function registerStartRound(fn) { _startRound = fn; }

// ── LEVEL-UP QUEUE ────────────────────────────────────────────
// Called after the result overlay is dismissed (via onContinue).
// Works through G.levelQueue one unit at a time, showing a modal
// for each. When the queue is empty, advances to the next round.
export function processLevelQueue() {
  if (!G.levelQueue.length) {
    G.round++;
    _startRound?.();
    return;
  }
  const u = G.levelQueue[0];
  document.getElementById('luname').textContent = `${u.name} reached Level ${u.lv + 1}`;
  document.getElementById('levelup').style.display = 'flex';
}

export function applyLevelUp(choice) {
  const u = G.levelQueue.shift();
  if (u) {
    u.lv = (u.lv || 1) + 1;
    if (choice === 'atk') {
      u.atk += 1;
    } else {
      u.hp   += 1;
      u.chp   = Math.min(u.chp + 1, u.hp);
      u.maxhp = u.hp;
    }
  }
  document.getElementById('levelup').style.display = 'none';
  processLevelQueue();
}

// ── CONTINUE BUTTON ───────────────────────────────────────────
// Wired to the result overlay's Continue button in index.html.
export function onContinue() {
  document.getElementById('overlay').style.display = 'none';
  processLevelQueue();
}