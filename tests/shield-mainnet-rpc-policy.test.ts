import { describe, expect, it } from "vitest";
import { assertSafeMainnetRpc } from "../scripts/shield-mainnet-rpc-policy.mjs";

describe("mainnet RPC transport policy", () => {
  it("requires HTTPS for real network endpoints", () => {
    expect(assertSafeMainnetRpc("https://rpc.example", false)).toBe("https://rpc.example/");
    expect(() => assertSafeMainnetRpc("http://rpc.example", false)).toThrow("mainnet_rpc_must_use_https");
  });

  it("allows HTTP only for explicitly selected loopback fork simulations", () => {
    expect(assertSafeMainnetRpc("http://127.0.0.1:18545", true)).toBe("http://127.0.0.1:18545/");
    expect(assertSafeMainnetRpc("http://[::1]:18545", true)).toBe("http://[::1]:18545/");
    expect(() => assertSafeMainnetRpc("http://localhost:18545", false)).toThrow("local_fork_flag_required");
    expect(() => assertSafeMainnetRpc("http://10.0.0.2:18545", true)).toThrow("local_fork_must_use_loopback");
    expect(() => assertSafeMainnetRpc("https://rpc.example", true)).toThrow("local_fork_must_use_loopback");
  });
});
