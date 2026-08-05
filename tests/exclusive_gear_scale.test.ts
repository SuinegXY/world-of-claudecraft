import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/sim/data';
import {
  EXCLUSIVE_STAT_MULT,
  EXCLUSIVE_WEAPON_MULT,
  effectiveItemStats,
  effectiveWeapon,
  isExclusiveGearItem,
  withExclusiveGearScale,
} from '../src/sim/loot/exclusive_gear_scale';
import { Sim } from '../src/sim/sim';
import { cloneItemInstancePayload } from '../src/sim/types';

describe('exclusive gear scale (grant-time stamp)', () => {
  it('stamps exclusiveScaled once and is idempotent', () => {
    const sword = ITEMS.worn_sword;
    expect(sword).toBeTruthy();
    if (!sword) return;
    expect(isExclusiveGearItem(sword)).toBe(true);
    const once = withExclusiveGearScale(undefined, sword);
    expect(once?.exclusiveScaled).toBe(true);
    const twice = withExclusiveGearScale(once, sword);
    expect(twice).toBe(once);
    expect(twice?.exclusiveScaled).toBe(true);
  });

  it('multiplies weapon x2 and primary stats x5 only when stamped', () => {
    const sword = ITEMS.worn_sword;
    expect(sword?.weapon).toBeTruthy();
    if (!sword?.weapon) return;
    // Official authored tables stay unscaled.
    expect(sword.weapon.min).toBe(2);
    expect(sword.weapon.max).toBe(5);
    const plain = effectiveWeapon(sword, undefined);
    expect(plain?.min).toBe(2);
    expect(plain?.max).toBe(5);
    const stamped = withExclusiveGearScale(undefined, sword);
    const scaled = effectiveWeapon(sword, stamped);
    expect(scaled?.min).toBe(2 * EXCLUSIVE_WEAPON_MULT);
    expect(scaled?.max).toBe(5 * EXCLUSIVE_WEAPON_MULT);
  });

  it('scales armor primaries x5 when stamped', () => {
    const staff = ITEMS.gnarled_staff;
    expect(staff?.stats?.int).toBe(1);
    if (!staff) return;
    const stamped = withExclusiveGearScale(undefined, staff);
    const stats = effectiveItemStats(staff, stamped);
    expect(stats?.int).toBe(1 * EXCLUSIVE_STAT_MULT);
  });

  it('cloneItemInstancePayload preserves exclusiveScaled', () => {
    const src = { exclusiveScaled: true as const, secondary: { critRating: 9 } };
    const copy = cloneItemInstancePayload(src);
    expect(copy.exclusiveScaled).toBe(true);
    expect(copy.secondary).toEqual(src.secondary);
  });

  it('addItem stamps gear and equip applies scaled weapon damage', () => {
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(1);
    const before = { ...sim.player.weapon };
    sim.addItem('worn_sword', 1);
    const bag = sim.inventory.find((s) => s.itemId === 'worn_sword');
    expect(bag?.instance?.exclusiveScaled).toBe(true);
    sim.equipItem('worn_sword');
    expect(sim.player.weapon.min).toBe(2 * EXCLUSIVE_WEAPON_MULT);
    expect(sim.player.weapon.max).toBe(5 * EXCLUSIVE_WEAPON_MULT);
    expect(sim.player.weapon.min).toBeGreaterThan(before.min);
  });

  it('re-granting a stamped instance via addItemInstance does not double-scale', () => {
    const sim = new Sim({ seed: 8, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(1);
    sim.addItem('worn_sword', 1);
    const bag = sim.inventory.find((s) => s.itemId === 'worn_sword');
    expect(bag?.instance?.exclusiveScaled).toBe(true);
    if (!bag?.instance) return;
    // Simulate trade: grant the same stamped payload again.
    const traded = cloneItemInstancePayload(bag.instance);
    sim.removeItem('worn_sword', 1);
    sim.addItemInstance('worn_sword', traded);
    const again = sim.inventory.find((s) => s.itemId === 'worn_sword');
    expect(again?.instance?.exclusiveScaled).toBe(true);
    sim.equipItem('worn_sword');
    // Still one x2, not x4.
    expect(sim.player.weapon.min).toBe(4);
    expect(sim.player.weapon.max).toBe(10);
  });

  it('serializeCharacter round-trip keeps exclusiveScaled on worn gear', () => {
    const sim = new Sim({ seed: 11, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(1);
    sim.addItem('worn_sword', 1);
    sim.equipItem('worn_sword');
    const saved = sim.serializeCharacter(sim.playerId);
    expect(saved?.equipmentInstance?.mainhand?.exclusiveScaled).toBe(true);
    if (!saved) return;
    const sim2 = new Sim({ seed: 12, playerClass: 'warrior', autoEquip: false, noPlayer: true });
    const pid = sim2.addPlayer('warrior', 'ScaleRT', { state: saved });
    const meta = sim2.players.get(pid);
    expect(meta?.equipmentInstance.mainhand?.exclusiveScaled).toBe(true);
    const p = sim2.entities.get(pid);
    expect(p?.weapon.min).toBe(4);
    expect(p?.weapon.max).toBe(10);
  });

  // Regression: addPlayer used to iterate the removed EQUIP_SLOTS name and throw
  // ReferenceError during ws auth / character join. Pre-exclusive saves also have
  // worn gear with no equipmentInstance; the live ALL_EQUIP_SLOTS path must stamp
  // every worn slot including offhand.
  it('addPlayer stamps pre-exclusive worn gear including offhand without crashing', () => {
    const sim = new Sim({ seed: 13, playerClass: 'warrior', autoEquip: false });
    sim.setPlayerLevel(40);
    expect(sim.setSpec('fury')).toBe(true);
    sim.addItem('worn_sword', 2);
    sim.equipItem('worn_sword');
    sim.equipItemToSlot('worn_sword', 'offhand');
    const saved = sim.serializeCharacter(sim.playerId);
    expect(saved).toBeTruthy();
    if (!saved) return;
    // Strip instances to mimic a pre-exclusive save (worn ids only).
    delete saved.equipmentInstance;
    expect(saved.equipment.mainhand).toBe('worn_sword');
    expect(saved.equipment.offhand).toBe('worn_sword');

    const sim2 = new Sim({ seed: 14, playerClass: 'warrior', autoEquip: false, noPlayer: true });
    const pid = sim2.addPlayer('warrior', 'PreExcl', { state: saved });
    const meta = sim2.players.get(pid);
    expect(meta?.equipmentInstance.mainhand?.exclusiveScaled).toBe(true);
    expect(meta?.equipmentInstance.offhand?.exclusiveScaled).toBe(true);
  });
});
