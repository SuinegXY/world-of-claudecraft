// Exclusive CN ship set for World of ClaudeCraft forks.
//
// Dense resolved locale modules may still be emitted for every authored overlay
// (tests and maintainer tooling import them by path). The RUNTIME picker, the
// generated SUPPORTED_LANGUAGES / LOCALE_LOADERS / translations map, and therefore
// the vite-emitted locale chunks, only include this ship set: English + Simplified
// Chinese. Override with I18N_SHIP_LOCALES=en,zh_CN,ja_JP (comma-separated) when a
// build must temporarily widen the set.

export const ALL_LOCALES = [
  'en',
  'es',
  'es_ES',
  'fr_FR',
  'fr_CA',
  'en_CA',
  'it_IT',
  'de_DE',
  'zh_CN',
  'zh_TW',
  'ko_KR',
  'ja_JP',
  'pt_BR',
  'ru_RU',
  'cs_CZ',
  'nl_NL',
  'pl_PL',
  'id_ID',
  'tr_TR',
  'sv_SE',
  'vi_VN',
  'da_DK',
];

const DEFAULT_SHIP = ['en', 'zh_CN'];

function parseShipLocales(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return [...DEFAULT_SHIP];
  const wanted = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set(ALL_LOCALES);
  const out = [];
  for (const code of wanted) {
    if (!allowed.has(code)) {
      throw new Error(`I18N_SHIP_LOCALES: unknown locale "${code}"`);
    }
    if (!out.includes(code)) out.push(code);
  }
  if (!out.includes('en')) {
    throw new Error('I18N_SHIP_LOCALES must include "en" (eager English base)');
  }
  // Preserve ALL_LOCALES order so SUPPORTED_LANGUAGES stays deterministic.
  return ALL_LOCALES.filter((code) => out.includes(code));
}

export const SHIP_LOCALES = parseShipLocales(process.env.I18N_SHIP_LOCALES);
