import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  http,
  parseEther,
  type Account,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { TOKEN_ABI, TOKEN_BYTECODE } from "./token-artifact";

export type HoodConfig = {
  id: 4663 | 46630;
  name: string;
  rpc: string;
  explorer: string;
  router: Address | null;
  factory: Address | null;
  weth: Address;
};

export const HOOD_MAINNET: HoodConfig = {
  id: 4663,
  name: "Robinhood Chain",
  rpc: "https://robinhood-rpc.publicnode.com",
  explorer: "https://robinhoodchain.blockscout.com",
  router: "0x89e5db8b5aa49aa85ac63f691524311aeb649eba",
  factory: "0x8bceaa40b9acdfaedf85adf4ff01f5ad6517937f",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
};

export const HOOD_TESTNET: HoodConfig = {
  id: 46630,
  name: "Robinhood Testnet",
  rpc: "https://robinhood-sepolia-rpc.publicnode.com",
  explorer: "https://explorer.testnet.chain.robinhood.com",
  router: null,
  factory: null,
  weth: "0x0000000000000000000000000000000000000000",
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

const ROUTER_ABI = [
  "function WETH() view returns (address)",
  "function factory() view returns (address)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
] as const;

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
  const [weth, factory, code] = await Promise.all([
    pub.readContract({ address: cfg.router, abi: ROUTER_ABI, functionName: "WETH" }),
    pub.readContract({ address: cfg.router, abi: ROUTER_ABI, functionName: "factory" }),
    pub.getCode({ address: cfg.router }),
  ]);
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
    account: args.account as Account,
  });
  const receipt = await publicClientFor(cfg).waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("no_contract_address");
  return { hash, token: receipt.contractAddress };
}

export async function addLiquidity(args: {
  chainId: 4663 | 46630;
  account: Address;
  token: Address;
  tokenAmount: bigint;
  ethAmount: bigint;
}): Promise<{ hash: `0x${string}` }> {
  const cfg = getHoodConfig(args.chainId);
  if (!cfg || !cfg.router) throw new Error("pool_unsupported_on_testnet");
  const wallet: WalletClient = createWalletClient({ chain: hoodChain(cfg), transport: custom(ethProvider() as never) });
  const pub = publicClientFor(cfg);
  const approveHash = await wallet.writeContract({
    address: args.token,
    abi: TOKEN_ABI,
    functionName: "approve",
    args: [cfg.router, args.tokenAmount],
    account: args.account as Account,
    chain: hoodChain(cfg),
  });
  await pub.waitForTransactionReceipt({ hash: approveHash });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  const hash = await wallet.writeContract({
    address: cfg.router,
    abi: ROUTER_ABI,
    functionName: "addLiquidityETH",
    args: [args.token, args.tokenAmount, args.tokenAmount, args.ethAmount, args.account, deadline],
    value: args.ethAmount,
    account: args.account as Account,
    chain: hoodChain(cfg),
  });
  await pub.waitForTransactionReceipt({ hash });
  return { hash };
}
