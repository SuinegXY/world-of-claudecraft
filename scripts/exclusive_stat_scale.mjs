#!/usr/bin/env node
// Exclusive-server numerical retune script.
//
// Applies the following transforms to content files:
// - Classes: x2 for baseStats, statsPerLevel, baseHp, hpPerLevel, baseMana, manaPerLevel, ranged.min/max
// - weaponDpsBudget: 13.4 + 0.6 * level (double of 6.7 + 0.3)
// - Enchant statBonus: x5
//
// Item weapon damage (x2) and gear primary stats / ratings / spellPower (x5) are
// NO LONGER mutated in content tables. They stamp once onto ItemInstancePayload
// at grant time via src/sim/loot/exclusive_gear_scale.ts (see also
// scripts/exclusive_stat_unscale_items.mjs to restore official item tables).
//
// Safe to re-run: per-file sentinels skip already-scaled content.
// Run: node scripts/exclusive_stat_scale.mjs
// Only mutate the exclusive worktree.

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
    const scaled = inner.replace(
      /(min|max):\s*(\d+)/g,
      (_, key, val) => `${key}: ${Number(val) * 2}`,
    );
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

function scaleEnchants() {
  const file = 'src/sim/content/enchants.ts';
  let src = readFile(file);
  if (/statBonus:\s*\{\s*str:\s*10\s*\}/.test(src)) {
    console.log(`[skip] ${file} appears already scaled`);
    return;
  }
  src = src.replace(/statBonus:\s*\{([^}]+)\}/g, (_m, inner) => {
    const scaled = inner.replace(/(\w+):\s*(\d+)/g, (_, key, val) => `${key}: ${Number(val) * 5}`);
    return `statBonus: {${scaled}}`;
  });
  writeFile(file, src);
  console.log(`[done] ${file}`);
}

scaleClasses();
scaleWeaponDpsBudget();
scaleEnchants();
console.log(
  '[note] Item tables are not content-scaled; runtime exclusive_gear_scale stamps at grant.',
);

const classesContent = readFile('src/sim/content/classes.ts');
const itemsContent = readFile('src/sim/content/items.ts');
const budgetContent = readFile('src/sim/item_budget.ts');
const enchantsContent = readFile('src/sim/content/enchants.ts');

const checks = [
  ['warrior baseHp 100', classesContent.includes('baseHp: 100')],
  ['weaponDpsBudget 13.4 + 0.6', budgetContent.includes('13.4 + 0.6 * level')],
  ['worn_sword official 2-5', itemsContent.includes('min: 2, max: 5')],
  ['gnarled_staff official int 1', itemsContent.includes('stats: { int: 1')],
  ['enchant str 10', /statBonus:\s*\{\s*str:\s*10\s*\}/.test(enchantsContent)],
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
