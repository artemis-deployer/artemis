import { NextResponse } from "next/server";
import { getShieldRuntimeStatus } from "@/lib/shield-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getShieldRuntimeStatus();
  return NextResponse.json(config, { headers: { "cache-control": "no-store" } });
}
