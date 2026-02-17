// All data.js imports consolidated at the top (fixes double-import smell).
import { CARDS, POOL, ENEMY_BASES }     from './data.js';
import { G, newUnit, living, tauntOf,
         shuffle, rand, polBonus,
         activeRule, resetCombatState,
         cloneUnit }                    from './state.js';
import { render }                      from './render.js';
import { processLevelQueue }           from './flow.js';
import { resetFluxState }              from './conductor.js';
import { applyBossEffect }             from './opponents.js';
import { getCombatHand, consumeArmed } from './intervention.js';

// ── CONSTANTS ─────────────────────────────────────────────────
export const WINDOW_MS = 3200;
let _tick = null;
export function clearTick() { clearTimeout(_tick); }

// ── TARGET SELECTION ──────────────────────────────────────────
function pickTarget(board) {
  return tauntOf(board) || living(board)[0];
}
function sortedLiving(board) {
  const l = living(board);
  return [...l.filter(u => u.kw === 'haste'), ...l.filter(u => u.kw !== 'haste')];
}

// ── TIMER BAR ─────────────────────────────────────────────────
export function startTimer() {
  const f = document.getElementById('timerfill');
  f.style.transition = 'none';
  f.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transition = `width ${WINDOW_MS}ms linear`;
    f.style.width = '0%';
  }));
}
export function stopTimer() {
  const f = document.getElementById('timerfill');
  f.style.transition = 'none';
  f.style.width = '0%';
}

// ── COMBAT ENTRY ──────────────────────────────────────────────
export function startCombat() {
  if (!G.pboard.length) return;

  G.pboardSnapshot = G.pboard.map(cloneUnit);

  const pb = polBonus(G.pboard);
  const eb = polBonus(G.eboard);

  resetCombatState();
  resetFluxState();

  // ── Build combat copies FIRST (boss effect needs them) ───────
  const entropyWarnings = [];
  G.cb.pb = G.pboard.map(u => {
    const ent = u.entropy || 0;
    if (ent >= 5) {
      entropyWarnings.push(`${u.name} collapses — entropy overwhelming.`);
      return { ...cloneUnit(u), chp: 0, maxhp: u.maxhp + pb.hp,
               atk: u.atk + pb.atk, dead: true };
    }
    return {
      ...cloneUnit(u),
      chp:   u.chp   + pb.hp,
      maxhp: u.maxhp + pb.hp,
      atk:   Math.max(0, u.atk + pb.atk - (ent >= 3 ? 1 : 0)),
      dead:  false,
    };
  });
  G.cb.eb = G.eboard.map(u => ({
    ...cloneUnit(u),
    chp:   u.chp   + eb.hp,
    maxhp: u.maxhp + eb.hp,
    atk:   u.atk   + eb.atk,
    dead:  false,
  }));

  // ── Boss effect applied AFTER boards exist (fix #1) ──────────
  const bossLog = applyBossEffect(G.round);

  G.chand = getCombatHand();
  G.cused = false;
  G.csel  = null;
  G.phase = 'combat';

  const rule    = activeRule(G.pboard);
  const ruleMsg = {
    order: 'ORDER active — formation engaged.',
    chaos: 'CHAOS active — chain kills enabled.',
    flux:  'FLUX active — first Redirect costs no Heat.',
  };
  G.cb.log = entropyWarnings.length
    ? entropyWarnings.join(' ')
    : bossLog ?? ruleMsg[rule];

  render();
  _tick = setTimeout(tick, 1200);
}

// ── TICK ──────────────────────────────────────────────────────
function tick() {
  const pa = sortedLiving(G.cb.pb);
  const ea = sortedLiving(G.cb.eb);
  if (!pa.length || !ea.length) { endCombat(); return; }

  const t     = G.cb.tickIdx;
  const pturn = (t % 2 === 0);
  G.cb.pturn  = pturn;

  const att = pturn
    ? pa[Math.floor(t / 2) % pa.length]
    : ea[Math.floor(t / 2) % ea.length];
  const tgt = pturn ? pickTarget(G.cb.eb) : pickTarget(G.cb.pb);

  G.cb.attacker = att;
  G.cb.target   = tgt;
  G.cb.log      = `${att.name} → ${tgt.name}…`;
  G.cb.tag      = pturn ? '⚔ Your attack' : '⚔ Enemy attack';
  G.cb.window   = true;
  G.cb.tickIdx++;

  render();
  startTimer();

  _tick = setTimeout(() => {
    G.cb.window = false;
    G.csel = null;
    render();
    resolve();
  }, WINDOW_MS);
}

