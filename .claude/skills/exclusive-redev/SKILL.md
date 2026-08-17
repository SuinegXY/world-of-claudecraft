---
name: exclusive-redev
description: >-
  Carry Chinese exclusive-server deltas onto a new official tip by branching
  feature/exclusive-v0XX from official main/release, then merging the prior
  feature/exclusive-v0(XX-1) and resolving conflicts so both official and 独家
  behavior survive. Use when official bumps (e.g. 0.37 to 0.38), when switching
  to feature/exclusive-v038 (or any exclusive-v0NN), when merging
  feature/exclusive-v037 into the new tip, or when asked to 合并上一版独家 /
  官服更新后带上独家改动 / 重新适配独家.
---

# Exclusive version bump (merge prior exclusive)

Official World of ClaudeCraft advances on `main` / `release/**`. This fork keeps
player-facing exclusive deltas on `feature/exclusive-v0NN` branches.

**Default path when a prior exclusive tip exists:** reset the new exclusive
branch to the official tip, then `git merge feature/exclusive-v0(NN-1)`. Do not
blind cherry-pick old exclusive commits. Resolve every conflict so **official
APIs win on upstream refactors** and **exclusive intent wins on fork-only
behavior**; when both changed the same site, **combine**.

Companion skills: `changelog-sync` (Chinese `/changelog` after a version bump),
`release-merge-audit` (silent-drop hazards after a large merge), `qa`.

## When to run

- Official `vX.Y.Z` (or `main`) landed and exclusive must follow
- User switches the worktree to `feature/exclusive-v0NN` that currently equals
  official tip, and asks to merge `feature/exclusive-v0(NN-1)`
- User says 合并上一版独家 / 官服更新后带上独家 / 重新适配独家

## Branch naming

| Role | Example |
|---|---|
| New exclusive tip (official base) | `feature/exclusive-v038` at `origin/main` or `release/v0.38.x` |
| Prior exclusive source | `feature/exclusive-v037` |
| Merge direction | On `v038`: `git merge feature/exclusive-v037` |

Never merge exclusive into official `main`. Exclusive absorbs official, not the reverse.

## Canonical exclusive intent

Keep `public/changelog.html` 独家更新 aligned:

1. Class attributes ×2
2. Weapon damage ×2
3. Equipment bonus stats ×5 (item `stats` / ratings / enchant `statBonus`)
4. Player casts ignore damage pushback (interrupts unchanged)
5. Dropped gear rolls Versatility / Crit / Haste secondaries (budget = itemLevel × 3)

Also fork-ops (not always in the HTML list):

- Unicode character names (`\p{L}` lockstep in auth / auth_utils / sanitizeOfflineName)
- Chinese `/changelog` + nav `nav.exclusiveUpdates`
- Discord client UI soft-disable (`VITE_DISCORD_DISABLED` default `'1'`); do not delete OAuth/rewards code
- Foreign outbound soft-disable (CN): no Google Fonts / GA / Meta Pixel / Turnstile api.js in HTML unless configured; GitHub / Solana / Claudium / daily-rewards / perf-report / site-presence off unless their `*_ENABLED=1` flags; wallet + GitHub + Claudium + Daily Rewards UI default off via `VITE_*_DISABLED`
- Locale ship set defaults to `en` + `zh_CN` (`scripts/i18n_ship_locales.mjs`). Keep full authored matcher tables keyed on `AuthoredLanguage` (exported from `src/ui/i18n.ts`); only the picker / `SUPPORTED_LANGUAGES` / `LOCALE_LOADERS` use `SupportedLanguage`. Never type a full multi-locale dict as `Record<SupportedLanguage, ...>` or tsc rejects excess keys.
- In-game donate / fashion welfare / solo raid toggles as currently on the prior exclusive tip
- Runtime gear scale via `exclusiveScaled` (`src/sim/loot/exclusive_gear_scale.ts`); do not content-mutate official item tables

## Workflow checklist

```text
Exclusive version bump:
- [ ] 1. New exclusive branch = official tip (clean tree)
- [ ] 2. Merge prior feature/exclusive-v0(NN-1)
- [ ] 3. Resolve conflicts (rules below)
- [ ] 4. Post-merge audit (overlap files + exclusive inventory)
- [ ] 5. Changelog for the new official version
- [ ] 6. Verify (tsc + exclusive tests + scoped gate)
- [ ] 7. Commit the merge only when the user asks
```

### 1. Start from official tip

```text
git fetch origin
# Preferred: already on feature/exclusive-v0NN pointing at official tip
git status --short   # must be clean before merge
git rev-parse --abbrev-ref HEAD   # expect feature/exclusive-v0NN
```

If creating fresh:

```text
git worktree add -b feature/exclusive-v0NN <path> origin/main
# or origin/release/v0.NN.x when that is the integration base
```

Preserve unrelated WIP on other checkouts.

### 2. Merge the prior exclusive tip

```text
git merge feature/exclusive-v0(NN-1)
```

Expect content conflicts on hot files (`src/main.ts`, `src/render/*`, loot,
site-presence, i18n). Auto-merge is not enough: read every conflict.

### 3. Conflict resolution rules

For each conflict hunk, classify:

