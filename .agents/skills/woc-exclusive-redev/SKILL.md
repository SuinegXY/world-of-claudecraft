---
name: woc-exclusive-redev
description: >-
  Re-develop Chinese exclusive-server deltas on top of a fresh official release
  branch. Use when merging official updates, porting 独家改动, adapting fork-only
  gameplay to a new official version, or when asked to 重新适配独家 / 官服基础上拉分支.
---

# Exclusive server re-development

Follow the sibling Claude skill `.claude/skills/exclusive-redev/SKILL.md` for the
full checklist. This Codex entry is the same workflow under `$woc-exclusive-redev`.

## Quick path

1. Create an isolated worktree from the new official tip (`main` or `release/vX.Y.Z`).
2. Inventory exclusive intent from `git log origin/dev --author=xiongyu --no-merges`
   (or the prior exclusive tip). Do not blind cherry-pick.
3. Re-implement P0: cast pushback, Unicode names, secondary affixes, numerical scale
   via `scripts/exclusive_stat_scale.mjs` (skip if already scaled).
4. Adapt wire/UI: add `secondary` to identity `eqi` allowlist + `vrat`; never
   `maybe('eqi', equipmentInstance)`.
5. Refresh `public/changelog.html` (独家 first, 官方 second) via `$woc-changelog-sync`.
6. Soft-disable Discord UI by default; do not delete OAuth/rewards code.
7. Run `npx vitest run tests/secondary_affix.test.ts`, `npx tsc --noEmit`, then `$woc-qa`.

## Exclusive player list

- Class attributes ×2
- Weapon damage ×2
- Equipment bonus stats ×5 (including jewelry primaries and JEWELRY_RATING)
- Player casts ignore damage pushback
- Dropped gear Versatility / Crit / Haste secondaries (itemLevel × 3); vendor jewelry rolls the same on purchase
- Soft-disable Claudium / daily-rewards / perf-report / Solana / GitHub outbound (opt-in env flags)

Do not commit or open a PR unless the user explicitly asks.

Include profession_items.ts and heroic_variants raid rating constants in the numerical scale; verify with node scripts/exclusive_gear_audit.mjs.
