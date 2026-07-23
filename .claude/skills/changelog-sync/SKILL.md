---
name: changelog-sync
description: >-
  Sync the Chinese exclusive-server changelog after merging an upstream official
  release. Use when the user merges official updates, bumps the game version,
  asks to update public/changelog.html, translate release notes, sync the
  Welcome Screen news feed, or sync 独家更新 / 中文更新日志 after a vX.Y.Z release.
user-invocable: true
---

# Sync Chinese changelog (exclusive server)

After merging an official World of ClaudeCraft release into this fork, refresh the
player-facing Chinese changelog page .
Canonical runbook: `docs/release-notes/CHANGELOG_SYNC.md`.

## Goal

Keep these surfaces current together:

1. `public/changelog.html` (route `/changelog`)

Page / feed order is always:

1. **独家更新** (this server's deltas only)
2. **官方更新 (vX.Y.Z)** (Chinese player summary of the new official version)

Do not paste the English GitHub Release body into the exclusive block.
The Welcome Screen must NOT fetch English `/api/releases` for this fork: wire
`fetchReleases` to `buildExclusiveChangelogReleases()`.

## Inputs

- Target version, for example `v0.28.0` (read from `package.json` / `index.html`
  `#game-version` if the user did not name it)
- Official notes: prefer `docs/release-notes/release-notes-vX.Y.Z.md` when present;
  else GitHub Release
  `https://github.com/levy-street/world-of-claudecraft/releases/tag/vX.Y.Z`
- Prior Chinese page: `public/changelog.html`
- Prior Chinese source draft: `docs/release-notes/release-notes-v*.md`
- 
## Steps

1. Confirm the merged version (`package.json` `version`, homepage `#game-version`).
2. Gather official highlights (English release notes or GitHub Release body).
3. Write or refresh the Chinese source draft:
   `docs/release-notes/release-notes-vX.Y.md`
   - Player-facing only; compress CI, toolchain, and internal verification notes
   - No em dashes, en dashes, or emojis (repo rule)
4. Update `public/changelog.html`:
   - Keep the exclusive section first; append new exclusive items only if this
     merge actually added fork-only behavior
   - Replace the official section with the new Chinese summary; title must include
     the version, for example `官方更新 (v0.28.0)`
   - Sync meta / og / twitter description version strings and the hero
     `发布日期` line
   - Preserve existing page structure, CSS, and nav/footer
5. Update `src/ui/exclusive_changelog_view.ts` in the SAME change:
   - Bump `EXCLUSIVE_CHANGELOG_VERSION`, `EXCLUSIVE_CHANGELOG_PUBLISHED_AT`, and
     `EXCLUSIVE_CHANGELOG_RELEASE_ID` (encode major*10000 + minor*100 + patch)
   - Keep `EXCLUSIVE_CHANGELOG_ITEMS` aligned with the HTML exclusive list
   - Refresh `EXCLUSIVE_OFFICIAL_BODY_MD` from the Chinese draft (独家 first)
   - Confirm `src/main.ts` still wires Welcome `fetchReleases` to
     `buildExclusiveChangelogReleases()`
6. Spot-check navigation still points at `/changelog`:
   - `nav.exclusiveUpdates`, `#nav-btn-exclusive` in `index.html` / `play.html`
   - `src/main.ts` exclusive nav handler
7. If sitemap or footer links need `/changelog`, verify them.
8. Run `npx vitest run tests/exclusive_changelog_view.test.ts`.

## Exclusive block rules

- Only fork deltas versus upstream (stat multipliers, cast rules, rolled secondaries, ...)
- New exclusive features land in the exclusive list in the same change
- Never mix official Release prose into the exclusive list

## Output

- Updated `docs/release-notes/release-notes-vX.Y.md`
- Updated `public/changelog.html`
- Short summary for the user: version, date used, whether exclusive items changed
- Do not commit or open a PR unless the user explicitly asks

## References

| Path | Role |
|---|---|
| `docs/release-notes/CHANGELOG_SYNC.md` | Human runbook |
| `public/changelog.html` | Live Chinese page |
| `src/ui/exclusive_changelog_view.ts` | Welcome Screen Chinese feed |
| `docs/release-notes/release-notes-v*.md` | Chinese source drafts |
| `docs/release-notes/release-notes-v*.*.*.md` | Upstream English notes when present |
