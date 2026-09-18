// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./ArtemisToken.sol";

interface IV2Router {
  function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
  ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

/// @notice One-transaction launcher: deploys a fixed-supply ArtemisToken and
/// funds its Uniswap V2 pool atomically. Either everything lands or all reverts
/// (minus gas). LP tokens and leftover supply go straight to the creator.
/// The launcher never holds funds after the call.
contract ArtemisLauncher {
  address public immutable router;

  event Launched(
    address indexed token,
    address indexed creator,
    uint pooledTokens,
    uint ethAdded,
    uint liquidity
  );

  constructor(address r) {
    require(r != address(0), "router");
    router = r;
  }

  function launch(
    string memory n,
    string memory s,
    uint supply,
    uint pooled,
    uint ethMin,
    uint deadline
  ) external payable returns (address token, uint liquidity) {
    require(msg.value > 0, "eth");
    require(pooled > 0 && pooled <= supply, "pooled");
    require(deadline > block.timestamp, "deadline");

    ArtemisToken t = new ArtemisToken(n, s, supply);
    token = address(t);

    require(t.approve(router, pooled), "approve");
    (uint usedTokens, uint usedEth, uint liq) = IV2Router(router).addLiquidityETH{value: msg.value}(
      token,
      pooled,
      pooled,
      ethMin,
      msg.sender,
      deadline
    );
    liquidity = liq;

    // Sweep full remainder: equals supply - pooled on the happy path, and
    // leaves no dust locked if a router ever pulls less than desired.
    uint bal = t.balanceOf(address(this));
    if (bal > 0) {
      require(t.transfer(msg.sender, bal), "payout");
    }
    emit Launched(token, msg.sender, usedTokens, usedEth, liquidity);
  }
}
