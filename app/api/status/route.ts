import { NextResponse } from "next/server";
import { CHAINS } from "../../../lib/chains";

export async function GET() {
  const configured = Boolean(process.env.LLM_API_URL && process.env.LLM_API_KEY);
  return NextResponse.json({
    configured,
    model: process.env.LLM_MODEL ?? "mimo-v2.5",
    networks: CHAINS.map((c) => ({ id: c.id, name: c.name, testnet: c.testnet })),
  });
}
