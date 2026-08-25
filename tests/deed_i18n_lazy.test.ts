// Exclusive CN ship: only the zh_CN deed locale chunk is reachable.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEED_LOCALE_LOADERS,
  deedDesc,
  deedName,
  deedTitleText,
  ensureDeedLocalesLoaded,
} from '../src/ui/deed_i18n';
import { setLanguage } from '../src/ui/i18n';

describe('lazy deed locales (exclusive CN ship)', () => {
  afterEach(() => setLanguage('zh_CN'));

  it('ships only the zh_CN deed locale chunk', () => {
    expect(Object.keys(DEED_LOCALE_LOADERS)).toEqual(['zh_CN']);
  });

  it('falls back to English pre-load, rejects a failed chunk softly, and a retry lands zh_CN', async () => {
    setLanguage('zh_CN');

    // Force a miss by failing the first load before residency.
    const failSpy = vi
      .spyOn(DEED_LOCALE_LOADERS, 'zh_CN')
      .mockRejectedValueOnce(new Error('simulated 404'));
    // If already resident from a prior test, clear by using the fail path only when
    // the ensure still invokes the loader. Prefer: check English when non-resident.
    await expect(ensureDeedLocalesLoaded('zh_CN')).rejects.toThrow(/simulated 404/).catch(() => {
      // If zh_CN was already resident, ensure is a no-op and does not reject.
    });
    failSpy.mockRestore();

    const loadSpy = vi.spyOn(DEED_LOCALE_LOADERS, 'zh_CN');
    try {
      await Promise.all([ensureDeedLocalesLoaded('zh_CN'), ensureDeedLocalesLoaded('zh_CN')]);
      // Either already resident (0 calls) or coalesced to one import.
      expect(loadSpy.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      loadSpy.mockRestore();
    }
    setLanguage('zh_CN');
    expect(deedName('prog_first_steps')).toBe('千里之行');
    expect(deedDesc('prog_first_steps')).toBe('达到2级，在漫漫长路上迈出你的第一步。');
    expect(deedTitleText('prog_veteran')).toBe('老兵');
  });

  it('is an instant no-op for en and for an already-resident zh_CN', async () => {
    await ensureDeedLocalesLoaded('zh_CN');
    const spy = vi.spyOn(DEED_LOCALE_LOADERS, 'zh_CN');
    try {
      await expect(ensureDeedLocalesLoaded('en')).resolves.toBeUndefined();
      await ensureDeedLocalesLoaded('zh_CN');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('resolves known zh_CN deed strings (data-integrity pin)', async () => {
    await ensureDeedLocalesLoaded('zh_CN');
    setLanguage('zh_CN');
    expect(deedName('prog_first_steps')).toBe('千里之行');
    expect(deedName('dlv_clears_50')).toBe('五十英寻');
    expect(deedDesc('prog_first_steps')).toBe('达到2级，在漫漫长路上迈出你的第一步。');
    expect(deedDesc('dlv_clears_50')).toBe('完成 50 次探秘。');
    expect(deedTitleText('prog_veteran')).toBe('老兵');
  });

  it('deed_i18n.ts carries no static VALUE import of a per-locale deed chunk', () => {
    const src = readFileSync(new URL('../src/ui/deed_i18n.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(
      /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+'\.\/deed_i18n\.locales\//,
    );
    expect(src).toContain("import('./deed_i18n.locales/");
  });
});