// ── RESOLVE ───────────────────────────────────────────────────
export function resolve() {
  const { attacker: att, target: tgt } = G.cb;

  if (!att || !tgt || tgt.dead || att.dead) {
    G.cb.log = '—'; G.cb.tag = '';
    G.cb.attacker = null; G.cb.target = null;
    render();
    _tick = setTimeout(tick, 600);
    return;
  }

  const rule = activeRule(G.pboard);
  const dA   = att.atk;
  const dB   = tgt.atk + (tgt.kw === 'retaliate' ? 1 : 0);

  tgt.chp -= dA;
  att.chp -= dB;
  G.cb.flashUids = [tgt.uid, att.uid];

  if (tgt.chp <= 0 && att.kw === 'leech') att.chp = Math.min(att.maxhp, att.chp + 1);
  if (att.chp <= 0 && tgt.kw === 'leech') tgt.chp = Math.min(tgt.maxhp, tgt.chp + 1);

  const tgtDied = tgt.chp <= 0;
  const attDied = att.chp <= 0;
  if (tgtDied) tgt.dead = true;
  if (attDied) att.dead = true;

  const retNote = tgt.kw === 'retaliate' ? ' (Retaliate +1)' : '';
  if      (attDied && tgtDied) G.cb.log = `Both ${att.name} and ${tgt.name} fall.`;
  else if (attDied)            G.cb.log = `${att.name} destroys ${tgt.name} but falls to the counter${retNote}.`;
  else if (tgtDied)            G.cb.log = `${att.name} slays ${tgt.name} (${dA} dealt, ${dB} taken${retNote}).`;
  else                         G.cb.log = `${att.name} deals ${dA}, takes ${dB}${retNote} — ${att.chp} vs ${tgt.chp} HP.`;

  if (rule === 'chaos' && tgtDied && !attDied) {
    const next = pickTarget(G.cb.pturn ? G.cb.eb : G.cb.pb);
    if (next) {
      next.chp -= att.atk;
      if (next.chp <= 0) next.dead = true;
      G.cb.log += ` [chain] → ${next.name} (${att.atk}).`;
      G.cb.flashUids.push(next.uid);
    }
  }

  G.cb.tag = ''; G.cb.attacker = null; G.cb.target = null; G.cb.window = false;
  render();
  setTimeout(() => { G.cb.flashUids = []; }, 400);
  _tick = setTimeout(tick, 900);
}

// ── END COMBAT ────────────────────────────────────────────────
function endCombat() {
  clearTimeout(_tick);
  stopTimer();

  const pa = living(G.cb.pb);
  const ea = living(G.cb.eb);

  let res;
  if      (pa.length && !ea.length) { res = 'win';  G.cb.log = 'Victory — your board holds.'; }
  else if (ea.length && !pa.length) { res = 'loss'; G.cb.log = 'Defeat. Entropy spreads.'; }
  else                              { res = 'draw'; G.cb.log = 'Draw — both sides fall.'; }

  G.cb.result = res;
  G.cb.over   = true;
  G.levelQueue = [];

  if (res === 'win') {
    G.cb.pb.forEach(cu => {
      const u = G.pboard.find(x => x.uid === cu.uid);
      if (!u) return;
      u.chp = cu.chp; u.dead = cu.dead;
      if (!cu.dead && cu.chp > 0) {
        u.xp = (u.xp || 0) + 1;
        if (u.xp >= 2) { u.xp = 0; G.levelQueue.push(u); }
      }
    });
    G.pboard = G.pboard.filter(u => !u.dead && u.chp > 0);
  } else if (res === 'loss') {
    G.hp = Math.max(0, G.hp - ea.reduce((s, u) => s + u.atk, 0));
    G.cb.pb.forEach(cu => {
      const u = G.pboard.find(x => x.uid === cu.uid);
      if (!u) return;
      u.chp = cu.chp; u.dead = cu.dead;
      u.entropy = (u.entropy || 0) + 2;
    });
    G.pboard = G.pboard.filter(u => !u.dead && u.chp > 0);
  } else {
    // Draw: snapshot restored but stalemate corrupts — +1 entropy to all.
    // This makes draw strictly worse than winning, not a free reset.
    G.pboard = G.pboardSnapshot;
    G.pboard.forEach(u => { u.entropy = (u.entropy || 0) + 1; });
  }

  consumeArmed();

  G.phase = 'result';
  render();

  setTimeout(() => {
    if (G.hp <= 0) {
      showResult('Eliminated', 'loss', 'Your HP reached zero.', true);
      return;
    }
    const msgs = {
      win:  ['Victory', 'Survivors carry their HP forward.'],
      loss: ['Defeat',  'You lose HP. Entropy marks your survivors.'],
      draw: ['Draw',    'Both armies fall. Your board is restored.'],
    };
    const [title, sub] = msgs[res];
    showResult(title, res, sub, false);
  }, 700);
}

function showResult(title, cls, sub, eliminated) {
  document.getElementById('rtitle').textContent    = title;
  document.getElementById('rtitle').className      = `rtitle ${cls}`;
  document.getElementById('rsub').textContent      = sub;
  document.getElementById('rbtn').style.display    = eliminated ? 'none' : '';
  document.getElementById('overlay').style.display = 'flex';
}

// ── ENEMY ROSTER BUILDER ──────────────────────────────────────
export function buildEnemyRoster(round) {
  const idx    = Math.min(round - 1, ENEMY_BASES.length - 1);
  const atkBon = Math.max(0, round - 1);
  const hpBon  = Math.floor(atkBon / 2);
  return ENEMY_BASES[idx].map(id => {
    const base = POOL.find(u => u.id === id);
    return newUnit({ ...base, atk: base.atk + atkBon, hp: base.hp + hpBon });
  });
}