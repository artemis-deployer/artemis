import { NextResponse } from "next/server";
import { getShieldRuntimeStatus, type ShieldRuntimeStatus } from "@/lib/shield-runtime";

export const dynamic = "force-dynamic";

// Share the same caching strategy as /api/features to avoid redundant
// 20-30 second RPC round-trips on every ShieldPanel mount.
let cachedConfig: { status: ShieldRuntimeStatus; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function getCachedShieldConfig(): Promise<ShieldRuntimeStatus> {
  const now = Date.now();
  if (cachedConfig && now < cachedConfig.expiresAt) {
    return cachedConfig.status;
  }
  const status = await getShieldRuntimeStatus();
  cachedConfig = { status, expiresAt: now + CACHE_TTL_MS };
  return status;
}

export async function GET() {
  const config = await getCachedShieldConfig();
  return NextResponse.json(config, { headers: { "cache-control": "no-store" } });
}
