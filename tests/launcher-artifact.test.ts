import { describe, expect, it } from "vitest";
import { LAUNCHER_ABI, LAUNCHER_BYTECODE } from "../lib/launcher-artifact";

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
});
