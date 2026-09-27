import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, defineChain, http } from "viem";
import { getShieldRuntimeStatus } from "@/lib/shield-runtime";
import { shieldNetworkForChainId } from "@/lib/shield-networks";
import { buildShieldAssociationSet } from "@/lib/shielded-association";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getShieldRuntimeStatus();
  if (!config.configured || !config.entrypoint || !config.pool || !config.rpcUrl || !config.entrypointDeploymentBlock) {
    return NextResponse.json({ error: "shield_pool_unavailable" }, { status: 503 });
  }

  try {
    const work = (async () => {
    const { entrypoint, pool, rpcUrl, entrypointDeploymentBlock } = config;
    if (!entrypoint || !pool || !rpcUrl || !entrypointDeploymentBlock) throw new Error("shield_pool_unavailable");
    const network = shieldNetworkForChainId(config.chainId);
    if (!network) throw new Error("unsupported_chain");
    const artifactPath = join(process.cwd(), "artifacts/shielded/0xbow-v1.2.1/Entrypoint.json");
    const abi = JSON.parse(readFileSync(artifactPath, "utf8")).abi;
    const chain = defineChain({
      id: network.id,
      name: network.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const head = await client.getBlockNumber();
    const confirmations = BigInt(Math.max(12, Number(process.env.SHIELD_CONFIRMATIONS || 12)));
    if (head <= confirmations) throw new Error("finalized_head_unavailable");
    const snapshot = head - confirmations;
    const firstBlock = BigInt(entrypointDeploymentBlock);
    const anchorBefore = await client.getBlock({ blockNumber: snapshot });
    // Scan backwards from head: the first chunk with events holds the latest
    // update, so the common case costs one RPC call instead of a full replay.
    // Chunks stay under the RPC 50k-block getLogs cap.
    const CHUNK = 40000n;
    let rootEvent: { root: bigint; cid: string; blockNumber: bigint } | undefined;
    for (let toBlock = snapshot; toBlock >= firstBlock; toBlock -= CHUNK) {
      const fromBlock = toBlock - (CHUNK - 1n) > firstBlock ? toBlock - (CHUNK - 1n) : firstBlock;
      const events = await client.getContractEvents({
        address: entrypoint,
        abi,
        eventName: "RootUpdated",
        fromBlock,
        toBlock,
        strict: true,
      });
      if (events.length > 0) {
        const latest = events.at(-1) as (typeof events)[number] & {
          args?: { _root?: bigint; _ipfsCID?: string };
        };
        const eventRoot = latest?.args?._root;
        const eventCid = latest?.args?._ipfsCID;
        if (eventRoot !== undefined && eventCid) {
          rootEvent = { root: eventRoot, cid: eventCid, blockNumber: latest.blockNumber };
        }
        break;
      }
      if (fromBlock === firstBlock) break;
    }
    const anchorAfter = await client.getBlock({ blockNumber: snapshot });
    if (!rootEvent || anchorBefore.hash !== anchorAfter.hash) throw new Error("finalized_root_unavailable");
    const root = rootEvent.root;
    const cid = rootEvent.cid;
    const currentRoot = await client.readContract({ address: entrypoint, abi, functionName: "latestRoot" });
    if (currentRoot !== root) throw new Error("root_not_current");
    const gateway = (process.env.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");
    const response = await fetch(`${gateway}/${encodeURIComponent(cid)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("association_dataset_fetch_failed");
    const dataset = await response.json();
    if (
      dataset.schemaVersion !== 1 ||
      dataset.chainId !== network.id ||
      String(dataset.pool).toLowerCase() !== pool.toLowerCase() ||
      String(dataset.root) !== String(root) ||
      !Array.isArray(dataset.labels) ||
      dataset.labels.length === 0 ||
      dataset.labels.length > 100_000 ||
      BigInt(dataset.snapshotBlock) > rootEvent.blockNumber
    ) throw new Error("association_dataset_invalid");

    const rebuilt = buildShieldAssociationSet(dataset.labels.map((label: string) => BigInt(label)));
    if (rebuilt.root !== root) throw new Error("association_root_mismatch");
    return NextResponse.json({ ...dataset, root: root.toString(), cid }, {
      headers: { "cache-control": "public, max-age=30, stale-while-revalidate=300" },
    });
    })();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("association_timeout")), 55_000));
    return await Promise.race([work, timeout]);
  } catch {
    return NextResponse.json({ error: "shield_association_unavailable" }, { status: 503 });
  }
}
