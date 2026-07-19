import { describe, expect, it } from 'vitest';
import { ITEMS, MOBS } from '../src/sim/data';
import { createMob } from '../src/sim/entity';
import {
  canRollSecondaryAffix,
  distributeSecondaryAffix,
  rollSecondaryAffix,
  SECONDARY_AFFIX_KEYS,
  type SecondaryAffixKey,
  secondaryAffixBudget,
  withSecondaryAffix,
} from '../src/sim/loot/secondary_affix';
import { Rng } from '../src/sim/rng';
import { Sim } from '../src/sim/sim';
import { cloneItemInstancePayload, versatilityDamageFractionFromRating } from '../src/sim/types';

describe('secondary affix roll', () => {
  it('budgets itemLevel * 3 points', () => {
    const item = Object.values(ITEMS).find((i) => i.kind === 'armor');
    expect(item).toBeTruthy();
    if (!item) return;
    expect(secondaryAffixBudget(item, 5) % 3).toBe(0);
    expect(secondaryAffixBudget(item, 5)).toBeGreaterThanOrEqual(3);
  });

  it('splits the budget across exactly two ratings (when total >= 2)', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 40; i++) {
      const rolled = distributeSecondaryAffix(rng, 30);
      const keys = SECONDARY_AFFIX_KEYS.filter((k) => (rolled[k] ?? 0) > 0);
      expect(keys).toHaveLength(2);
      const a = keys[0];
      const b = keys[1];
      expect(a && b).toBeTruthy();
      if (!a || !b) return;
      expect((rolled[a] ?? 0) + (rolled[b] ?? 0)).toBe(30);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const item = Object.values(ITEMS).find((i) => canRollSecondaryAffix(i));
    expect(item).toBeTruthy();
    if (!item) return;
    const a = rollSecondaryAffix(new Rng(99), item, 10);
    const b = rollSecondaryAffix(new Rng(99), item, 10);
    expect(a).toEqual(b);
  });

  it('skips non-gear item kinds', () => {
    const junk = Object.values(ITEMS).find((i) => i.kind === 'junk' || i.kind === 'food');
    if (!junk) return;
    expect(canRollSecondaryAffix(junk)).toBe(false);
    expect(rollSecondaryAffix(new Rng(1), junk)).toBeNull();
  });

  it('cloneItemInstancePayload deep-copies secondary', () => {
    const src = withSecondaryAffix(undefined, { critRating: 12, hasteRating: 18 });
    expect(src).toBeTruthy();
    if (!src?.secondary) return;
    const copy = cloneItemInstancePayload(src);
    expect(copy.secondary).toEqual(src.secondary);
    if (!copy.secondary) return;
    copy.secondary.critRating = 99;
    expect(src.secondary.critRating).toBe(12);
  });
  it('never rolls hitRating (pool is Versatility / Crit / Haste only)', () => {
    expect(SECONDARY_AFFIX_KEYS).toEqual(['versatilityRating', 'critRating', 'hasteRating']);
    expect(SECONDARY_AFFIX_KEYS.includes('hitRating' as SecondaryAffixKey)).toBe(false);
    const rng = new Rng(7);
    for (let i = 0; i < 60; i++) {
      const rolled = distributeSecondaryAffix(rng, 24);
      expect((rolled as { hitRating?: number }).hitRating).toBeUndefined();
    }
  });

  it('survives corpse loot into inventory (grant preserves instance)', () => {
    const sim = new Sim({ seed: 21, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(10);
    const pid = sim.playerId;
    const player = sim.entities.get(pid);
    expect(player).toBeTruthy();
    if (!player) return;
    const secondary = { versatilityRating: 18, hasteRating: 12 };
    const mob = createMob(sim.nextId++, MOBS.forest_wolf, 5, {
      x: player.pos.x + 1,
      y: player.pos.y,
      z: player.pos.z,
    });
    mob.dead = true;
    mob.lootable = true;
    mob.tappedById = pid;
    mob.loot = {
      copper: 0,
      items: [{ itemId: 'militia_vest', count: 1, instance: { secondary } }],
    };
    sim.entities.set(mob.id, mob);
    expect(sim.lootCorpse(mob.id, pid)).toBe(true);
    const bag = sim.players.get(pid)?.inventory.find((s) => s.itemId === 'militia_vest');
    expect(bag?.instance?.secondary).toEqual(secondary);
  });
});

describe('secondary affix combat effects', () => {
  it('folds equipped secondary ratings into player combat stats', () => {
    const sim = new Sim({ seed: 7, playerClass: 'mage', autoEquip: false });
    sim.setPlayerLevel(20);
    const gear = Object.values(ITEMS).find(
      (i) =>
        i.kind === 'armor' &&
        i.slot === 'chest' &&
        i.armorType === 'cloth' &&
        (!i.requiredClass || i.requiredClass.includes('mage')),
    );
    expect(gear).toBeTruthy();
    if (!gear) return;
    const id = gear.id;
    sim.addItemInstance(id, { secondary: { versatilityRating: 20, critRating: 10 } });
    expect(sim.inventory.some((s) => s.itemId === id && s.instance?.secondary)).toBe(true);
    sim.equipItem(id);
    const meta = [...sim.players.values()][0];
    expect(meta).toBeTruthy();
    if (!meta) return;
    expect(meta.equipment.chest).toBe(id);
    expect(meta.equipmentInstance.chest?.secondary).toEqual({
      versatilityRating: 20,
      critRating: 10,
    });
    const p = sim.player;
    expect(p.versatilityRating).toBeGreaterThanOrEqual(20);
    expect(p.critRating).toBeGreaterThanOrEqual(10);
    expect(p.versatilityDmgBonus).toBeCloseTo(
      versatilityDamageFractionFromRating(p.versatilityRating),
      9,
    );
  });

  it('persists secondary on serializeCharacter round-trip', () => {
    const sim = new Sim({ seed: 11, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(8);
    const gear = Object.values(ITEMS).find(
      (i) =>
        i.kind === 'armor' &&
        i.slot === 'chest' &&
        (!i.requiredClass || i.requiredClass.includes('warrior')),
    );
    expect(gear).toBeTruthy();
    if (!gear) return;
    sim.addItemInstance(gear.id, { secondary: { hasteRating: 15, versatilityRating: 9 } });
    sim.equipItem(gear.id);
    const saved = sim.serializeCharacter(sim.playerId);
    expect(saved).toBeTruthy();
    if (!saved) return;
    expect(saved.equipmentInstance?.chest?.secondary).toEqual({
      hasteRating: 15,
      versatilityRating: 9,
    });
    const sim2 = new Sim({ seed: 12, playerClass: 'warrior', autoEquip: false, noPlayer: true });
    const pid = sim2.addPlayer('warrior', 'RoundTrip', { state: saved });
    const meta = sim2.players.get(pid);
    expect(meta).toBeTruthy();
    if (!meta) return;
    expect(meta.equipmentInstance.chest?.secondary).toEqual({
      hasteRating: 15,
      versatilityRating: 9,
    });
  });
});
