import { logoImageUrl } from "./draft";

export type ResolvedLogo = { url: string; via: "google" | "pollinations" };

/**
 * Logo resolution chain: Google (server key) → pin to IPFS → https URL.
 * Any step fails → Pollinations URL (keyless). Never throws, never empty.
 */
export async function resolveLogo(logoPrompt: string, seed: number): Promise<ResolvedLogo> {
  const fallback = logoImageUrl(logoPrompt, seed);
  try {
    const gen = await fetch("/api/logo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logoPrompt }),
      signal: AbortSignal.timeout(100000),
    });
    if (!gen.ok) return { url: fallback, via: "pollinations" };
    const gj = (await gen.json().catch(() => null)) as { imageData?: unknown } | null;
    if (!gj || typeof gj.imageData !== "string" || !gj.imageData.startsWith("data:image/")) {
      return { url: fallback, via: "pollinations" };
    }
    const pin = await fetch("/api/pump-metadata", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageData: gj.imageData, artworkOnly: true }),
      signal: AbortSignal.timeout(60000),
    });
    const pj = (await pin.json().catch(() => null)) as { imageUri?: unknown } | null;
    if (!pin.ok || !pj || typeof pj.imageUri !== "string" || !pj.imageUri.startsWith("https://")) {
      return { url: fallback, via: "pollinations" };
    }
    return { url: pj.imageUri, via: "google" };
  } catch {
    return { url: fallback, via: "pollinations" };
  }
}
