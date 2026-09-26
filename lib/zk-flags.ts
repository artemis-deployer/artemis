export type ZkFlags = {
  enabled: boolean;
  uiEnabled: boolean;
  badgePublic: boolean;
  landingSection: boolean;
  allowlist: string[];
};

function on(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true";
}

/** Server-side ZK feature flags (brief: flags read from server, never hardcoded in client). */
export function zkFlags(): ZkFlags {
  const allowlist = (process.env.ZK_VERIFY_ALLOWLIST ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
  return {
    enabled: on(process.env.ZK_VERIFY_ENABLED),
    uiEnabled: on(process.env.ZK_VERIFY_UI_ENABLED),
    badgePublic: on(process.env.ZK_BADGE_PUBLIC),
    landingSection: on(process.env.ZK_LANDING_SECTION),
    allowlist,
  };
}

/** Empty allowlist means everyone; otherwise the wallet must be listed. */
export function isWalletAllowed(flags: ZkFlags, wallet: string): boolean {
  if (flags.allowlist.length === 0) return true;
  return flags.allowlist.includes(wallet.trim().toLowerCase());
}
