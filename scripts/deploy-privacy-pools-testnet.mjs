import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  isAddress,
  keccak256,
  parseEther,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const arg = (key) => args.includes(key) ? args[args.indexOf(key) + 1] ?? "" : "";
if (!args.includes("--testnet") || !args.includes("--i-understand-testnet-only")) {
  throw new Error("Deployment blocked. Pass --testnet --i-understand-testnet-only after reviewing the testnet runbook.");
}

const key = (process.env.SHIELD_DEPLOYER_PRIVATE_KEY ?? "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set SHIELD_DEPLOYER_PRIVATE_KEY to a dedicated testnet-only deployment key.");
const account = privateKeyToAccount(key);
const postmanKey = (process.env.SHIELD_ASP_POSTMAN_PRIVATE_KEY || key).trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(postmanKey)) throw new Error("SHIELD_ASP_POSTMAN_PRIVATE_KEY must be a valid EVM key when provided.");
const postmanAccount = privateKeyToAccount(postmanKey);
const relayerKey = (process.env.SHIELD_RELAYER_PRIVATE_KEY || key).trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(relayerKey)) throw new Error("SHIELD_RELAYER_PRIVATE_KEY must be a valid EVM key when provided.");
const relayerAccount = privateKeyToAccount(relayerKey);
const configuredRelayer = (process.env.SHIELD_RELAYER_ADDRESS || relayerAccount.address).trim();
if (!isAddress(configuredRelayer) || configuredRelayer.toLowerCase() !== relayerAccount.address.toLowerCase()) {
  throw new Error("SHIELD_RELAYER_ADDRESS must match the configured relayer key.");
}
const rootText = arg("--asp-root") || (process.env.SHIELD_ASP_ROOT ?? "").trim();
if (!/^\d+$/.test(rootText)) throw new Error("Provide a decimal --asp-root from the published deterministic test dataset.");
const aspRoot = BigInt(rootText);
const snarkScalarField = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
if (aspRoot <= 0n || aspRoot >= snarkScalarField) throw new Error("ASP root must be a non-zero BN254 scalar.");
const cid = arg("--cid") || (process.env.SHIELD_ASP_CID ?? "").trim();
if (cid.length < 32 || cid.length > 64) throw new Error("Provide the content-addressed test dataset CID (32-64 characters).");
if (!/^(bafy[a-z2-7]{20,59}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/.test(cid)) {
  throw new Error("CID must be a syntactically valid IPFS CIDv0 or CIDv1.");
}
const guardian = arg("--guardian") || process.env.SHIELD_GUARDIAN_ADDRESS || account.address;
if (!isAddress(guardian) || guardian.toLowerCase() === zeroAddress.toLowerCase()) throw new Error("Guardian must be a non-zero EVM address.");
const postman = arg("--postman") || postmanAccount.address;
if (!isAddress(postman) || postman === zeroAddress) throw new Error("Provide a valid ASP postman address.");
if (postman.toLowerCase() !== postmanAccount.address.toLowerCase()) {
  throw new Error("--postman must match the address derived from SHIELD_ASP_POSTMAN_PRIVATE_KEY.");
}
const denomination = parseEther(arg("--denomination") || "0.001");
const cap = parseEther(arg("--cap") || "10");
if (denomination !== parseEther("0.001") || cap !== parseEther("10")) {
  throw new Error("This reviewed testnet pool build supports exactly 0.001 ETH notes and a 10 ETH lifetime cap.");
}
const manifestName = arg("--manifest") || "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json";
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("--manifest must be a safe JSON filename.");
const manifestPath = join(root, "deployments", manifestName);
const checkpointPath = manifestPath.replace(/\.json$/i, ".pending.json");
if (existsSync(manifestPath)) throw new Error(`Manifest already exists; archive it before deploying again: ${manifestPath}`);
const reuseManifestName = arg("--reuse-core-from") || "";
const reuseManifestPath = reuseManifestName ? join(root, "deployments", reuseManifestName) : "";
if (!reuseManifestName || !/^[a-z0-9][a-z0-9.-]*\.json$/i.test(reuseManifestName) || !existsSync(reuseManifestPath)) {
  throw new Error("Pass --reuse-core-from with the reviewed prior testnet deployment manifest.");
}
const priorManifest = JSON.parse(readFileSync(reuseManifestPath, "utf8"));
if (priorManifest.chainId !== 46630 || priorManifest.status !== "testnet-rehearsal") {
  throw new Error("The reused verifier and Entrypoint implementation must come from a Robinhood testnet rehearsal.");
}

const rpcUrl = process.env.SHIELD_RPC_URL || "https://robinhood-sepolia-rpc.publicnode.com";
const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
const postmanWallet = createWalletClient({ account: postmanAccount, chain, transport: http(rpcUrl) });
const pub = createPublicClient({ chain, transport: http(rpcUrl) });
if (await pub.getChainId() !== chain.id) throw new Error("RPC chain id mismatch; deployment aborted.");
if (await pub.getBalance({ address: account.address }) === 0n) {
  throw new Error("Fund the testnet operator wallet with testnet ETH before deployment.");
}

const artifactDir = join(root, "artifacts/shielded/0xbow-v1.2.1");
const artifact = (name) => JSON.parse(readFileSync(join(artifactDir, `${name}.json`), "utf8"));
const checkpoint = existsSync(checkpointPath)
  ? JSON.parse(readFileSync(checkpointPath, "utf8"))
  : {
    schemaVersion: 1, chainId: chain.id, deployer: account.address, aspPostman: postman, guardian,
    denominationWei: denomination.toString(), lifetimeDepositCapWei: cap.toString(), reuseManifest: reuseManifestName,
    associationSet: { root: aspRoot.toString(), cid },
    contracts: {
      withdrawalVerifier: priorManifest.contracts.withdrawalVerifier,
      commitmentVerifier: priorManifest.contracts.commitmentVerifier,
      entrypointImplementation: priorManifest.contracts.entrypointImplementation,
      libraries: priorManifest.contracts.libraries ?? {},
    },
    transactions: {},
  };
if (
  checkpoint.chainId !== chain.id || checkpoint.deployer?.toLowerCase() !== account.address.toLowerCase() ||
  checkpoint.aspPostman?.toLowerCase() !== postman.toLowerCase() || checkpoint.guardian?.toLowerCase() !== guardian.toLowerCase() ||
  checkpoint.associationSet?.root !== aspRoot.toString() || checkpoint.associationSet?.cid !== cid ||
  checkpoint.denominationWei !== denomination.toString() || checkpoint.lifetimeDepositCapWei !== cap.toString() ||
  checkpoint.reuseManifest !== reuseManifestName
) throw new Error("A pending deployment checkpoint exists with different operator or ASP settings; inspect it before continuing.");
checkpoint.contracts ??= {};
checkpoint.contracts.libraries ??= {};
checkpoint.transactions ??= {};
const saveCheckpoint = () => writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);

