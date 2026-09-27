import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { saveNonce } from "../../../../lib/zk-db";
import { zkSignMessage } from "../../../../lib/zk";
import { isEvmWallet, isSolanaWallet, readJsonBody } from "../../../../lib/zk-http";
import { zkFlags } from "../../../../lib/zk-flags";

export async function POST(req: Request) {
  if (!zkFlags().enabled) return NextResponse.json({ error: "zk_disabled" }, { status: 503 });
  if (!(await checkRateLimit(`zk-nonce:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 4 * 1024);
  if ("error" in parsed) return parsed.error;
  const wallet = typeof parsed.body.wallet === "string" ? parsed.body.wallet.trim() : "";
  if (!isEvmWallet(wallet) && !isSolanaWallet(wallet)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const nonce = randomBytes(16).toString("hex");
    await saveNonce(nonce, wallet);
    return NextResponse.json({ nonce, message: zkSignMessage(nonce) });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
