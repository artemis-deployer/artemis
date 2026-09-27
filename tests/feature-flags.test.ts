import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicFeatureFlags } from "../lib/feature-flags";

describe("publicFeatureFlags", () => {
  beforeEach(() => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "");
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "");
    vi.stubEnv("ZK_BADGE_PUBLIC", "");
    vi.stubEnv("ZK_LANDING_SECTION", "");
    vi.stubEnv("ZK_VERIFY_ALLOWLIST", "");
    vi.stubEnv("SHIELD_ENABLED", "");
    vi.stubEnv("SHIELD_DEPOSIT_ENABLED", "true");
    vi.stubEnv("SHIELD_WITHDRAW_ENABLED", "true");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("RECLAIM_APP_ID", "");
    vi.stubEnv("RECLAIM_APP_SECRET", "");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "");
  });

  it("defaults public features off and never enables unfinished shield actions", () => {
    expect(publicFeatureFlags()).toEqual({
      zk: { enabled: false, uiEnabled: false, badgePublic: false, landingSection: false },
      shield: { enabled: false, depositEnabled: false, withdrawEnabled: false },
    });
  });

  it("keeps public Shield flags off when only the selected network changes to mainnet", () => {
    vi.stubEnv("SHIELD_CHAIN_ID", "4663");
    vi.stubEnv("SHIELD_MAINNET_VERIFIER_READY", "false");
    expect(publicFeatureFlags().shield).toEqual({ enabled: false, depositEnabled: false, withdrawEnabled: false });
  });

  it("requires the parent ZK switch before exposing child switches", () => {
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "true");
    vi.stubEnv("ZK_BADGE_PUBLIC", "true");
    vi.stubEnv("ZK_LANDING_SECTION", "true");
    expect(publicFeatureFlags().zk).toEqual({ enabled: false, uiEnabled: false, badgePublic: false, landingSection: false });
  });

  it("exposes only explicitly enabled server flags", () => {
    vi.stubEnv("ZK_VERIFY_ENABLED", "true");
    vi.stubEnv("ZK_VERIFY_UI_ENABLED", "1");
    vi.stubEnv("DATABASE_URL", "postgres://database");
    vi.stubEnv("RECLAIM_APP_ID", "app-id");
    vi.stubEnv("RECLAIM_APP_SECRET", "app-secret");
    vi.stubEnv("RECLAIM_PROVIDER_ID_X", "provider-x");
    vi.stubEnv("SHIELD_ENABLED", "1");
    expect(publicFeatureFlags()).toEqual({
      zk: { enabled: true, uiEnabled: true, badgePublic: false, landingSection: false },
      shield: { enabled: true, depositEnabled: false, withdrawEnabled: false },
    });
  });
});
