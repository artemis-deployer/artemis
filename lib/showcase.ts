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
export async function submitShowcase(input: ShowcaseInput): Promise<void> {
  try {
    await fetch("/api/community/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // showcase DB optional; never break launch UX
  }
}
