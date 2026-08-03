---
name: woc-changelog-sync
description: >-
  Sync the Chinese exclusive-server changelog after merging an upstream official
  release. Use when the user merges official updates, bumps the game version,
  asks to update public/changelog.html, translate release notes, or sync 独家更新 /
  中文更新日志 after a vX.Y.Z release.
---

# Sync Chinese changelog

Refresh `public/changelog.html` after an official release merge. Follow
`docs/release-notes/CHANGELOG_SYNC.md` and the sibling Claude skill
`.claude/skills/changelog-sync/SKILL.md` for the same procedure.

## Establish version and sources

1. Read `package.json` version and homepage `#game-version`.
2. Prefer upstream English notes at `docs/release-notes/release-notes-vX.Y.Z.md`.
3. Fall back to the GitHub Release body for tag `vX.Y.Z`.
4. Read the current `public/changelog.html` and the previous Chinese draft under
   `docs/release-notes/`.

## Write the Chinese draft

Create or update `docs/release-notes/release-notes-vX.Y.md`:

- Player-facing highlights only
- Drop CI, locale-fill, malware-audit, and other operator-only verification detail
- No em dashes, en dashes, or emojis

## Update the live page and Welcome feed

Edit `public/changelog.html` and `src/ui/exclusive_changelog_view.ts` together:

1. Keep **独家更新** first. Append fork-only items only when this merge added them.
2. Replace **官方更新** with the new Chinese summary; include the version in the
   heading.
3. Sync meta / og / twitter descriptions and the hero publish date on the HTML page.
4. Bump version, published-at, and synthetic release id in
   `exclusive_changelog_view.ts`; refresh the markdown body.
5. Confirm Welcome `fetchReleases` still calls `buildExclusiveChangelogReleases()`.
6. Preserve HTML layout, CSS, and footer links.

## Verify navigation

Confirm `/changelog` still has:

- `nav.exclusiveUpdates` and `#nav-btn-exclusive`
- `src/main.ts` handler for the exclusive nav button

Run `npx vitest run tests/exclusive_changelog_view.test.ts`.

## Completion

Report the version, date string, exclusive-list changes (if any), and files touched.
Do not commit, push, or open a PR unless the user explicitly asks.
