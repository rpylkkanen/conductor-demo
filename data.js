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
  { id: 'redirect', name: 'Redirect', sym: '↺', desc: 'During your attack window: retarget to another enemy',  tgt: 'enemy'    },
  { id: 'bulwark',  name: 'Bulwark',  sym: '⛨', desc: 'Give a friendly unit +3 HP',                            tgt: 'friendly' },
  { id: 'surge',    name: 'Surge',    sym: '↑', desc: 'Give a friendly unit +2 ATK this combat',                tgt: 'friendly' },
  { id: 'drain',    name: 'Drain',    sym: '◎', desc: 'Deal 3 damage spread across random enemies',             tgt: null       },
  { id: 'unravel',  name: 'Unravel',  sym: '≋', desc: 'Remove 3 entropy from a friendly unit',                 tgt: 'friendly' },
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
export const TUTORIAL = [
  {
    title: 'The Shop',
    body: '<strong>Buy units</strong> with 🪙 gold (up to your board cap). Hover a board unit and click <strong>sell</strong> to reclaim 1 gold. Each card shows its polarity strip and keyword. Use <strong>Reroll</strong> (1🪙) for a fresh shop, or <strong>Upgrade Tavern</strong> (4🪙) to unlock a 5th board slot and rarer units.',
  },
  {
    title: 'Incoming Damage',
    body: 'The topbar shows <strong>⚔ If you lose: N dmg</strong> — the sum of all surviving enemy ATK. That number updates every round. It tells you exactly how much a loss will cost, so every purchase is a legible trade-off.',
  },
  {
    title: 'Keywords',
    body: `<span class="kw-inline kw-taunt">Taunt</span> must be attacked first &nbsp;
<span class="kw-inline kw-haste">Haste</span> attacks before others<br>
<span class="kw-inline kw-retaliate">Retaliate</span> deals +1 counter-damage &nbsp;
<span class="kw-inline kw-leech">Leech</span> heals 1 on kill<br><br>
Two cheap Rifters trade evenly. A Stoneguard with <strong>Taunt</strong> controls who takes the hits.`,
  },
  {
    title: 'Unit XP & Level-Up',
    body: 'Every unit that <strong>survives a combat</strong> gains 1 XP. At 2 XP it levels up — you choose <strong>+1 ATK</strong> or <strong>+1 HP</strong>. A levelled unit is worth protecting. Selling a Lv2 unit is a real sacrifice.',
  },
];