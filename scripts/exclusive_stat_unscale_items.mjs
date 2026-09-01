#!/usr/bin/env node
// Reverse exclusive item-table numerical scaling back to official authored
// values. Weapon min/max /2; stats / ratings / spellPower /5.
// Safe to re-run: per-file sentinels skip already-unscaled content.
// Enchants, classes, weaponDpsBudget, and item sets stay content-scaled.
// Runtime exclusive gear scale (loot/exclusive_gear_scale.ts) applies the
// player-facing multiples at grant time instead.
//
// Run: node scripts/exclusive_stat_unscale_items.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}
function writeFile(rel, content) {
  writeFileSync(resolve(ROOT, rel), content, 'utf8');
}

const ITEM_FILES = [
  'src/sim/content/items.ts',
  'src/sim/content/delves/items.ts',
  'src/sim/content/heroic_loot.ts',
  'src/sim/content/heroic_vendor.ts',
  'src/sim/content/pvp_honor.ts',
  'src/sim/content/temple.ts',
  'src/sim/content/zone2.ts',
  'src/sim/content/zone3.ts',
  'src/sim/content/profession_items.ts',
];

/** True when this file still has the exclusive x2/x5 content mutation. */
const SCALED_SENTINELS = {
  'src/sim/content/items.ts': (src) =>
    src.includes('worn_sword:') && src.includes('min: 4, max: 10'),
  'src/sim/content/delves/items.ts': (src) =>
    src.includes('stats: { armor: 150, int: 10, spi: 5 }'),
  'src/sim/content/heroic_loot.ts': (src) => /weapon:\s*\{\s*min:\s*44,\s*max:\s*72/.test(src),
  'src/sim/content/heroic_vendor.ts': (src) => src.includes('stats: { str: 35, sta: 20 }'),
  'src/sim/content/pvp_honor.ts': (src) => /weapon:\s*\{\s*min:\s*68,\s*max:\s*100/.test(src),
  'src/sim/content/temple.ts': (src) => /weapon:\s*\{\s*min:\s*34,\s*max:\s*56/.test(src),
  'src/sim/content/zone2.ts': (src) => /weapon:\s*\{\s*min:\s*22,\s*max:\s*36/.test(src),
  'src/sim/content/zone3.ts': (src) => /weapon:\s*\{\s*min:\s*36,\s*max:\s*58/.test(src),
  'src/sim/content/profession_items.ts': (src) =>
    src.includes('copper_bearded_axe') && src.includes('min: 12, max: 22'),
};

function unscaleOne(file) {
  let src = readFile(file);
  const isScaled = SCALED_SENTINELS[file];
  if (!isScaled) {
    console.log(`[skip] ${file} has no unscale sentinel`);
    return false;
  }
  if (!isScaled(src)) {
    console.log(`[skip] ${file} already unscaled (or unexpected)`);
    return false;
  }

  src = src.replace(/weapon:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(min|max):\s*(\d+)/g, (_, key, val) => {
      const n = Number(val);
      if (n % 2 !== 0) {
        throw new Error(`${file}: weapon ${key}=${n} not divisible by 2`);
      }
      return `${key}: ${n / 2}`;
    });
    return `weapon: {${scaled}}`;
  });
  src = src.replace(/(?<![A-Za-z])stats:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => {
      const n = Number(val);
      if (n % 5 !== 0) {
        throw new Error(`${file}: stats.${key}=${n} not divisible by 5`);
      }
      return `${key}: ${n / 5}`;
    });
    return `stats: {${scaled}}`;
  });
  for (const field of ['critRating', 'hasteRating', 'hitRating', 'spellPower']) {
    src = src.replace(new RegExp(`${field}:\\s*(\\d+)`, 'g'), (_, val) => {
      const n = Number(val);
      if (n % 5 !== 0) {
        throw new Error(`${file}: ${field}=${n} not divisible by 5`);
      }
      return `${field}: ${n / 5}`;
    });
  }

  writeFile(file, src);
  console.log(`[done] ${file}`);
  return true;
}

let failed = false;
for (const file of ITEM_FILES) {
  try {
    unscaleOne(file);
  } catch (e) {
    console.error(`[error] ${file}: ${e.message}`);
    failed = true;
  }
}

const items = readFile('src/sim/content/items.ts');
const profession = readFile('src/sim/content/profession_items.ts');
const checks = [
  ['worn_sword 2-5', items.includes('min: 2, max: 5')],
  ['gnarled_staff stats.int 1', items.includes('stats: { int: 1')],
  ['profession copper_bearded_axe 6-11', profession.includes('min: 6, max: 11')],
];
console.log('\n--- Verification ---');
for (const [label, ok] of checks) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}
if (failed) {
  console.error('\nUnscale failed.');
  process.exit(1);
}
console.log('\nItem tables restored to official authored values.');
