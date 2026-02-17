// ── KEYWORDS ─────────────────────────────────────────────────
// Display metadata only. Combat behaviour lives in combat.js.
export const KW = {
  taunt:     { label: 'Taunt',     cls: 'kw-taunt'     },
  haste:     { label: 'Haste',     cls: 'kw-haste'     },
  retaliate: { label: 'Retaliate', cls: 'kw-retaliate' },
  leech:     { label: 'Leech',     cls: 'kw-leech'     },
};

// ── UNIT POOL ─────────────────────────────────────────────────
// tier 1 = always available; tier 2 = unlocked after tavern upgrade.
// stat budget heuristic: cost-2 ≈ 5pts, cost-3 ≈ 7pts+kw, cost-4 ≈ 9pts+kw
export const POOL = [
  { id: 'rifter',     name: 'Rifter',     atk: 2, hp: 3, pol: 50, sym: '◈', cost: 2, kw: null,        tier: 1 },
  { id: 'tendril',    name: 'Tendril',    atk: 1, hp: 5, pol: 75, sym: '❋', cost: 2, kw: null,        tier: 1 },
  { id: 'voltspawn',  name: 'Voltspawn',  atk: 3, hp: 2, pol: 85, sym: '⚡', cost: 3, kw: 'haste',    tier: 1 },
  { id: 'stoneguard', name: 'Stoneguard', atk: 1, hp: 6, pol: 15, sym: '⬡', cost: 3, kw: 'taunt',    tier: 1 },
  { id: 'prismcore',  name: 'Prismcore',  atk: 2, hp: 4, pol: 50, sym: '◇', cost: 3, kw: 'retaliate', tier: 1 },
  { id: 'ironwarden', name: 'Ironwarden', atk: 2, hp: 5, pol: 20, sym: '▣', cost: 3, kw: 'taunt',    tier: 1 },
  { id: 'wraithclaw', name: 'Wraithclaw', atk: 4, hp: 3, pol: 10, sym: '✦', cost: 4, kw: 'leech',    tier: 2 },
  { id: 'voidmaw',    name: 'Voidmaw',    atk: 5, hp: 2, pol: 90, sym: '◉', cost: 4, kw: 'haste',    tier: 2 },
  { id: 'soulbinder', name: 'Soulbinder', atk: 3, hp: 4, pol: 55, sym: '⌬', cost: 4, kw: 'leech',    tier: 2 },
  { id: 'nullspike',  name: 'Nullspike',  atk: 4, hp: 3, pol: 45, sym: '✧', cost: 4, kw: 'retaliate', tier: 2 },
];

// ── CONDUCTOR CARDS ───────────────────────────────────────────
// tgt: 'enemy' | 'friendly' | null (no target required)
export const CARDS = [
  { id: 'redirect', name: 'Redirect', sym: '↺', desc: 'During your attack window: retarget to a different enemy',       tgt: 'enemy'    },
  { id: 'bulwark',  name: 'Bulwark',  sym: '⛨', desc: 'Give a front-row unit (slot 1 or 2) +3 HP',                      tgt: 'friendly' },
  { id: 'surge',    name: 'Surge',    sym: '↑', desc: 'Give a front-row unit (slot 1 or 2) +2 ATK this combat',          tgt: 'friendly' },
  { id: 'drain',    name: 'Drain',    sym: '◎', desc: 'Deal 3 damage spread across random enemies',                      tgt: null       },
  { id: 'unravel',  name: 'Unravel',  sym: '≋', desc: 'Remove 3 entropy from a friendly unit (entropy causes ATK loss)', tgt: 'friendly' },
];

// ── ENEMY ROSTERS (base, before round scaling) ────────────────
// combat.js applies per-round ATK/HP bonuses on top of these.
export const ENEMY_BASES = [
  ['tendril', 'stoneguard'],
  ['voltspawn', 'rifter', 'tendril'],
  ['wraithclaw', 'ironwarden', 'prismcore'],
  ['voidmaw', 'stoneguard', 'wraithclaw'],
  ['voidmaw', 'nullspike', 'ironwarden', 'soulbinder'],
];

