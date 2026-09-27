export function assertShieldDeploymentAllowed({ network, rehearsal }) {
  if (network === "mainnet") {
    throw new Error("mainnet_blocked: this deployment helper is testnet-only");
  }
  if (network !== "testnet") throw new Error("unsupported_network");
  if (rehearsal !== true) {
    throw new Error("rehearsal_confirmation_required: the verifier accepts arbitrary rehearsal proofs");
  }
}
