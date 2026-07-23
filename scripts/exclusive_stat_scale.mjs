#!/usr/bin/env node
// Exclusive-server numerical retune script.
//
// Applies the following transforms to content files:
// - Classes: x2 for baseStats, statsPerLevel, baseHp, hpPerLevel, baseMana, manaPerLevel, ranged.min/max
// - Weapons: x2 for weapon.min and weapon.max (not speed/range)
// - Gear stats objects: x5 for integer primary stat values (str/agi/sta/int/spi/armor)
// - Combat ratings on items: x5 for critRating/hasteRating/hitRating/armor (authored on items)
// - weaponDpsBudget: 13.4 + 0.6 * level (double of 6.7 + 0.3)
//
// Safe to re-run: detects if already scaled by checking sentinel values.
// Run: node scripts/exclusive_stat_scale.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}
function writeFile(rel, content) {
  writeFileSync(resolve(ROOT, rel), content, 'utf8');
}

// --- Classes ---
function scaleClasses() {
  const file = 'src/sim/content/classes.ts';
  let src = readFile(file);

  // Detect if already scaled: warrior baseHp should be 50 -> 100
  if (src.includes('baseHp: 100') && src.includes("id: 'warrior'")) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }

  // Scale baseStats and statsPerLevel values (object literals after these keys)
  // Pattern: baseStats: { str: N, agi: N, sta: N, int: N, spi: N, armor: N }
  src = src.replace(
    /baseStats:\s*\{([^}]+)\}/g,
    (match, inner) => {
      const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
      return `baseStats: {${scaled}}`;
    },
  );
  src = src.replace(
    /statsPerLevel:\s*\{([^}]+)\}/g,
    (match, inner) => {
      const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
      return `statsPerLevel: {${scaled}}`;
    },
  );

  // Scale baseHp, hpPerLevel, baseMana, manaPerLevel
  src = src.replace(/baseHp:\s*(\d+)/g, (_, val) => `baseHp: ${Number(val) * 2}`);
  src = src.replace(/hpPerLevel:\s*(\d+)/g, (_, val) => `hpPerLevel: ${Number(val) * 2}`);
  src = src.replace(/baseMana:\s*(\d+)/g, (_, val) => `baseMana: ${Number(val) * 2}`);
  src = src.replace(/manaPerLevel:\s*(\d+)/g, (_, val) => `manaPerLevel: ${Number(val) * 2}`);

  // Scale ranged.min/max (only within ranged objects, not weapon)
  src = src.replace(
    /ranged:\s*\{([^}]+)\}/g,
    (match, inner) => {
      const scaled = inner.replace(/(min|max):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
      return `ranged: {${scaled}}`;
    },
  );

  writeFile(file, src);
  console.log(`[done] ${file}`);
}

// --- Weapon DPS Budget ---
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

// --- Items (weapons x2, stats x5) ---
function scaleItemFile(file) {
  let src = readFile(file);

  // Skip if this file already shows exclusive weapon/stat scaling sentinels.
  if (
    src.includes('min: 4, max: 10') ||
    src.includes('statBonus: { str: 10 }') ||
    src.includes('stats: { int: 5 }')
  ) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }

  // Scale weapon.min and weapon.max (within weapon: { ... } objects)
  // Be careful to only match weapon object literals
  src = src.replace(
    /weapon:\s*\{([^}]+)\}/g,
    (match, inner) => {
      const scaled = inner.replace(/(min|max):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 2}`);
      return `weapon: {${scaled}}`;
    },
  );

  // Scale stats objects: x5 for all integer values
  // Match stats: { key: N, ... } but NOT statsPerLevel or baseStats (handled separately)
  // Only match 'stats:' that is NOT preceded by 'base' or 'Per'
  src = src.replace(
    /(?<![A-Za-z])stats:\s*\{([^}]+)\}/g,
    (match, inner) => {
      const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 5}`);
      return `stats: {${scaled}}`;
    },
  );

  // Scale standalone critRating/hasteRating/hitRating/armor on items (top-level item props)
  src = src.replace(/critRating:\s*(\d+)/g, (_, val) => `critRating: ${Number(val) * 5}`);
  src = src.replace(/hasteRating:\s*(\d+)/g, (_, val) => `hasteRating: ${Number(val) * 5}`);
  src = src.replace(/hitRating:\s*(\d+)/g, (_, val) => `hitRating: ${Number(val) * 5}`);

  writeFile(file, src);
  console.log(`[done] ${file}`);
}

// --- Main ---
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
];

scaleClasses();
scaleWeaponDpsBudget();
for (const file of ITEM_FILES) {
  try {
    scaleItemFile(file);
  } catch (e) {
    console.error(`[error] ${file}: ${e.message}`);
  }
}

// Verify a few known rows
const classesContent = readFile('src/sim/content/classes.ts');
const itemsContent = readFile('src/sim/content/items.ts');
const budgetContent = readFile('src/sim/item_budget.ts');

const checks = [
  ['warrior baseHp 100', classesContent.includes('baseHp: 100')],
  ['weaponDpsBudget 13.4 + 0.6', budgetContent.includes('13.4 + 0.6 * level')],
  ['worn_sword 4-10', itemsContent.includes('min: 4, max: 10')],
  ['gnarled_staff stats.int 5', itemsContent.includes("stats: { int: 5")],
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
