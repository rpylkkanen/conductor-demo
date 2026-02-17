import { KW }                             from './data.js';
import { G, polColor, polLabel,
         polAvg, polBonus, enemyThreat,
         resetGame }                      from './state.js';
import { startCombat }                   from './combat.js';
import { reroll, upgradeTavern, buyUnit,
         sellUnit, insightReroll }        from './shop.js';
import { selectCard, targetClick }       from './conductor.js';
import { armCard, holdAction }           from './intervention.js';

// ── FLOATING TOOLTIP ──────────────────────────────────────────
// A single <div id="tooltip"> follows the cursor.
// Elements declare their tip via data-tip="..." — works through
// overflow:hidden because the div lives directly on <body>.
function initTooltip() {
  const tip = document.createElement('div');
  tip.id = 'tooltip';
  document.body.appendChild(tip);

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.style.display = 'none'; return; }
    tip.textContent  = el.dataset.tip;
    tip.style.display = 'block';
  });
  document.addEventListener('mousemove', e => {
    if (tip.style.display === 'none') return;
    tip.style.left = (e.clientX + 14) + 'px';
    tip.style.top  = (e.clientY - 36) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget?.closest('[data-tip]')) tip.style.display = 'none';
  });
}

// ── KEYWORD TOOLTIPS ──────────────────────────────────────────
const KW_TIPS = {
  taunt:     'Taunt — enemies must attack this unit first, protecting others behind it.',
  haste:     'Haste — attacks before all non-Haste units each combat tick.',
  retaliate: 'Retaliate — deals +1 counter-damage back to any attacker.',
  leech:     'Leech — heals 1 HP when it kills an enemy unit.',
};

const POL_RULE_TIPS = {
  order: 'ORDER — board avg below 35. Back-row units are protected from direct attack.',
  chaos: 'CHAOS — board avg above 65. Attacker immediately strikes again on any kill.',
  flux:  'FLUX — board avg 35–65. Your first Redirect each combat costs no Heat.',
};

// ── POLARITY METER ────────────────────────────────────────────
function renderPolMeter() {
  const m = document.getElementById('polmeter');
  if (!G.pboard.length) { m.style.display = 'none'; return; }
  m.style.display = 'flex';
  const avg  = polAvg(G.pboard);
  const rule = avg > 65 ? 'chaos' : avg < 35 ? 'order' : 'flux';
  document.getElementById('polfill').style.cssText =
    `width:${avg}%;background:${polColor(avg)}`;
  const lbl = document.getElementById('pollabel');
  lbl.textContent    = polLabel(avg);
  lbl.dataset.tip    = POL_RULE_TIPS[rule];
  const bn = polBonus(G.pboard);
  const pb = document.getElementById('polbonus');
  pb.textContent  = bn.note ? `(${bn.note})` : '';
  pb.dataset.tip  = bn.note
    ? `Polarity bonus: all your units enter combat with ${bn.note} due to your board's average polarity.`
    : '';
}

// ── KEYWORD BADGE ─────────────────────────────────────────────
function kwBadge(kw) {
  if (!kw) return '<div class="ukw-ph"></div>';
  const { label, cls } = KW[kw];
  return `<div class="ukw ${cls}" data-tip="${KW_TIPS[kw] ?? label}">${label}</div>`;
}

