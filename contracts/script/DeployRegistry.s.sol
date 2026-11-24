// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { SentraRegistry } from "../src/SentraRegistry.sol";

contract DeployRegistry is Script {
    address internal constant BSC_AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;

    function run() external returns (SentraRegistry registry) {
        address agentId = vm.envOr("AGENT_ID", BSC_AGENT_ID);

        vm.startBroadcast();
        registry = new SentraRegistry(agentId);
        vm.stopBroadcast();

        console2.log("chainId", block.chainid);
        console2.log("agentId", agentId);
        console2.log("SentraRegistry", address(registry));

        string memory json = vm.serializeAddress("sentra", "registry", address(registry));
        json = vm.serializeAddress("sentra", "agentId", agentId);
        json = vm.serializeUint("sentra", "chainId", block.chainid);
        string memory path = string.concat(
            vm.projectRoot(), "/deployments/", vm.toString(block.chainid), "-registry.json"
        );
        vm.writeJson(json, path);
    }
}
