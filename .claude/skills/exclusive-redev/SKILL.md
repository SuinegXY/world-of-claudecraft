---
name: exclusive-redev
description: >-
  Bring Chinese exclusive-server deltas onto a fresh official release by
  branching from official main/release and merging the previous exclusive
  branch. Use when updating 独家 to vX.Y.Z, merging exclusive-v0NN onto a new
  official tip, or when the user asks to 重新适配独家 / 官服基础上拉分支 /
  更新到0.NN. Default path is merge, not file-by-file re-implementation.
---

# Exclusive server re-development

Official World of ClaudeCraft advances on `main` / `release/**`. This fork keeps
player-facing exclusive deltas on `feature/exclusive-vX.Y.Z` branches.

**Default workflow (required): merge the previous exclusive branch onto a new
branch cut from the official tip.** Do not re-implement file by file when a
prior `feature/exclusive-v*` tip exists. Do not reverse the merge direction.

Companion skills: `changelog-sync` (Chinese `/changelog` page after a version
bump), `qa` (end-of-contribution gate).

## When to run

- Official `vX.Y.Z` landed on `main` (or `release/vX.Y.Z`) and exclusive must
  move forward
- User asks to 更新到0.NN / 重新适配独家 / merge 上一版独家

## Source of truth

- **Prior exclusive tip:** `origin/feature/exclusive-v{prev}` (example: for
  v0.39, merge `origin/feature/exclusive-v038`)
- Optional intent log (exclude merges):  
  `git log origin/dev --author=xiongyu --no-merges --oneline`

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
- Ship locales may be English + Simplified Chinese only (`scripts/i18n_ship_locales.mjs`)

## Workflow (merge path)

Copy this checklist and track it:

```text
Exclusive redev (merge):
- [ ] 1. Fetch + worktree from official tip (main / release)
- [ ] 2. Merge previous exclusive branch into that worktree
- [ ] 3. Resolve ONLY the few content conflicts (keep both sides when needed)
- [ ] 4. Regenerate generated i18n; bump Chinese changelog to the new version
- [ ] 5. Conclude the merge commit
- [ ] 6. Scoped verify (tsc + exclusive tests)
```

### 1. Branch from the official tip (not from the old exclusive tip)

```text
git fetch origin
git worktree add -b feature/exclusive-vX.Y.Z <path> origin/main
# or origin/release/vX.Y.Z when that is the integration base
```

Preserve unrelated WIP on other checkouts. The new branch parent MUST be the
official tip so the tree is already at vX.Y.Z before exclusive deltas arrive.

### 2. Merge the previous exclusive branch (this direction only)

```text
cd <path>
git merge origin/feature/exclusive-v{prev}
# example for v0.39: git merge origin/feature/exclusive-v038
```

**Correct:** `official tip` ← merge `previous exclusive`  
**Wrong:** `previous exclusive` ← merge `official main`

Wrong direction pulls hundreds/thousands of official commits as the merge side
and forces mass conflict resolution. If you discover you reversed direction,
abort immediately (`git merge --abort` / hard-reset to the official tip) and
restart from step 1. Never "finish" a reversed merge.

### 3. Resolve conflicts (expect a small set)

Typical conflicts when exclusive and official both touched the same seam:

| Area | Resolution |
|---|---|
| `server/game.ts` / `src/sim/sim.ts` | Keep exclusive methods (example: weapon-skin unlock-from-item) AND official comments/APIs (example: permanent mech chroma unlock wording) |
| `src/ui/i18n.catalog/items.ts` | Keep BOTH new official item ids AND exclusive fashion unlock token ids/names |
| `src/ui/i18n.resolved.generated/*` | Take **ours** (official tip), then regenerate (step 4). Do not hand-edit |

Do not delete exclusive gameplay to silence a conflict. Do not drop official
vX.Y.Z additions to keep exclusive hunks.

### 4. Changelog + i18n after the merge tree is coherent

```text
npm run i18n:gen
```

Then refresh `public/changelog.html` (and draft under `docs/release-notes/` when
useful) via `$changelog-sync` / `$woc-changelog-sync`:

- 独家 first (fork deltas only; do not invent new exclusive bullets unless this
  merge added them)
- 官方 second (Chinese summary of **this** official version, example v0.39.0)
- Sync meta / og / twitter description version strings and the hero date line
- Confirm nav `#nav-btn-exclusive` and `/changelog` routes still work

### 5. Conclude the merge

```text
git add -A
git commit   # conclude the merge; only when the user wants a commit, or when
             # concluding an in-progress merge the user asked you to finish
```

Do not open a PR unless the user explicitly asks.

### 6. Verify

Minimum:

```text
npx tsc --noEmit
npx vitest run tests/secondary_affix.test.ts tests/exclusive_gear_scale.test.ts
```

Then scoped tests for any conflict files you edited. Before calling done, run
`$woc-qa` / `docs/qa-gate.md` proportional to the diff.

## When file-by-file re-implementation is allowed

Only if **no** prior exclusive branch exists (first exclusive cut), or the user
explicitly forbids merge and asks for a clean-room port. Then use the P0 map
below. Otherwise merge.

### P0 landing map (reference / clean-room only)

| Feature | Primary landing | Notes |
|---|---|---|
| Cast pushback | `src/sim/combat/damage.ts` `ignoresDamagePushback` | `if (target.kind === 'player') return true;` first |
| Unicode names | `server/auth.ts`, `src/ui/auth_utils.ts`, `src/main.ts` | Same `\p{L}` regex, three sites |
| Secondary affix | `src/sim/loot/secondary_affix.ts` + loot/entity/types/damage | Pure leaf; tests in `tests/secondary_affix.test.ts` |
| Numerical | grant-time `exclusive_gear_scale` + `scripts/exclusive_stat_scale.mjs` | Classes/enchants/DPS budget via script; gear x2/x5 stamped at grant |
| Wire / UI | `eqi` allowlist `secondary`; self `vrat` | Never `maybe('eqi', equipmentInstance)` |

## Anti-patterns (hard fail)

- Merging `origin/main` into the old exclusive tip (reversed direction)
- Aborting a correct merge mid-flight and restarting as reverse merge
- File-by-file re-implementation when `feature/exclusive-v{prev}` exists
- Cherry-picking scattered exclusive commits onto a drifted tip instead of
  merging the prior exclusive branch
- Reusing self `maybe('eqi')` against identity inspect `eqi`
- Double-running numerical scale without skip sentinels
- Mixing official Release English into the 独家 list
- Deleting the whole Discord surface on a modern official tree
- Hand-editing `i18n.resolved.generated` or locale overlays

## Output

- `feature/exclusive-vX.Y.Z` worktree whose first parent is the official tip and
  whose merge brings `feature/exclusive-v{prev}`
- Updated `public/changelog.html` for the new official version
- Short summary: merge parents, conflicts resolved, commands run

Do not commit or open a PR unless the user explicitly asks (except concluding a
merge the user already asked you to perform).
