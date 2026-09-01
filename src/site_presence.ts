const STORAGE_KEY = 'woc_site_visitor_id';

function randomVisitorId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The stable per-browser visitor id (get-or-create). Exported so signup
 *  attribution (src/attribution.ts) can link the pre-signup web session to
 *  the created account; storage-unavailable degrades to an ephemeral id.
 *  Kept even when site-presence heartbeats are hard-off. */
export function visitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const next = randomVisitorId();
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return randomVisitorId();
  }
}

/** Exclusive: site-presence poster is hard-off (zero config). */
export function startSitePresence(_fallbackPage = 'home'): void {
  // Server also drops /api/site-presence unless SITE_PRESENCE_ENABLED=1.
  // visitorId() above still works for signup attribution.
}
