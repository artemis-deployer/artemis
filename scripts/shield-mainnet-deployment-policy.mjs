/**
 * @param {{ args?: string[], env?: Record<string, string | undefined>, chainId?: number, verifierReady?: boolean, configuredOperator?: string, signerAddress?: string }} options
 */
export function resolveMainnetDeploymentMode({
  args = [],
  env = {},
  chainId,
  verifierReady = false,
  configuredOperator = "",
  signerAddress = "",
}) {
  if (!args.includes("--mainnet")) throw new Error("mainnet_flag_required");
  if (args.includes("--broadcast") && args.includes("--dry-run")) throw new Error("mainnet_mode_conflict");

  const broadcast = args.includes("--broadcast");
  if (!broadcast) return { broadcast: false };
  if (!args.includes("--i-understand-mainnet-broadcast")) {
    throw new Error("mainnet_broadcast_acknowledgement_required");
  }
  if (String(env.SHIELD_MAINNET_BROADCAST_ENABLED).toLowerCase() !== "true") {
    throw new Error("mainnet_broadcast_env_opt_in_required");
  }
  if (chainId !== 4663) throw new Error("mainnet_chain_id_mismatch");
  if (verifierReady !== true) throw new Error("mainnet_verifier_release_gate_closed");
  if (!/^0x[\da-f]{40}$/i.test(configuredOperator) || configuredOperator.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("mainnet_operator_signer_mismatch");
  }

  return { broadcast: true };
}
