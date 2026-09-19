import { describe, expect, it } from "vitest";
import {
  calcEthMin,
  estimateLaunchCost,
  ETH_MIN_BPS,
  formatEth,
  getHoodConfig,
  HOOD_MAINNET,
  HOOD_TESTNET,
  launchOneTx,
  toTokenUnits,
  TX_DEADLINE_SECS,
} from "../lib/launcher-evm";

describe("hood config", () => {
  it("pins mainnet router, factory, weth", () => {
    expect(HOOD_MAINNET.router).toBe("0x89e5db8b5aa49aa85ac63f691524311aeb649eba");
    expect(HOOD_MAINNET.factory).toBe("0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f");
    expect(HOOD_MAINNET.weth).toBe("0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73");
    expect(HOOD_MAINNET.id).toBe(4663);
  });

  it("marks testnet pool unsupported", () => {
    expect(HOOD_TESTNET.router).toBeNull();
    expect(getHoodConfig(46630)).toBe(HOOD_TESTNET);
    expect(getHoodConfig(4663)).toBe(HOOD_MAINNET);
    expect(getHoodConfig(1)).toBeUndefined();
  });
});

describe("toTokenUnits", () => {
  it("scales 18 decimals", () => {
    expect(toTokenUnits("1")).toBe(1000000000000000000n);
    expect(toTokenUnits("999000000")).toBe(999000000000000000000000000n);
  });

  it("rejects bad input", () => {
    expect(() => toTokenUnits("")).toThrow();
    expect(() => toTokenUnits("abc")).toThrow();
    expect(() => toTokenUnits("-5")).toThrow();
  });
});

describe("eth min slippage", () => {
  it("pins slippage and deadline constants", () => {
    expect(ETH_MIN_BPS).toBe(9800);
    expect(TX_DEADLINE_SECS).toBe(600);
  });

  it("applies 2 percent tolerance to 1 ETH", () => {
    expect(calcEthMin(1000000000000000000n)).toBe(980000000000000000n);
  });

  it("maps zero to zero", () => {
    expect(calcEthMin(0n)).toBe(0n);
  });

  it("clamps dust to 1 wei", () => {
    expect(calcEthMin(1n)).toBe(1n);
    expect(calcEthMin(0n)).toBe(0n);
    expect(calcEthMin(10n ** 18n)).toBe(98n * 10n ** 16n);
  });
});

describe("formatEth", () => {
  it("trims to 6 decimals", () => {
    expect(formatEth(1000000000000000000n)).toBe("1");
    expect(formatEth(1500000000000000n)).toBe("0.0015");
    expect(formatEth(0n)).toBe("0");
  });
});

describe("estimateLaunchCost guards", () => {
  const base = {
    chainId: 4663 as const,
    account: "0x0000000000000000000000000000000000000001" as const,
    name: "T",
    ticker: "T",
    supply: 999000000000000000000000000n,
  };

  it("refuses bad amounts without touching RPC", async () => {
    await expect(estimateLaunchCost({ ...base, pooled: 0n, ethAmount: 1n })).rejects.toThrow("bad_pool_amount");
    await expect(estimateLaunchCost({ ...base, pooled: 1n, ethAmount: 0n })).rejects.toThrow("bad_eth_amount");
  });
});

describe("launchOneTx guards", () => {
  const base = {
    chainId: 4663 as const,
    account: "0x0000000000000000000000000000000000000001" as const,
    name: "T",
    ticker: "T",
    supply: 999000000000000000000000000n,
  };

  it("pins the deployed mainnet launcher", () => {
    expect(HOOD_MAINNET.launcher).toBe("0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71");
  });

  it("refuses when no launcher is configured", async () => {
    const prev = HOOD_MAINNET.launcher;
    HOOD_MAINNET.launcher = null;
    try {
      await expect(launchOneTx({ ...base, pooled: 1n, ethAmount: 1n })).rejects.toThrow("launcher_unavailable");
    } finally {
      HOOD_MAINNET.launcher = prev;
    }
  });

  it("refuses bad amounts before touching a wallet", async () => {
    const prev = HOOD_MAINNET.launcher;
    HOOD_MAINNET.launcher = "0x0000000000000000000000000000000000000001";
    try {
      await expect(launchOneTx({ ...base, pooled: 0n, ethAmount: 1n })).rejects.toThrow("bad_pool_amount");
      await expect(
        launchOneTx({ ...base, pooled: 999000001000000000000000000n, ethAmount: 1n }),
      ).rejects.toThrow("bad_pool_amount");
      await expect(launchOneTx({ ...base, pooled: 1n, ethAmount: 0n })).rejects.toThrow("bad_eth_amount");
    } finally {
      HOOD_MAINNET.launcher = prev;
    }
  });
});
