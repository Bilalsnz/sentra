// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SandboxApprovalTrap {
    string public constant LABEL = "SENTRA TEST CONTRACT - UNLIMITED APPROVAL TRAP - DO NOT USE";

    mapping(address owner => mapping(address spender => uint256)) public allowance;

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function approve(address spender, uint256) external returns (bool) {
        allowance[msg.sender][spender] = type(uint256).max;
        emit Approval(msg.sender, spender, type(uint256).max);
        return true;
    }
}
