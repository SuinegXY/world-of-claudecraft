#!/usr/bin/env node
// Audit exclusive gear scaling vs official base (parent of feature branch).
// Weapon min/max should be x2; item stats / ratings / spellPower / enchant
 //statBonus / set primary stats should be x5.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const BASE = '280616411';
const WEAPON_MULT = 2;
const STAT_MULT = 5;
const PRIMARY = new Set(['str', 'agi', 'sta', 'int', 'spi', 'armor']);
const RATINGS = new Set(['critRating', 'hasteRating', 'hitRating']);

const CANDIDATE_FILES = [
  'src/sim/content/items.ts',
  'src/sim/content/delves/items.ts',
  'src/sim/content/enchants.ts',
  'src/sim/content/heroic_loot.ts',
  'src/sim/content/heroic_vendor.ts',
  'src/sim/content/pvp_honor.ts',
  'src/sim/content/temple.ts',
  'src/sim/content/zone2.ts',
  'src/sim/content/zone3.ts',
  'src/sim/content/profession_items.ts',
  'src/sim/content/item_sets.ts',
  'src/sim/content/ptr_dev_vendor.ts',
  'src/sim/content/zone1.ts',
  'src/sim/content/delves/drowned_litany_loot.ts',
  'src/sim/content/delves/shop.ts',
];

