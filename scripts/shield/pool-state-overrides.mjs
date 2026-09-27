// solc 0.8.28 storage layout for the pinned v1.2.1 PrivacyPoolSimple.
export const PRIVACY_POOL_STORAGE = Object.freeze({
  guardianAndPauseFlags: 10n,
  lifetimeDeposited: 11n,
  depositsPausedOffsetBytes: 20n,
});

function storageWord(value) {
  if (value < 0n || value >= 1n << 256n) throw new RangeError("state override value must fit uint256");
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function storageSlot(value) {
  return storageWord(value);
}

export function lifetimeDepositCapOverride(address, cap) {
  return {
    address,
    stateDiff: [{ slot: storageSlot(PRIVACY_POOL_STORAGE.lifetimeDeposited), value: storageWord(cap) }],
  };
}

export function depositsPausedOverride(address) {
  const packedPauseFlag = 1n << BigInt(PRIVACY_POOL_STORAGE.depositsPausedOffsetBytes * 8n);
  return {
    address,
    stateDiff: [{ slot: storageSlot(PRIVACY_POOL_STORAGE.guardianAndPauseFlags), value: storageWord(packedPauseFlag) }],
  };
}

export function simulatedFundedSenderOverride(address, balance) {
  if (balance < 0n || balance >= 1n << 256n) throw new RangeError("simulated balance must fit uint256");
  return { address, balance };
}
