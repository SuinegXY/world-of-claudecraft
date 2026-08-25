import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// db.ts requires DATABASE_URL at import time (it throws otherwise). Stub it
// before the import below so the module loads; pool.query is spied per-test
// so no real connection is ever opened.
vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgres://test/test';
});

import { getAccountsCount, pool } from '../server/db';
import { Api, apiUrl } from '../src/net/online';
import { ensureLocaleLoaded, getLanguage, setLanguage, t } from '../src/ui/i18n';

describe('i18n Translation Foundation', () => {
  beforeEach(() => {
    // Reset to base language
    setLanguage('en');
  });

  it('retrieves English translations by default', () => {
    expect(getLanguage()).toBe('en');
    expect(t('nav.home')).toBe('Home');
    expect(t('stats.playersOnline')).toBe('Players Online');
    expect(t('footer.copyright')).toBe('2026 World of ClaudeCraft');
    expect(t('footer.githubLabel')).toBe('Open Source Project');
    expect(t('nav.highscores')).toBe('High Scores');
    expect(t('nav.wiki')).toBe('Wiki');
    expect(t('nav.news')).toBe('News');
    expect(t('nav.download')).toBe('Download');
    expect(t('nav.loginRegister')).toBe('Login/Register');
    expect(t('highscores.title')).toBe('High Scores Leaderboard');
    expect(t('wiki.title')).toBe('Game Wiki & Guide');
    expect(t('news.title')).toBe('News & Updates');
    expect(t('download.title')).toBe('Download Desktop Launcher');
    expect(t('game.talents.comingSoonTitle')).toBe('Talents coming soon');
    expect(t('game.talents.comingSoonBody')).toContain('does not have talent trees yet');
  });

  it('updates language and retrieves Simplified Chinese translations', async () => {
    await ensureLocaleLoaded('zh_CN');
    setLanguage('zh_CN');
    expect(getLanguage()).toBe('zh_CN');
    expect(t('nav.home')).toBe('首页');
    expect(t('nav.play')).toBe('开始游戏');
    expect(t('footer.copyright')).toBe('2026 World of ClaudeCraft');
  });

  it('supports only the exclusive CN ship locales (en + zh_CN)', async () => {
    const ship = [
      { code: 'en' as const, play: 'Play' },
      { code: 'zh_CN' as const, play: '开始游戏' },
    ];
    for (const lang of ship) {
      await ensureLocaleLoaded(lang.code);
      setLanguage(lang.code);
      expect(getLanguage()).toBe(lang.code);
      expect(t('nav.play')).toBe(lang.play);
    }
  });

  it('persists language selection in localStorage when available', () => {
    const mockStorage: Record<string, string> = {};
    const originalLocalStorage = global.localStorage;

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
      },
      writable: true,
      configurable: true,
    });

    setLanguage('zh_CN');
    expect(global.localStorage.getItem('locale')).toBe('zh_CN');

    // Restore original localStorage
    if (originalLocalStorage) {
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
        configurable: true,
      });
    } else {
      // @ts-expect-error
      delete global.localStorage;
    }
  });
});

describe('Database helper getAccountsCount', () => {
  let querySpy: any;

  beforeEach(() => {
    querySpy = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  it('queries database and returns the integer count', async () => {
    querySpy.mockResolvedValueOnce({
      rows: [{ count: 42 }],
    });

    const count = await getAccountsCount();
    expect(count).toBe(42);
    expect(querySpy).toHaveBeenCalledTimes(1);
    expect(querySpy).toHaveBeenCalledWith('SELECT COUNT(*)::int AS count FROM accounts');
  });

  it('returns 0 when database response is empty', async () => {
    querySpy.mockResolvedValueOnce({
      rows: [],
    });

    const count = await getAccountsCount();
    expect(count).toBe(0);
  });
});

describe('Api.projectStats', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fetches and returns project stats', async () => {
    const mockStats = {
      accounts_created: 100,
      characters_created: 250,
      players_online: 10,
      realm: 'Test Realm',
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response);

    const api = new Api();
    const stats = await api.projectStats();

    expect(fetchSpy).toHaveBeenCalledWith('/api/project-stats', expect.any(Object));
    expect(stats).toEqual(mockStats);
  });

  it('throws error when request fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    } as Response);

    const api = new Api();
    await expect(api.projectStats()).rejects.toThrow('Internal Server Error');
  });
});

describe('Api URL helpers', () => {
  it('keeps browser builds same-origin when no base is configured', () => {
    expect(apiUrl('/api/status')).toBe('/api/status');
  });

  it('resolves native or realm calls against an absolute origin', () => {
    expect(apiUrl('/api/status', 'https://worldofclaudecraft.com/')).toBe(
      'https://worldofclaudecraft.com/api/status',
    );
    expect(apiUrl('https://realm.example.com/api/status', 'https://worldofclaudecraft.com')).toBe(
      'https://realm.example.com/api/status',
    );
  });
});
