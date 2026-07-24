import { describe, expect, it } from 'vitest';
import {
  exclusiveFlagEnabled,
  githubOutboundEnabled,
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
});
