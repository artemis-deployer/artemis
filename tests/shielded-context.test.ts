import { describe, expect, it } from "vitest";
import { createShieldWithdrawalContext } from "../lib/shielded-client";

describe("proof-bound withdrawal context", () => {
  const args = {
    entrypoint: "0x1111111111111111111111111111111111111111" as const,
    recipient: "0x2222222222222222222222222222222222222222" as const,
    feeRecipient: "0x3333333333333333333333333333333333333333" as const,
    scope: 123n,
  };

  it("binds the recipient into the exact relay request context", () => {
    const context = createShieldWithdrawalContext(args);
    expect(context.withdrawal.processooor).toBe(args.entrypoint);
    expect(context.context).not.toBe(createShieldWithdrawalContext({ ...args, recipient: "0x4444444444444444444444444444444444444444" }).context);
  });

  it("binds the zero-fee recipient and scope too", () => {
    expect(createShieldWithdrawalContext(args).context)
      .not.toBe(createShieldWithdrawalContext({ ...args, feeRecipient: "0x5555555555555555555555555555555555555555" }).context);
    expect(createShieldWithdrawalContext(args).context)
      .not.toBe(createShieldWithdrawalContext({ ...args, scope: 124n }).context);
  });
});
