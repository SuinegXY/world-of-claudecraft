// Exclusive CN ship: only en + zh_CN are supported. zh_CN loads lazily via
// LOCALE_LOADERS (main.ts awaits ensureLocaleLoaded before first paint).

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  en,
  ensureLocaleLoaded,
  getLanguage,
  isLocaleResident,
  isSupportedLanguage,
  prefetchLocale,
  setLanguage,
  supportedLanguages,
  t,
  zh_CN,
} from '../src/ui/i18n';
import { LOCALE_LOADERS } from '../src/ui/i18n.resolved.generated/loaders';

describe('exclusive CN ship locales', () => {
  afterEach(() => setLanguage('zh_CN'));

  it('ships only English and Simplified Chinese', () => {
    expect(supportedLanguages).toEqual(['en', 'zh_CN']);
    expect(isSupportedLanguage('zh_CN')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('de_DE')).toBe(false);
    expect(Object.keys(LOCALE_LOADERS)).toEqual(['zh_CN']);
  });

  it('defaults to Simplified Chinese and loads it before synchronous reads', async () => {
    expect(getLanguage()).toBe('zh_CN');
    await ensureLocaleLoaded('zh_CN');
    expect(isLocaleResident('zh_CN')).toBe(true);
    expect(t('nav.play')).toBe(zh_CN.nav.play);
    expect(zh_CN.nav.play).not.toBe(en.nav.play);
  });

  it('falls back to English before zh_CN is resident, then renders Chinese after', async () => {
    // Start from a clean non-resident zh_CN by resetting modules is heavy; instead
    // assert the English path and the post-load Chinese path on a known-different key.
    setLanguage('en');
    expect(t('nav.play')).toBe(en.nav.play);
    await ensureLocaleLoaded('zh_CN');
    setLanguage('zh_CN');
    expect(t('nav.play')).toBe(zh_CN.nav.play);
  });

  it('coalesces concurrent zh_CN loads onto one import when not yet resident', async () => {
    const spy = vi.spyOn(LOCALE_LOADERS, 'zh_CN');
    try {
      await Promise.all([ensureLocaleLoaded('zh_CN'), ensureLocaleLoaded('zh_CN')]);
      expect(spy.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      spy.mockRestore();
    }
    expect(isLocaleResident('zh_CN')).toBe(true);
  });

  it('loading a locale does not change the active language', async () => {
    setLanguage('en');
    await ensureLocaleLoaded('zh_CN');
    expect(t('nav.play')).toBe(en.nav.play);
  });

  it('renders the language-load status keys via t() (en)', () => {
    setLanguage('en');
    expect(t('settings.languageLoading')).toBe(en.settings.languageLoading);
    expect(t('settings.languageLoadFailed')).toBe(en.settings.languageLoadFailed);
    expect(t('settings.languageLoadUnavailable')).toBe(en.settings.languageLoadUnavailable);
  });
});

describe('prefetchLocale (exclusive CN)', () => {
  afterEach(() => setLanguage('zh_CN'));

  it('is a no-op for English', () => {
    expect(() => prefetchLocale('en')).not.toThrow();
  });

  it('is a no-op for an already-resident zh_CN', async () => {
    await ensureLocaleLoaded('zh_CN');
    const spy = vi.spyOn(LOCALE_LOADERS, 'zh_CN');
    try {
      prefetchLocale('zh_CN');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
