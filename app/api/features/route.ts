import { NextResponse } from "next/server";
import { publicFeatureFlags } from "../../../lib/feature-flags";
import { getShieldRuntimeStatus } from "@/lib/shield-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const shield = await getShieldRuntimeStatus();
  return NextResponse.json({
    ...publicFeatureFlags(),
    shield: { enabled: shield.enabled, depositEnabled: shield.depositEnabled, withdrawEnabled: shield.withdrawEnabled },
  }, { headers: { "cache-control": "no-store" } });
}
