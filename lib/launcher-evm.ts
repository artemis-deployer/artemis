import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeDeployData,
  formatEther,
  http,
  parseAbi,
  parseEther,
  type Account,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { TOKEN_ABI, TOKEN_BYTECODE } from "./token-artifact";
import { LAUNCHER_ABI } from "./launcher-artifact";
import { getActiveEvmProvider } from "./wallets";

export type HoodConfig = {
  id: 4663 | 46630;
  name: string;
  rpc: string;
  explorer: string;
  router: Address | null;
  factory: Address | null;
  weth: Address;
  /** One-tx factory. Null until deployed (see scripts/deploy-launcher.mjs). */
  launcher: Address | null;
};

export const ETH_MIN_BPS = 9800;

export const SLIPPAGE_PRESETS = [
  { label: "Low 0.5%", bps: 9950 },
  { label: "Default 2%", bps: 9800 },
  { label: "High 5%", bps: 9500 },
] as const;

export function calcEthMin(ethAmount: bigint, bps: number = ETH_MIN_BPS): bigint {
  if (!Number.isInteger(bps) || bps < 5000 || bps > 10000) throw new Error("bad_slippage");
  const result = (ethAmount * BigInt(bps)) / 10000n;
  if (ethAmount > 0n && result === 0n) return 1n;
  return result;
}
export const TX_DEADLINE_SECS = 600;

export function formatEth(value: bigint, maxDecimals = 8): string {
  const [head, tail = ""] = formatEther(value).split(".");
  const frac = tail.replace(/0+$/, "").slice(0, maxDecimals);
  return frac ? `${head || "0"}.${frac}` : head || "0";
}

export type LaunchCost = { gas: bigint; gasPrice: bigint; fee: bigint; steps: 1 | 2 };

/** Live gas estimate for the review screen. Throws on bad input or RPC failure. */
export async function estimateLaunchCost(args: {
  chainId: 4663 | 46630;
  account: Address;
  name: string;
  ticker: string;
  supply: bigint;
  pooled: bigint;
  ethAmount: bigint;
  slippageBps?: number;
}): Promise<LaunchCost> {
  const cfg = getHoodConfig(args.chainId);
  if (!cfg) throw new Error("unsupported_chain");
  if (args.pooled <= 0n || args.pooled > args.supply) throw new Error("bad_pool_amount");
  if (args.ethAmount <= 0n) throw new Error("bad_eth_amount");
  const ethMin = calcEthMin(args.ethAmount, args.slippageBps);
  const pub = publicClientFor(cfg);
  const gasPrice = await pub.getGasPrice();
  if (cfg.launcher) {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + TX_DEADLINE_SECS);
    const gas = await pub.estimateContractGas({
      address: cfg.launcher,
      abi: LAUNCHER_ABI,
      functionName: "launch",
      args: [args.name || args.ticker, args.ticker, args.supply, args.pooled, ethMin, deadline],
      value: args.ethAmount,
      account: args.account,
    });
    return { gas, gasPrice, fee: gas * gasPrice, steps: 1 };
  }
  const data = encodeDeployData({
    abi: TOKEN_ABI,
    bytecode: TOKEN_BYTECODE as `0x${string}`,
    args: [args.name || args.ticker, args.ticker, args.supply],
  });
  const gas = await pub.estimateGas({ account: args.account, data });
  return { gas, gasPrice, fee: gas * gasPrice, steps: 2 };
}

export const HOOD_MAINNET: HoodConfig = {
  id: 4663,
  name: "Robinhood Chain",
  rpc: "https://robinhood-rpc.publicnode.com",
  explorer: "https://robinhoodchain.blockscout.com",
  router: "0x89e5db8b5aa49aa85ac63f691524311aeb649eba",
  factory: "0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  launcher: "0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71",
};

export const HOOD_TESTNET: HoodConfig = {
  id: 46630,
  name: "Robinhood Testnet",
  rpc: "https://robinhood-sepolia-rpc.publicnode.com",
  explorer: "https://explorer.testnet.chain.robinhood.com",
  router: null,
  factory: null,
  weth: "0x0000000000000000000000000000000000000000",
  launcher: null,
};

