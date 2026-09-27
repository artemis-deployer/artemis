import {
  AccountService,
  calculateContext,
  CircuitName,
  PrivacyPoolSDK,
  DataService,
  type CircuitsInterface,
  type AccountCommitment,
  type ChainConfig,
  type DepositEvent,
  type RagequitEvent,
  type WithdrawalEvent,
  type WithdrawalProof,
  type PoolInfo,
  type Withdrawal,
} from "@0xbow/privacy-pools-core-sdk";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { createPublicClient, encodeAbiParameters, http, type Address, type PublicClient } from "viem";
import { fetchPinnedShieldArtifact, type ShieldArtifactName } from "./shielded-artifact-integrity";
import { buildShieldAssociationProof, type ShieldAssociationSet } from "./shielded-association";
import type { ShieldStateTree } from "./shielded-state-tree";
import { SHIELDED_POOL_READ_ABI } from "./shielded-contract-abis";

const BACKUP_VERSION = 1;
const BACKUP_AAD = new TextEncoder().encode("artemis-shield-note-backup:v1");
const PBKDF2_ITERATIONS = 310_000;

export class ArtemisShieldDataService extends DataService {
  private readonly shieldClients = new Map<number, PublicClient>();
  private readonly shieldConfigs = new Map<number, ChainConfig>();

  constructor(configs: ChainConfig[]) {
    super(configs, new Map(configs.map((config) => [config.chainId, {
      blockChunkSize: 1800,
      concurrency: 1,
      chunkDelayMs: 100,
      retryOnFailure: true,
      maxRetries: 5,
      retryBaseDelayMs: 1000,
    }])));
    for (const config of configs) {
      this.shieldConfigs.set(config.chainId, config);
      this.shieldClients.set(config.chainId, createPublicClient({ transport: http(config.rpcUrl) }));
    }
  }

  private client(chainId: number): PublicClient {
    const client = this.shieldClients.get(chainId);
    if (!client) throw new Error("shield_chain_not_configured");
    return client;
  }

  private async finalizedBlock(chainId: number): Promise<bigint> {
    const head = await this.client(chainId).getBlockNumber();
    const depth = BigInt(Math.max(12, Number(process.env.SHIELD_CONFIRMATIONS || 12)));
    if (head <= depth) throw new Error("shield_finalized_head_unavailable");
    return head - depth;
  }

  private async logs(pool: PoolInfo, eventName: "Deposited" | "Withdrawn" | "Ragequit") {
    const config = this.shieldConfigs.get(pool.chainId);
    if (!config || config.privacyPoolAddress.toLowerCase() !== pool.address.toLowerCase()) throw new Error("shield_pool_not_configured");
    const client = this.client(pool.chainId);
    const end = await this.finalizedBlock(pool.chainId);
    const logs: unknown[] = [];
    for (let fromBlock = pool.deploymentBlock; fromBlock <= end; fromBlock += 1800n) {
      const toBlock = fromBlock + 1799n < end ? fromBlock + 1799n : end;
      logs.push(...await client.getContractEvents({
        address: pool.address,
        abi: SHIELDED_POOL_READ_ABI,
        eventName,
        fromBlock,
        toBlock,
        strict: true,
      }));
    }
    return logs as {
      args?: Record<string, unknown>;
      blockNumber?: bigint;
      transactionHash?: `0x${string}`;
    }[];
  }

