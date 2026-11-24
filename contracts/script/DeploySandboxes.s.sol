// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { SandboxCleanVault } from "../src/sandbox/SandboxCleanVault.sol";
import { SandboxApprovalTrap } from "../src/sandbox/SandboxApprovalTrap.sol";
import { SandboxHoneypotRouter } from "../src/sandbox/SandboxHoneypotRouter.sol";

/// @notice Deploy intentionally educational sandbox contracts to BSC testnet only.
contract DeploySandboxes is Script {
    function run()
        external
        returns (
            SandboxCleanVault cleanVault,
            SandboxApprovalTrap approvalTrap,
            SandboxHoneypotRouter honeypotRouter
        )
    {
        require(block.chainid == 97, "Sandbox contracts are testnet-only (chain 97)");

        vm.startBroadcast();
        cleanVault = new SandboxCleanVault();
        approvalTrap = new SandboxApprovalTrap();
        honeypotRouter = new SandboxHoneypotRouter();
        vm.stopBroadcast();

        console2.log("chainId", block.chainid);
        console2.log("cleanVault", address(cleanVault));
        console2.log("approvalTrap", address(approvalTrap));
        console2.log("honeypotRouter", address(honeypotRouter));

        string memory json = vm.serializeAddress("sandboxes", "cleanVault", address(cleanVault));
        json = vm.serializeAddress("sandboxes", "approvalTrap", address(approvalTrap));
        json = vm.serializeAddress("sandboxes", "honeypotRouter", address(honeypotRouter));
        json = vm.serializeUint("sandboxes", "chainId", block.chainid);
        string memory directory = string.concat(vm.projectRoot(), "/deployments");
        vm.createDir(directory, true);
        string memory path = string.concat(
            directory, "/", vm.toString(block.chainid), "-sandboxes.json"
        );
        vm.writeJson(json, path);
    }
}
