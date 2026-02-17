import { KW }                            from './data.js';
import { G, polColor, polLabel,
         polAvg, polBonus, enemyThreat } from './state.js';
import { startCombat }                  from './combat.js';
import { reroll, upgradeTavern, buyUnit,
         sellUnit }                     from './shop.js';
import { selectCard, targetClick }      from './conductor.js';

// ── POLARITY METER (topbar) ───────────────────────────────────
function renderPolMeter() {
  const m = document.getElementById('polmeter');
  if (!G.pboard.length) { m.style.display = 'none'; return; }
  m.style.display = 'flex';
  const avg = polAvg(G.pboard);
  const f   = document.getElementById('polfill');
  f.style.width      = avg + '%';
  f.style.background = polColor(avg);
  document.getElementById('pollabel').textContent = polLabel(avg);
  const bn = polBonus(G.pboard);
  document.getElementById('polbonus').textContent = bn.note ? `(${bn.note})` : '';
}

// ── KEYWORD BADGE ─────────────────────────────────────────────
function kwBadge(kw) {
  if (!kw) return '';
  const { label, cls } = KW[kw];
  return `<div class="ukw ${cls}">${label}</div>`;
}

// ── UNIT CARD (board) ─────────────────────────────────────────
function mkUnitHTML(u, { enemy = false, click = false, combat = false, order = 0 } = {}) {
  const pct     = u.chp / u.maxhp;
  const hpColor = pct > .5 ? 'var(--green)' : pct > .25 ? '#ffcc44' : 'var(--red)';

  const cls = [
    'ucard',
    G.cb.attacker?.uid  === u.uid          ? 'attacking' : '',
    G.cb.target?.uid    === u.uid          ? 'targeted'  : '',
    G.cb.flashUids?.includes(u.uid)        ? 'flash'     : '',
    u.dead                                 ? 'dead'      : '',
    click                                  ? 'selectable': '',
    (!enemy && u.lv > 1)                   ? 'lv2'       : '',
  ].join(' ');

  const sell    = (!combat && !enemy) ? `<div class="sellbtn" data-sell="${u.uid}">sell</div>` : '';
  const ent     = u.entropy > 0       ? `<div class="entbadge">${u.entropy}</div>`             : '';
  const ordBadge = combat             ? `<div class="orderbadge">${order}</div>`               : '';
  const lv      = u.lv > 1           ? `<div class="ulv">LV ${u.lv}</div>`                    : '';
  const xpDots  = (!enemy && !combat && u.xp > 0)
    ? `<div class="xpdots">${'●'.repeat(u.xp)}</div>` : '';

  return `<div class="${cls}" data-uid="${u.uid}" data-enemy="${enemy ? 1 : 0}">
    ${sell}${ent}${ordBadge}
    <div class="usym">${u.sym}</div>
    <div class="uname">${u.name}</div>
    <div class="ustats">
      <span class="uatk">${u.atk}⚔</span>
      <span class="uhp${u.chp < u.maxhp ? ' dmg' : ''}">${u.chp}♥</span>
    </div>
    ${lv}${xpDots}${kwBadge(u.kw)}
    <div class="polbar" style="background:${polColor(u.pol)};opacity:.6"></div>
    <div class="hpbar">
      <div class="hpfill" style="width:${Math.max(0, pct) * 100}%;background:${hpColor}"></div>
    </div>
  </div>`;
}

// ── SHOP UNIT CARD ────────────────────────────────────────────
function mkShopHTML(u, i) {
  const canBuy = G.gold >= u.cost && G.pboard.length < G.maxBoard;
  const kwHtml = u.kw
    ? `<div class="ukw ${KW[u.kw].cls}" style="margin-top:2px">${KW[u.kw].label}</div>`
    : `<div style="height:15px"></div>`;

  return `<div class="${canBuy ? 'sunit' : 'sunit unafford'}" data-buy="${i}">
    <div style="font-size:1.55em">${u.sym}</div>
    <div style="font-size:.58em;color:var(--dim);margin-bottom:1px">${u.name}</div>
    <div style="font-size:.64em">
      <span style="color:var(--chaos)">${u.atk}⚔</span>
      <span style="color:var(--green)">${u.hp}♥</span>
    </div>
    ${kwHtml}
    <div class="shoppolrow">
      <div class="shoppolbar" style="background:${polColor(u.pol)}"></div>
      <span class="shoppollabel">${polLabel(u.pol)}</span>
    </div>
    <div class="scost">🪙${u.cost}</div>
  </div>`;
}

// ── BOARD RENDERER ────────────────────────────────────────────
function renderBoard(units, enemy) {
  const inCombat = G.phase === 'combat' || G.phase === 'result';
  const board    = inCombat ? (enemy ? G.cb.eb : G.cb.pb) : units;
  if (!board.length) return `<div class="slot">—</div>`;

  const fc           = G.csel && !G.cused;
  const clickEnemy   = fc && G.csel.tgt === 'enemy';
  const clickFriendly= fc && G.csel.tgt === 'friendly';
  const click        = enemy ? clickEnemy : clickFriendly;

  return board.map((u, i) =>
    mkUnitHTML(u, { enemy, click, combat: inCombat, order: i + 1 })
  ).join('');
}