  override async getDeposits(pool: PoolInfo): Promise<DepositEvent[]> {
    const logs = await this.logs(pool, "Deposited");
    const events: DepositEvent[] = [];
    for (const log of logs) {
        const { _depositor, _commitment, _label, _value, _precommitmentHash } = log.args ?? {};
        if (typeof _depositor !== "string" || typeof _commitment !== "bigint" || typeof _label !== "bigint" || typeof _value !== "bigint" || typeof _precommitmentHash !== "bigint" || log.blockNumber === undefined || !log.transactionHash) {
          throw new Error("shield_deposit_event_invalid");
        }
        events.push({
          depositor: _depositor.toLowerCase(),
          commitment: _commitment as never,
          label: _label as never,
          value: _value,
          precommitment: _precommitmentHash as never,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
    }
    return events;
  }

  override async getWithdrawals(pool: PoolInfo, fromBlock = pool.deploymentBlock): Promise<WithdrawalEvent[]> {
    const logs = await this.logs(pool, "Withdrawn");
    return logs.filter((log) => (log.blockNumber ?? 0n) >= fromBlock).map((log) => {
      const { _value, _spentNullifier, _newCommitment } = log.args ?? {};
      if (typeof _value !== "bigint" || typeof _spentNullifier !== "bigint" || typeof _newCommitment !== "bigint" || log.blockNumber === undefined || !log.transactionHash) {
        throw new Error("shield_withdrawal_event_invalid");
      }
      return { withdrawn: _value, spentNullifier: _spentNullifier as never, newCommitment: _newCommitment as never, blockNumber: log.blockNumber, transactionHash: log.transactionHash };
    });
  }

  override async getRagequits(pool: PoolInfo, fromBlock = pool.deploymentBlock): Promise<RagequitEvent[]> {
    const logs = await this.logs(pool, "Ragequit");
    return logs.filter((log) => (log.blockNumber ?? 0n) >= fromBlock).map((log) => {
      const { _ragequitter, _commitment, _label, _value } = log.args ?? {};
      if (typeof _ragequitter !== "string" || typeof _commitment !== "bigint" || typeof _label !== "bigint" || typeof _value !== "bigint" || log.blockNumber === undefined || !log.transactionHash) {
        throw new Error("shield_ragequit_event_invalid");
      }
      return { ragequitter: _ragequitter, commitment: _commitment as never, label: _label as never, value: _value, blockNumber: log.blockNumber, transactionHash: log.transactionHash };
    });
  }
}

export interface EncryptedShieldBackup {
  version: 1;
  kdf: "PBKDF2-SHA256";
  cipher: "AES-256-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function validateShieldRecoveryPhrase(phrase: string): boolean {
  try {
    mnemonicToAccount(phrase.trim());
    return true;
  } catch {
    return false;
  }
}

function requireValidPhrase(phrase: string): void {
  if (!validateShieldRecoveryPhrase(phrase)) throw new Error("shield_recovery_phrase_invalid");
}

async function deriveBackupKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations: PBKDF2_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function createShieldRecoveryPhrase(): string {
  return generateMnemonic(english, 256);
}

export async function encryptShieldBackup(phrase: string, password: string): Promise<EncryptedShieldBackup> {
  requireValidPhrase(phrase);
  if (password.length < 12) throw new Error("shield_backup_password_too_short");

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), additionalData: toArrayBuffer(BACKUP_AAD), tagLength: 128 },
    key,
    toArrayBuffer(new TextEncoder().encode(phrase.trim())),
  );
  return {
    version: BACKUP_VERSION,
    kdf: "PBKDF2-SHA256",
    cipher: "AES-256-GCM",
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptShieldBackup(
  value: unknown,
  password: string,
): Promise<string> {
  if (!value || typeof value !== "object") throw new Error("shield_backup_invalid");
  const backup = value as Partial<EncryptedShieldBackup>;
  if (
    backup.version !== BACKUP_VERSION ||
    backup.kdf !== "PBKDF2-SHA256" ||
    backup.cipher !== "AES-256-GCM" ||
    backup.iterations !== PBKDF2_ITERATIONS ||
    typeof backup.salt !== "string" ||
    typeof backup.iv !== "string" ||
    typeof backup.ciphertext !== "string"
  ) {
    throw new Error("shield_backup_invalid");
  }

  try {
    const key = await deriveBackupKey(password, fromBase64(backup.salt));
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(fromBase64(backup.iv)),
        additionalData: toArrayBuffer(BACKUP_AAD),
        tagLength: 128,
      },
      key,
      toArrayBuffer(fromBase64(backup.ciphertext)),
    );
    const phrase = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    requireValidPhrase(phrase);
    return phrase;
  } catch {
    throw new Error("shield_backup_decryption_failed");
  }
}

export class PinnedShieldCircuits implements CircuitsInterface {
  private readonly loaded = new Map<ShieldArtifactName, Promise<Uint8Array>>();

