// Exclusive Eastbrook fashion welfare vendor: sells every inventory cosmetic
// (class skin cache, mech skin cache, each mech chroma plate, and every Season 1
// Armory weapon-skin unlock token) for a flat 10 gold. Dynamic + reserved entity
// id so adding him never shifts nextId or the shared world-gen rng stream (same
// pattern as FURY / Warmarshal Kole).

import { EASTBROOK_NPC_PLACEMENTS_BY_ID } from '../eastbrook_layout';
import type { ItemDef, NpcDef } from '../types';
import { EVENT_SKIN_TOKEN_ID, MECH_CHROMAS, mechChromaItemId } from './skins';
import { WEAPON_SKIN_LIST, weaponSkinItemId } from './weapon_skins';

/** Content key of the Eastbrook fashion welfare merchant. */
export const FASHION_WELFARE_NPC_ID = 'da_xiong_fashion_welfare_merchant';

/** Reserved entity id outside the sequential nextId allocator. */
export const FASHION_WELFARE_ENTITY_ID = 1_000_000_003;

/** Flat vendor price: 10 gold in copper. */
export const FASHION_WELFARE_PRICE_COPPER = 10 * 10_000;

// English display names for unlock tokens: lockstep with armorySkinStrings.name
// in src/ui/i18n.catalog/armory.ts (the sim cannot import ui/).
const WEAPON_SKIN_UNLOCK_NAMES: Readonly<Record<string, string>> = {
  guildmark_arming_sword: 'Guildmark Arming Sword',
  brasscap_axe: 'Brasscap Hatchet',
  tempered_flanged_mace: 'Tempered Flanged Mace',
  guildmark_dirk: 'Guildmark Dirk',
  brasscrown_staff: 'Brasscrown Walking Staff',
  lacquered_wand: 'Lacquered Rod',
  fletcher_s_guild_bow: "Fletcher's Guild Bow",
  cinderbrand_sword: 'Cinderbrand',
  emberbite_axe: 'Emberbite',
  smoulderfall_mace: 'Smoulderfall',
  ashspark_dagger: 'Ashspark Shiv',
  forgeheart_staff: 'Forgeheart Stave',
  emberwrought_wand: 'Emberwrought Wand',
  cinderlatch_crossbow: 'Cinderlatch',
  ice_fang_sword: 'Ice Fang',
  glaciersplit_axe: 'Glaciersplit',
  rimecrusher_mace: 'Rimecrusher',
  frostbite_dagger: 'Rime Needle',
  hoarfrost_vigil_staff: 'Hoarfrost Vigil',
  everwinter_wand: 'Shard of Everwinter',
  winterbite: 'Winterbite',
  solheim_sword: 'Solheim, Last Light of the Dawn',
  skyrender_axe: "Skyrender, the Firmament's Wound",
  starfall_mace: 'Starfall, Judgment of the Heavens',
  astravyr_dagger: 'Astravyr, Fang of the Fallen Star',
  cosmarch_staff: 'Cosmarch, Spire of the Endless Void',
  emberwish_wand: 'Emberwish, Mote of the Dying Sun',
  encore_bow: 'Encore, the Second Falling Star',
  meteorlatch_crossbow: "Meteorlatch, the Sky's Last Judgment",
};

/** Bag/vendor unlock tokens for every Season 1 Armory weapon skin. */
export const FASHION_WEAPON_SKIN_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  WEAPON_SKIN_LIST.map((skin) => {
    const id = weaponSkinItemId(skin.id);
    const name = WEAPON_SKIN_UNLOCK_NAMES[skin.id];
    if (!name) throw new Error(`missing unlock display name for weapon skin ${skin.id}`);
    const def: ItemDef = {
      id,
      name,
      kind: 'tool',
      quality: skin.rarity,
      use: { type: 'weaponSkin', skinId: skin.id },
      sellValue: 0,
      buyValue: FASHION_WELFARE_PRICE_COPPER,
      noVendorSell: true,
      noDiscard: true,
      noMarketList: true,
    };
    return [id, def];
  }),
);

/** Every inventory cosmetic currently defined in content. */
export const FASHION_WELFARE_STOCK: readonly string[] = Object.freeze([
  EVENT_SKIN_TOKEN_ID,
  'alien_armor_plate',
  ...MECH_CHROMAS.map((chroma) => {
    const id = mechChromaItemId(chroma.id);
    if (!id) throw new Error(`missing mech chroma item for ${chroma.id}`);
    return id;
  }),
  ...WEAPON_SKIN_LIST.map((skin) => weaponSkinItemId(skin.id)),
]);

export const FASHION_WELFARE_NPC: NpcDef = {
  id: FASHION_WELFARE_NPC_ID,
  name: 'Da Xiong Fashion Welfare Merchant',
  title: 'Fashion Outfitter',
  pos: { ...EASTBROOK_NPC_PLACEMENTS_BY_ID[FASHION_WELFARE_NPC_ID].position },
  facing: EASTBROOK_NPC_PLACEMENTS_BY_ID[FASHION_WELFARE_NPC_ID].facing,
  color: 0xc45c26,
  questIds: [],
  vendorItems: [...FASHION_WELFARE_STOCK],
  dynamic: true,
  greeting: 'Ten gold apiece. Every look the realm already knows, boxed and ready.',
};
