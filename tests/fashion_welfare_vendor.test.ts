// Exclusive Eastbrook fashion welfare merchant: stock, price, reserved-id spawn.

import { afterEach, describe, expect, it } from 'vitest';
import { visualKeyFor } from '../src/render/characters/manifest';
import {
  FASHION_WELFARE_ENTITY_ID,
  FASHION_WELFARE_NPC,
  FASHION_WELFARE_NPC_ID,
  FASHION_WELFARE_PRICE_COPPER,
  FASHION_WELFARE_STOCK,
} from '../src/sim/content/fashion_welfare_vendor';
import { EVENT_SKIN_TOKEN_ID, MECH_CHROMAS, mechChromaItemId } from '../src/sim/content/skins';
import { WEAPON_SKIN_LIST, weaponSkinItemId } from '../src/sim/content/weapon_skins';
import { BUILTIN_WORLD, ITEMS, NPCS, setActiveWorldContent } from '../src/sim/data';
import { EASTBROOK_NPC_PLACEMENTS_BY_ID } from '../src/sim/eastbrook_layout';
import { Sim } from '../src/sim/sim';
import { INTERACT_RANGE } from '../src/sim/types';
import { worldEntityText } from '../src/ui/world_entity_i18n';

const SEED = 20061;

afterEach(() => setActiveWorldContent(null));

describe('Da Xiong fashion welfare merchant: definition', () => {
  it('stands in Eastbrook with the authored name, title, and flat 10g stock', () => {
    expect(NPCS[FASHION_WELFARE_NPC_ID]).toBe(FASHION_WELFARE_NPC);
    expect(FASHION_WELFARE_NPC.name).toBe('Da Xiong Fashion Welfare Merchant');
    expect(FASHION_WELFARE_NPC.title).toBe('Fashion Outfitter');
    expect(FASHION_WELFARE_NPC.dynamic).toBe(true);
    expect(FASHION_WELFARE_PRICE_COPPER).toBe(100_000);
    expect(FASHION_WELFARE_NPC.vendorItems).toEqual([...FASHION_WELFARE_STOCK]);
    expect(FASHION_WELFARE_STOCK).toContain(EVENT_SKIN_TOKEN_ID);
    expect(FASHION_WELFARE_STOCK).toContain('alien_armor_plate');
    for (const chroma of MECH_CHROMAS) {
      expect(FASHION_WELFARE_STOCK).toContain(mechChromaItemId(chroma.id));
    }
    for (const skin of WEAPON_SKIN_LIST) {
      const itemId = weaponSkinItemId(skin.id);
      expect(FASHION_WELFARE_STOCK).toContain(itemId);
      expect(ITEMS[itemId]?.use).toEqual({ type: 'weaponSkin', skinId: skin.id });
    }
    for (const itemId of FASHION_WELFARE_STOCK) {
      expect(ITEMS[itemId]?.buyValue, itemId).toBe(FASHION_WELFARE_PRICE_COPPER);
    }
    expect(EASTBROOK_NPC_PLACEMENTS_BY_ID[FASHION_WELFARE_NPC_ID]).toEqual({
      id: FASHION_WELFARE_NPC_ID,
      position: { x: -3, z: 6.5 },
      facing: expect.any(Number),
      anchorId: 'eastbrook_civic_well_beacon',
      bodyRadius: 0.6,
    });
    expect(FASHION_WELFARE_NPC.pos).toEqual(
      EASTBROOK_NPC_PLACEMENTS_BY_ID[FASHION_WELFARE_NPC_ID].position,
    );
  });

  it('is registered as a localizable world entity sourced from the NpcDef', () => {
    const npcs = worldEntityText.en.entities.npcs as Record<
      string,
      { name: string; title: string; greeting: string }
    >;
    expect(npcs[FASHION_WELFARE_NPC_ID]).toEqual({
      name: FASHION_WELFARE_NPC.name,
      title: FASHION_WELFARE_NPC.title,
      greeting: FASHION_WELFARE_NPC.greeting,
    });
  });

  it('renders as the villager provisioner silhouette', () => {
    expect(visualKeyFor({ kind: 'npc', templateId: FASHION_WELFARE_NPC_ID } as never)).toBe(
      'npc_villager',
    );
  });
});