  private load(name: ShieldArtifactName): Promise<Uint8Array> {
    let pending = this.loaded.get(name);
    if (!pending) {
      pending = fetchPinnedShieldArtifact(name);
      this.loaded.set(name, pending);
    }
    return pending;
  }

  getWasm(name: CircuitName): Promise<Uint8Array> {
    return this.load(`${name}.wasm` as ShieldArtifactName);
  }

  getProvingKey(name: CircuitName): Promise<Uint8Array> {
    return this.load(`${name}.zkey` as ShieldArtifactName);
  }

  getVerificationKey(name: CircuitName): Promise<Uint8Array> {
    return this.load(`${name}.vkey` as ShieldArtifactName);
  }
}

export function createShieldWithdrawalContext(input: {
  entrypoint: Address;
  recipient: Address;
  feeRecipient: Address;
  scope: bigint;
}): { withdrawal: Withdrawal; context: bigint } {
  const data = encodeAbiParameters(
    [{ type: "tuple", components: [
      { name: "recipient", type: "address" },
      { name: "feeRecipient", type: "address" },
      { name: "relayFeeBPS", type: "uint256" },
    ] }],
    [{ recipient: input.recipient, feeRecipient: input.feeRecipient, relayFeeBPS: 0n }],
  );
  const withdrawal: Withdrawal = { processooor: input.entrypoint, data };
  const context = BigInt(calculateContext(withdrawal, input.scope as never));
  return { withdrawal, context };
}

export async function proveShieldWithdrawal(input: {
  sdk: PrivacyPoolSDK;
  accountService: AccountService;
  commitment: AccountCommitment;
  stateTree: ShieldStateTree;
  associationSet: ShieldAssociationSet;
  entrypoint: Address;
  recipient: Address;
  feeRecipient: Address;
  scope: bigint;
  withdrawalAmount: bigint;
}): Promise<{ withdrawalProof: WithdrawalProof; withdrawal: Withdrawal }> {
  if (!input.stateTree.leaves.includes(input.commitment.hash)) throw new Error("shield_state_commitment_missing");
  const stateMerkleProof = input.stateTree.proof(input.commitment.hash);
  const aspMerkleProof = buildShieldAssociationProof(input.associationSet, input.commitment.label);
  const secretPair = input.accountService.createWithdrawalSecrets(input.commitment);
  const { withdrawal, context } = createShieldWithdrawalContext(input);
  const withdrawalProof = await input.sdk.proveWithdrawal(input.commitment, {
    withdrawalAmount: input.withdrawalAmount,
    stateMerkleProof,
    aspMerkleProof,
    stateRoot: input.stateTree.root as never,
    stateTreeDepth: 32n,
    aspRoot: input.associationSet.root as never,
    aspTreeDepth: 32n,
    context,
    newNullifier: secretPair.nullifier,
    newSecret: secretPair.secret,
  });
  if (!(await input.sdk.verifyWithdrawal(withdrawalProof))) throw new Error("shield_withdrawal_proof_invalid");
  return { withdrawalProof, withdrawal };
}

export function createShieldAccount(mnemonic: string, pool: PoolInfo, rpcUrl: string) {
  requireValidPhrase(mnemonic);
  const dataService = new ArtemisShieldDataService([
    {
      chainId: pool.chainId,
      privacyPoolAddress: pool.address,
      startBlock: pool.deploymentBlock,
      rpcUrl,
    },
  ]);
  return {
    sdk: new PrivacyPoolSDK(new PinnedShieldCircuits()),
    accountService: new AccountService(dataService, { mnemonic: mnemonic.trim() }),
    dataService,
  };
}

export async function recoverShieldAccount(mnemonic: string, pools: PoolInfo[], rpcUrl: string) {
  requireValidPhrase(mnemonic);
  const dataService = new ArtemisShieldDataService(
    pools.map((pool) => ({
      chainId: pool.chainId,
      privacyPoolAddress: pool.address,
      startBlock: pool.deploymentBlock,
      rpcUrl,
    })),
  );
  const restored = await AccountService.initializeWithEvents(dataService, { mnemonic: mnemonic.trim() }, pools);
  return { ...restored, sdk: new PrivacyPoolSDK(new PinnedShieldCircuits()), dataService };
}
