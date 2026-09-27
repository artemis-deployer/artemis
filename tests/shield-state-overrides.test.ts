import { describe, expect, it } from "vitest";
import {
  depositsPausedOverride,
  lifetimeDepositCapOverride,
  simulatedFundedSenderOverride,
} from "../scripts/shield/pool-state-overrides.mjs";

const pool = "0x1234567890123456789012345678901234567890" as const;

describe("read-only PrivacyPool state overrides", () => {
  it("sets lifetimeDeposited to the cap at the pinned compiler storage slot", () => {
    expect(lifetimeDepositCapOverride(pool, 10n)).toEqual({
      address: pool,
      stateDiff: [{ slot: `0x${"0b".padStart(64, "0")}`, value: `0x${"0a".padStart(64, "0")}` }],
    });
  });

  it("sets only the packed depositsPaused flag and preserves guardian storage bytes", () => {
    const override = depositsPausedOverride(pool);
    expect(override.address).toBe(pool);
    expect(override.stateDiff).toEqual([{
      slot: `0x${"0a".padStart(64, "0")}`,
      value: `0x${(1n << 160n).toString(16).padStart(64, "0")}`,
    }]);
  });

  it("funds only the ephemeral simulated caller", () => {
    expect(simulatedFundedSenderOverride(pool, 100n)).toEqual({ address: pool, balance: 100n });
  });
});