export function getHoodConfig(chainId: number): HoodConfig | undefined {
  if (chainId === HOOD_MAINNET.id) return HOOD_MAINNET;
  if (chainId === HOOD_TESTNET.id) return HOOD_TESTNET;
  return undefined;
}

export function toTokenUnits(amount: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("bad_amount");
  return parseEther(amount);
}

const ROUTER_ABI = parseAbi([
  "function WETH() view returns (address)",
  "function factory() view returns (address)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
]);

function hoodChain(cfg: HoodConfig) {
  return defineChain({
    id: cfg.id,
    name: cfg.name,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [cfg.rpc] } },
    blockExplorers: { default: { name: "explorer", url: cfg.explorer } },
  });
}

function ethProvider() {
  const chosen = getActiveEvmProvider();
  if (chosen) return chosen;
  const w = window as unknown as { ethereum?: unknown };
  if (!w.ethereum) throw new Error("no_wallet");
  return w.ethereum;
}

export function publicClientFor(cfg: HoodConfig): PublicClient {
  return createPublicClient({ chain: hoodChain(cfg), transport: http(cfg.rpc) });
}

export async function connectWallet(): Promise<Address> {
  const client = createWalletClient({ transport: custom(ethProvider() as never) });
  const [account] = await client.requestAddresses();
  if (!account) throw new Error("no_account");
  return account;
}

export async function ensureChain(chainId: 4663 | 46630): Promise<void> {
  const eth = ethProvider() as {
    request: (a: { method: string; params?: unknown }) => Promise<unknown>;
  };
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  const want = `0x${chainId.toString(16)}`;
  if (current.toLowerCase() === want) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: want }] });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code !== 4902) throw e;
    const cfg = getHoodConfig(chainId);
    if (!cfg) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: want,
          chainName: cfg.name,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [cfg.rpc],
          blockExplorerUrls: [cfg.explorer],
        },
      ],
    });
  }
}

export async function validateRouter(cfg: HoodConfig): Promise<void> {
  if (!cfg.router || !cfg.factory) throw new Error("pool_unsupported_on_testnet");
  const pub = publicClientFor(cfg);
  const [weth, factory, code] = (await Promise.all([
    pub.readContract({ address: cfg.router, abi: ROUTER_ABI, functionName: "WETH" }),
    pub.readContract({ address: cfg.router, abi: ROUTER_ABI, functionName: "factory" }),
    pub.getCode({ address: cfg.router }),
  ])) as [Address, Address, `0x${string}` | undefined];
  if (weth.toLowerCase() !== cfg.weth.toLowerCase()) throw new Error("router_weth_mismatch");
  if (factory.toLowerCase() !== (cfg.factory as string).toLowerCase()) throw new Error("router_factory_mismatch");
  if (!code || code === "0x") throw new Error("router_no_code");
}

export async function deployToken(args: {
  chainId: 4663 | 46630;
  account: Address;
  name: string;
  ticker: string;
  supply: bigint;
}): Promise<{ hash: `0x${string}`; token: Address }> {
  const cfg = getHoodConfig(args.chainId);
  if (!cfg) throw new Error("unsupported_chain");
  const wallet: WalletClient = createWalletClient({ chain: hoodChain(cfg), transport: custom(ethProvider() as never) });
  const hash = await wallet.deployContract({
    abi: TOKEN_ABI,
    bytecode: TOKEN_BYTECODE as `0x${string}`,
    args: [args.name || args.ticker, args.ticker, args.supply],
    account: args.account as unknown as Account,
    chain: hoodChain(cfg),
  });
  const receipt = await publicClientFor(cfg).waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new Error("tx_failed");
  if (!receipt.contractAddress) throw new Error("no_contract_address");
  return { hash, token: receipt.contractAddress };
}

