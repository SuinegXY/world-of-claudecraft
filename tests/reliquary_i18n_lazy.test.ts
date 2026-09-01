// Exclusive CN ship: only the zh_CN Reliquary locale chunk is reachable.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../src/ui/i18n';
import {
  ensureReliquaryLocalesLoaded,
  RELIQUARY_LOCALE_LOADERS,
  reliquaryPageDesc,
  reliquaryPageName,
} from '../src/ui/reliquary_i18n';

describe('lazy reliquary locales (exclusive CN ship)', () => {
  afterEach(() => setLanguage('zh_CN'));

  it('ships only the zh_CN Reliquary locale chunk', () => {
    expect(Object.keys(RELIQUARY_LOCALE_LOADERS)).toEqual(['zh_CN']);
  });

  it('loads zh_CN and resolves page names synchronously after ensure', async () => {
    await ensureReliquaryLocalesLoaded('zh_CN');
    setLanguage('zh_CN');
    expect(reliquaryPageName('conquerors_hollow_crypt')).toBe('空洞墓穴');
  });

  it('is an instant no-op for en and for an already-resident zh_CN', async () => {
    await ensureReliquaryLocalesLoaded('zh_CN');
    const spy = vi.spyOn(RELIQUARY_LOCALE_LOADERS, 'zh_CN');
    try {
      await expect(ensureReliquaryLocalesLoaded('en')).resolves.toBeUndefined();
      await ensureReliquaryLocalesLoaded('zh_CN');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('coalesces concurrent zh_CN loads onto at most one import when not yet resident', async () => {
    const spy = vi.spyOn(RELIQUARY_LOCALE_LOADERS, 'zh_CN');
    try {
      await Promise.all([
        ensureReliquaryLocalesLoaded('zh_CN'),
        ensureReliquaryLocalesLoaded('zh_CN'),
      ]);
      expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      spy.mockRestore();
    }
    setLanguage('zh_CN');
    expect(reliquaryPageName('conquerors_hollow_crypt')).toBe('空洞墓穴');
  });

  it('a locale with no chunk resolves as a no-op and keeps rendering English', async () => {
    setLanguage('en');
    await expect(ensureReliquaryLocalesLoaded('en')).resolves.toBeUndefined();
    expect(reliquaryPageName('conquerors_hollow_crypt')).toBe('The Hollow Crypt');
    expect(reliquaryPageDesc('horizons_titles')).toContain('Book of Deeds');
  });

  it('reliquary_i18n.ts carries no static VALUE import of a per-locale chunk', () => {
    const src = readFileSync(new URL('../src/ui/reliquary_i18n.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(
      /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+'\.\/reliquary_i18n\.locales\//,
    );
    expect(src).toContain("import('./reliquary_i18n.locales/");
  });
});
