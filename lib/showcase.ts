export type ShowcaseInput = {
  chainId: number | string;
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  pool?: string;
  txHash?: string;
};

// ponytail: fire-and-forget, local receipt stays source of truth when DB offline
export type ShowcaseStatus = "saved" | "rejected" | "offline";

export async function submitShowcase(input: ShowcaseInput): Promise<ShowcaseStatus> {
  try {
    const res = await fetch("/api/community/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return "saved";
    if (res.status >= 500) return "offline";
    return "rejected";
  } catch {
    // showcase DB optional; never break launch UX
    return "offline";
  }
}
