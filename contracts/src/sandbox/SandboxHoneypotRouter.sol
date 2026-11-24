// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SandboxHoneypotRouter {
    string public constant LABEL =
        "SENTRA TEST CONTRACT - MOCK HONEYPOT ROUTER - SELLS REVERT - DO NOT USE";

    uint256 public constant QUOTED_FEE_BPS = 9900;

    error SellBlocked();

    function buy() external pure returns (uint256) {
        return 1;
    }

    function sell() external pure {
        revert SellBlocked();
    }
}
