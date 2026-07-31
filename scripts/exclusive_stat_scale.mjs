#!/usr/bin/env node
// Exclusive-server numerical retune script.
//
// Applies the following transforms to content files:
// - Classes: x2 for baseStats, statsPerLevel, baseHp, hpPerLevel, baseMana, manaPerLevel, ranged.min/max
// - Weapons: x2 for weapon.min and weapon.max (not speed/range)
// - Gear stats objects: x5 for integer primary stat values (str/agi/sta/int/spi/armor)
// - Combat ratings / spellPower on items: x5
// - Enchant statBonus: x5
// - weaponDpsBudget: 13.4 + 0.6 * level (double of 6.7 + 0.3)
//
// Safe to re-run: per-file sentinels skip already-scaled content.
// Run: node scripts/exclusive_stat_scale.mjs
// Only mutate the exclusive worktree (D:/Self/woc-exclusive-v029).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}
function writeFile(rel, content) {
  writeFileSync(resolve(ROOT, rel), content, 'utf8');
}

function scaleClasses() {
  const file = 'src/sim/content/classes.ts';
  let src = readFile(file);
  if (src.includes('baseHp: 100') && src.includes("id: 'warrior'")) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }
  src = src.replace(/baseStats:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
    return `baseStats: {${scaled}}`;
  });
  src = src.replace(/statsPerLevel:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
    return `statsPerLevel: {${scaled}}`;
  });
  src = src.replace(/baseHp:\s*(\d+)/g, (_, val) => `baseHp: ${Number(val) * 2}`);
  src = src.replace(/hpPerLevel:\s*(\d+)/g, (_, val) => `hpPerLevel: ${Number(val) * 2}`);
  src = src.replace(/baseMana:\s*(\d+)/g, (_, val) => `baseMana: ${Number(val) * 2}`);
  src = src.replace(/manaPerLevel:\s*(\d+)/g, (_, val) => `manaPerLevel: ${Number(val) * 2}`);
  src = src.replace(/ranged:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(min|max):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
    return `ranged: {${scaled}}`;
  });
  writeFile(file, src);
  console.log(`[done] ${file}`);
}

function scaleWeaponDpsBudget() {
  const file = 'src/sim/item_budget.ts';
  let src = readFile(file);
  if (src.includes('13.4 + 0.6')) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }
  src = src.replace(/6\.7\s*\+\s*0\.3\s*\*\s*level/, '13.4 + 0.6 * level');
  writeFile(file, src);
  console.log(`[done] ${file}`);
}

const ITEM_FILES = [
  'src/sim/content/items.ts',
  'src/sim/content/delves/items.ts',
  'src/sim/content/enchants.ts',
  'src/sim/content/heroic_loot.ts',
  'src/sim/content/heroic_vendor.ts',
  'src/sim/content/pvp_honor.ts',
  'src/sim/content/temple.ts',
  'src/sim/content/zone2.ts',
  'src/sim/content/zone3.ts',
  // Profession-crafted gear (v0.29). Must match world/dungeon exclusive multiples.
  'src/sim/content/profession_items.ts',
];