// ── UNIT CARD ─────────────────────────────────────────────────
function mkUnitHTML(u, { enemy = false, click = false, combat = false, order = 0 } = {}) {
  const pct     = u.chp / u.maxhp;
  const hpColor = pct > .5 ? 'var(--green)' : pct > .25 ? '#ffcc44' : 'var(--red)';

  const isAtt    = G.cb.attacker?.uid === u.uid;
  const attCls   = isAtt ? (G.cb.pturn ? 'player-attacking' : 'enemy-attacking') : '';
  const reordCls = (!enemy && !combat && G.reorderSel === u.uid) ? 'reorder-sel' : '';

  const cls = ['ucard', attCls, reordCls,
    G.cb.target?.uid    === u.uid        ? 'targeted'  : '',
    G.cb.flashUids?.includes(u.uid)      ? 'flash'     : '',
    u.dead                               ? 'dead'      : '',
    click                                ? 'selectable': '',
    (!enemy && u.lv > 1)                 ? 'lv2'       : '',
  ].join(' ');

  const sell = (!combat && !enemy)
    ? `<div class="sellbtn" data-sell="${u.uid}">sell</div>` : '';

  const entTip = u.entropy >= 5
    ? `Entropy ${u.entropy} — this unit collapses before combat begins.`
    : u.entropy >= 3
      ? `Entropy ${u.entropy} — enters combat with −1 ATK. Cleanse with Unravel. Death at ≥5.`
      : `Entropy ${u.entropy} — accumulates on losses. −1 ATK at ≥3, death at ≥5. Cleanse with Unravel.`;
  const ent = u.entropy > 0
    ? `<div class="entbadge" data-tip="${entTip}">${u.entropy}</div>` : '';

  const ord = combat
    ? `<div class="orderbadge" data-tip="Attack order this tick">${order}</div>` : '';

  const lv = u.lv > 1
    ? `<div class="ulv" data-tip="Level ${u.lv} — earned by surviving combats and choosing +ATK or +HP at level-up.">LV ${u.lv}</div>`
    : '<div class="ulv-ph"></div>';

  const xp = (!enemy && !combat)
    ? `<div class="xpdots" data-tip="XP ${u.xp}/2 — survive a combat to earn 1 XP. At 2 XP you choose +1 ATK or +1 HP permanently.">${u.xp}/2 XP</div>`
    : '';

  const polRule = u.pol > 65 ? 'Chaos' : u.pol < 35 ? 'Order' : 'Flux';
  const polTip  = `Polarity ${u.pol} — pulls your board average toward ${polRule}. Board average determines the active combat rule.`;
  const atkTip  = `ATK ${u.atk} — damage dealt per attack${u.entropy >= 3 && !enemy ? ' (penalised by entropy)' : ''}.`;
  const hpTip   = `HP ${u.chp}/${u.maxhp} — falls to 0 and this unit dies.`;

  return `<div class="${cls}" data-uid="${u.uid}" data-enemy="${enemy ? 1 : 0}">
    ${sell}${ent}${ord}
    <img class="uimg" src="assets/units/${u.id}.png" alt="${u.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
    <div class="usym" style="display:none">${u.sym}</div>
    <div class="uname">${u.name}</div>
    <div class="ustats">
      <span class="uatk" data-tip="${atkTip}">${u.atk}⚔</span>
      <span class="uhp${u.chp < u.maxhp ? ' dmg' : ''}" data-tip="${hpTip}">${u.chp}♥</span>
    </div>
    ${lv}${xp}${kwBadge(u.kw)}
    <div class="polbar" style="background:${polColor(u.pol)};opacity:.6" data-tip="${polTip}"></div>
    <div class="hpbar"><div class="hpfill"
      style="width:${Math.max(0, pct) * 100}%;background:${hpColor}"></div></div>
  </div>`;
}

// ── SHOP UNIT CARD ────────────────────────────────────────────
function mkShopHTML(u, i) {
  const canBuy  = G.gold >= u.cost && G.pboard.length < G.maxBoard;
  const buyTip  = canBuy
    ? `Buy ${u.name} for ${u.cost}🪙`
    : G.pboard.length >= G.maxBoard ? 'Your board is full — sell a unit first.'
    : `Not enough gold (need ${u.cost}🪙, have ${G.gold}🪙).`;
  const polRule = u.pol > 65 ? 'Chaos' : u.pol < 35 ? 'Order' : 'Flux';
  const kwHtml  = u.kw
    ? `<div class="ukw ${KW[u.kw].cls}" style="margin-top:2px" data-tip="${KW_TIPS[u.kw] ?? KW[u.kw].label}">${KW[u.kw].label}</div>`
    : `<div style="height:15px"></div>`;
  return `<div class="${canBuy ? 'sunit' : 'sunit unafford'}" data-buy="${i}" data-tip="${buyTip}">
    <img class="simg" src="assets/units/${u.id}.png" alt="${u.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
    <div style="font-size:1.55em;display:none">${u.sym}</div>
    <div style="font-size:.58em;color:var(--dim);margin-bottom:1px">${u.name}</div>
    <div style="font-size:.64em">
      <span style="color:var(--chaos)" data-tip="ATK — damage this unit deals per attack.">${u.atk}⚔</span>
      <span style="color:var(--green)" data-tip="HP — this unit's health.">${u.hp}♥</span>
    </div>
    ${kwHtml}
    <div class="shoppolrow" data-tip="Polarity ${u.pol} — pulls your board average toward ${polRule}, which changes the active combat rule.">
      <div class="shoppolbar" style="background:${polColor(u.pol)}"></div>
      <span class="shoppollabel">${polLabel(u.pol)}</span>
    </div>
    <div class="scost">🪙${u.cost}</div>
  </div>`;
}

