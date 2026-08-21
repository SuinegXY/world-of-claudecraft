---
name: woc-exclusive-redev
description: >-
  Bring Chinese exclusive-server deltas onto a fresh official release by
  branching from official main/release and merging the previous exclusive
  branch. Use when updating 独家 to vX.Y.Z, or when asked to 重新适配独家 /
  官服基础上拉分支 / 更新到0.NN. Default path is merge, not file-by-file port.
---

# Exclusive server re-development

Canonical full checklist: `.claude/skills/exclusive-redev/SKILL.md`  
This Codex entry is the same workflow under `$woc-exclusive-redev`.

## Required merge path

1. `git fetch origin`
2. Worktree / branch from the **official tip**:  
   `git worktree add -b feature/exclusive-vX.Y.Z <path> origin/main`
3. In that worktree, merge the **previous exclusive** tip only:  
   `git merge origin/feature/exclusive-v{prev}`  
   Example for v0.39: `git merge origin/feature/exclusive-v038`
4. Resolve the small conflict set (keep both official and exclusive sides when
   both added symbols). For `src/ui/i18n.resolved.generated/*`, take ours then
   `npm run i18n:gen`.
5. Bump `public/changelog.html` (独家 first, 官方 second for the new version)
   via `$woc-changelog-sync`.
6. Conclude the merge commit. Verify with `npx tsc --noEmit` and exclusive tests.

## Hard rules

- **Correct direction:** official tip ← merge previous exclusive
- **Forbidden:** previous exclusive ← merge official main (mass conflicts)
- **Forbidden:** file-by-file re-implementation when a prior exclusive branch exists
- If you reverse direction by mistake: abort and restart from the official tip

## Exclusive player list

- Class attributes ×2
- Weapon damage ×2
- Equipment bonus stats ×5
- Player casts ignore damage pushback
- Dropped gear Versatility / Crit / Haste secondaries (itemLevel × 3)

Do not commit or open a PR unless the user explicitly asks (except concluding a
merge the user already asked you to finish).