// ── SHOP PANEL ────────────────────────────────────────────────
function renderShop() {
  const b          = polBonus(G.pboard);
  const canUpgrade = G.tavernTier < 2 && G.gold >= 4;
  const canReroll  = G.gold >= 1;

  return `
    ${G.shop.map((u, i) => mkShopHTML(u, i)).join('')}
    <div class="shop-actions">
      ${b.note ? `<div class="bonus-note">◈ ${b.note}</div>` : ''}
      <div class="tier-note">Tier ${G.tavernTier} · ${G.pboard.length}/${G.maxBoard}</div>
      <button class="btn" id="rerollbtn"  ${canReroll  ? '' : 'disabled'}>↻ Reroll (1🪙)</button>
      ${G.tavernTier < 2
        ? `<button class="btn" id="upgradebtn" ${canUpgrade ? '' : 'disabled'}>▲ Upgrade (4🪙)</button>`
        : ''}
      <button class="btn primary" id="fightbtn">⚔ Fight</button>
    </div>`;
}

// ── CONDUCTOR PANEL ───────────────────────────────────────────
function renderConductor() {
  const w = G.cb.window && !G.cused;

  const note = G.cused
    ? '<span class="clabel-note">Intervention used.</span>'
    : G.csel
      ? `<span class="clabel-note active">Click a ${G.csel.tgt === 'enemy' ? 'target' : 'friendly'}…</span>`
      : w
        ? '<span class="clabel-note window">⬡ Intervene now</span>'
        : '<span class="clabel-note">Play once per combat.</span>';

  const cards = G.chand.map(c => `
    <div class="ccard ${G.cused ? 'cused' : ''} ${G.csel?.id === c.id ? 'csel' : ''} ${w && !G.cused ? 'cwindow' : ''}"
         data-conduct="${c.id}">
      <span class="csym">${c.sym}</span>
      <span class="cname">${c.name}</span>
      <span class="cdesc">${c.desc}</span>
    </div>`).join('');

  return `
    <div class="clabel">
      <div class="clabel-title">Conductor</div>
      ${note}
    </div>
    ${cards}`;
}

// ── MAIN RENDER ───────────────────────────────────────────────
export function render() {
  // Topbar
  document.getElementById('shp').textContent    = G.hp;
  document.getElementById('srd').textContent    = `Round ${G.round}`;
  document.getElementById('sgold').textContent  = G.gold;
  document.getElementById('sgwrap').style.display = G.phase === 'shop' ? 'flex' : 'none';

  // Threat preview
  const th = document.getElementById('threat');
  if (G.phase === 'shop') {
    th.classList.remove('hidden');
    document.getElementById('threatval').textContent = enemyThreat();
  } else {
    th.classList.add('hidden');
  }

  renderPolMeter();

  // Phase pill
  const pillMap = {
    shop:   ['Shop',   'pill-shop'],
    combat: ['Combat', 'pill-combat'],
    result: ['Result', 'pill-result'],
  };
  const [pt, pc] = pillMap[G.phase] ?? pillMap.result;
  const ph = document.getElementById('sphase');
  ph.textContent = pt;
  ph.className   = `pill ${pc}`;

  // Boards
  document.getElementById('eboard').innerHTML = renderBoard(G.eboard, true);
  document.getElementById('pboard').innerHTML = renderBoard(G.pboard, false);

  // Log bar
  const lb = document.getElementById('logbar');
  const inCombat = G.phase === 'combat' || G.phase === 'result';
  if (inCombat) {
    lb.style.display = 'block';
    document.getElementById('ltext').textContent = G.cb.log;
    document.getElementById('ltag').textContent  = G.cb.over ? '' : G.cb.tag;
  } else {
    lb.style.display = 'none';
  }

  // Bottom panel
  const shopEl = document.getElementById('shop');
  const condEl = document.getElementById('conductor');

  if (G.phase === 'shop') {
    shopEl.style.display = 'flex';
    condEl.style.display = 'none';
    shopEl.innerHTML = renderShop();
    // Bind shop buttons after innerHTML set
    document.getElementById('fightbtn')  ?.addEventListener('click', startCombat);
    document.getElementById('rerollbtn') ?.addEventListener('click', reroll);
    document.getElementById('upgradebtn')?.addEventListener('click', upgradeTavern);
  } else if (G.phase === 'combat') {
    shopEl.style.display = 'none';
    condEl.style.display = 'flex';
    condEl.innerHTML = renderConductor();
  } else {
    shopEl.style.display = 'none';
    condEl.style.display = 'none';
  }
}

// ── EVENT DELEGATION ──────────────────────────────────────────
// All click events routed here. index.html calls initEvents() once.
export function initEvents({ onContinue, applyLevelUp }) {
  document.addEventListener('click', e => {
    if (e.target.closest('#tutorial')) return;

    const buy = e.target.closest('[data-buy]');
    if (buy) { buyUnit(+buy.dataset.buy); return; }

    const sell = e.target.closest('[data-sell]');
    if (sell) { e.stopPropagation(); sellUnit(+sell.dataset.sell); return; }

    const cd = e.target.closest('[data-conduct]');
    if (cd && !G.cused) { selectCard(cd.dataset.conduct); return; }

    const uu = e.target.closest('[data-uid]');
    if (uu && G.csel && !G.cused) {
      targetClick(+uu.dataset.uid, uu.dataset.enemy === '1');
      return;
    }

    if (e.target.id === 'rbtn')    { onContinue();        return; }
    if (e.target.id === 'lu-atk')  { applyLevelUp('atk'); return; }
    if (e.target.id === 'lu-hp')   { applyLevelUp('hp');  return; }
  });
}