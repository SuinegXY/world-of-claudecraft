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
    expect(panelSrc).toContain("alipay: '/donate/ali.png'");
    expect(panelSrc).toContain("wechat: '/donate/wx.png'");
    expect(panelSrc).toContain('export function openSponsorQrPanel');
    expect(panelSrc).toContain('export function wireSponsorTriggers');
    expect(panelSrc).toContain('BACKDROP_DISMISS_GRACE_MS');
    expect(panelSrc).toContain('exitPointerLock');
    expect(mainSrc).toContain("from './ui/sponsor_qr_panel'");
    expect(mainSrc).toContain('onDonate: () => openSponsorEntry()');
    expect(mainSrc).toContain('wireSponsorTriggers(document, sponsorFocusManager)');
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
