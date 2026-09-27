// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PrivacyPoolSimple} from "contracts/implementations/PrivacyPoolSimple.sol";
import {ArtemisMainnetPrivacyPoolSimple} from "contracts/ArtemisMainnetPrivacyPoolSimple.sol";
import {PrivacyPool} from "contracts/PrivacyPool.sol";
import {IPrivacyPool} from "interfaces/IPrivacyPool.sol";
import {IState} from "interfaces/IState.sol";
import {ProofLib} from "contracts/lib/ProofLib.sol";

interface Vm {
  function expectRevert(bytes4) external;
  function prank(address) external;
  function store(address, bytes32, bytes32) external;
}

contract TestOnlyVerifier {
  bool public accepts = true;

  function setAccepts(bool value) external {
    accepts = value;
  }

  function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[8] calldata)
    external
    view
    returns (bool)
  {
    return accepts;
  }
}

contract TestOnlyEntrypoint {
  uint256 public latestRoot = 123;

  function deposit(address pool, uint256 value, uint256 precommitment) external payable {
    IPrivacyPool(pool).deposit{value: value}(msg.sender, value, precommitment);
  }

  function relay(address pool, IPrivacyPool.Withdrawal calldata withdrawal, ProofLib.WithdrawProof calldata proof)
    external
  {
    IPrivacyPool(pool).withdraw(withdrawal, proof);
  }

  receive() external payable {}
}

