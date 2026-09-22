export type ShowcaseInput = {
  chainId: number | string;
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  pool?: string;
  txHash?: string;
  image?: string;
  tagline?: string;
  description?: string;
  lore?: string;
  marketingHook?: string;
  xUrl?: string;
  webUrl?: string;
};

// ponytail: fire-and-forget, local receipt stays source of truth when DB offline
export type ShowcaseStatus = "saved" | "rejected" | "offline";
export type ShowcaseDisplay = "listed" | "pending";
export function toShowcaseDisplay(s: ShowcaseStatus): ShowcaseDisplay {
  return s === "saved" ? "listed" : "pending";
}

/** Render artwork through a reliable gateway (ipfs.io rate-limits hard). */
export function displayArtworkUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  if (url.startsWith("https://ipfs.io/ipfs/")) {
    return `https://gateway.pinata.cloud/ipfs/${url.slice("https://ipfs.io/ipfs/".length)}`;
  }
  return url;
}

export async function submitShowcase(input: ShowcaseInput): Promise<ShowcaseStatus> {
  // ponytail: server 400s these anyway; skip network, same status
  if (!String(input.chainId ?? "").trim() || !String(input.address ?? "").trim()) return "rejected";
  try {
    const res = await fetch("/api/community/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      // Bounded: success modal waits on this, never hang the celebration.
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return "saved";
    if (res.status >= 500 || res.status === 429) return "offline";
    return "rejected";
  } catch {
    // showcase DB optional; never break launch UX
    return "offline";
  }
}
