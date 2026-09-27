import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.SHIELD_CHAIN_ID !== "46630") {
    return NextResponse.json({ error: "sync_asp_testnet_only" }, { status: 403 });
  }

  try {
    const scriptPath = join(process.cwd(), "scripts/shield/publish-association-set.mjs");
    const { stdout, stderr } = await execFileAsync("node", ["--env-file=.env.local", scriptPath], {
      timeout: 45_000,
      cwd: process.cwd(),
    });

    return NextResponse.json({
      ok: true,
      output: stdout.trim(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "sync_asp_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
