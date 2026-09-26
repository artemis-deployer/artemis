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

  it("parses the allowlist comma-separated and lowercase", () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "0xABC, 0xdef ,,");
    expect(zkFlags().allowlist).toEqual(["0xabc", "0xdef"]);
  });

  it("allows everyone when the allowlist is empty", () => {
    expect(isWalletAllowed(zkFlags(), "0xabc")).toBe(true);
  });

  it("restricts to listed wallets when the allowlist is set", () => {
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "0xabc");
    const f = zkFlags();
    expect(isWalletAllowed(f, "0xABC")).toBe(true);
    expect(isWalletAllowed(f, "0xdef")).toBe(false);
  });
});
