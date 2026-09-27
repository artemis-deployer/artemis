import { NextResponse } from "next/server";
import { publicFeatureFlags } from "../../../../lib/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicFeatureFlags().zk, { headers: { "cache-control": "no-store" } });
}
