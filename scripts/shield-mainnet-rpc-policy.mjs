/**
 * Require HTTPS for network RPCs. The sole HTTP exception is an explicitly
 * opted-in local fork bound to a loopback address.
 * @param {string} rpcUrl
 * @param {boolean} localForkSimulation
 */
export function assertSafeMainnetRpc(rpcUrl, localForkSimulation = false) {
  let url;
  try {
    url = new URL(rpcUrl);
  } catch {
    throw new Error("mainnet_rpc_url_invalid");
  }

  if (!localForkSimulation) {
    const loopback = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(url.hostname.toLowerCase());
    if (url.protocol === "http:" && loopback) throw new Error("local_fork_flag_required");
    if (url.protocol !== "https:") throw new Error("mainnet_rpc_must_use_https");
    return url.toString();
  }

  const loopback = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(url.hostname.toLowerCase());
  if (url.protocol !== "http:" || !loopback) throw new Error("local_fork_must_use_loopback");
  return url.toString();
}