// ── ARM CARD DISPLAY ──────────────────────────────────────────
function mkArmCardHTML(c, isArmed) {
  const tip = isArmed
    ? `${c.name} is armed. If you play it in combat, it is discarded. If you Hold instead, it is kept for next round.`
    : `Arm ${c.name}: ${c.desc}. You can only carry one card into combat.`;
  return `<div class="ccard${isArmed ? ' armed' : ''}" ${isArmed ? '' : `data-arm="${c.id}"`} data-tip="${tip}">
    <img class="cimg" src="assets/cards/${c.id}.png" alt="${c.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
    <span class="csym" style="display:none">${c.sym}</span>
    <span class="cname">${c.name}</span>
    <span class="cdesc">${c.desc}</span>
  </div>`;
}

function renderArmSection() {
  if (G.armedCard) {
    return `<div class="arm-section">
      <div class="arm-label">Armed<br><span class="arm-note">Retained — Hold kept it</span></div>
      ${mkArmCardHTML(G.armedCard, true)}
    </div>`;
  }
  if (G.cardOptions.length) {
    return `<div class="arm-section">
      <div class="arm-label">Arm a card<br><span class="arm-note">Choose one to carry into combat</span></div>
      ${G.cardOptions.map(c => mkArmCardHTML(c, false)).join('')}
    </div>`;
  }
  return '';
}

// ── BOARD RENDERER ────────────────────────────────────────────
function renderBoard(units, enemy) {
  const inCombat = G.phase === 'combat' || G.phase === 'result';
  const board    = inCombat ? (enemy ? G.cb.eb : G.cb.pb) : units;
  if (!board.length) return `<div class="slot">—</div>`;
  const fc    = G.csel && !G.cused;
  const click = enemy ? (fc && G.csel.tgt === 'enemy') : (fc && G.csel.tgt === 'friendly');
  return board.map((u, i) => mkUnitHTML(u, { enemy, click, combat: inCombat, order: i + 1 })).join('');
}

// ── SHOP PANEL ────────────────────────────────────────────────
function renderShop() {
  const b        = polBonus(G.pboard);
  const canFight = !!G.armedCard;
  const fightTip = canFight ? 'Begin combat.' : 'You must arm a Conductor card before fighting.';
  return `
    ${G.shop.map((u, i) => mkShopHTML(u, i)).join('')}
    <div class="shop-actions">
      ${b.note ? `<div class="bonus-note" data-tip="All your units enter combat with ${b.note} because your board's polarity average is extreme.">◈ ${b.note}</div>` : ''}
      <div class="tier-note">Tier ${G.tavernTier} · ${G.pboard.length}/${G.maxBoard}</div>
      <button class="btn" data-action="reroll" ${G.gold >= 1 ? '' : 'disabled'}
              data-tip="Spend 1🪙 to refresh the shop with new units.">↻ Reroll (1🪙)</button>
      ${G.insight > 0
        ? `<button class="btn" data-action="insight-reroll"
                  data-tip="Spend 1 Insight for a free shop reroll.">◈ Free Reroll</button>` : ''}
      ${G.tavernTier < 2
        ? `<button class="btn" data-action="upgrade" ${G.gold >= 4 ? '' : 'disabled'}
                  data-tip="Spend 4🪙 to unlock tier-2 units and a 5th board slot.">▲ Upgrade (4🪙)</button>`
        : ''}
      <button class="btn primary" data-action="fight" ${canFight ? '' : 'disabled'}
              data-tip="${fightTip}">⚔ Fight</button>
    </div>
    ${renderArmSection()}`;
}

