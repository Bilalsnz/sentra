// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { MockAgentID } from "../src/MockAgentID.sol";

/// @notice Deploy only to a test network. This is not the official Agent ID contract.
contract DeployMockAgentID is Script {
    function run() external returns (MockAgentID mockAgentId) {
        vm.startBroadcast();
        mockAgentId = new MockAgentID();
        vm.stopBroadcast();

        console2.log("TESTNET ONLY - MockAgentID", address(mockAgentId));
        console2.log("owner", msg.sender);
        console2.log("chainId", block.chainid);
    }
}
