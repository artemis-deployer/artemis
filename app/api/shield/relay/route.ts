import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { checkSharedRateLimit, clientIp } from "@/lib/rate-limit";
import { getShieldRuntimeStatus, resolveShieldRelayer } from "@/lib/shield-runtime";
import { shieldNetworkForChainId } from "@/lib/shield-networks";
import { readJsonBody } from "@/lib/zk-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function parseProof(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("invalid_proof");
  const proof = value as { proof?: Record<string, unknown>; publicSignals?: unknown };
  const groth16 = proof.proof as Record<string, unknown> | undefined;
  const piA = groth16?.pi_a as unknown[] | undefined;
  const piB = groth16?.pi_b as unknown[][] | undefined;
  const piC = groth16?.pi_c as unknown[] | undefined;
  const signals = proof.publicSignals;
  if (!piA || piA.length < 2 || !piB || piB.length < 2 || !piC || piC.length < 2 || !Array.isArray(signals) || signals.length !== 8) {
    throw new Error("invalid_proof");
  }
  const fieldValue = (item: unknown) => {
    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "bigint") throw new Error("invalid_proof");
    const value = BigInt(item);
    if (value < 0n || value >= FIELD) throw new Error("invalid_proof");
    return value;
  };
  return {
    pA: [fieldValue(piA[0]), fieldValue(piA[1])] as const,
    pB: [
      [fieldValue(piB[0]?.[1]), fieldValue(piB[0]?.[0])],
      [fieldValue(piB[1]?.[1]), fieldValue(piB[1]?.[0])],
    ] as const,
    pC: [fieldValue(piC[0]), fieldValue(piC[1])] as const,
    pubSignals: signals.map(fieldValue) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
  };
}

export async function POST(request: Request) {
  const ipDigest = createHash("sha256").update(clientIp(request)).digest("hex");
  const limit = Math.max(1, Math.min(30, Number(process.env.SHIELD_RELAYER_MAX_REQUESTS_PER_MINUTE || 5)));
  try {
    const decision = await checkSharedRateLimit(`shield-relay:${ipDigest}`, limit, 60_000);
    if (!decision.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    return NextResponse.json({ error: "rate_limit_unavailable" }, { status: 503 });
  }

  const parsed = await readJsonBody(request, 64 * 1024);
  if ("error" in parsed) return parsed.error;
  const config = await getShieldRuntimeStatus();
  if (!config.withdrawEnabled || !config.entrypoint || !config.pool || !config.scope || !config.rpcUrl) {
    return NextResponse.json({ error: "shield_withdraw_disabled" }, { status: 503 });
  }
  const relayer = resolveShieldRelayer(process.env);
  if (!relayer) {
    return NextResponse.json({ error: "relayer_unconfigured" }, { status: 503 });
  }

  try {
    const recipient = parsed.body.recipient;
    if (typeof recipient !== "string" || !isAddress(recipient) || /^0x0{40}$/i.test(recipient)) {
      return NextResponse.json({ error: "invalid_recipient" }, { status: 400 });
    }
    const proof = parseProof(parsed.body.withdrawalProof);
    if (!config.denominationWei || proof.pubSignals[2] !== BigInt(config.denominationWei)) {
      return NextResponse.json({ error: "invalid_withdrawal_amount" }, { status: 400 });
    }

    const rpcUrl = config.rpcUrl;
    const network = shieldNetworkForChainId(config.chainId);
    if (!network) throw new Error("unsupported_chain");
    const chain = defineChain({
      id: network.id,
      name: network.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    const account = privateKeyToAccount(relayer.privateKey);
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
    if (await publicClient.getChainId() !== chain.id) throw new Error("chain_id_mismatch");

    const entrypointAbi = JSON.parse(readFileSync(join(process.cwd(), "artifacts/shielded/0xbow-v1.2.1/Entrypoint.json"), "utf8")).abi;
    const poolAbi = JSON.parse(readFileSync(join(process.cwd(), "artifacts/shielded/0xbow-v1.2.1/PrivacyPoolSimple.json"), "utf8")).abi;
    const latestRoot = await publicClient.readContract({ address: config.entrypoint, abi: entrypointAbi, functionName: "latestRoot" });
    const spent = await publicClient.readContract({
      address: config.pool,
      abi: poolAbi,
      functionName: "nullifierHashes",
      args: [proof.pubSignals[1]],
    });
    if (spent) return NextResponse.json({ error: "nullifier_already_spent" }, { status: 409 });
    if (proof.pubSignals[5] !== latestRoot) return NextResponse.json({ error: "association_root_stale" }, { status: 409 });

    const data = encodeAbiParameters(
      [{ type: "tuple", components: [
        { name: "recipient", type: "address" },
        { name: "feeRecipient", type: "address" },
        { name: "relayFeeBPS", type: "uint256" },
      ] }],
      [{ recipient, feeRecipient: account.address, relayFeeBPS: 0n }],
    );
    const withdrawal = { processooor: config.entrypoint, data };
    const { request: txRequest } = await publicClient.simulateContract({
      account,
      address: config.entrypoint,
      abi: entrypointAbi,
      functionName: "relay",
      args: [withdrawal, proof, BigInt(config.scope)],
    });
    const hash = await wallet.writeContract(txRequest);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("relay_transaction_failed");
    return NextResponse.json({ transactionHash: hash, status: "confirmed" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "shield_relay_failed" }, { status: 400 });
  }
}
