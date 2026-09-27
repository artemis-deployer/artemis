import { NextResponse } from "next/server";
import { publicFeatureFlags } from "../../../lib/feature-flags";
import { getShieldRuntimeStatus, type ShieldRuntimeStatus } from "@/lib/shield-runtime";

export const dynamic = "force-dynamic";

// Cache the shield status for 60 seconds so we don't hammer the RPC on every
// page load. The mainnet RPC takes 20-30 seconds for the full verification
// round-trip (18 parallel contract reads). Without caching, intermittent
// timeouts cause the section to disappear randomly.
let cachedShield: { status: ShieldRuntimeStatus; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function getCachedShieldStatus(): Promise<ShieldRuntimeStatus> {
  const now = Date.now();
  if (cachedShield && now < cachedShield.expiresAt) {
    return cachedShield.status;
  }
  const status = await getShieldRuntimeStatus();
  cachedShield = { status, expiresAt: now + CACHE_TTL_MS };
  return status;
}

export async function GET() {
  const shield = await getCachedShieldStatus();
  return NextResponse.json({
    ...publicFeatureFlags(),
    shield: { enabled: shield.enabled, depositEnabled: shield.depositEnabled, withdrawEnabled: shield.withdrawEnabled },
  }, { headers: { "cache-control": "no-store" } });
}