async function deployLibrary(name) {
  const saved = checkpoint.contracts.libraries[name];
  if (saved?.address) {
    const code = await pub.getCode({ address: saved.address });
    if (code && code !== "0x") return saved.address;
    throw new Error(`Saved library ${name} has no deployed bytecode; refusing to silently replace it.`);
  }
  const item = artifact(name);
  const bytecode = await linkBytecode(item);
  const hash = await wallet.deployContract({ abi: item.abi, bytecode, args: [] });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} library deployment failed: ${hash}`);
  const result = { address: receipt.contractAddress, transactionHash: hash, blockNumber: receipt.blockNumber.toString() };
  checkpoint.contracts.libraries[name] = result;
  saveCheckpoint();
  console.log(`${name} library deployed: ${result.address} (${hash})`);
  return result.address;
}

async function linkBytecode(item) {
  let object = item.bytecode.slice(2);
  for (const libraries of Object.values(item.linkReferences ?? {})) {
    for (const [name, references] of Object.entries(libraries)) {
      const address = await deployLibrary(name);
      for (const reference of references) {
        const start = reference.start * 2;
        const length = reference.length * 2;
        object = `${object.slice(0, start)}${address.slice(2).toLowerCase()}${object.slice(start + length)}`;
      }
    }
  }
  if (object.includes("__$")) throw new Error("Contract bytecode contains unresolved Solidity library links.");
  return `0x${object}`;
}

async function deploy(name, parameters = [], checkpointKey = name) {
  const saved = checkpoint.contracts[checkpointKey];
  if (saved?.address) {
    const code = await pub.getCode({ address: saved.address });
    if (code && code !== "0x") {
      console.log(`${name} already deployed; resuming at ${saved.address}.`);
      return saved;
    }
    throw new Error(`Saved ${name} has no deployed bytecode; refusing to silently replace it.`);
  }
  const item = artifact(name);
  const bytecode = await linkBytecode(item);
  const hash = await wallet.deployContract({ abi: item.abi, bytecode, args: parameters });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} deployment failed: ${hash}`);
  console.log(`${name} deployed: ${receipt.contractAddress} (${hash})`);
  const result = { address: receipt.contractAddress, transactionHash: hash, blockNumber: receipt.blockNumber.toString() };
  checkpoint.contracts[checkpointKey] = result;
  saveCheckpoint();
  return result;
}
async function call(address, abi, functionName, parameters = [], signer = wallet) {
  const saved = checkpoint.transactions[functionName];
  if (saved) {
    const receipt = await pub.getTransactionReceipt({ hash: saved });
    if (receipt.status === "success") {
      console.log(`${functionName} already confirmed: ${saved}`);
      return saved;
    }
    throw new Error(`Saved ${functionName} transaction did not succeed; inspect checkpoint ${checkpointPath}.`);
  }
  const hash = await signer.writeContract({ address, abi, functionName, args: parameters });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} failed: ${hash}`);
  console.log(`${functionName} confirmed: ${hash}`);
  checkpoint.transactions[functionName] = hash;
  saveCheckpoint();
  return hash;
}

for (const [name, saved] of Object.entries({
  WithdrawalVerifier: checkpoint.contracts.withdrawalVerifier,
  CommitmentVerifier: checkpoint.contracts.commitmentVerifier,
  Entrypoint: checkpoint.contracts.entrypointImplementation,
  ...checkpoint.contracts.libraries,
})) {
  const code = saved?.address ? await pub.getCode({ address: saved.address }) : undefined;
  if (!saved?.address || !code || code === "0x") throw new Error(`Reusable core contract ${name} is not deployed.`);
}
const withdrawalVerifier = checkpoint.contracts.withdrawalVerifier;
const commitmentVerifier = checkpoint.contracts.commitmentVerifier;
const entrypointImplementation = checkpoint.contracts.entrypointImplementation;
const entrypointArtifact = artifact("Entrypoint");
const initializeData = encodeFunctionData({
  abi: entrypointArtifact.abi,
  functionName: "initialize",
  args: [account.address, postman],
});
const proxy = await deploy("ERC1967Proxy", [entrypointImplementation.address, initializeData], "entrypointProxy");

const pool = await deploy("PrivacyPoolSimple", [
  proxy.address,
  withdrawalVerifier.address,
  commitmentVerifier.address,
  guardian,
], "pool");
const entrypointAbi = entrypointArtifact.abi;
const rootTx = await call(proxy.address, entrypointAbi, "updateRoot", [aspRoot, cid], postmanWallet);
const nativeAsset = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const registerTx = await call(proxy.address, entrypointAbi, "registerPool", [
  nativeAsset,
  pool.address,
  denomination,
  0n,
  0n,
]);
const ownerRole = keccak256(new TextEncoder().encode("OWNER_ROLE"));
const renounceTx = await call(proxy.address, entrypointAbi, "renounceRole", [ownerRole, account.address]);

const manifest = {
  schemaVersion: 1,
  status: "testnet-rehearsal",
  chainId: chain.id,
  protocol: "0xbow-privacy-pools-core-v1.2.1",
  sourceCommit: "a80836a47451e662f127af17e11430ffa976c234",
  compiler: "solc 0.8.28",
  denominationWei: denomination.toString(),
  lifetimeDepositCapWei: cap.toString(),
  protocolFeeBps: 0,
  relayFeeBps: 0,
  deployer: account.address,
  aspPostman: postman,
  guardian,
  associationSet: { root: aspRoot.toString(), cid },
  supersedes: reuseManifestName,
  contracts: { withdrawalVerifier, commitmentVerifier, entrypointImplementation, entrypointProxy: proxy, pool, libraries: checkpoint.contracts.libraries },
  transactions: { rootTx, registerTx, renounceOwnerRoleTx: renounceTx },
  publishedAt: new Date().toISOString(),
  privacyClaim: "Testnet rehearsal only. No production privacy or compliance claim.",
};
manifest.poolDeploymentBlock = pool.blockNumber;
manifest.entrypointDeploymentBlock = proxy.blockNumber;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
rmSync(checkpointPath, { force: true });
console.log(`Wrote deployment manifest: ${manifestPath}`);
