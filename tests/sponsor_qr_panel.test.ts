import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPONSOR_QR } from '../src/ui/sponsor_qr_panel';

describe('sponsor QR panel', () => {
  it('ships both QR assets under public/donate', () => {
    const root = join(process.cwd(), 'public', 'donate');
    expect(existsSync(join(root, 'ali.png'))).toBe(true);
    expect(existsSync(join(root, 'wx.png'))).toBe(true);
    expect(readFileSync(join(root, 'ali.png')).subarray(0, 4)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(readFileSync(join(root, 'wx.png')).subarray(0, 4)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    expect(SPONSOR_QR.alipay).toBe('/donate/ali.png');
    expect(SPONSOR_QR.wechat).toBe('/donate/wx.png');
  });

  it('keeps the panel module DOM-owned and wired from main', () => {
    const panelSrc = readFileSync(join(process.cwd(), 'src/ui/sponsor_qr_panel.ts'), 'utf8');
    const mainSrc = readFileSync(join(process.cwd(), 'src/main.ts'), 'utf8');
    const shellCss = readFileSync(join(process.cwd(), 'src/styles/shell.css'), 'utf8');
    expect(panelSrc).toContain("alipay: '/donate/ali.png'");
    expect(panelSrc).toContain("wechat: '/donate/wx.png'");
    expect(panelSrc).toContain('export function openSponsorQrPanel');
    expect(panelSrc).toContain('export function wireSponsorTriggers');
    expect(panelSrc).toContain('export function isSponsorQrPanelOpen');
    expect(panelSrc).toContain('BACKDROP_DISMISS_GRACE_MS');
    expect(panelSrc).toContain('exitPointerLock');
    // Event delegation (not per-node bind): survives #game-ui-template clone.
    // Boot-time querySelectorAll never sees the in-game community Donate button.
    expect(panelSrc).toContain("node.closest('.js-open-sponsor')");
    expect(panelSrc).toContain('wiredRoots');
    expect(panelSrc).not.toContain("querySelectorAll<HTMLElement>('.js-open-sponsor')");
    expect(mainSrc).toContain("from './ui/sponsor_qr_panel'");
    expect(mainSrc).toContain('onDonate: () => openSponsorEntry()');
    expect(mainSrc).toContain('wireSponsorTriggers(document, sponsorFocusManager)');
    expect(mainSrc).toContain('isSponsorQrPanelOpen()');
    // z-index must follow `.modal-backdrop` or equal-specificity z-index:300 wins.
    const modalAt = shellCss.indexOf('\n  .modal-backdrop {\n');
    const sponsorZAt = shellCss.indexOf('\n  .modal-backdrop.sponsor-qr-backdrop {\n');
    expect(modalAt).toBeGreaterThan(-1);
    expect(sponsorZAt).toBeGreaterThan(modalAt);
    expect(shellCss).toContain('.modal-backdrop.sponsor-qr-backdrop {\n    z-index: 10000;');
  });

  it('keeps the in-game community Donate inside the game-ui template', () => {
    // Regression pin: that control is cloned only at mountGameUi(). A boot-time
    // per-element listener never reaches it; wireSponsorTriggers must delegate.
    for (const file of ['index.html', 'play.html'] as const) {
      const html = readFileSync(join(process.cwd(), file), 'utf8');
      const start = html.indexOf('<template id="game-ui-template">');
      const end = html.indexOf('</template>', start);
      expect(start, file).toBeGreaterThan(-1);
      expect(end, file).toBeGreaterThan(start);
      const inside = html.slice(start, end);
      expect(inside, file).toContain('community-link donate js-open-sponsor');
    }
  });

  it('embeds the homepage sponsor rail with both QR images on index only', () => {
    const indexHtml = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const playHtml = readFileSync(join(process.cwd(), 'play.html'), 'utf8');
    expect(indexHtml).toContain('id="homepage-sponsor-rail"');
    expect(indexHtml).toContain('/donate/ali.png');
    expect(indexHtml).toContain('/donate/wx.png');
    expect(playHtml).not.toContain('id="homepage-sponsor-rail"');
    expect(indexHtml).not.toContain('https://ko-fi.com/worldofclaudecraft');
    expect(playHtml).not.toContain('https://ko-fi.com/worldofclaudecraft');
  });
});
