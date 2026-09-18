import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAUNCHER_ABI, LAUNCHER_BYTECODE } from "../lib/launcher-artifact";

const launcherSrc = readFileSync(new URL("../contracts/KentirLauncher.sol", import.meta.url), "utf8");
const deploySrc = readFileSync(new URL("../scripts/deploy-launcher.mjs", import.meta.url), "utf8");

describe("launcher artifact", () => {
  it("exposes the launch function and Launched event", () => {
    const names = LAUNCHER_ABI.map((e) => (e as { name?: string }).name);
    expect(names).toContain("launch");
    expect(names).toContain("Launched");
  });

  it("embeds non-empty init bytecode", () => {
    expect(LAUNCHER_BYTECODE.startsWith("0x")).toBe(true);
    expect(LAUNCHER_BYTECODE.length).toBeGreaterThan(1000);
  });

  it("pins launch inputs and Launched event fields", () => {
    const fn = LAUNCHER_ABI.find((e) => (e as { name?: string }).name === "launch") as unknown as {
      inputs: { name: string }[];
    };
    expect(fn.inputs.map((i) => i.name)).toEqual(["n", "s", "supply", "pooled", "ethMin", "deadline"]);
    const ev = LAUNCHER_ABI.find((e) => (e as { name?: string }).name === "Launched") as unknown as {
      inputs: { name: string }[];
    };
    expect(ev.inputs.map((i) => i.name)).toEqual(["token", "creator", "pooledTokens", "ethAdded", "liquidity"]);
  });
});

describe("launcher launch safety", () => {
  it("emits actual router return values, not desired inputs", () => {
    expect(launcherSrc).not.toMatch(/\(\s*,\s*,\s*liquidity\s*\)\s*=/);
    expect(launcherSrc).not.toContain("msg.value, liquidity");
  });

  it("sweeps full leftover balance so no dust locks on partial fill", () => {
    expect(launcherSrc).toMatch(/balanceOf\(address\(this\)\)/);
  });
});

describe("deploy-launcher safety", () => {
  it("refuses to run without an explicit --mainnet flag", () => {
    expect(deploySrc).toContain("--mainnet");
  });

  it("trims PRIVATE_KEY whitespace before validating", () => {
    expect(deploySrc).toMatch(/PRIVATE_KEY[^;]*\.trim\(\)/);
  });

  it("validates the router constructor arg format", () => {
    expect(deploySrc).toMatch(/0x\[0-9a-fA-F\]\{40\}/);
  });
});