function show(ref, file) {
  try {
    return execSync(`git show ${ref}:${file}`, {
      encoding: 'utf8',
      cwd: ROOT,
      maxBuffer: 30e6,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

function readLocal(file) {
  try {
    return readFileSync(resolve(ROOT, file), 'utf8');
  } catch {
    return null;
  }
}

/** Extract equippable-ish numeric fields by crude id blocks. */
function extractItems(src) {
  const items = new Map();
  if (!src) return items;
  // Match object entries like  id_key: { ... } at top level of Record tables.
  const re =
    /(?:^|\n)\s*(?:['"]([\w.-]+)['"]|(\w+))\s*:\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const id = m[1] || m[2];
    if (!id || id === 'stats' || id === 'weapon' || id === 'effect' || id === 'reagents') continue;
    const start = m.index + m[0].length - 1;
    let depth = 0;
    let i = start;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const body = src.slice(start, i);
    // Only keep blocks that look like item defs / enchant defs / set pieces.
    if (
      !/kind:\s*'/.test(body) &&
      !/statBonus:/.test(body) &&
      !/weapon:/.test(body) &&
      !/effect:\s*\{/.test(body) &&
      !/slot:\s*'/.test(body)
    ) {
      continue;
    }
    const weapon = {};
    const wm = body.match(/weapon:\s*\{([^}]*)\}/);
    if (wm) {
      const min = wm[1].match(/\bmin:\s*(\d+)/);
      const max = wm[1].match(/\bmax:\s*(\d+)/);
      if (min) weapon.min = Number(min[1]);
      if (max) weapon.max = Number(max[1]);
    }
    const stats = {};
    const sm = body.match(/(?<![A-Za-z])stats:\s*\{([^}]*)\}/);
    if (sm) {
      for (const pm of sm[1].matchAll(/(\w+):\s*(\d+)/g)) {
        stats[pm[1]] = Number(pm[2]);
      }
    }
    const ratings = {};
    for (const k of RATINGS) {
      const rm = body.match(new RegExp(`\\b${k}:\\s*(\\d+)`));
      if (rm) ratings[k] = Number(rm[1]);
    }
    const spellPower = body.match(/\bspellPower:\s*(\d+)/);
    const statBonus = {};
    const sb = body.match(/statBonus:\s*\{([^}]*)\}/);
    if (sb) {
      for (const pm of sb[1].matchAll(/(\w+):\s*(\d+)/g)) {
        statBonus[pm[1]] = Number(pm[2]);
      }
    }
    // item set effect primary stats
    const effectStats = {};
    const em = body.match(/effect:\s*\{([^}]*)\}/);
    if (em && !/stats:/.test(em[1])) {
      for (const pm of em[1].matchAll(/(\w+):\s*(\d+)/g)) {
        if (PRIMARY.has(pm[1]) || RATINGS.has(pm[1])) effectStats[pm[1]] = Number(pm[2]);
      }
    }
    items.set(id, {
      weapon: Object.keys(weapon).length ? weapon : null,
      stats: Object.keys(stats).length ? stats : null,
      ratings: Object.keys(ratings).length ? ratings : null,
      spellPower: spellPower ? Number(spellPower[1]) : null,
      statBonus: Object.keys(statBonus).length ? statBonus : null,
      effectStats: Object.keys(effectStats).length ? effectStats : null,
    });
  }
  return items;
}

function expectScaled(base, cur, mult, label, issues, file, id) {
  if (base == null || cur == null) return;
  const want = base * mult;
  if (cur !== want) {
    issues.push({
      file,
      id,
      field: label,
      base,
      cur,
      want,
      ratio: base === 0 ? null : +(cur / base).toFixed(3),
    });
  }
}

const report = [];
const fileSummary = [];

for (const file of CANDIDATE_FILES) {
  const baseSrc = show(BASE, file);
  const curSrc = readLocal(file);
  if (!baseSrc && !curSrc) continue;
  if (!baseSrc && curSrc) {
    fileSummary.push({ file, note: 'new-file-only-on-exclusive', items: extractItems(curSrc).size });
    continue;
  }
  if (baseSrc && !curSrc) {
    fileSummary.push({ file, note: 'missing-locally' });
    continue;
  }
  const baseItems = extractItems(baseSrc);
  const curItems = extractItems(curSrc);
  let checked = 0;
  let bad = 0;
  for (const [id, b] of baseItems) {
    const c = curItems.get(id);
    if (!c) {
      report.push({ file, id, field: '(missing)', base: null, cur: null, want: null, ratio: null });
      bad++;
      continue;
    }
    if (b.weapon && c.weapon) {
      checked++;
      expectScaled(b.weapon.min, c.weapon.min, WEAPON_MULT, 'weapon.min', report, file, id);
      expectScaled(b.weapon.max, c.weapon.max, WEAPON_MULT, 'weapon.max', report, file, id);
    }
    if (b.stats) {
      for (const [k, v] of Object.entries(b.stats)) {
        // Percent-like floats in augments are not exclusive item stats; skip non-int primaries only.
        if (!PRIMARY.has(k) && !RATINGS.has(k)) continue;
        checked++;
        expectScaled(v, c.stats?.[k] ?? null, STAT_MULT, `stats.${k}`, report, file, id);
      }
    }
    if (b.ratings) {
      for (const [k, v] of Object.entries(b.ratings)) {
        checked++;
        expectScaled(v, c.ratings?.[k] ?? null, STAT_MULT, k, report, file, id);
      }
    }
    if (b.spellPower != null) {
      checked++;
      expectScaled(b.spellPower, c.spellPower, STAT_MULT, 'spellPower', report, file, id);
    }
    if (b.statBonus) {
      for (const [k, v] of Object.entries(b.statBonus)) {
        checked++;
        expectScaled(v, c.statBonus?.[k] ?? null, STAT_MULT, `statBonus.${k}`, report, file, id);
      }
    }
    if (b.effectStats) {
      for (const [k, v] of Object.entries(b.effectStats)) {
        checked++;
        expectScaled(v, c.effectStats?.[k] ?? null, STAT_MULT, `effect.${k}`, report, file, id);
      }
    }
  }
  // New ids only on exclusive tip (added in official since exclusive origin, already present at BASE).
  const newIds = [...curItems.keys()].filter((id) => !baseItems.has(id));
  fileSummary.push({
    file,
    checked,
    mismatches: report.filter((r) => r.file === file).length,
    newIds: newIds.length,
    newIdSample: newIds.slice(0, 8),
  });
  bad += report.filter((r) => r.file === file).length;
}

const out = {
  summary: fileSummary,
  mismatches: report,
  mismatchCount: report.length,
};
writeFileSync(resolve(ROOT, 'scripts/exclusive_gear_audit.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ mismatchCount: report.length, files: fileSummary }, null, 2));
if (report.length) {
  console.log('\nFirst 40 mismatches:');
  for (const row of report.slice(0, 40)) {
    console.log(
      `- ${row.file} ${row.id} ${row.field}: base=${row.base} cur=${row.cur} want=${row.want} ratio=${row.ratio}`,
    );
  }
}
