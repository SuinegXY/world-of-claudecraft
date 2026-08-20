// Exclusive-server secondary affixes on dropped gear: Versatility / Crit / Haste.
// Pure leaf (Rng only): roll at loot time, persist on ItemInstancePayload.secondary,
// and recalcPlayerStats folds the ratings into combat. Total points = itemLevel * 3,
// split across two randomly chosen ratings.
import { itemLevel } from '../item_level';
import { requiredLevelFor } from '../item_level_req';
import type { Rng } from '../rng';
import type { ItemDef, ItemInstancePayload } from '../types';

export type SecondaryAffixKey = 'versatilityRating' | 'critRating' | 'hasteRating';

export const SECONDARY_AFFIX_KEYS: readonly SecondaryAffixKey[] = [
  'versatilityRating',
  'critRating',
  'hasteRating',
] as const;

export type ItemSecondaryAffix = Partial<Record<SecondaryAffixKey, number>>;

/** Neck / ring jewelry (kind 'armor', no armorType). */
export function isJewelryItem(item: ItemDef): boolean {
  return item.kind === 'armor' && (item.slot === 'neck' || item.slot === 'ring');
}

/** Equippable combat gear (not bags, junk, consumables, quest tokens). */
export function canRollSecondaryAffix(item: ItemDef): boolean {
  if (!item.slot) return false;
  return item.kind === 'armor' || item.kind === 'weapon' || item.kind === 'held_offhand';
}

/** Total secondary points granted by one drop: item level * 3 (fallback level when sourceless). */
export function secondaryAffixBudget(item: ItemDef, fallbackLevel = 1): number {
  const level = Math.max(1, itemLevel(item) ?? requiredLevelFor(item) ?? fallbackLevel);
  return level * 3;
}

/**
 * Pick two distinct secondary ratings and partition `total` points between them
 * (each gets at least 1 when total >= 2). Deterministic via `rng`.
 */
export function distributeSecondaryAffix(rng: Rng, total: number): ItemSecondaryAffix {
  const points = Math.max(0, Math.floor(total));
  if (points <= 0) return {};
  const i0 = rng.int(0, SECONDARY_AFFIX_KEYS.length - 1);
  let i1 = rng.int(0, SECONDARY_AFFIX_KEYS.length - 2);
  if (i1 >= i0) i1 += 1;
  const aKey = SECONDARY_AFFIX_KEYS[i0];
  const bKey = SECONDARY_AFFIX_KEYS[i1];
  if (aKey === undefined || bKey === undefined) return {};
  if (points === 1) return { [aKey]: 1 };
  const a = rng.int(1, points - 1);
  return { [aKey]: a, [bKey]: points - a };
}

/** Roll affixes for a drop, or null when the item is not eligible. */
export function rollSecondaryAffix(
  rng: Rng,
  item: ItemDef,
  fallbackLevel = 1,
): ItemSecondaryAffix | null {
  if (!canRollSecondaryAffix(item)) return null;
  return distributeSecondaryAffix(rng, secondaryAffixBudget(item, fallbackLevel));
}

/** Attach a rolled secondary map onto a loot/inventory instance payload. */
export function withSecondaryAffix(
  instance: ItemInstancePayload | undefined,
  secondary: ItemSecondaryAffix | null,
): ItemInstancePayload | undefined {
  if (!secondary) return instance;
  const hasAny = SECONDARY_AFFIX_KEYS.some((k) => (secondary[k] ?? 0) > 0);
  if (!hasAny) return instance;
  return { ...(instance ?? {}), secondary: { ...secondary } };
}

/**
 * Roll exclusive secondary onto jewelry (and other eligible gear) at grant time.
 * Returns undefined when the item does not roll, so callers can fall back to
 * plain addItem.
 */
export function rolledSecondaryInstance(
  rng: Rng,
  item: ItemDef,
  fallbackLevel = 1,
): ItemInstancePayload | undefined {
  return withSecondaryAffix(undefined, rollSecondaryAffix(rng, item, fallbackLevel));
}