export async function addLiquidity(args: {
  chainId: 4663 | 46630;
  account: Address;
  token: Address;
  tokenAmount: bigint;
  ethAmount: bigint;
  slippageBps?: number;
}): Promise<{ hash: `0x${string}` }> {
  const cfg = getHoodConfig(args.chainId);
  if (!cfg || !cfg.router) throw new Error("pool_unsupported_on_testnet");
  const ethMin = calcEthMin(args.ethAmount, args.slippageBps);
  const wallet: WalletClient = createWalletClient({ chain: hoodChain(cfg), transport: custom(ethProvider() as never) });
  const pub = publicClientFor(cfg);
  const approveHash = await wallet.writeContract({
    address: args.token,
    abi: TOKEN_ABI,
    functionName: "approve",
    args: [cfg.router, args.tokenAmount],
    account: args.account as unknown as Account,
    chain: hoodChain(cfg),
  });
  await pub.waitForTransactionReceipt({ hash: approveHash }).then((r) => {
    if (r.status === "reverted") throw new Error("tx_failed");
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + TX_DEADLINE_SECS);
  const hash = await wallet.writeContract({
    address: cfg.router,
    abi: ROUTER_ABI,
    functionName: "addLiquidityETH",
    args: [args.token, args.tokenAmount, args.tokenAmount, ethMin, args.account, deadline],
    value: args.ethAmount,
    account: args.account as unknown as Account,
    chain: hoodChain(cfg),
  });
  const liqReceipt = await pub.waitForTransactionReceipt({ hash });
  if (liqReceipt.status === "reverted") throw new Error("tx_failed");
  return { hash };
}

/**
 * One-transaction launch via ArtemisLauncher: deploy token + fund pool atomically.
 * Either everything lands or the whole call reverts (minus gas).
 */
export async function launchOneTx(args: {
  chainId: 4663 | 46630;
  account: Address;
  name: string;
  ticker: string;
  supply: bigint;
  pooled: bigint;
  ethAmount: bigint;
  slippageBps?: number;
}): Promise<{ hash: `0x${string}`; token: Address }> {
  const cfg = getHoodConfig(args.chainId);
  if (!cfg || !cfg.launcher) throw new Error("launcher_unavailable");
  if (args.pooled <= 0n || args.pooled > args.supply) throw new Error("bad_pool_amount");
  if (args.ethAmount <= 0n) throw new Error("bad_eth_amount");
  const ethMin = calcEthMin(args.ethAmount, args.slippageBps);
  await validateRouter(cfg);
  const wallet: WalletClient = createWalletClient({ chain: hoodChain(cfg), transport: custom(ethProvider() as never) });
  const pub = publicClientFor(cfg);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + TX_DEADLINE_SECS);
  const hash = await wallet.writeContract({
    address: cfg.launcher,
    abi: LAUNCHER_ABI,
    functionName: "launch",
    args: [args.name || args.ticker, args.ticker, args.supply, args.pooled, ethMin, deadline],
    value: args.ethAmount,
    account: args.account as unknown as Account,
    chain: hoodChain(cfg),
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") throw new Error("tx_failed");
  const token = decodeLaunchedToken(
    receipt.logs as { address: string; topics: `0x${string}`[]; data: `0x${string}` }[],
    cfg.launcher,
  );
  if (!token) throw new Error("no_contract_address");
  return { hash, token };
}

export function decodeLaunchedToken(
  logs: { address: string; topics: `0x${string}`[]; data: `0x${string}` }[],
  launcher: Address,
): Address | null {
  // Launched(address,address,uint256,uint256,uint256): token is the first indexed topic.
  // The launcher-address check filters out Transfer logs emitted by the token itself.
  for (const log of logs) {
    if (log.topics.length >= 3 && log.address.toLowerCase() === launcher.toLowerCase()) {
      const token = `0x${log.topics[1].slice(-40)}` as Address;
      if (/^0x[0-9a-fA-F]{40}$/.test(token) && token !== "0x0000000000000000000000000000000000000000") {
        return token;
      }
    }
  }
  return null;
}
