import { describe, expect, it, vi } from "vitest";
import { readRecentShieldRoots } from "../lib/shielded-indexer";

describe("shield root history reads", () => {
  it("limits concurrent RPC calls while checking the full root ring", async () => {
    let active = 0;
    let maximumActive = 0;
    const readContract = vi.fn(async ({ args }: { args: readonly [bigint] }) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return args[0];
    });
    const client = { readContract } as never;

    const roots = await readRecentShieldRoots(client, "0x1111111111111111111111111111111111111111", 3);

    expect(roots).toHaveLength(64);
    expect(roots[0]).toBe(3n);
    expect(roots[1]).toBe(2n);
    expect(roots.at(-1)).toBe(4n);
    expect(maximumActive).toBeLessThanOrEqual(8);
  });
});
