import { describe, expect, it } from "vitest";
import {
  addLiquidity,
  calcEthMin,
  decodeLaunchedToken,
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

  it("clamps dust to 1 wei with custom bps", () => {
    expect(calcEthMin(1n, 9500)).toBe(1n);
    expect(calcEthMin(1n, 9950)).toBe(1n);
  });

  it("honors custom slippage bps", () => {
    expect(calcEthMin(10n ** 18n, 9950)).toBe(995n * 10n ** 15n);
    expect(calcEthMin(10n ** 18n, 9500)).toBe(95n * 10n ** 16n);
  });

  it("rejects absurd slippage", () => {
    expect(() => calcEthMin(10n ** 18n, 4999)).toThrow("bad_slippage");
    expect(() => calcEthMin(10n ** 18n, 10001)).toThrow("bad_slippage");
  });

  it("handles exact, half, and non-integer/NaN", () => {
    expect(calcEthMin(10n ** 18n, 10000)).toBe(10n ** 18n);
    expect(calcEthMin(10n ** 18n, 5000)).toBe(5n * 10n ** 17n);
    expect(calcEthMin(1n, 10000)).toBe(1n);
    expect(calcEthMin(1n, 5000)).toBe(1n);
    for (const bad of [9800.5, NaN, Infinity, -1]) {
      expect(() => calcEthMin(10n ** 18n, bad as number)).toThrow("bad_slippage");
    }
  });

  it("handles huge 21-digit liquidity without overflow", () => {
    const huge = toTokenUnits("999999999999999999999");
    expect(huge).toBe(999999999999999999999n * 10n ** 18n);
    expect(huge < 2n ** 256n).toBe(true);
    expect(calcEthMin(huge)).toBe((huge * 9800n) / 10000n);
    expect(() => formatEth(huge)).not.toThrow();
  });
});

describe("formatEth", () => {
  it("trims to 6 decimals", () => {
    expect(formatEth(1000000000000000000n)).toBe("1");
    expect(formatEth(1500000000000000n)).toBe("0.0015");
    expect(formatEth(0n)).toBe("0");
  });

  it("keeps tiny values instead of zeroing them", () => {
    expect(formatEth(200000000000n)).toBe("0.0000002");
    expect(formatEth(100000000000000000000n)).toBe("100");
  });

  it("table: zero, dust, thousand, huge", () => {
    expect(formatEth(0n)).toBe("0");
    // 1 wei truncates to 8 decimals: zero-looking but distinct from "0", never crashes.
    expect(formatEth(1n)).toBe("0.00000000");
    expect(formatEth(1n)).not.toBe("0");
    expect(formatEth(1000n * 10n ** 18n)).toBe("1000");
    expect(formatEth(10n ** 30n)).toBe("1000000000000");
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

  it("refuses bad slippage before touching RPC", async () => {
    await expect(estimateLaunchCost({ ...base, pooled: 1n, ethAmount: 1n, slippageBps: 4999 })).rejects.toThrow(
      "bad_slippage",
    );
    await expect(estimateLaunchCost({ ...base, pooled: 1n, ethAmount: 1n, slippageBps: 10001 })).rejects.toThrow(
      "bad_slippage",
    );
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

  it("refuses bad slippage before touching RPC or wallet", async () => {
    const prev = HOOD_MAINNET.launcher;
    HOOD_MAINNET.launcher = "0x0000000000000000000000000000000000000001";
    try {
      await expect(launchOneTx({ ...base, pooled: 1n, ethAmount: 1n, slippageBps: 4999 })).rejects.toThrow(
        "bad_slippage",
      );
      await expect(launchOneTx({ ...base, pooled: 1n, ethAmount: 1n, slippageBps: 10001 })).rejects.toThrow(
        "bad_slippage",
      );
    } finally {
      HOOD_MAINNET.launcher = prev;
    }
  });
});

describe("addLiquidity guards", () => {
  it("refuses bad slippage before touching wallet", async () => {
    await expect(
      addLiquidity({
        chainId: 4663 as const,
        account: "0x0000000000000000000000000000000000000001",
        token: "0x0000000000000000000000000000000000000002",
        tokenAmount: 1n,
        ethAmount: 1n,
        slippageBps: 4999,
      }),
    ).rejects.toThrow("bad_slippage");
  });
});

describe("decodeLaunchedToken", () => {
  const launcher = "0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71";
  const token = "0x097716e767df17605627def0030110f8ee559ec4";
  const pad = (hex: string) => `0x${hex.replace(/^0x/, "").padStart(64, "0")}` as `0x${string}`;
  function launchedLog(tokenAddr: string, from = launcher) {
    return {
      address: from,
      topics: [pad("0xaaa"), pad(tokenAddr), pad("0x1111111111111111111111111111111111111111")] as `0x${string}`[],
      data: "0x" as `0x${string}`,
    };
  }
  it("picks Launched log among unrelated logs from same and other addresses", () => {
    const other = "0x0000000000000000000000000000000000000001";
    const logs = [
      { address: other, topics: [pad("0xddd"), pad(token)] as `0x${string}`[], data: "0x" as `0x${string}` },
      launchedLog(token),
      { address: token, topics: [pad("0xeee"), pad(token), pad("0x222")] as `0x${string}`[], data: "0x" as `0x${string}` },
    ];
    expect(decodeLaunchedToken(logs, launcher as `0x${string}`)).toBe(token);
  });
  it("returns first token when multiple Launched events exist", () => {
    const second = "0x1111111111111111111111111111111111111111";
    expect(decodeLaunchedToken([launchedLog(token), launchedLog(second)], launcher as `0x${string}`)).toBe(
      token,
    );
  });
  it("rejects zero-address and short-topic logs", () => {
    const zero = launchedLog("0x0000000000000000000000000000000000000000");
    const short = { address: launcher, topics: [pad("0xaaa")] as `0x${string}`[], data: "0x" as `0x${string}` };
    expect(decodeLaunchedToken([zero, short], launcher as `0x${string}`)).toBeNull();
  });
});
