import { beforeEach, describe, expect, it, vi } from "vitest";
import { isWalletAllowed, zkFlags } from "../lib/zk-flags";

describe("zk-flags", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ZK_VERIFY_ENABLED", "");
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "");
    vi.stubEnv("ZK_BADGE_PUBLIC", "");
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "");
    vi.stubEnv("ZK_LANDING_SECTION", "");
  });

  it("defaults everything to off", () => {
    expect(zkFlags()).toEqual({
      enabled: false,
      uiEnabled: false,
      badgePublic: false,
      landingSection: false,
      allowlist: [],
    });
  });

  it("accepts 1 and true as on", () => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "1");
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    const f = zkFlags();
    expect(f.enabled).toBe(true);
    expect(f.badgePublic).toBe(true);
    expect(f.uiEnabled).toBe(false);
  });

  it("parses the allowlist comma-separated and normalizes EVM wallets", () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "0x00000000000000000000000000000000000000AB, 0x00000000000000000000000000000000000000CD ,, ");
    expect(zkFlags().allowlist).toEqual([
      "0x00000000000000000000000000000000000000ab",
      "0x00000000000000000000000000000000000000cd",
    ]);
  });

  it("allows everyone when the allowlist is empty", () => {
    expect(isWalletAllowed(zkFlags(), "0xabc")).toBe(true);
  });

  it("restricts to listed wallets when the allowlist is set", () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "0x00000000000000000000000000000000000000AB");
    const f = zkFlags();
    expect(isWalletAllowed(f, "0x00000000000000000000000000000000000000ab")).toBe(true);
    expect(isWalletAllowed(f, "0x00000000000000000000000000000000000000cd")).toBe(false);
  });

  it("compares Solana allowlist entries case-sensitively", () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "So11111111111111111111111111111111111111112");
    const flags = zkFlags();
    expect(isWalletAllowed(flags, "So11111111111111111111111111111111111111112")).toBe(true);
    expect(isWalletAllowed(flags, "so11111111111111111111111111111111111111112")).toBe(false);
  });
});
