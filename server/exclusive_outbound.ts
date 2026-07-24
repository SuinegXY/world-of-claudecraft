// Exclusive China-reachable defaults: foreign outbound APIs stay off unless
// explicitly re-enabled. Official behavior is restored with the matching
// *_OUTBOUND_ENABLED=1 env (see .env.example). Pure helpers stay import-safe
// for Vitest; callers pass process.env (or a stub) so tests do not need to
// mutate the real environment at module load.

/** True only when the env value is exactly the string "1" (after trim). */
export function exclusiveFlagEnabled(value: string | undefined): boolean {
  return String(value ?? '').trim() === '1';
}

/** GitHub Releases + contributors API (api.github.com). Default off. */
export function githubOutboundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.GITHUB_OUTBOUND_ENABLED);
}

/**
 * Solana JSON-RPC for $WOC balances / holder-tier flair. Default off.
 * Does not invent a public RPC URL when disabled.
 */
export function solanaOutboundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.SOLANA_OUTBOUND_ENABLED);
}
