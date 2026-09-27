import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fetchPinnedShieldArtifact,
  SHIELDED_ARTIFACTS,
  verifyShieldArtifact,
} from "../lib/shielded-artifact-integrity";

describe("verifyShieldArtifact", () => {
  it("accepts bytes that match the pinned SHA-256 digest", async () => {
    const bytes = new TextEncoder().encode("official circuit artifact");
    await expect(
      verifyShieldArtifact(bytes, "7a7d4be65227466114fce330c59cac775fccd0d3c71797d352702230aec2885a"),
    ).resolves.toBe(true);
  });

  it("rejects bytes that do not match the pinned SHA-256 digest", async () => {
    const bytes = new TextEncoder().encode("tampered artifact");
    await expect(verifyShieldArtifact(bytes, "0".repeat(64))).resolves.toBe(false);
  });

  it("rejects malformed expected digests", async () => {
    const bytes = new TextEncoder().encode("anything");
    await expect(verifyShieldArtifact(bytes, "not-a-digest")).resolves.toBe(false);
  });

  it("ships only the pinned 0xbow v1.2.1 WASM, verification keys, and proving keys", async () => {
    const artifactDirectory = join(process.cwd(), "public", "shield-artifacts", "v1.2.1");
    for (const [name, expectedSha256] of Object.entries(SHIELDED_ARTIFACTS)) {
      const bytes = await readFile(join(artifactDirectory, name));
      await expect(verifyShieldArtifact(bytes, expectedSha256), name).resolves.toBe(true);
    }
  });

  it("fetches a local pinned artifact and rejects altered bytes", async () => {
    const bytes = await readFile(join(process.cwd(), "public", "shield-artifacts", "v1.2.1", "commitment.vkey"));
    const fetcher: typeof fetch = async () => new Response(bytes);
    await expect(fetchPinnedShieldArtifact("commitment.vkey", fetcher)).resolves.toEqual(new Uint8Array(bytes));

    const tamperedFetch: typeof fetch = async () => new Response("tampered");
    await expect(fetchPinnedShieldArtifact("commitment.vkey", tamperedFetch)).rejects.toThrow(
      "shield_artifact_integrity_failed",
    );
  });
});
