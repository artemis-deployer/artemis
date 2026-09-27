// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Fixed-denomination shielded pool (commitment–nullifier + association set).
/// Deposit appends a commitment to an onchain Merkle tree; withdraw proves
/// membership in zero knowledge, reveals a nullifier (no double spend), and
/// pays out to a fresh address. Withdraw can NEVER be paused: only deposits
/// are pausable, and the guardian role itself can be renounced.
/// @dev Testnet-first. Owner decision 2026-09-26: no third-party audit;
/// substituted with internal review + full test suite + testnet rehearsal +
/// strict onchain caps. Mock verifier is testnet-only: mainnet with the mock
/// has NO privacy (anyone can withdraw) and must stay explicitly labeled.
interface IShieldedVerifier {
  function verify(
    bytes calldata proof,
    bytes32 root,
    bytes32 nullifierHash,
    address recipient,
    uint256 fee,
    bytes32 associationRoot
  ) external view returns (bool);
}

contract ShieldedPool {
  uint8 public constant TREE_DEPTH = 20;
  uint8 public constant ROOT_HISTORY = 100;

  IShieldedVerifier public immutable verifier;
  uint256 public immutable denomination;
  uint256 public immutable poolCap;
  bytes32 public immutable associationRoot;
  address public guardian;

  bool public depositsPaused;
  uint256 public totalDeposits;
  uint256 public totalWithdrawn;
  uint32 public nextIndex;

  mapping(uint32 => bytes32) public filledSubtrees;
  mapping(bytes32 => bool) public knownRoots;
  bytes32[] public rootHistory;
  mapping(bytes32 => bool) public nullifierUsed;

  event Deposit(uint32 indexed index, bytes32 commitment);
  event Withdraw(bytes32 indexed nullifierHash, address indexed recipient);
  event DepositsPaused(address indexed guardian);
  event DepositsUnpaused(address indexed guardian);
  event GuardianRenounced(address indexed guardian);

  constructor(
    address _verifier,
    uint256 _denomination,
    uint256 _poolCap,
    bytes32 _associationRoot,
    address _guardian
  ) {
    require(_verifier != address(0), "verifier");
    require(_denomination > 0, "denomination");
    require(_poolCap >= _denomination, "cap");
    require(_guardian != address(0), "guardian");
    verifier = IShieldedVerifier(_verifier);
    denomination = _denomination;
    poolCap = _poolCap;
    associationRoot = _associationRoot;
    guardian = _guardian;
  }

  /// @notice Deposit exactly `denomination` and append a commitment leaf.
  function deposit(bytes32 commitment) external payable {
    require(!depositsPaused, "paused");
    require(msg.value == denomination, "amount");
    require(totalDeposits + denomination <= poolCap, "pool_cap");
    require(nextIndex < 2 ** TREE_DEPTH, "tree_full");

    uint32 index = nextIndex;
    unchecked {
      nextIndex = index + 1;
    }
    totalDeposits += denomination;

    bytes32 node = commitment;
    uint32 current = index;
    for (uint8 level = 0; level < TREE_DEPTH; level++) {
      if (current % 2 == 0) {
        filledSubtrees[level] = node;
        node = keccak256(abi.encodePacked(node, _zero(level)));
      } else {
        node = keccak256(abi.encodePacked(filledSubtrees[level], node));
      }
      current /= 2;
    }
    knownRoots[node] = true;
    rootHistory.push(node);
    if (rootHistory.length > ROOT_HISTORY) {
      bytes32 evicted = rootHistory[0];
      rootHistory[0] = rootHistory[rootHistory.length - 1];
      rootHistory.pop();
      delete knownRoots[evicted];
    }
    emit Deposit(index, commitment);
  }

  /// @notice Withdraw to a fresh address via relayer. Never pausable.
  function withdraw(
    bytes calldata proof,
    bytes32 root,
    bytes32 nullifierHash,
    address recipient,
    uint256 fee
  ) external {
    require(!nullifierUsed[nullifierHash], "spent");
    require(knownRoots[root], "unknown_root");
    require(recipient != address(0), "recipient");
    require(fee < denomination, "fee");
    require(
      verifier.verify(proof, root, nullifierHash, recipient, fee, associationRoot),
      "bad_proof"
    );
    nullifierUsed[nullifierHash] = true;
    uint256 payout = denomination - fee;
    totalWithdrawn += denomination;
    (bool okRecipient, ) = recipient.call{value: payout}("");
    require(okRecipient, "payout");
    if (fee > 0) {
      (bool okFee, ) = msg.sender.call{value: fee}("");
      require(okFee, "fee_payout");
    }
    emit Withdraw(nullifierHash, recipient);
  }

  function pauseDeposits() external {
    require(msg.sender == guardian, "guardian");
    depositsPaused = true;
    emit DepositsPaused(msg.sender);
  }

  function unpauseDeposits() external {
    require(msg.sender == guardian, "guardian");
    depositsPaused = false;
    emit DepositsUnpaused(msg.sender);
  }

  /// @notice Permanently remove the guardian. Withdraw was never pausable.
  function renounceGuardian() external {
    require(msg.sender == guardian, "guardian");
    emit GuardianRenounced(guardian);
    guardian = address(0);
  }

  /// @notice Reject plain transfers so funds cannot lock without a commitment.
  receive() external payable {
    revert("use_deposit");
  }

  function _zero(uint8 level) internal pure returns (bytes32) {
    bytes32 z = bytes32(0);
    for (uint8 i = 0; i < level; i++) {
      z = keccak256(abi.encodePacked(z, z));
    }
    return z;
  }
}