function scaleOneItemFile(file, { force = false } = {}) {
  let src = readFile(file);
  const sentinels = {
    'src/sim/content/items.ts': () => src.includes('worn_sword:') && src.includes('min: 4, max: 10'),
    'src/sim/content/delves/items.ts': () => src.includes('stats: { armor: 150, int: 10, spi: 5 }'),
    'src/sim/content/enchants.ts': () => /statBonus:\s*\{\s*str:\s*10\s*\}/.test(src),
    'src/sim/content/heroic_loot.ts': () => /weapon:\s*\{\s*min:\s*44,\s*max:\s*72/.test(src),
    'src/sim/content/heroic_vendor.ts': () => src.includes('stats: { str: 35, sta: 20 }'),
    'src/sim/content/pvp_honor.ts': () => /weapon:\s*\{\s*min:\s*68,\s*max:\s*100/.test(src),
    'src/sim/content/temple.ts': () => /weapon:\s*\{\s*min:\s*34,\s*max:\s*56/.test(src),
    'src/sim/content/zone2.ts': () => /weapon:\s*\{\s*min:\s*22,\s*max:\s*36/.test(src),
    'src/sim/content/zone3.ts': () => /weapon:\s*\{\s*min:\s*36,\s*max:\s*58/.test(src),
    'src/sim/content/profession_items.ts': () =>
      src.includes('copper_bearded_axe') && src.includes('min: 12, max: 22'),
  };
  if (!force && sentinels[file]?.()) {
    console.log(`[skip] ${file} appears already scaled`);
    return false;
  }
  if (!force && !sentinels[file]) {
    console.log(`[skip] ${file} has no exclusive sentinel; refusing blind scale`);
    return false;
  }

  src = src.replace(/weapon:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(min|max):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
    return `weapon: {${scaled}}`;
  });
  src = src.replace(/(?<![A-Za-z])stats:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 5}`);
    return `stats: {${scaled}}`;
  });
  src = src.replace(/critRating:\s*(\d+)/g, (_, val) => `critRating: ${Number(val) * 5}`);
  src = src.replace(/hasteRating:\s*(\d+)/g, (_, val) => `hasteRating: ${Number(val) * 5}`);
  src = src.replace(/hitRating:\s*(\d+)/g, (_, val) => `hitRating: ${Number(val) * 5}`);
  src = src.replace(/spellPower:\s*(\d+)/g, (_, val) => `spellPower: ${Number(val) * 5}`);
  src = src.replace(/statBonus:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 5}`);
    return `statBonus: {${scaled}}`;
  });

  writeFile(file, src);
  console.log(`[done] ${file}`);
  return true;
}

function scaleRaidVariantRatings() {
  // Heroic raid variants overwrite ratings with absolute constants; keep them on
  // the exclusive x5 ladder so generated heroic raid gear matches authored gear.
  const file = 'src/sim/content/heroic_variants.ts';
  let src = readFile(file);
  if (src.includes('const RAID_PRIMARY_ARMOR = 275')) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }
  if (!src.includes('const RAID_PRIMARY_ARMOR = 55')) {
    console.log(`[warn] ${file} unexpected RAID_PRIMARY_ARMOR; skipped`);
    return;
  }
  src = src
    .replace('const RAID_PRIMARY_ARMOR = 55', 'const RAID_PRIMARY_ARMOR = 275')
    .replace('const RAID_PRIMARY_WEAPON = 65', 'const RAID_PRIMARY_WEAPON = 325')
    .replace('const RAID_PRIMARY_LEGENDARY = 70', 'const RAID_PRIMARY_LEGENDARY = 350')
    .replace('const RAID_SECONDARY = 20', 'const RAID_SECONDARY = 100')
    .replace('const RAID_SECONDARY_LEGENDARY = 30', 'const RAID_SECONDARY_LEGENDARY = 150');
  writeFile(file, src);
  console.log(`[done] ${file}`);
}

scaleClasses();
scaleWeaponDpsBudget();
for (const file of ITEM_FILES) {
  try {
    scaleOneItemFile(file);
  } catch (e) {
    console.error(`[error] ${file}: ${e.message}`);
  }
}
scaleRaidVariantRatings();

const classesContent = readFile('src/sim/content/classes.ts');
const itemsContent = readFile('src/sim/content/items.ts');
const professionContent = readFile('src/sim/content/profession_items.ts');
const budgetContent = readFile('src/sim/item_budget.ts');
const heroicVariants = readFile('src/sim/content/heroic_variants.ts');

const checks = [
  ['warrior baseHp 100', classesContent.includes('baseHp: 100')],
  ['weaponDpsBudget 13.4 + 0.6', budgetContent.includes('13.4 + 0.6 * level')],
  ['worn_sword 4-10', itemsContent.includes('min: 4, max: 10')],
  ['gnarled_staff stats.int 5', itemsContent.includes('stats: { int: 5')],
  ['profession copper_bearded_axe 12-22', professionContent.includes('min: 12, max: 22')],
  ['profession ironedge stats x5', professionContent.includes('stats: { str: 20, sta: 10 }')],
  ['raid variant rating x5', heroicVariants.includes('RAID_PRIMARY_ARMOR = 275')],
];

console.log('\n--- Verification ---');
for (const [label, ok] of checks) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
}
if (checks.some(([, ok]) => !ok)) {
  console.error('\nSome verifications failed.');
  process.exit(1);
}
console.log('\nAll verifications passed.');
