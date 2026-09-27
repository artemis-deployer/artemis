export const SHIELDED_ARTIFACTS = {
  "commitment.wasm": "254d2130607182fd6fd1aee67971526b13cfe178c88e360da96dce92663828d8",
  "commitment.vkey": "7d48b4eb3dedc12fb774348287b587f0c18c3c7254cd60e9cf0f8b3636a570d8",
  "commitment.zkey": "494ae92d64098fda2a5649690ddc5821fcd7449ca5fe8ef99ee7447544d7e1f3",
  "withdraw.wasm": "36cda22791def3d520a55c0fc808369cd5849532a75fab65686e666ed3d55c10",
  "withdraw.vkey": "666bd0983b20c1611543b04f7712e067fbe8cad69f07ada8a310837ff398d21e",
  "withdraw.zkey": "2a893b42174c813566e5c40c715a8b90cd49fc4ecf384e3a6024158c3d6de677",
} as const;

export type ShieldArtifactName = keyof typeof SHIELDED_ARTIFACTS;

export async function verifyShieldArtifact(bytes: BufferSource, expectedSha256: string): Promise<boolean> {
  if (!/^[\da-f]{64}$/i.test(expectedSha256)) return false;

  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const actualSha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  return actualSha256 === expectedSha256.toLowerCase();
}

export async function fetchPinnedShieldArtifact(
  name: string,
  fetcher: typeof fetch = fetch,
  baseUrl = "/shield-artifacts/v1.2.1",
): Promise<Uint8Array> {
  if (!Object.prototype.hasOwnProperty.call(SHIELDED_ARTIFACTS, name)) {
    throw new Error("shield_artifact_unknown");
  }

  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/${name}`, { cache: "force-cache" });
  if (!response.ok) throw new Error("shield_artifact_fetch_failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!(await verifyShieldArtifact(bytes, SHIELDED_ARTIFACTS[name as ShieldArtifactName]))) {
    throw new Error("shield_artifact_integrity_failed");
  }
  return bytes;
}