// ── CONDUCTOR PANEL ───────────────────────────────────────────
function renderConductor() {
  const locked  = G.cb.interventionLocked;
  const w       = G.cb.window && !G.cused && !locked;
  const canHold = w && !G.cb.holdUsed;

  const note = G.cused    ? '<span class="clabel-note">Intervention used.</span>'
    : locked              ? '<span class="clabel-note">Held — card carried to next round.</span>'
    : G.csel              ? `<span class="clabel-note active">Click a ${G.csel.tgt === 'enemy' ? 'target enemy' : 'friendly unit'}…</span>`
    : w                   ? '<span class="clabel-note window">⬡ Window open — intervene or hold</span>'
    :                       '<span class="clabel-note">One card per combat.</span>';

  const holdHtml = canHold
    ? `<div class="hold-wrap">
         <button class="btn hold-btn" data-hold="gold"
                 data-tip="Pass on intervening. Bank +1 Gold for next round's shop. Your armed card is kept for next combat.">Hold +🪙</button>
         <button class="btn hold-btn" data-hold="insight"
                 data-tip="Pass on intervening. Gain +1 Insight (max 2). Spend Insight for a free shop reroll. Your armed card is kept.">Hold +◈</button>
       </div>` : '';

  const cards = G.chand.map(c => `
    <div class="ccard ${G.cused || locked ? 'cused' : ''} ${G.csel?.id === c.id ? 'csel' : ''} ${w ? 'cwindow' : ''}"
         data-conduct="${c.id}" data-tip="${c.desc}${locked ? ' — window locked, you chose to Hold.' : ''}">
      <img class="cimg" src="assets/cards/${c.id}.png" alt="${c.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span class="csym" style="display:none">${c.sym}</span>
      <span class="cname">${c.name}</span>
      <span class="cdesc">${c.desc}</span>
    </div>`).join('');

  return `
    <div class="clabel">
      <div class="clabel-title">Conductor</div>${note}
    </div>
    ${holdHtml}${cards}`;
}

// ── MAIN RENDER ───────────────────────────────────────────────
export function render() {
  document.getElementById('shp').textContent   = G.hp;
  document.getElementById('srd').textContent   = `Round ${G.round}`;
  document.getElementById('sgold').textContent = G.gold;
  document.getElementById('sgwrap').style.display = G.phase === 'shop' ? 'flex' : 'none';

  const insWrap = document.getElementById('sinsight-wrap');
  insWrap.style.display  = G.insight > 0 ? 'flex' : 'none';
  insWrap.dataset.tip    = `Insight ${G.insight}/2 — spend in the shop for a free Reroll.`;
  document.getElementById('sinsight').textContent = G.insight;

  const heatWrap = document.getElementById('sheat-wrap');
  heatWrap.style.display = G.heat > 0 ? 'flex' : 'none';
  heatWrap.dataset.tip   = `Heat ${G.heat}/3 — each intervention adds 1 Heat. Enemies gain +Heat ATK next round. Decays by 1 each round.`;
  document.getElementById('sheat').textContent = G.heat;

  const th = document.getElementById('threat');
  const bw = document.getElementById('bosswarn');
  if (G.phase === 'shop') {
    th.classList.remove('hidden');
    th.dataset.tip = 'Sum of all living enemy ATK — the HP you lose if you lose this combat.';
    document.getElementById('threatval').textContent = enemyThreat();
    bw.textContent   = G.upcomingBoss ? `⚠ ${G.upcomingBoss}` : '';
    bw.style.display = G.upcomingBoss ? 'block' : 'none';
  } else {
    th.classList.add('hidden');
    bw.style.display = 'none';
  }

  renderPolMeter();

  const pillMap = { shop: ['Shop','pill-shop'], combat: ['Combat','pill-combat'], result: ['Result','pill-result'] };
  const [pt, pc] = pillMap[G.phase] ?? pillMap.result;
  const ph = document.getElementById('sphase');
  ph.textContent = pt; ph.className = `pill ${pc}`;

  document.getElementById('opp-label').textContent =
    G.currentBossName ? `Opponent — ${G.currentBossName}` : 'Opponent';
  document.getElementById('board-label').textContent =
    G.reorderSel !== null ? 'Your Board — click another unit to swap' : 'Your Board';

  document.getElementById('eboard').innerHTML = renderBoard(G.eboard, true);
  document.getElementById('pboard').innerHTML = renderBoard(G.pboard, false);

  const lb       = document.getElementById('logbar');
  const inCombat = G.phase === 'combat' || G.phase === 'result';
  if (inCombat) {
    lb.style.display = 'block';
    lb.className = `logbar${G.cb.over ? '' : G.cb.pturn ? ' pturn' : ' eturn'}`;
    document.getElementById('ltext').textContent = G.cb.log;
    document.getElementById('ltag').textContent  = G.cb.over ? '' : G.cb.tag;
  } else {
    lb.style.display = 'none';
    lb.className = 'logbar';
  }

  const shopEl = document.getElementById('shop');
  const condEl = document.getElementById('conductor');
  if (G.phase === 'shop') {
    shopEl.style.display = 'flex'; condEl.style.display = 'none';
    shopEl.innerHTML = renderShop();
  } else if (G.phase === 'combat') {
    shopEl.style.display = 'none'; condEl.style.display = 'flex';
    condEl.innerHTML = renderConductor();
  } else {
    shopEl.style.display = 'none'; condEl.style.display = 'none';
  }
}

