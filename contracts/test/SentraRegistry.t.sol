// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { SentraRegistry } from "../src/SentraRegistry.sol";
import { MockAgentID } from "./mocks/MockAgentID.sol";

contract SentraRegistryTest is Test {
    MockAgentID internal id;
    SentraRegistry internal registry;

    address internal holder;
    address internal holder2;
    address internal holder3;
    address internal nonHolder;
    address internal target;

    bytes32 internal constant EVIDENCE = keccak256("ipfs://sentra-evidence");

    uint8 internal constant NO_FLAGS = 0;
    uint8 internal constant WARNING = 1;
    uint8 internal constant DANGEROUS = 2;

    uint8 internal constant CONTRACT_RISK = 0;
    uint8 internal constant APPROVAL_RISK = 1;

    function setUp() public {
        id = new MockAgentID();
        holder = makeAddr("holder");
        holder2 = makeAddr("holder2");
        holder3 = makeAddr("holder3");
        nonHolder = makeAddr("nonHolder");
        target = makeAddr("target");

        id.setBalance(holder, 1);
        id.setBalance(holder2, 1);
        id.setBalance(holder3, 1);

        registry = new SentraRegistry(address(id));
        vm.warp(1_700_000_000);
    }

    function _attest(address account, address attestationTarget, uint8 verdict, uint8 category)
        internal
        returns (uint256)
    {
        vm.prank(account);
        return registry.attest(attestationTarget, verdict, category, EVIDENCE);
    }

    function test_HolderCanAttestAndEventEmitted() public {
        uint64 ts = uint64(block.timestamp);

        vm.expectEmit(true, true, true, true, address(registry));
        emit SentraRegistry.AttestationPosted(holder, target, NO_FLAGS, CONTRACT_RISK, EVIDENCE, ts);

        uint256 index = _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        assertEq(index, 0);

        SentraRegistry.Attestation[] memory list = registry.getAttestations(target, 0, 10);
        assertEq(list.length, 1);
        assertEq(list[0].attester, holder);
        assertEq(list[0].target, target);
        assertEq(list[0].verdict, NO_FLAGS);
        assertEq(list[0].category, CONTRACT_RISK);
        assertEq(list[0].evidenceHash, EVIDENCE);
        assertEq(uint256(list[0].ts), uint256(ts));

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(target);
        assertEq(stats.noFlagsFound, 1);
        assertEq(stats.warning, 0);
        assertEq(stats.dangerous, 0);
        assertEq(stats.uniqueAttesters, 1);
        assertEq(stats.totalAttestations, 1);
        assertTrue(registry.hasAttested(holder, target, CONTRACT_RISK));
        assertEq(registry.getAttestationCount(target), 1);
    }

    function test_RevertWhen_NonHolderAttests() public {
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.NotAgentIdHolder.selector, nonHolder));
        vm.prank(nonHolder);
        registry.attest(target, NO_FLAGS, CONTRACT_RISK, EVIDENCE);
    }

    function test_RevertWhen_DuplicateSameCategory() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);

        vm.expectRevert(
            abi.encodeWithSelector(
                SentraRegistry.DuplicateAttestation.selector, holder, target, CONTRACT_RISK
            )
        );
        _attest(holder, target, WARNING, CONTRACT_RISK);
    }

    function test_AllowsDifferentCategoriesAndTargets() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        _attest(holder, target, WARNING, APPROVAL_RISK);
        _attest(holder, makeAddr("otherTarget"), NO_FLAGS, CONTRACT_RISK);

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(target);
        assertEq(stats.uniqueAttesters, 1);
        assertEq(stats.totalAttestations, 2);
        assertEq(stats.noFlagsFound, 1);
        assertEq(stats.warning, 1);
    }

    function test_RevertWhen_ZeroTarget() public {
        vm.expectRevert(SentraRegistry.ZeroTarget.selector);
        _attest(holder, address(0), NO_FLAGS, CONTRACT_RISK);
    }

    function test_RevertWhen_SelfTarget() public {
        vm.expectRevert(SentraRegistry.SelfTarget.selector);
        _attest(holder, holder, NO_FLAGS, CONTRACT_RISK);
    }

    function test_RevertWhen_InvalidVerdict() public {
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidVerdict.selector, uint8(3)));
        _attest(holder, target, 3, CONTRACT_RISK);
    }

    function test_RevertWhen_InvalidCategory() public {
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidCategory.selector, uint8(5)));
        _attest(holder, target, NO_FLAGS, 5);
    }

    function test_CountersByVerdictAndUniqueAttesters() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        _attest(holder2, target, WARNING, CONTRACT_RISK);
        _attest(holder3, target, DANGEROUS, CONTRACT_RISK);

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(target);
        assertEq(stats.noFlagsFound, 1);
        assertEq(stats.warning, 1);
        assertEq(stats.dangerous, 1);
        assertEq(stats.uniqueAttesters, 3);
        assertEq(stats.totalAttestations, 3);

        assertEq(registry.verdictCount(target, NO_FLAGS), 1);
        assertEq(registry.verdictCount(target, WARNING), 1);
        assertEq(registry.verdictCount(target, DANGEROUS), 1);
        assertEq(registry.totalUniqueAttesters(), 3);
    }

    function test_TotalUniqueAttestersCountsEachWalletOnce() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        _attest(holder, target, WARNING, APPROVAL_RISK);
        _attest(holder, makeAddr("secondTarget"), NO_FLAGS, CONTRACT_RISK);
        assertEq(registry.totalUniqueAttesters(), 1);
        assertTrue(registry.hasEverAttested(holder));

        _attest(holder2, target, NO_FLAGS, CONTRACT_RISK);
        assertEq(registry.totalUniqueAttesters(), 2);
        assertFalse(registry.hasEverAttested(nonHolder));
    }

    function test_UniqueAttesterCountedOnceAcrossCategories() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        _attest(holder, target, WARNING, APPROVAL_RISK);
        _attest(holder, target, DANGEROUS, 2);

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(target);
        assertEq(stats.uniqueAttesters, 1);
        assertEq(stats.totalAttestations, 3);
        assertEq(registry.totalUniqueAttesters(), 1);
    }

    function test_RevertWhen_VerdictCountInvalid() public {
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidVerdict.selector, uint8(3)));
        registry.verdictCount(target, 3);
    }

    function test_UnknownTargetHasEmptyStats() public {
        SentraRegistry.TargetStats memory stats = registry.getTargetStats(makeAddr("unknown"));
        assertEq(stats.noFlagsFound, 0);
        assertEq(stats.warning, 0);
        assertEq(stats.dangerous, 0);
        assertEq(stats.uniqueAttesters, 0);
        assertEq(stats.totalAttestations, 0);
        assertFalse(registry.hasAttested(holder, makeAddr("unknown"), CONTRACT_RISK));
    }

    function test_Pagination() public {
        _attest(holder, target, NO_FLAGS, CONTRACT_RISK);
        _attest(holder2, target, WARNING, CONTRACT_RISK);
        _attest(holder3, target, DANGEROUS, CONTRACT_RISK);

        SentraRegistry.Attestation[] memory first = registry.getAttestations(target, 0, 2);
        assertEq(first.length, 2);
        assertEq(first[0].attester, holder);
        assertEq(first[1].attester, holder2);

        SentraRegistry.Attestation[] memory second = registry.getAttestations(target, 2, 2);
        assertEq(second.length, 1);
        assertEq(second[0].attester, holder3);

        SentraRegistry.Attestation[] memory pastEnd = registry.getAttestations(target, 3, 2);
        assertEq(pastEnd.length, 0);

        SentraRegistry.Attestation[] memory zeroLimit = registry.getAttestations(target, 0, 0);
        assertEq(zeroLimit.length, 0);

        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidPageBounds.selector, 4, 3));
        registry.getAttestations(target, 4, 2);
    }

    function test_PageSizeIsCapped() public {
        for (uint160 i = 1; i <= 105; i++) {
            address account = address(100_000 + i);
            id.setBalance(account, 1);
            _attest(account, target, NO_FLAGS, CONTRACT_RISK);
        }

        assertEq(registry.getAttestationCount(target), 105);
        SentraRegistry.Attestation[] memory page = registry.getAttestations(target, 0, 1000);
        assertEq(page.length, registry.MAX_PAGE_SIZE());
    }

    function test_RegistryRejectsEther() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(registry).call{ value: 1 ether }("");
        assertFalse(ok);
        assertEq(address(registry).balance, 0);
    }

    function test_RevertWhen_AgentIdZero() public {
        vm.expectRevert(SentraRegistry.ZeroAgentId.selector);
        new SentraRegistry(address(0));
    }

    function testFuzz_StoresValidAttestation(
        uint8 verdict,
        uint8 category,
        bytes32 evidence,
        address fuzzTarget
    ) public {
        verdict = uint8(bound(verdict, 0, 2));
        category = uint8(bound(category, 0, 4));
        vm.assume(fuzzTarget != address(0));
        vm.assume(fuzzTarget != holder);

        vm.prank(holder);
        registry.attest(fuzzTarget, verdict, category, evidence);

        SentraRegistry.Attestation[] memory list = registry.getAttestations(fuzzTarget, 0, 1);
        assertEq(list.length, 1);
        assertEq(list[0].attester, holder);
        assertEq(list[0].verdict, verdict);
        assertEq(list[0].category, category);
        assertEq(list[0].evidenceHash, evidence);

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(fuzzTarget);
        assertEq(stats.totalAttestations, 1);
        assertEq(stats.uniqueAttesters, 1);
        if (verdict == NO_FLAGS) assertEq(stats.noFlagsFound, 1);
        if (verdict == WARNING) assertEq(stats.warning, 1);
        if (verdict == DANGEROUS) assertEq(stats.dangerous, 1);
    }

    function testFuzz_InvalidVerdictReverts(uint8 verdict) public {
        verdict = uint8(bound(verdict, 3, type(uint8).max));
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidVerdict.selector, verdict));
        _attest(holder, target, verdict, CONTRACT_RISK);
    }

    function testFuzz_InvalidCategoryReverts(uint8 category) public {
        category = uint8(bound(category, 5, type(uint8).max));
        vm.expectRevert(abi.encodeWithSelector(SentraRegistry.InvalidCategory.selector, category));
        _attest(holder, target, NO_FLAGS, category);
    }

    function testFuzz_CountersStayConsistent(uint8 count) public {
        uint256 total = bound(count, 1, 20);
        uint256 noFlags;
        uint256 warning;
        uint256 dangerous;

        for (uint256 i = 0; i < total; i++) {
            address account = address(uint160(1_000_000 + i));
            id.setBalance(account, 1);

            uint8 verdict = uint8(uint256(keccak256(abi.encode(i))) % 3);
            if (verdict == NO_FLAGS) noFlags += 1;
            if (verdict == WARNING) warning += 1;
            if (verdict == DANGEROUS) dangerous += 1;

            _attest(account, target, verdict, CONTRACT_RISK);
        }

        SentraRegistry.TargetStats memory stats = registry.getTargetStats(target);
        assertEq(stats.noFlagsFound, noFlags);
        assertEq(stats.warning, warning);
        assertEq(stats.dangerous, dangerous);
        assertEq(stats.uniqueAttesters, total);
        assertEq(stats.totalAttestations, total);
        assertEq(registry.totalUniqueAttesters(), total);
        assertEq(stats.noFlagsFound + stats.warning + stats.dangerous, stats.totalAttestations);
    }
}
