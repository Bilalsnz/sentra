// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { SandboxCleanVault } from "../src/sandbox/SandboxCleanVault.sol";
import { SandboxApprovalTrap } from "../src/sandbox/SandboxApprovalTrap.sol";
import { SandboxHoneypotRouter } from "../src/sandbox/SandboxHoneypotRouter.sol";

contract SandboxTest is Test {
    SandboxCleanVault internal cleanVault;
    SandboxApprovalTrap internal approvalTrap;
    SandboxHoneypotRouter internal honeypotRouter;

    function setUp() public {
        cleanVault = new SandboxCleanVault();
        approvalTrap = new SandboxApprovalTrap();
        honeypotRouter = new SandboxHoneypotRouter();
    }

    function test_CleanVaultPing() public {
        assertEq(cleanVault.pingCount(), 0);
        assertEq(cleanVault.ping(), 1);
        assertEq(cleanVault.ping(), 2);
        assertEq(cleanVault.pingCount(), 2);
    }

    function test_ApprovalTrapIgnoresRequestedAmount() public {
        assertTrue(approvalTrap.approve(makeAddr("spender"), 1));
        assertEq(approvalTrap.allowance(address(this), makeAddr("spender")), type(uint256).max);
    }

    function test_HoneypotBuysButBlocksSells() public {
        assertEq(honeypotRouter.buy(), 1);
        vm.expectRevert(SandboxHoneypotRouter.SellBlocked.selector);
        honeypotRouter.sell();
    }

    function test_LabelsMarkContractsAsTests() public view {
        assertTrue(bytes(cleanVault.LABEL()).length > 0);
        assertTrue(bytes(approvalTrap.LABEL()).length > 0);
        assertTrue(bytes(honeypotRouter.LABEL()).length > 0);
    }
}
