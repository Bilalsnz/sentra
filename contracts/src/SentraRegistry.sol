// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IAgentID } from "./IAgentID.sol";

contract SentraRegistry {
    struct Attestation {
        address attester;
        address target;
        uint8 verdict;
        uint8 category;
        bytes32 evidenceHash;
        uint64 ts;
    }

    struct TargetStats {
        uint256 noFlagsFound;
        uint256 warning;
        uint256 dangerous;
        uint256 uniqueAttesters;
        uint256 totalAttestations;
    }

    uint8 public constant VERDICT_NO_FLAGS_FOUND = 0;
    uint8 public constant VERDICT_WARNING = 1;
    uint8 public constant VERDICT_DANGEROUS = 2;
    uint8 public constant VERDICT_COUNT = 3;

    uint8 public constant CATEGORY_CONTRACT_RISK = 0;
    uint8 public constant CATEGORY_APPROVAL_RISK = 1;
    uint8 public constant CATEGORY_HONEYPOT = 2;
    uint8 public constant CATEGORY_PROXY_UPGRADE = 3;
    uint8 public constant CATEGORY_OTHER = 4;
    uint8 public constant CATEGORY_COUNT = 5;

    uint256 public constant MAX_PAGE_SIZE = 100;

    IAgentID public immutable agentId;
    uint256 public totalUniqueAttesters;

    mapping(address attester => mapping(address target => mapping(uint8 category => bool))) private
        _attested;
    mapping(address target => mapping(address attester => bool)) private _hasAttestedTarget;
    mapping(address attester => bool) private _hasEverAttested;
    mapping(address target => Attestation[]) private _attestations;
    mapping(address target => TargetStats) private _stats;

    event AttestationPosted(
        address indexed attester,
        address indexed target,
        uint8 indexed verdict,
        uint8 category,
        bytes32 evidenceHash,
        uint64 ts
    );

    error NotAgentIdHolder(address caller);
    error ZeroTarget();
    error SelfTarget();
    error InvalidVerdict(uint8 verdict);
    error InvalidCategory(uint8 category);
    error DuplicateAttestation(address attester, address target, uint8 category);
    error ZeroAgentId();
    error InvalidPageBounds(uint256 offset, uint256 total);

    constructor(address agentId_) {
        if (agentId_ == address(0)) revert ZeroAgentId();
        agentId = IAgentID(agentId_);
    }

    function attest(address target, uint8 verdict, uint8 category, bytes32 evidenceHash)
        external
        returns (uint256 index)
    {
        if (agentId.balanceOf(msg.sender) == 0) revert NotAgentIdHolder(msg.sender);
        if (target == address(0)) revert ZeroTarget();
        if (target == msg.sender) revert SelfTarget();
        if (verdict >= VERDICT_COUNT) revert InvalidVerdict(verdict);
        if (category >= CATEGORY_COUNT) revert InvalidCategory(category);
        if (_attested[msg.sender][target][category]) {
            revert DuplicateAttestation(msg.sender, target, category);
        }

        _attested[msg.sender][target][category] = true;

        if (!_hasEverAttested[msg.sender]) {
            _hasEverAttested[msg.sender] = true;
            totalUniqueAttesters += 1;
        }

        TargetStats storage stats = _stats[target];
        if (!_hasAttestedTarget[target][msg.sender]) {
            _hasAttestedTarget[target][msg.sender] = true;
            stats.uniqueAttesters += 1;
        }
        if (verdict == VERDICT_NO_FLAGS_FOUND) {
            stats.noFlagsFound += 1;
        } else if (verdict == VERDICT_WARNING) {
            stats.warning += 1;
        } else {
            stats.dangerous += 1;
        }
        stats.totalAttestations += 1;

        uint64 ts = uint64(block.timestamp);
        index = _attestations[target].length;
        _attestations[target].push(
            Attestation({
                attester: msg.sender,
                target: target,
                verdict: verdict,
                category: category,
                evidenceHash: evidenceHash,
                ts: ts
            })
        );

        emit AttestationPosted(msg.sender, target, verdict, category, evidenceHash, ts);
    }

    function getTargetStats(address target) external view returns (TargetStats memory) {
        return _stats[target];
    }

    function verdictCount(address target, uint8 verdict) external view returns (uint256) {
        if (verdict >= VERDICT_COUNT) revert InvalidVerdict(verdict);
        TargetStats storage stats = _stats[target];
        if (verdict == VERDICT_NO_FLAGS_FOUND) return stats.noFlagsFound;
        if (verdict == VERDICT_WARNING) return stats.warning;
        return stats.dangerous;
    }

    function hasAttested(address attester, address target, uint8 category)
        external
        view
        returns (bool)
    {
        return _attested[attester][target][category];
    }

    function hasEverAttested(address attester) external view returns (bool) {
        return _hasEverAttested[attester];
    }

    function getAttestationCount(address target) external view returns (uint256) {
        return _attestations[target].length;
    }

    function getAttestations(address target, uint256 offset, uint256 limit)
        external
        view
        returns (Attestation[] memory page)
    {
        uint256 total = _attestations[target].length;
        if (offset > total) revert InvalidPageBounds(offset, total);

        uint256 size = limit > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : limit;
        uint256 remaining = total - offset;
        if (size > remaining) size = remaining;

        page = new Attestation[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = _attestations[target][offset + i];
        }
    }
}
