// Exclusive-server Discord UI gate. Soft-disable by default so CN builds never
// surface Discord OAuth, invite links, or HUD widgets unless the operator sets
// VITE_DISCORD_DISABLED=0 at build time. Shared by the game client and guide.

/** True when this build exposes Discord UI and invite entry points. */
export const DISCORD_BUILD_ENABLED =
  String(import.meta.env.VITE_DISCORD_DISABLED ?? '1').trim() !== '1';
