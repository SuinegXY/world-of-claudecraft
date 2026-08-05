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

/**
 * Claudium economy service proxy (/api/claudium/*). Default off: the service
 * lives overseas and CN realms cannot reach it. Even when WOC_ECONOMY_* is set,
 * call sites must also see CLAUDIUM_OUTBOUND_ENABLED=1 before dialing out.
 */
export function claudiumOutboundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.CLAUDIUM_OUTBOUND_ENABLED);
}

/**
 * Daily-rewards payout service (WOC_DAILY_REWARD_SERVICE_URL). Default off:
 * wallet-gated WOC prizes and the overseas payout service are not used on the
 * exclusive realm. Opt in with DAILY_REWARDS_OUTBOUND_ENABLED=1.
 */
export function dailyRewardsOutboundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.DAILY_REWARDS_OUTBOUND_ENABLED);
}

/**
 * Client perf-report ingestion (/api/perf-report). Default off on exclusive:
 * same-origin (not overseas), but the community telemetry path is unused here.
 * Opt in with PERF_REPORT_ENABLED=1.
 */
export function perfReportEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.PERF_REPORT_ENABLED);
}

/**
 * Site-presence heartbeat (/api/site-presence). Default off on exclusive:
 * anonymous homepage visitor telemetry for the admin dashboard, unused here.
 * Opt in with SITE_PRESENCE_ENABLED=1.
 */
export function sitePresenceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.SITE_PRESENCE_ENABLED);
}

/**
 * Discord OAuth, bot gateway, and discord.com REST. Default off on exclusive:
 * Discord is unreachable from CN realms. Keep OAuth/rewards code; call sites
 * must also see DISCORD_OUTBOUND_ENABLED=1 (plus the usual Discord credentials)
 * before dialing out. Client UI soft-disable is VITE_DISCORD_DISABLED (default 1).
 */
export function discordOutboundEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return exclusiveFlagEnabled(env.DISCORD_OUTBOUND_ENABLED);
}
