// Exclusive-server gear numerical retune at grant time (not content mutation):
// weapon damage x2, authored primary stats / ratings / spellPower x5.
// Pure leaf: stamp ItemInstancePayload.exclusiveScaled once; read paths multiply
// ItemDef fields when the flag is set. Trade / mail / bank / market re-grants
// keep the flag and never multiply again.
import type { ItemDef, ItemInstancePayload, WeaponInfo } from '../types';

export const EXCLUSIVE_WEAPON_MULT = 2;
export const EXCLUSIVE_STAT_MULT = 5;

const PRIMARY_STAT_KEYS = ['str', 'agi', 'sta', 'int', 'spi', 'armor'] as const;

/** Equippable combat gear that receives the exclusive numerical retune. */
export function isExclusiveGearItem(item: ItemDef): boolean {
  if (!item.slot) return false;
  return item.kind === 'armor' || item.kind === 'weapon' || item.kind === 'held_offhand';
}

/**
 * Idempotent stamp: eligible gear gets `exclusiveScaled: true` exactly once.
 * Already-stamped copies (trade, bank withdraw, buyback, reconnect) are unchanged.
 */
export function withExclusiveGearScale(
  instance: ItemInstancePayload | undefined,
  item: ItemDef,
): ItemInstancePayload | undefined {
  if (!isExclusiveGearItem(item)) return instance;
  if (instance?.exclusiveScaled) return instance;
  return { ...(instance ?? {}), exclusiveScaled: true };
}

export function exclusiveWeaponMult(instance?: ItemInstancePayload | null): number {
  return instance?.exclusiveScaled ? EXCLUSIVE_WEAPON_MULT : 1;
}

export function exclusiveStatMult(instance?: ItemInstancePayload | null): number {
  return instance?.exclusiveScaled ? EXCLUSIVE_STAT_MULT : 1;
}

/** Effective weapon damage for a worn/bag copy (def values x2 when stamped). */
export function effectiveWeapon(
  item: ItemDef,
  instance?: ItemInstancePayload | null,
): WeaponInfo | undefined {
  if (!item.weapon) return undefined;
  const m = exclusiveWeaponMult(instance);
  if (m === 1) return item.weapon;
  return {
    ...item.weapon,
    min: item.weapon.min * m,
    max: item.weapon.max * m,
  };
}

/** Effective authored primary stats for a copy (def values x5 when stamped). */
export function effectiveItemStats(
  item: ItemDef,
  instance?: ItemInstancePayload | null,
): NonNullable<ItemDef['stats']> | undefined {
  if (!item.stats) return undefined;
  const m = exclusiveStatMult(instance);
  if (m === 1) return item.stats;
  const out: NonNullable<ItemDef['stats']> = { ...item.stats };
  for (const k of PRIMARY_STAT_KEYS) {
    const v = item.stats[k];
    if (v !== undefined) out[k] = v * m;
  }
  return out;
}

/** Flat item rating / spell power fields scaled the same way as primaries. */
export function effectiveItemRating(
  base: number | undefined,
  instance?: ItemInstancePayload | null,
): number {
  if (!base) return 0;
  return base * exclusiveStatMult(instance);
}
