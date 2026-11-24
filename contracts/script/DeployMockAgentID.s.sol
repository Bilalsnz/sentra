// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { MockAgentID } from "../src/MockAgentID.sol";

/// @notice Deploy only to BNB Smart Chain testnet. Never use this as the mainnet Agent ID.
contract DeployMockAgentID is Script {
    function run() external returns (MockAgentID mockAgentId) {
        require(block.chainid == 97, "MockAgentID is testnet-only (chain 97)");

        vm.startBroadcast();
        mockAgentId = new MockAgentID();
        vm.stopBroadcast();

        console2.log("TESTNET ONLY - MockAgentID", address(mockAgentId));
        console2.log("owner", msg.sender);
        console2.log("chainId", block.chainid);

        string memory json = vm.serializeAddress("mockAgentId", "address", address(mockAgentId));
        json = vm.serializeAddress("mockAgentId", "owner", msg.sender);
        json = vm.serializeUint("mockAgentId", "chainId", block.chainid);
        string memory directory = string.concat(vm.projectRoot(), "/deployments");
        vm.createDir(directory, true);
        vm.writeJson(json, string.concat(directory, "/97-mock-agent-id.json"));
    }
}