contract ShieldPoolInvariantTest {
  Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
  uint256 private constant DENOMINATION = 0.001 ether;
  uint256 private constant FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

  TestOnlyEntrypoint private entrypoint;
  TestOnlyVerifier private verifier;
  PrivacyPoolSimple private pool;

  function setUp() public {
    entrypoint = new TestOnlyEntrypoint();
    verifier = new TestOnlyVerifier();
    pool = new PrivacyPoolSimple(address(entrypoint), address(verifier), address(verifier), address(this));
  }

  function testActualPoolRejectsWrongDenominationAndCap() public {
    vm.expectRevert(PrivacyPool.InvalidDenomination.selector);
    entrypoint.deposit{value: DENOMINATION + 1}(address(pool), DENOMINATION + 1, 11);

    // lifetimeDeposited is slot 11 in the pinned, inspected PrivacyPoolSimple storage layout.
    vm.store(address(pool), bytes32(uint256(11)), bytes32(uint256(10 ether)));
    vm.expectRevert(PrivacyPool.PoolDepositCapExceeded.selector);
    entrypoint.deposit{value: DENOMINATION}(address(pool), DENOMINATION, 12);

    require(pool.lifetimeDeposited() == 10 ether, "failed deposits changed lifetime total");
    require(address(pool).balance == 0, "failed deposits changed pool balance");
  }

  function testPoolAccountingAndPausedDepositWithdrawalReplay() public {
    entrypoint.deposit{value: DENOMINATION}(address(pool), DENOMINATION, 21);
    require(pool.lifetimeDeposited() - address(entrypoint).balance == address(pool).balance, "deposit accounting mismatch");

    pool.pauseDeposits();
    vm.expectRevert(PrivacyPool.DepositsArePaused.selector);
    entrypoint.deposit{value: DENOMINATION}(address(pool), DENOMINATION, 22);

    (IPrivacyPool.Withdrawal memory withdrawal, ProofLib.WithdrawProof memory proof) = _validWithdrawal(0xA11CE, 0xB0B);
    entrypoint.relay(address(pool), withdrawal, proof);
    require(address(entrypoint).balance == DENOMINATION, "withdrawal did not return funds to processor");
    require(pool.nullifierHashes(proof.pubSignals[1]), "nullifier not recorded");
    require(pool.lifetimeDeposited() - address(entrypoint).balance == address(pool).balance, "withdrawal accounting mismatch");

    vm.expectRevert(IState.NullifierAlreadySpent.selector);
    entrypoint.relay(address(pool), withdrawal, proof);
  }

  function testRecipientSubstitutionAndInvalidProofAreRejected() public {
    entrypoint.deposit{value: DENOMINATION}(address(pool), DENOMINATION, 31);
    (IPrivacyPool.Withdrawal memory withdrawal, ProofLib.WithdrawProof memory proof) = _validWithdrawal(0xA11CE, 0xB0B);
    withdrawal.data = hex"5678";
    vm.expectRevert(IPrivacyPool.ContextMismatch.selector);
    entrypoint.relay(address(pool), withdrawal, proof);

    (withdrawal, proof) = _validWithdrawal(0xA11CE, 0xB0B);
    verifier.setAccepts(false);
    vm.expectRevert(IPrivacyPool.InvalidProof.selector);
    entrypoint.relay(address(pool), withdrawal, proof);
    require(pool.nullifierHashes(proof.pubSignals[1]) == false, "failed proof spent nullifier");
    require(address(pool).balance == DENOMINATION, "failed proof changed pool balance");
  }

  function testGuardianAuthorizationIsEnforced() public {
    vm.prank(address(0xBEEF));
    vm.expectRevert(PrivacyPool.NotGuardian.selector);
    pool.pauseDeposits();
    require(pool.depositsPaused() == false, "unauthorized caller paused deposits");
  }

  function testMainnetDeploymentStartsWithDepositsPaused() public {
    ArtemisMainnetPrivacyPoolSimple launchPool = new ArtemisMainnetPrivacyPoolSimple(
      address(entrypoint), address(verifier), address(verifier), address(this)
    );
    require(launchPool.depositsPaused(), "mainnet pool must start paused");

    vm.expectRevert(PrivacyPool.DepositsArePaused.selector);
    entrypoint.deposit{value: DENOMINATION}(address(launchPool), DENOMINATION, 41);

    vm.prank(address(0xBEEF));
    vm.expectRevert(PrivacyPool.NotGuardian.selector);
    launchPool.activateDeposits();

    launchPool.activateDeposits();
    entrypoint.deposit{value: DENOMINATION}(address(launchPool), DENOMINATION, 42);
    require(launchPool.lifetimeDeposited() == DENOMINATION, "guardian could not activate deposits");

    vm.expectRevert(ArtemisMainnetPrivacyPoolSimple.ActivationAlreadyCompleted.selector);
    launchPool.activateDeposits();
  }

  function testFuzz_AccountingInvariantAcrossDepositAndWithdrawalSequences(uint8 seed) public {
    uint256 cycles = uint256(seed % 12) + 1;
    uint256 totalWithdrawn;
    for (uint256 i; i < cycles; ++i) {
      entrypoint.deposit{value: DENOMINATION}(address(pool), DENOMINATION, uint256(keccak256(abi.encode(seed, i))));
      if (i % 2 == 1) {
        (IPrivacyPool.Withdrawal memory withdrawal, ProofLib.WithdrawProof memory proof) =
          _validWithdrawal(0x1000 + i, 0x2000 + i);
        entrypoint.relay(address(pool), withdrawal, proof);
        totalWithdrawn += DENOMINATION;
      }
      require(pool.lifetimeDeposited() - totalWithdrawn == address(pool).balance, "sequence accounting invariant failed");
    }
  }

  function _validWithdrawal(uint256 newCommitment, uint256 nullifierHash)
    private
    view
    returns (IPrivacyPool.Withdrawal memory withdrawal, ProofLib.WithdrawProof memory proof)
  {
    withdrawal = IPrivacyPool.Withdrawal({processooor: address(entrypoint), data: hex"1234"});
    proof.pubSignals[0] = newCommitment;
    proof.pubSignals[1] = nullifierHash;
    proof.pubSignals[2] = DENOMINATION;
    proof.pubSignals[3] = pool.currentRoot();
    proof.pubSignals[4] = pool.currentTreeDepth();
    proof.pubSignals[5] = entrypoint.latestRoot();
    proof.pubSignals[6] = 1;
    proof.pubSignals[7] = uint256(keccak256(abi.encode(withdrawal, pool.SCOPE()))) % FIELD;
  }
}
