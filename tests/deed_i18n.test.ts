// Unit tests for the deed name/desc/title resolver (src/ui/deed_i18n.ts):
// English resolution from the live catalog, the unknown-id fallbacks, the
// ''-for-non-title gate (load-bearing: the hud inspect/nameplate surfaces
// hide entirely on ''), and the release-fill manifest shape.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEEDS } from '../src/sim/content/deeds';
import {
  DEED_LOCALE_LOADERS,
  type DeedLocaleTable,
  deedBroadcastLine,
  deedDesc,
  deedName,
  deedTitleText,
  deedTranslationManifest,
  ensureDeedLocalesLoaded,
  titledDisplayName,
  titledNameDecoration,
} from '../src/ui/deed_i18n';
import { setLanguage } from '../src/ui/i18n';

describe('deed_i18n English resolution', () => {
  it('resolves name and desc from the catalog def', () => {
    expect(deedName('prog_first_steps')).toBe('First Steps');
    expect(deedDesc('prog_first_steps')).toBe(
      'Reach level 2 and take your first step on a long road.',
    );
  });

  it('falls back for catalog-unknown ids (content drift)', () => {
    expect(deedName('removed_deed')).toBe('removed_deed');
    expect(deedDesc('removed_deed')).toBe('');
    expect(deedTitleText('removed_deed')).toBe('');
    // Prototype keys index truthy on a plain object; the hasOwn guard keeps
    // the raw-id contract for a hostile or drifted id.
    expect(deedName('__proto__')).toBe('__proto__');
    expect(deedDesc('constructor')).toBe('');
    expect(deedTitleText('__proto__')).toBe('');
  });

  it("returns title text only for title-reward deeds, '' otherwise (the hide gate)", () => {
    expect(deedTitleText('prog_veteran')).toBe('Veteran');
    expect(deedTitleText('hid_saul_footnote')).toBe('the Footnote');
    // No reward at all, and a border (non-title) reward: both hide.
    expect(deedTitleText('prog_first_steps')).toBe('');
    expect(deedTitleText('prog_prestige_10')).toBe('');
    expect(deedTitleText('dgn_deepward')).toBe('');
  });

  it('manifests one row per name and desc plus one per title reward', () => {
    const manifest = deedTranslationManifest();
    // 273 deeds x (name + desc) + the 42 shipped title rewards (both counts
    // pinned by tests/deeds_content.test.ts): the Drakelands brood pair, the
    // four Thornhollow Fields battleground deeds, the Rift coverage pair
    // (dgn_rift, dgn_rift_s_rank), the seven per-craft rare-tier profession
    // deeds, the twelve remaining starter-zone chronicle pairs, the four
    // Reliquary Curator rank bridges (3 titles + 1 border; the border has no
    // title manifest row), the three WARFARE lifetime-honor rank titles, the
    // five Phase 18 Reliquary completion-ladder titles, and the walk-in
    // castle visit pair (no title reward).
    expect(manifest.length).toBe(273 * 2 + 42);
    expect(manifest.filter((row) => row.field === 'title').length).toBe(42);
    expect(manifest).toContainEqual({
      id: 'prog_veteran',
      field: 'title',
      source: 'Veteran',
    });
    for (const row of manifest) expect(row.source.length).toBeGreaterThan(0);
  });
});

describe('deedBroadcastLine (the guild-chat news line)', () => {
  it('composes the chrome key with the earner name and the localized deed name', () => {
    expect(deedBroadcastLine('Hilda', 'prog_veteran')).toBe(
      'Hilda has accomplished a deed: Veteran',
    );
  });

  it('a catalog-unknown id degrades to the raw id, never a crash or empty line', () => {
    expect(deedBroadcastLine('Hilda', 'removed_deed')).toBe(
      'Hilda has accomplished a deed: removed_deed',
    );
  });

  it('the HUD switch arm stays wired to this composer with the guild-chat green', () => {
    // hud.ts cannot be unit-driven (DOM monolith); the live wiring was
    // verified end to end against a real server, and this source pin keeps
    // the arm from being dropped or detached from the pinned composer. The
    // deed slot renders as the splice sentinel so the name lands as a
    // clickable jump node (deed_chat_line.ts); the template still comes from
    // this module (deedBroadcastRendered, which deedBroadcastLine shares).
    const hudSrc = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    const arm = hudSrc.slice(hudSrc.indexOf("case 'deedBroadcast'"));
    expect(arm.length).toBeGreaterThan(0);
    expect(arm.slice(0, 900)).toContain('deedBroadcastRendered(ev.characterName, DEED_NAME_TOKEN)');
    expect(arm.slice(0, 900)).toContain("'#40d264'");
    expect(arm.slice(0, 900)).toContain('this.deedsWindow.openWithDeed(ev.deedId)');
  });
});

