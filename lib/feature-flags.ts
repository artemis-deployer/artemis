import { zkFlags } from "./zk-flags";

function enabled(name: string): boolean {
  const value = (process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

export function publicFeatureFlags() {
  const zk = zkFlags();
  const zkConfigured = Boolean(
    process.env.DATABASE_URL?.trim() &&
    process.env.RECLAIM_APP_ID?.trim() &&
    process.env.RECLAIM_APP_SECRET?.trim() &&
    process.env.RECLAIM_PROVIDER_ID_X?.trim(),
  );
  const zkEnabled = zk.enabled && zkConfigured;
  return {
    zk: {
      enabled: zkEnabled,
      uiEnabled: zkEnabled && zk.uiEnabled,
      badgePublic: zkEnabled && zk.badgePublic,
      landingSection: zkEnabled && zk.landingSection,
    },
    shield: {
      enabled: enabled("SHIELD_ENABLED"),
      // The current custom Merkle format has no compatible proving circuit.
      // These remain hard-off even if a deployment sets optimistic env flags.
      depositEnabled: false,
      withdrawEnabled: false,
    },
  };
}
