import { describe, expect, it } from "vitest";
import { isShieldPoolActivated, resolveShieldGates, resolveShieldRelayer } from "../lib/shield-runtime";

describe("shield runtime activation gates", () => {
  it("keeps a mainnet pool unconfigured until its one-time activation completes", () => {
    expect(isShieldPoolActivated(4663, true, true)).toBe(false);
    expect(isShieldPoolActivated(4663, false, true)).toBe(false);
    expect(isShieldPoolActivated(4663, false, false)).toBe(true);
    expect(isShieldPoolActivated(46630, true, true)).toBe(true);
  });

  it("keeps all actions disabled by default", () => {
    expect(resolveShieldGates({} as NodeJS.ProcessEnv, true)).toEqual({ enabled: false, depositEnabled: false, withdrawEnabled: false });
  });

  it("does not activate when deployment or end-to-end readiness is missing", () => {
    const env = {
      SHIELD_ENABLED: "true",
      SHIELD_DEPOSIT_ENABLED: "true",
      SHIELD_WITHDRAW_ENABLED: "true",
      SHIELD_CHAIN_ID: "46630",
      SHIELD_CLIENT_READY: "true",
      SHIELD_INDEXER_READY: "true",
      SHIELD_RELAYER_READY: "true",
      SHIELD_REHEARSAL_COMPLETE: "true",
    } as unknown as NodeJS.ProcessEnv;
    expect(resolveShieldGates(env, false).depositEnabled).toBe(false);
    expect(resolveShieldGates(env, true).withdrawEnabled).toBe(true);
  });

  it("supports mainnet only when its explicit activation gates are all enabled", () => {
    const env = {
      SHIELD_ENABLED: "true",
      SHIELD_DEPOSIT_ENABLED: "true",
      SHIELD_WITHDRAW_ENABLED: "true",
      SHIELD_CHAIN_ID: "4663",
      SHIELD_MAINNET_VERIFIER_READY: "true",
      SHIELD_CLIENT_READY: "true",
      SHIELD_INDEXER_READY: "true",
      SHIELD_RELAYER_READY: "true",
      SHIELD_REHEARSAL_COMPLETE: "true",
    } as unknown as NodeJS.ProcessEnv;
    expect(resolveShieldGates(env, true).withdrawEnabled).toBe(true);
    expect(resolveShieldGates({ ...env, SHIELD_MAINNET_VERIFIER_READY: "false" }, true).enabled).toBe(false);
    expect(resolveShieldGates({ ...env, SHIELD_ENABLED: "false" }, true).enabled).toBe(false);
    expect(resolveShieldGates({ ...env, SHIELD_CHAIN_ID: "1" }, true).enabled).toBe(false);
  });
});

describe("single-wallet testnet operators", () => {
  const key = `0x${"0".repeat(63)}1`;
  const address = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";

  it("uses the deployment wallet for relaying when no separate relayer is configured", () => {
    expect(resolveShieldRelayer({ SHIELD_DEPLOYER_PRIVATE_KEY: key } as unknown as NodeJS.ProcessEnv))
      .toEqual({ privateKey: key, address });
  });

  it("accepts a dedicated relayer override and rejects an address mismatch", () => {
    const relayerKey = `0x${"0".repeat(63)}2`;
    expect(resolveShieldRelayer({ SHIELD_RELAYER_PRIVATE_KEY: relayerKey } as unknown as NodeJS.ProcessEnv)?.address)
      .toBe("0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF");
    expect(resolveShieldRelayer({ SHIELD_DEPLOYER_PRIVATE_KEY: key, SHIELD_RELAYER_ADDRESS: "0x1111111111111111111111111111111111111111" } as unknown as NodeJS.ProcessEnv))
      .toBeNull();
  });

  it("uses the mainnet wallet key for mainnet relay requests", () => {
    const testnetKey = `0x${"0".repeat(63)}1`;
    const mainnetKey = `0x${"0".repeat(63)}2`;
    const mainnetAddress = "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF";
    expect(resolveShieldRelayer({
      SHIELD_CHAIN_ID: "4663",
      SHIELD_DEPLOYER_PRIVATE_KEY: testnetKey,
      SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY: mainnetKey,
      SHIELD_OPERATOR_ADDRESS: mainnetAddress,
    } as unknown as NodeJS.ProcessEnv)).toEqual({ privateKey: mainnetKey, address: mainnetAddress });
    expect(resolveShieldRelayer({
      SHIELD_CHAIN_ID: "4663",
      SHIELD_DEPLOYER_PRIVATE_KEY: testnetKey,
    } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
