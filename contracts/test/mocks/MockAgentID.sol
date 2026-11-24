// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAgentID {
    mapping(address => uint256) public balanceOf;

    function setBalance(address account, uint256 balance) external {
        balanceOf[account] = balance;
    }
}