// ── TUTORIAL STEPS ────────────────────────────────────────────
// Replace the existing TUTORIAL array at the bottom of data.js with this.

export const TUTORIAL = [
  {
    title: 'The Shop',
    body: `Spend 🪙 gold to <strong>buy units</strong> for your board (max 4 slots). 
Hover any unit to see its cost and what it does.
<br><br>
<strong>Sell</strong> a board unit for 1🪙 by hovering it. 
<strong>Reroll</strong> (1🪙) refreshes the shop. 
<strong>Upgrade Tavern</strong> (4🪙) unlocks a 5th slot and stronger tier-2 units.
<br><br>
You cannot fight until you arm a Conductor card — see the bottom of the shop.`,
  },
  {
    title: 'Keywords',
    body: `<span class="kw-inline kw-taunt">Taunt</span> — enemies must attack this unit first, shielding others behind it.
<br>
<span class="kw-inline kw-haste">Haste</span> — attacks before all non-Haste units each tick.
<br>
<span class="kw-inline kw-retaliate">Retaliate</span> — deals +1 counter-damage back to any attacker.
<br>
<span class="kw-inline kw-leech">Leech</span> — heals 1 HP on any kill.
<br><br>
Hover a keyword badge on any card during play to read its effect.`,
  },
  {
    title: 'Polarity',
    body: `Every unit has a <strong>polarity</strong> — the thin coloured bar at its bottom edge. 
Blue leans toward Order, red toward Chaos.
<br><br>
Your board's <em>average</em> polarity determines the active combat rule (shown in the topbar):
<br><br>
<strong>ORDER</strong> (avg &lt; 35) — back-row units are protected from direct attack.<br>
<strong>CHAOS</strong> (avg &gt; 65) — your attacker strikes again immediately on any kill.<br>
<strong>FLUX</strong> (35–65) — your first Redirect this combat costs no Heat.
<br><br>
Extreme boards also gain a flat stat bonus — hover the ◈ note to see it.`,
  },
  {
    title: 'The Conductor',
    body: `Before fighting, <strong>arm one card</strong> from the three offered at the bottom of the shop. 
That card is your only option this combat.
<br><br>
During combat each attack opens a <strong>3-second intervention window</strong>. You can:
<br><br>
<strong>Intervene</strong> — play your card. It is discarded after combat.<br>
<strong>Hold +🪙</strong> — skip the window, bank 1 Gold for next round. Card is <em>kept</em>.<br>
<strong>Hold +◈</strong> — skip, gain 1 Insight instead. Insight buys a free shop Reroll.
<br><br>
Holding and intervening are mutually exclusive in any single window.`,
  },
  {
    title: 'Heat & Entropy',
    body: `<strong>Heat</strong> 🔥 — every intervention you make adds 1 Heat (max 3). 
Next round's enemies gain +Heat ATK. Decays by 1 each round. 
Sometimes the right play is to Hold and let Heat cool.
<br><br>
<strong>Entropy</strong> — a green badge that appears on your units after losses. 
Each loss adds +2 entropy to survivors.
<br><br>
Entropy ≥ 3 → unit enters combat with −1 ATK.<br>
Entropy ≥ 5 → unit collapses before the fight begins.<br><br>
The Conductor card <strong>Unravel</strong> removes 3 entropy from one unit.`,
  },
  {
    title: 'XP & Level-Up',
    body: `Every unit that <strong>survives a combat</strong> gains 1 XP (shown as 0/2 XP on its card).
<br><br>
At 2 XP a level-up modal appears: choose <strong>+1 ATK</strong> or <strong>+1 HP</strong> permanently. 
A levelled unit is shown with a gold border and LV badge.
<br><br>
Selling a levelled unit discards all that investment — keep your veterans alive.
<br><br>
<strong>Draw</strong> restores your board but adds +1 entropy to every unit — not a free outcome.`,
  },
];