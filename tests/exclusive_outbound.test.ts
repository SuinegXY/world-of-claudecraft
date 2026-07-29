import { describe, expect, it } from 'vitest';
import {
  claudiumOutboundEnabled,
  dailyRewardsOutboundEnabled,
  exclusiveFlagEnabled,
  githubOutboundEnabled,
  perfReportEnabled,
  sitePresenceEnabled,
  solanaOutboundEnabled,
} from '../server/exclusive_outbound';

describe('exclusive_outbound gates', () => {
  it('enables only the exact string "1"', () => {
    expect(exclusiveFlagEnabled(undefined)).toBe(false);
    expect(exclusiveFlagEnabled('')).toBe(false);
    expect(exclusiveFlagEnabled('0')).toBe(false);
    expect(exclusiveFlagEnabled('true')).toBe(false);
    expect(exclusiveFlagEnabled('1')).toBe(true);
    expect(exclusiveFlagEnabled(' 1 ')).toBe(true);
  });

  it('keeps GitHub and Solana outbound off unless opted in', () => {
    expect(githubOutboundEnabled({})).toBe(false);
    expect(solanaOutboundEnabled({})).toBe(false);
    expect(githubOutboundEnabled({ GITHUB_OUTBOUND_ENABLED: '1' })).toBe(true);
    expect(solanaOutboundEnabled({ SOLANA_OUTBOUND_ENABLED: '1' })).toBe(true);
  });

  it('keeps Claudium, daily-rewards, perf-report, and site-presence off unless opted in', () => {
    expect(claudiumOutboundEnabled({})).toBe(false);
    expect(dailyRewardsOutboundEnabled({})).toBe(false);
    expect(perfReportEnabled({})).toBe(false);
    expect(sitePresenceEnabled({})).toBe(false);
    expect(claudiumOutboundEnabled({ CLAUDIUM_OUTBOUND_ENABLED: '1' })).toBe(true);
    expect(dailyRewardsOutboundEnabled({ DAILY_REWARDS_OUTBOUND_ENABLED: '1' })).toBe(true);
    expect(perfReportEnabled({ PERF_REPORT_ENABLED: '1' })).toBe(true);
    expect(sitePresenceEnabled({ SITE_PRESENCE_ENABLED: '1' })).toBe(true);
  });
});