describe('Da Xiong fashion welfare merchant: spawn and purchase', () => {
  it('spawns under a reserved id without shifting nextId or shared RNG', () => {
    expect(FASHION_WELFARE_ENTITY_ID).toBe(1_000_000_003);

    const npcsWithout = { ...BUILTIN_WORLD.npcs };
    delete npcsWithout[FASHION_WELFARE_NPC_ID];
    const worldWithout = { ...BUILTIN_WORLD, npcs: npcsWithout };
    setActiveWorldContent(worldWithout);
    const without = new Sim({
      seed: SEED,
      playerClass: 'warrior',
      noPlayer: true,
      world: worldWithout,
    });
    setActiveWorldContent(BUILTIN_WORLD);
    const withMerchant = new Sim({ seed: SEED, playerClass: 'warrior', noPlayer: true });

    expect(without.entities.has(FASHION_WELFARE_ENTITY_ID)).toBe(false);
    const npc = withMerchant.entities.get(FASHION_WELFARE_ENTITY_ID);
    if (!npc) throw new Error('missing fashion welfare merchant');
    expect(npc.kind).toBe('npc');
    expect(npc.templateId).toBe(FASHION_WELFARE_NPC_ID);
    expect(
      [...withMerchant.entities.keys()].filter((id) => id !== FASHION_WELFARE_ENTITY_ID),
    ).toEqual([...without.entities.keys()]);
    expect(withMerchant.nextId).toBe(without.nextId);
  });

  it('sells a cosmetic for exactly 10 gold', () => {
    const sim = new Sim({ seed: SEED, playerClass: 'warrior' });
    const pid = sim.playerId;
    const meta = sim.players.get(pid);
    if (!meta) throw new Error('missing player meta');
    const merchant = sim.entities.get(FASHION_WELFARE_ENTITY_ID);
    const player = sim.entities.get(pid);
    if (!merchant || !player) throw new Error('missing entities');

    player.pos = { ...merchant.pos };
    player.prevPos = { ...player.pos };
    sim.rebucket(player);
    expect(Math.hypot(player.pos.x - merchant.pos.x, player.pos.z - merchant.pos.z)).toBeLessThan(
      INTERACT_RANGE + 2,
    );

    meta.copper = FASHION_WELFARE_PRICE_COPPER;
    const before = sim.countItem(EVENT_SKIN_TOKEN_ID, pid);
    sim.buyItem(FASHION_WELFARE_ENTITY_ID, EVENT_SKIN_TOKEN_ID, undefined, pid);
    expect(sim.countItem(EVENT_SKIN_TOKEN_ID, pid)).toBe(before + 1);
    expect(meta.copper).toBe(0);
  });

  it('sells a weapon-skin unlock that grants ownership, parks loadout, and shows when type matches', () => {
    const sim = new Sim({ seed: SEED, playerClass: 'warrior' });
    const pid = sim.playerId;
    const meta = sim.players.get(pid);
    if (!meta) throw new Error('missing player meta');
    const merchant = sim.entities.get(FASHION_WELFARE_ENTITY_ID);
    const player = sim.entities.get(pid);
    if (!merchant || !player) throw new Error('missing entities');
    player.pos = { ...merchant.pos };
    player.prevPos = { ...player.pos };
    sim.rebucket(player);

    const skinId = 'guildmark_arming_sword';
    const itemId = weaponSkinItemId(skinId);
    meta.copper = FASHION_WELFARE_PRICE_COPPER;
    sim.buyItem(FASHION_WELFARE_ENTITY_ID, itemId, undefined, pid);
    expect(sim.countItem(itemId, pid)).toBe(1);
    expect(sim.accountCosmetics.weaponSkinIds).not.toContain(skinId);

    const result = sim.useItem(itemId, pid);
    expect(result).toEqual({ type: 'weaponSkin', skinId });
    expect(sim.countItem(itemId, pid)).toBe(0);
    expect(sim.accountCosmetics.weaponSkinIds).toContain(skinId);
    expect(sim.accountCosmetics.weaponSkinLoadout.sword).toBe(skinId);
    expect(player.mainhandItemId).toBe('worn_sword');
    expect(player.weaponSkinLoadout.sword).toBe(skinId);
    expect(player.weaponSkinId).toBe(skinId);
  });

  it('parks a mismatched weapon skin in the loadout until a matching weapon is equipped', () => {
    const sim = new Sim({ seed: SEED, playerClass: 'warrior' });
    const pid = sim.playerId;
    const player = sim.entities.get(pid);
    if (!player) throw new Error('missing player');

    const skinId = 'glaciersplit_axe';
    const itemId = weaponSkinItemId(skinId);
    sim.addItem(itemId, 1, pid);
    expect(sim.useItem(itemId, pid)).toEqual({ type: 'weaponSkin', skinId });
    expect(sim.accountCosmetics.weaponSkinIds).toContain(skinId);
    expect(sim.accountCosmetics.weaponSkinLoadout.axe).toBe(skinId);
    expect(player.weaponSkinLoadout.axe).toBe(skinId);
    expect(player.weaponSkinId).toBeNull();

    sim.addItem('rusty_hatchet', 1, pid);
    sim.equipItem('rusty_hatchet', pid);
    expect(player.mainhandItemId).toBe('rusty_hatchet');
    expect(player.weaponSkinId).toBe(skinId);
  });
});
