/**
 * Exclusive-server sponsor QR panel.
 *
 * Independent of Ko-fi / Solana wallet: shows local Alipay + WeChat Pay QR images
 * under /donate/. Homepage embeds the same images in a fixed rail; Donate buttons
 * open this modal.
 */
import type { FocusManager } from './focus_manager';
import { t } from './i18n';

export const SPONSOR_QR = {
  alipay: '/donate/ali.png',
  wechat: '/donate/wx.png',
} as const;

const PANEL_ID = 'sponsor-qr-panel';
/** Ignore backdrop dismiss for this long after open: in-game touch synthesizes a
 *  click on the new full-screen backdrop, and pointer-lock release can do the same. */
const BACKDROP_DISMISS_GRACE_MS = 400;

const wiredRoots = new WeakSet<object>();

function buildQrFigure(src: string, label: string, alt: string): HTMLElement {
  const fig = document.createElement('figure');
  fig.className = 'sponsor-qr-item';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.width = 160;
  img.height = 160;
  img.decoding = 'async';
  img.loading = 'lazy';
  const caption = document.createElement('figcaption');
  caption.textContent = label;
  fig.append(img, caption);
  return fig;
}

function buildPanelBody(): HTMLElement {
  const body = document.createElement('div');
  body.className = 'sponsor-qr-body';

  const blurb = document.createElement('p');
  blurb.className = 'sponsor-qr-blurb';
  blurb.id = 'sponsor-qr-blurb';
  blurb.textContent = t('sponsor.blurb');

  const grid = document.createElement('div');
  grid.className = 'sponsor-qr-grid';
  grid.append(
    buildQrFigure(SPONSOR_QR.alipay, t('sponsor.alipay'), t('sponsor.alipayAlt')),
    buildQrFigure(SPONSOR_QR.wechat, t('sponsor.wechat'), t('sponsor.wechatAlt')),
  );

  body.append(blurb, grid);
  return body;
}

/** True while the exclusive sponsor QR modal is mounted. */
export function isSponsorQrPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null;
}

/** Close any open sponsor modal (idempotent). */
export function closeSponsorQrPanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

/**
 * Open a focus-trapped modal that shows the Alipay and WeChat Pay QR codes.
 * Replaces the overseas Ko-fi / wallet donate entry on the exclusive server.
 */
export function openSponsorQrPanel(focusManager: FocusManager): void {
  closeSponsorQrPanel();

  // Free the game cursor so the player can read / screenshot the QR codes.
  try {
    document.exitPointerLock?.();
  } catch {
    /* ignore */
  }

  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const back = document.createElement('div');
  back.id = PANEL_ID;
  back.className = 'modal-backdrop sponsor-qr-backdrop';

  const panel = document.createElement('div');
  panel.className = 'panel sponsor-qr-modal';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'sponsor-qr-title');
  panel.setAttribute('aria-describedby', 'sponsor-qr-blurb');
  panel.tabIndex = -1;

  const titleRow = document.createElement('div');
  titleRow.className = 'panel-title';
  const title = document.createElement('span');
  title.id = 'sponsor-qr-title';
  title.textContent = t('sponsor.title');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'x-btn sponsor-qr-close';
  closeBtn.setAttribute('aria-label', t('skinEvent.close'));
  closeBtn.textContent = '×';
  titleRow.append(title, closeBtn);

  panel.append(titleRow, buildPanelBody());
  back.appendChild(panel);
  document.body.appendChild(back);

  const focusHandle = focusManager.open({ root: () => panel, returnFocusTo: opener });
  const openedAt = performance.now();
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('click', onOpeningGestureCapture, true);
    back.remove();
    focusHandle.release(true);
  };
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    close();
  };
  // Capture-phase swallow: the opening tap/click (or pointer-lock unlock ghost
  // click) is often retargeted onto this brand-new full-screen backdrop. Stop it
  // before the bubble-phase dismiss handler, and before any other document click
  // listener can treat the overlay as an outside tap.
  const onOpeningGestureCapture = (ev: Event): void => {
    if (closed) return;
    if (performance.now() - openedAt >= BACKDROP_DISMISS_GRACE_MS) return;
    if (ev.target !== back) return;
    ev.preventDefault();
    ev.stopPropagation();
  };
  closeBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    close();
  });
  // Defer backdrop dismiss so the opening tap/click (or pointer-lock unlock
  // ghost click) cannot immediately close the brand-new overlay.
  back.addEventListener('click', (ev) => {
    if (ev.target !== back) return;
    if (performance.now() - openedAt < BACKDROP_DISMISS_GRACE_MS) return;
    close();
  });
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('click', onOpeningGestureCapture, true);
  closeBtn.focus();
}

/**
 * Bind Donate controls under `root` to open the QR panel.
 *
 * Uses event delegation (not per-node listeners): the in-game community Donate
 * button lives inside `#game-ui-template` and is cloned into the live DOM only
 * when `mountGameUi()` runs. Boot-time `querySelectorAll('.js-open-sponsor')`
 * never sees that node (same pitfall as `#mm-discord`), so a per-element bind
 * at module load leaves the in-game control dead.
 */
export function wireSponsorTriggers(root: ParentNode, focusManager: FocusManager): void {
  if (wiredRoots.has(root as object)) return;
  wiredRoots.add(root as object);
  root.addEventListener(
    'click',
    (ev) => {
      const node = ev.target;
      if (!(node instanceof Element)) return;
      const trigger = node.closest('.js-open-sponsor');
      if (!trigger) return;
      if (root instanceof Element && !root.contains(trigger)) return;
      ev.preventDefault();
      ev.stopPropagation();
      openSponsorQrPanel(focusManager);
    },
    true,
  );
}
