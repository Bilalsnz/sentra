// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SandboxCleanVault {
    string public constant LABEL = "SENTRA TEST CONTRACT - CLEAN VAULT - NO ADMIN";

    uint256 public pingCount;

    event Pinged(address indexed caller, uint256 count);

    function ping() external returns (uint256) {
        pingCount += 1;
        emit Pinged(msg.sender, pingCount);
        return pingCount;
    }
}