// ── EVENT DELEGATION ──────────────────────────────────────────
export function initEvents({ onContinue, applyLevelUp, onRestart }) {
  initTooltip();

  document.addEventListener('click', e => {
    if (e.target.closest('#tutorial')) return;

    const sell = e.target.closest('[data-sell]');
    if (sell) { e.stopPropagation(); sellUnit(+sell.dataset.sell); return; }

    const buy = e.target.closest('[data-buy]');
    if (buy) { buyUnit(+buy.dataset.buy); return; }

    const act = e.target.closest('[data-action]')?.dataset.action;
    if (act === 'fight')          { startCombat();  return; }
    if (act === 'reroll')         { reroll();        return; }
    if (act === 'upgrade')        { upgradeTavern(); return; }
    if (act === 'insight-reroll') { insightReroll(); return; }
    if (act === 'restart')        { onRestart();     return; }

    const arm = e.target.closest('[data-arm]');
    if (arm) { armCard(arm.dataset.arm); render(); return; }

    const hold = e.target.closest('[data-hold]');
    if (hold) { holdAction(hold.dataset.hold); render(); return; }

    const cd = e.target.closest('[data-conduct]');
    if (cd && !G.cused && !G.cb.interventionLocked) { selectCard(cd.dataset.conduct); return; }

    const uu = e.target.closest('[data-uid]');
    if (uu) {
      const uid     = +uu.dataset.uid;
      const isEnemy = uu.dataset.enemy === '1';
      if (G.csel && !G.cused && !G.cb.interventionLocked) { targetClick(uid, isEnemy); return; }
      if (!isEnemy && G.phase === 'shop') {
        if (G.reorderSel === uid) {
          G.reorderSel = null;
        } else if (G.reorderSel !== null) {
          const a = G.pboard.findIndex(u => u.uid === G.reorderSel);
          const b = G.pboard.findIndex(u => u.uid === uid);
          if (a >= 0 && b >= 0) [G.pboard[a], G.pboard[b]] = [G.pboard[b], G.pboard[a]];
          G.reorderSel = null;
        } else {
          G.reorderSel = uid;
        }
        render(); return;
      }
    }

    if (e.target.closest('#rbtn'))    { onContinue();        return; }
    if (e.target.closest('#lu-atk')) { applyLevelUp('atk'); return; }
    if (e.target.closest('#lu-hp'))  { applyLevelUp('hp');  return; }
  });
}