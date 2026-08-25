import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/sim/data';
import { EXCLUSIVE_STAT_MULT, effectiveItemStats } from '../src/sim/loot/exclusive_gear_scale';
import { canRollSecondaryAffix, SECONDARY_AFFIX_KEYS } from '../src/sim/loot/secondary_affix';
import { riftHeroicClearPool } from '../src/sim/rift/loot_pools';
import {
  addRiftClearGearLoot,
  addRiftProgressionLoot,
  createRiftGearInstance,
  sanitizeRiftGearInstance,
} from '../src/sim/rift/progression';
import { Rng } from '../src/sim/rng';
import { Sim } from '../src/sim/sim';
import type { SimContext } from '../src/sim/sim_context';
import type { Entity } from '../src/sim/types';

function secondaryKeys(instance: { secondary?: Record<string, number> } | undefined): string[] {
  if (!instance?.secondary) return [];
  return SECONDARY_AFFIX_KEYS.filter((k) => (instance.secondary?.[k] ?? 0) > 0);
}

describe('rift exclusive secondary affixes', () => {
  it('clear-time gear slots carry secondary; mounts stay plain', () => {
    let sawGear = false;
    for (let seed = 1; seed <= 80; seed++) {
      const boss = { loot: { copper: 0, items: [] }, lootable: false } as unknown as Entity;
      const ctx = { rng: new Rng(seed) } as unknown as SimContext;
      addRiftClearGearLoot(ctx, boss, 25); // A-rank: one heroic epic + mount chance
      const items = boss.loot?.items ?? [];
      for (const slot of items) {
        const itemId = slot.itemId;
        if (!itemId) continue;
        const def = ITEMS[itemId];
        expect(def, itemId).toBeTruthy();
        if (!def) continue;
        if (!canRollSecondaryAffix(def)) {
          expect(slot.instance?.secondary).toBeUndefined();
          continue;
        }
        sawGear = true;
        expect(secondaryKeys(slot.instance).length).toBe(2);
      }
    }
    expect(sawGear).toBe(true);
  });

  it('clear-time item picks for a seed are unchanged when secondary is stamped after', () => {
    // Append-only: the first gear itemId for a fixed seed must match the pick
    // that existed before secondary draws were added (pool index only).
    const boss = { loot: { copper: 0, items: [] }, lootable: false } as unknown as Entity;
    const ctx = { rng: new Rng(17) } as unknown as SimContext;
    addRiftClearGearLoot(ctx, boss, 25);
    const firstId = boss.loot?.items[0]?.itemId;
    expect(firstId).toBeTruthy();

    const pool = riftHeroicClearPool();
    const expected = pool[new Rng(17).int(0, pool.length - 1)];
    expect(firstId).toBe(expected);
  });

  it('first-clear personal rings roll secondary and sanitize keeps them', () => {
    const boss = { loot: { copper: 0, items: [] }, lootable: false } as unknown as Entity;
    const players = new Map([
      [1, { cls: 'warrior' as const, entityId: 1, name: 'A' }],
      [2, { cls: 'mage' as const, entityId: 2, name: 'B' }],
    ]);
    const ctx = {
      rng: new Rng(44),
      players,
    } as unknown as SimContext;
    addRiftProgressionLoot(ctx, boss, 'evt-1', 'A', [1, 2]);
    const rings = (boss.loot?.items ?? []).filter((s) => s.instance?.rift);
    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      expect(secondaryKeys(ring.instance).length).toBe(2);
      const itemId = ring.itemId;
      const instance = ring.instance;
      const ownerId = ring.personalFor?.[0];
      expect(itemId && instance && ownerId !== undefined).toBeTruthy();
      if (!itemId || !instance || ownerId === undefined) continue;
      const clean = sanitizeRiftGearInstance(itemId, instance, ownerId);
      expect(clean?.secondary).toEqual(instance.secondary);
      expect(clean?.exclusiveScaled).toBe(true);
    }
  });

  it('sanitize preserves exclusiveScaled even when secondary was never rolled', () => {
    const gear = createRiftGearInstance('rift-preserve-scale', 'S', 'warrior', 9);
    gear.instance.exclusiveScaled = true;
    const clean = sanitizeRiftGearInstance(gear.itemId, gear.instance, 9);
    expect(clean?.exclusiveScaled).toBe(true);
    expect(clean?.rift?.sourceEventId).toBe('rift-preserve-scale');
  });

  it('relogin restores x5 shell stats when a saved rift copy lost exclusiveScaled', () => {
    // User report: tooltip shows +30/+25 on grant, then +6/+5 after logout
    // (ItemDef shell of riftbound_band_of_guile). Simulates a save written
    // after the old sanitize stripped the stamp.
    const sim = new Sim({ seed: 91, playerClass: 'rogue', autoEquip: false });
    sim.setPlayerLevel(20);
    const gear = createRiftGearInstance('rift-relogin', 'S', 'rogue', sim.player.id);
    sim.addItemInstance(gear.itemId, gear.instance);
    sim.equipItem(gear.itemId);
    const before = sim.equipmentInstances.ring1;
    expect(before?.exclusiveScaled).toBe(true);
    const def = ITEMS[gear.itemId];
    expect(def?.stats?.agi).toBe(6);
    if (!def) return;
    expect(effectiveItemStats(def, before)?.agi).toBe(6 * EXCLUSIVE_STAT_MULT);

    const state = sim.serializeCharacter(sim.player.id);
    expect(state?.equipmentInstance?.ring1).toBeTruthy();
    if (!state?.equipmentInstance?.ring1) return;
    // Strip the stamp the way the pre-fix sanitize did on every login.
    delete state.equipmentInstance.ring1.exclusiveScaled;

    const restored = new Sim({ seed: 92, playerClass: 'rogue', noPlayer: true });
    const pid = restored.addPlayer('rogue', 'Relog', { state });
    const worn = restored.players.get(pid)?.equipmentInstance?.ring1;
    expect(worn?.exclusiveScaled).toBe(true);
    expect(worn?.rift?.sourceEventId).toBe('rift-relogin');
    expect(effectiveItemStats(def, worn)?.agi).toBe(6 * EXCLUSIVE_STAT_MULT);
    expect(effectiveItemStats(def, worn)?.sta).toBe(5 * EXCLUSIVE_STAT_MULT);
  });
});