describe('titledDisplayName + titledNameDecoration (the name-plus-title pattern)', () => {
  it('decorates a titled name through the hudChrome.deeds.titledName pattern', () => {
    expect(titledDisplayName('Hilda', 'prog_veteran')).toBe('Hilda [Veteran]');
    expect(titledDisplayName('Hilda', 'hid_saul_footnote')).toBe('Hilda [the Footnote]');
  });

  it('returns the bare name for null, undefined, stale, and non-title ids', () => {
    expect(titledDisplayName('Hilda', null)).toBe('Hilda');
    expect(titledDisplayName('Hilda', undefined)).toBe('Hilda');
    expect(titledDisplayName('Hilda', 'removed_deed')).toBe('Hilda');
    expect(titledDisplayName('Hilda', 'prog_first_steps')).toBe('Hilda'); // no reward
    expect(titledDisplayName('Hilda', 'prog_prestige_10')).toBe('Hilda'); // border reward
  });

  it('splits the pattern into pre/post decoration around the name', () => {
    // The English pattern places the whole decoration after the name.
    expect(titledNameDecoration('prog_veteran')).toEqual({ pre: '', post: ' [Veteran]' });
  });

  it('collapses to empty decoration for untitled, stale, and non-title ids', () => {
    const empty = { pre: '', post: '' };
    expect(titledNameDecoration(null)).toEqual(empty);
    expect(titledNameDecoration(undefined)).toEqual(empty);
    expect(titledNameDecoration('removed_deed')).toEqual(empty);
    expect(titledNameDecoration('prog_prestige_10')).toEqual(empty);
  });

  it('the chat sender span composes through titledDisplayName over the CLOSURED raw name', () => {
    // chatLogFrom decorates only the DISPLAYED text; the context-menu handlers
    // must keep closing over the raw `name` so whisper/social lookups work,
    // and the "To {name}" whisper echo must never receive the sender's title.
    const hudSrc = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    const fn = hudSrc.slice(hudSrc.indexOf('private chatLogFrom('));
    // The window spans the sender-span setup: the name is now clickable/tappable as
    // well as right-clickable, so the contextmenu arm sits behind those handlers.
    // (widened from 2400: the classId doc comment above the --class-color stamp)
    expect(fn.slice(0, 3200)).toContain('sender.textContent = titledDisplayName(name, fromTitle);');
    expect(fn.slice(0, 3200)).toContain('this.openChatPlayerContextMenu(name, ev.clientX');
    const toWhisperArm = hudSrc.slice(hudSrc.indexOf('CHAT_TEMPLATE_KEYS.toWhisper') - 200);
    expect(toWhisperArm.slice(0, 400)).not.toContain('ev.fromTitle');
  });
});

describe('deed locale chunks (the per-base-locale release fill)', () => {
  // Exclusive CN ship: only the zh_CN deed locale chunk is reachable at runtime.
  type BaseLocale = keyof typeof DEED_LOCALE_LOADERS;
  const tables = {} as Record<BaseLocale, DeedLocaleTable>;

  beforeAll(async () => {
    const keys = Object.keys(DEED_LOCALE_LOADERS) as BaseLocale[];
    await Promise.all(
      keys.map(async (loc) => {
        tables[loc] = (await DEED_LOCALE_LOADERS[loc]!()).table;
      }),
    );
    await ensureDeedLocalesLoaded('zh_CN');
  });

  const tableLocales = (): BaseLocale[] => Object.keys(tables) as BaseLocale[];

  it('ships only the zh_CN deed locale chunk', () => {
    expect(tableLocales()).toEqual(['zh_CN']);
  });

  it.runIf(process.env.I18N_RELEASE_TIER === '1')(
    'covers every manifest row in the shipped zh_CN table',
    () => {
      const manifest = deedTranslationManifest();
      for (const lang of tableLocales()) {
        const table = tables[lang];
        for (const row of manifest) {
          const value = table[row.id]?.[row.field];
          expect(
            value !== undefined && value.trim().length > 0,
            `${lang}.${row.id}.${row.field}`,
          ).toBe(true);
        }
      }
    },
  );

  it('carries only real catalog ids, and a title exactly where the deed rewards one', () => {
    for (const lang of tableLocales()) {
      for (const [id, entry] of Object.entries(tables[lang])) {
        const def = DEEDS[id];
        expect(def, `${lang}.${id} is not a catalog deed`).toBeDefined();
        if (entry.title !== undefined) {
          expect(def?.reward?.kind, `${lang}.${id} carries a title but the deed rewards none`).toBe(
            'title',
          );
        }
      }
    }
  });

  it('keeps every value free of em/en dashes and emoji (these files sit outside the overlay copy-scan exemption)', () => {
    const forbidden =
      /[\u{2013}\u{2014}\u{2015}]|[\u{1F000}-\u{1FAFF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{2600}-\u{27BF}]|\u{FE0F}/u;
    expect(forbidden.test('a\u2014b')).toBe(true);
    expect(forbidden.test('a-b')).toBe(false);
    for (const lang of tableLocales()) {
      for (const [id, entry] of Object.entries(tables[lang])) {
        for (const field of ['name', 'desc', 'title'] as const) {
          const value = entry[field];
          if (value !== undefined) {
            expect(forbidden.test(value), `${lang}.${id}.${field}: "${value}"`).toBe(false);
          }
        }
      }
    }
  });

  it('resolves Simplified Chinese deed strings from the shipped chunk', () => {
    try {
      setLanguage('zh_CN');
      expect(deedName('prog_first_steps')).toBe('千里之行');
      expect(deedTitleText('prog_veteran')).toBe('老兵');
      expect(deedDesc('dlv_clears_50')).toBe('完成 50 次探秘。');
    } finally {
      setLanguage('en');
    }
  });
});
