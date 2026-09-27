import { spawn } from "node:child_process";

if (!process.argv.includes("--confirm-testnet-transfer")) {
  throw new Error("Pass --confirm-testnet-transfer to run the onchain testnet deposit and withdrawal rehearsal.");
}
if (!process.argv.includes("--acknowledge-unreconciled-pool-balance")) {
  throw new Error("Pass --acknowledge-unreconciled-pool-balance to test with the known 0.001 ETH residual pool balance.");
}
const allowNewDeposit = process.argv.includes("--allow-new-deposit");

const root = process.cwd();
const port = "3013";
const apiBase = `http://127.0.0.1:${port}`;
const rpcUrl = process.env.SHIELD_E2E_RPC_URL || "https://robinhood-sepolia-rpc.publicnode.com";
const temporaryGates = {
  SHIELD_ENABLED: "true",
  SHIELD_DEPOSIT_ENABLED: "true",
  SHIELD_WITHDRAW_ENABLED: "true",
  SHIELD_CLIENT_READY: "true",
  SHIELD_INDEXER_READY: "true",
  SHIELD_RELAYER_READY: "true",
  SHIELD_REHEARSAL_COMPLETE: "true",
};
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", port], {
  cwd: root,
  env: { ...process.env, ...temporaryGates, SHIELD_RPC_URL: rpcUrl },
  stdio: "inherit",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next server exited before readiness (${server.exitCode}).`);
    try {
      const response = await fetch(`${apiBase}/api/shield/config`, { signal: AbortSignal.timeout(5_000) });
      const config = await response.json();
      if (response.ok && config.configured && config.enabled && config.depositEnabled && config.withdrawEnabled && config.chainId === 46630) {
        console.log(`Local test server ready on testnet pool ${config.pool} (${config.denominationWei} wei).`);
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Local test server did not report a ready testnet configuration.");
}

async function runTest() {
  const runner = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/shield-live-testnet-rehearsal.test.ts"], {
    cwd: root,
    env: {
      ...process.env,
      RUN_SHIELD_TESTNET_REHEARSAL: "1",
      SHIELD_E2E_ACKNOWLEDGE_RESIDUAL_POOL_BALANCE: "1",
      SHIELD_E2E_API_BASE: apiBase,
      SHIELD_RPC_URL: rpcUrl,
      SHIELD_E2E_ALLOW_NEW_DEPOSIT: allowNewDeposit ? "1" : "0",
    },
    stdio: "inherit",
  });
  const [code] = await new Promise((resolve, reject) => {
    runner.once("error", reject);
    runner.once("exit", (exitCode, signal) => resolve([exitCode, signal]));
  });
  if (code !== 0) throw new Error(`Shield testnet rehearsal failed (exit ${code ?? "signal"}).`);
}

try {
  await waitForServer();
  await runTest();
} finally {
  server.kill("SIGTERM");
}