| Class | Take | Examples |
|---|---|---|
| Official API / Three / render path refactor | **HEAD (official)** | r185 `lookAtFrozen` / `refreshFrozenWorldMatrix` / `presentFrame` vs old `commitManualMatrixWorld` + manual post.render |
| Official gameplay / loot / balance change | **HEAD**, then re-attach exclusive wrapper if needed | `heroicCopper` money base; keep exclusive `makeLootItem(...)` for secondary + exclusiveScaled |
| Exclusive hard-off / outbound / CN ops | **exclusive** | site-presence stub, perf-report client hard-off, Discord/UI disabled defaults |
| Exclusive gameplay / content / scripts | **exclusive** | secondary affix, exclusive_gear_scale, donate, fashion vendor, locale ship set |
| Docs naming old APIs | Rewrite to **current official symbols** | CLAUDE.md must describe r185 helpers, not r165 `commitManualMatrixWorld` |
| Both changed same call site | **Combine** | official heroicCopper draw + exclusive `makeLootItem`; keep `presentationGate` import while dropping `startPerfReporter` |

Concrete exemplars from the v037 -> v038 bump:

- `src/render/static_matrix.ts` + `renderer.ts`: keep official r185 freeze/aim/present path entirely; drop exclusive `commitManualMatrixWorld`.
- `src/sim/loot/loot_roll.ts`: keep official `heroicCopper` moneyBase; stamp items via `makeLootItem` (not bare `{ itemId, count: 1 }`).
- `src/site_presence.ts`: exclusive hard-off stub.
- `src/main.ts`: keep exclusive perf-report hard-off; keep any still-used official imports (`presentationGate`); remove imports only used by the dropped reporter.

After resolving: `git add` the conflicted files, confirm `git diff --name-only --diff-filter=U` is empty, and grep the tree for `<<<<<<<` (ignore decorative `====` rulers in old docs).

### 4. Post-merge audit (do not skip)

1. List files both sides touched (merge-base..each tip intersection) and spot-check that neither side's intent vanished without a conflict marker.
2. Confirm exclusive inventory still present: `exclusive_gear_scale`, `secondary_affix`, `ignoresDamagePushback` player arm, Unicode name regex, changelog page, outbound soft-disables, `VITE_DISCORD_DISABLED`.
3. Confirm official-only v0.NN features still present on the merged tree (example for 0.38: heroic finale gold / r185 camera helpers / resurrection range+LoS).
4. If i18n catalogs on both sides changed: run the owning i18n gen; never hand-edit `*.resolved.generated*`.
5. Optionally run `$release-merge-audit` / `$woc-release-merge-audit` on the merge commit once created.

### 5. Changelog

Follow `docs/release-notes/CHANGELOG_SYNC.md` and `$changelog-sync`:

- 独家 first (fork deltas only)
- 官方 second (Chinese summary of the new official version)
- Bump/create `docs/release-notes/release-notes-v0.NN.md` as needed

### 6. Verify

Minimum:

```text
npx vitest run tests/secondary_affix.test.ts tests/exclusive_aura.test.ts tests/imbue_exclusive.test.ts
npx tsc --noEmit
```

Then any loot / auth / net tests touched by the merge. Before calling done, run
`$woc-qa` / `docs/qa-gate.md` proportional to the diff (`node scripts/gate_select.mjs`
or `npm run gate` when required).

### 7. Commit

Do **not** commit or open a PR unless the user explicitly asks. When asked, finish
the merge with a Conventional Commit body explaining that exclusive-v0(NN-1)
landed on the official v0.NN tip and summarizing conflict policy (official APIs
kept, exclusive ops kept, combined loot path).

## Fallback: full re-implement (no prior exclusive tip)

Only when there is no usable `feature/exclusive-v0(NN-1)` (or the histories are
too divergent to merge):

1. Inventory exclusive intent from `git log origin/dev --author=xiongyu --no-merges`
   or an older exclusive tip.
2. Re-implement P0 against current APIs (do not cherry-pick drifted hunks).
3. Wire/UI: add `secondary` + `exclusiveScaled` to identity `eqi` allowlist; wire
   `vrat`; never `maybe('eqi', meta.equipmentInstance)`.
4. Numerical: classes/enchants via `scripts/exclusive_stat_scale.mjs`; gear via
   runtime `exclusiveScaled` only.

### P0 landing map

| Feature | Primary landing | Notes |
|---|---|---|
| Cast pushback | `src/sim/combat/damage.ts` `ignoresDamagePushback` | `if (target.kind === 'player') return true;` first |
| Unicode names | `server/auth.ts`, `src/ui/auth_utils.ts`, `src/main.ts` | Same `\p{L}` regex, three sites |
| Secondary affix | `src/sim/loot/secondary_affix.ts` | Tests: `tests/secondary_affix.test.ts` |
| Numerical | `exclusive_gear_scale.ts` + scale scripts | Stamp once at grant; never double-scale |

## Anti-patterns

- Cherry-picking old exclusive commits onto a drifted tip when a prior exclusive
  branch can merge instead
- Taking exclusive camera/matrix helpers over a newer official Three major (r185+)
- Dropping official heroicCopper / presentFrame / lookAtFrozen while keeping exclusive loot wrappers
- Reusing self `maybe('eqi')` against identity inspect `eqi`
- Double-running numerical scale without skip sentinels
- Mixing official Release English into the 独家 list
- Deleting the whole Discord surface on a modern official tree
- Editing `i18n.resolved.generated` or locale overlays by hand
- Leaving unused imports that only served a hard-off path (e.g. `telemetryZoneId`
  after dropping `startPerfReporter`)

## Output

- Merged `feature/exclusive-v0NN` with official tip + prior exclusive intent
- Conflict summary: official-kept / exclusive-kept / combined
- Updated changelog notes when the version changed
- Commands run and remaining risks

Do not commit or open a PR unless the user explicitly asks.
