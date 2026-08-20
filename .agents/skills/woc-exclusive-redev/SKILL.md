---
name: woc-exclusive-redev
description: >-
  Carry Chinese exclusive-server deltas onto a new official tip by merging the
  prior feature/exclusive-v0(NN-1) into feature/exclusive-v0NN. Use when official
  bumps, when merging exclusive-v037 into exclusive-v038, or when asked to
  合并上一版独家 / 官服更新后带上独家 / 重新适配独家.
---

# Exclusive version bump

Follow the sibling Claude skill `.claude/skills/exclusive-redev/SKILL.md` for the
full checklist. This Codex entry is the same workflow under `$woc-exclusive-redev`.

## Quick path (preferred)

1. Ensure `feature/exclusive-v0NN` is a clean tree on the new official tip.
2. `git merge feature/exclusive-v0(NN-1)`.
3. Resolve conflicts:
   - Official wins on API / Three / render refactors (e.g. r185 `lookAtFrozen`).
   - Exclusive wins on hard-off outbound, CN ops, fork gameplay.
   - Combine when both changed one site (e.g. `heroicCopper` + `makeLootItem`).
4. Audit: exclusive inventory still present; official-only v0.NN features still present.
5. Refresh changelog via `$woc-changelog-sync` when the version changed.
6. Run exclusive tests + `npx tsc --noEmit`, then `$woc-qa`.
7. Commit the merge only when the user asks.

## Fallback (no prior exclusive tip)

Re-implement P0 against current APIs (pushback, Unicode names, secondary affix,
runtime `exclusiveScaled`); do not blind cherry-pick.

## Exclusive player list

- Class attributes ×2
- Weapon damage ×2
- Equipment bonus stats ×5 (including jewelry primaries and JEWELRY_RATING)
- Player casts ignore damage pushback
- Dropped gear Versatility / Crit / Haste secondaries (itemLevel × 3)
- Soft-disable Claudium / daily-rewards / perf-report / site-presence / Solana / GitHub outbound

Do not commit or open a PR unless the user explicitly asks.
