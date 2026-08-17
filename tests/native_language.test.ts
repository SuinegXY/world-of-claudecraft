import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, setLanguage } from '../src/ui/i18n';
import {
  applyNativeDeviceLanguage,
  nativeDeviceLocaleList,
  resolveSupportedDeviceLanguage,
} from '../src/ui/native_language';

function storageWithLocale(
  locale: string | null,
  nativeAutoLocale: string | null = null,
): Pick<Storage, 'getItem' | 'setItem'> & { values: Map<string, string> } {
  const values = new Map<string, string>();
  if (locale) values.set('locale', locale);
  if (nativeAutoLocale) values.set('woc_native_auto_locale', nativeAutoLocale);
  return {
    values,
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    },
  };
}

describe('native device language selection', () => {
  afterEach(() => setLanguage('zh_CN'));

  it('uses an exact supported device dialect when available', () => {
    // Exclusive CN ship: only en + zh_CN are supported.
    expect(resolveSupportedDeviceLanguage(['zh-Hans-CN'])).toBe('zh_CN');
    expect(resolveSupportedDeviceLanguage(['en-US'])).toBe('en');
    expect(resolveSupportedDeviceLanguage(['fr-CA'])).toBeNull();
    expect(resolveSupportedDeviceLanguage(['zh-Hant-TW'])).toBe('zh_CN'); // zh -> zh_CN
  });

  it('falls back from device language subtags to an available game locale', () => {
    expect(resolveSupportedDeviceLanguage(['zh-SG'])).toBe('zh_CN');
    expect(resolveSupportedDeviceLanguage(['en-GB'])).toBe('en');
    expect(resolveSupportedDeviceLanguage(['de'])).toBeNull();
    expect(resolveSupportedDeviceLanguage(['es-MX'])).toBeNull();
  });

  it('returns null for unsupported device languages so Simplified Chinese remains the default', () => {
    setLanguage('zh_CN');
    expect(resolveSupportedDeviceLanguage(['ar-SA', 'hi-IN'])).toBeNull();
    expect(
      applyNativeDeviceLanguage({
        native: true,
        storage: storageWithLocale(null),
        languages: ['ar-SA'],
      }),
    ).toBeNull();
    expect(getLanguage()).toBe('zh_CN');
  });

  it('does not override an explicit saved language or URL language', () => {
    setLanguage('en');
    expect(
      applyNativeDeviceLanguage({
        native: true,
        storage: storageWithLocale('en'),
        languages: ['zh-CN'],
      }),
    ).toBeNull();
    expect(getLanguage()).toBe('en');

    expect(
      applyNativeDeviceLanguage({
        native: true,
        locationSearch: '?lang=en',
        storage: storageWithLocale(null),
        languages: ['zh-CN'],
      }),
    ).toBeNull();
    expect(getLanguage()).toBe('en');
  });

  it('keeps native auto-selected languages device-driven across launches', () => {
    setLanguage('en');
    const storage = storageWithLocale('en', 'en');
    expect(
      applyNativeDeviceLanguage({
        native: true,
        storage,
        languages: ['zh-CN'],
      }),
    ).toBe('zh_CN');
    expect(getLanguage()).toBe('zh_CN');
    expect(storage.values.get('woc_native_auto_locale')).toBe('zh_CN');
  });

  it('resets an auto-managed saved locale to Simplified Chinese when the device language is unavailable', () => {
    setLanguage('en');
    expect(
      applyNativeDeviceLanguage({
        native: true,
        storage: storageWithLocale('en', 'en'),
        languages: ['ar-SA'],
      }),
    ).toBe('zh_CN');
    expect(getLanguage()).toBe('zh_CN');
  });

  it('applies a supported native device language only in native mode', () => {
    setLanguage('en');
    expect(
      applyNativeDeviceLanguage({
        native: false,
        storage: storageWithLocale(null),
        languages: ['zh-CN'],
      }),
    ).toBeNull();
    expect(getLanguage()).toBe('en');

    expect(
      applyNativeDeviceLanguage({
        native: true,
        storage: storageWithLocale(null),
        languages: ['zh-CN'],
      }),
    ).toBe('zh_CN');
    expect(getLanguage()).toBe('zh_CN');
  });

  it('deduplicates navigator.languages with navigator.language preserving priority', () => {
    expect(nativeDeviceLocaleList({ languages: ['zh-CN'], language: 'zh-CN' })).toEqual(['zh-CN']);
    expect(nativeDeviceLocaleList({ languages: ['ar-SA'], language: 'en-US' })).toEqual([
      'ar-SA',
      'en-US',
    ]);
  });
});
