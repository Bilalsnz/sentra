// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice TESTNET ONLY. Never configure this contract for a mainnet Sentra deployment.
contract MockAgentID {
    address public immutable owner;
    mapping(address account => uint256) public balanceOf;

    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    function mint(address account) external {
        if (msg.sender != owner) revert NotOwner();
        balanceOf[account] = 1;
    }

    function revoke(address account) external {
        if (msg.sender != owner) revert NotOwner();
        balanceOf[account] = 0;
    }
}
