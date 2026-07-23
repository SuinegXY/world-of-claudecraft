---
name: exclusive-redev
description: >-
  Re-develop Chinese exclusive-server deltas on top of a fresh official release
  branch. Use when merging or rebasing onto official main/release, porting 独家
  改动 from origin/dev or prior exclusive commits (author xiongyu), adapting
  fork-only gameplay (stat multipliers, cast pushback, secondary affixes,
  Unicode names, changelog, Discord soft-disable) to a new official version,
  or when the user asks to 重新适配独家 / 官服基础上拉分支重新开发.
---

# Exclusive server re-development

Official World of ClaudeCraft advances on `main` / `release/**`. This fork keeps
player-facing exclusive deltas. Never long-lived-merge exclusive commits blindly
into a new official tip: **branch from the new official base, re-implement
exclusive intent against current APIs, then land.**

Companion skills: `changelog-sync` (Chinese `/changelog` page after a version
bump), `qa` (end-of-contribution gate).

## When to run

- Official `vX.Y.Z` (or `main`) landed and exclusive features must return
- User points at `origin/dev` / xiongyu non-merge history as the exclusive source
- A prior exclusive worktree is stale relative to a newer official tip

## Source of truth for exclusive intent

Discover commits (exclude merges):

```text
git log origin/dev --author=xiongyu --no-merges --oneline
```

Canonical exclusive player list (keep `public/changelog.html` 独家更新 aligned):

1. Class attributes ×2
2. Weapon damage ×2
3. Equipment bonus stats ×5 (item `stats` / ratings / enchant `statBonus`)
4. Player casts ignore damage pushback (no delay / rollback; interrupts unchanged)
5. Dropped gear rolls Versatility / Crit / Haste secondaries (budget = itemLevel × 3)

Also fork-ops (not always in the HTML list):

- Unicode character names (`\p{L}` lockstep in auth / auth_utils / sanitizeOfflineName)
- Chinese `/changelog` + nav `nav.exclusiveUpdates`
- Discord client UI soft-disable (`VITE_DISCORD_DISABLED` default `'1'`); do not delete OAuth/rewards code

## Workflow

Copy this checklist and track it:

```text
Exclusive redev:
- [ ] 1. Worktree off official tip
- [ ] 2. Inventory exclusive intent vs HEAD
- [ ] 3. Port P0 gameplay (pushback, names, secondary, numerical)
- [ ] 4. Adapt wire/UI to current APIs
- [ ] 5. Changelog + nav for current version
- [ ] 6. Soft Discord default-off
- [ ] 7. Tests + scoped gate
```

### 1. Isolated worktree

```text
git fetch origin
git worktree add -b feature/exclusive-vX.Y.Z <path> origin/main
# or origin/release/vX.Y.Z when that is the integration base
```

Preserve unrelated WIP on other checkouts.

### 2. Inventory (never blind cherry-pick)

For each exclusive feature, record:

| Feature | Still needed? | HEAD API drift | Port strategy |
|---|---|---|---|
| ... | yes/no | what moved | re-implement / script / skip |

**Do not cherry-pick** when the same symbols already changed upstream
(example: identity `eqi` allowlist, professions instance tooltips, dungeon retunes).

### 3. P0 gameplay ports

| Feature | Primary landing | Notes |
|---|---|---|
| Cast pushback | `src/sim/combat/damage.ts` `ignoresDamagePushback` | `if (target.kind === 'player') return true;` first |
| Unicode names | `server/auth.ts`, `src/ui/auth_utils.ts`, `src/main.ts` | Same `\p{L}` regex, three sites |
| Secondary affix | `src/sim/loot/secondary_affix.ts` + loot/entity/types/damage | Pure leaf module; tests in `tests/secondary_affix.test.ts` |
| Numerical | `scripts/exclusive_stat_scale.mjs` then content files | Re-run only on unscaled official content; script must skip if already scaled |

Numerical rules (re-apply on **current** content, not old patch hunks):

- Classes: ×2 `baseStats`, `statsPerLevel`, `baseHp`, `hpPerLevel`, `baseMana`, `manaPerLevel`, `ranged.min/max`
- Weapons: ×2 `weapon.min` / `weapon.max`; `weaponDpsBudget` → `13.4 + 0.6 * level`
- Gear: ×5 authored `stats` and item ratings; enchants ×5 `statBonus`; include `profession_items.ts` and raid `heroic_variants` rating constants
- Do not scale sellValue, mob HP, copper, or official dungeon floors unless product asks

### 4. Wire / UI adaptation (v0.29+ contract)

HEAD uses identity `eqi` for inspect with a public allowlist (`signer` / `enchant` / `rolled`).
Owner full payloads ride self `inv`.

Exclusive adaptation:

- Add `secondary` to the **eqi allowlist** (display-safe like `rolled`)
- Pass `secondary` through `wornTooltipInstance` / `instanceBonusStatLines`
- Self sheet: wire `vrat` next to `crat` / `hrat` / `hirat`
- **Never** `maybe('eqi', meta.equipmentInstance)` (collides with identity `eqi`)
- Keep `itemTooltip(item, instance?)`; do not revive a three-arg compare signature
- i18n: English catalog only; regenerate keys via the repo i18n pipeline

### 5. Changelog

Follow `docs/release-notes/CHANGELOG_SYNC.md` and `$changelog-sync` /
`$woc-changelog-sync`:

- 独家 first (fork deltas only)
- 官方 second (Chinese summary of the new official version)
- Nav: `#nav-btn-exclusive` on `index.html` / `play.html`, handler in `src/main.ts`
- Sitemap `/changelog`; static route in `vite.config.ts` + `server/main.ts`

Charselect news may still show English GitHub Releases; the Chinese page is the
fork surface. Do not invent `exclusive_changelog_view.ts` unless product asks.

### 6. Discord

Default `VITE_DISCORD_DISABLED` to `'1'` for this fork build. Prefer hiding UI
over deleting `discord_relay` / native Discord login / daily-reward paths.

### 7. Verify

Minimum:

```text
npx vitest run tests/secondary_affix.test.ts
npx tsc --noEmit
```

Then scoped sim/loot/auth tests touched by the port. Before calling done, run
`$woc-qa` / `docs/qa-gate.md` proportional to the diff (`npm run gate` when
required).

## Anti-patterns

- Cherry-picking old exclusive commits onto a drifted tip
- Reusing self `maybe('eqi')` against identity inspect `eqi`
- Double-running numerical scale without skip sentinels
- Mixing official Release English into the 独家 list
- Deleting the whole Discord surface on a modern official tree
- Editing `i18n.resolved.generated` or locale overlays by hand

## Output

- Feature branch / worktree with exclusive intent re-implemented
- Updated `public/changelog.html` for the official version base
- Short summary: what ported, what adapted, what skipped, commands run

Do not commit or open a PR unless the user explicitly asks.
