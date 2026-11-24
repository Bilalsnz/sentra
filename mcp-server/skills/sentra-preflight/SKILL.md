---
name: sentra-preflight
description: Run a read-only Sentra preflight check before proposing any BNB Chain contract interaction, especially token approvals, operator approvals, or calls to unverified or proxy contracts. Uses the sentra_preflight_check MCP tool. The user always makes the final transaction decision.
---

# Sentra Preflight

## When to use

Call `sentra_preflight_check` before proposing any BNB Chain contract write, and always when:

- The user asks to `approve`, `increaseAllowance`, or `setApprovalForAll`.
- The target contract is unknown, newly deployed, unverified, or upgradeable.
- The user pastes calldata or asks an agent to prepare a transaction.
- The interaction moves funds, tokens, or NFT operator permissions.

Call it before showing a transaction request to the user, not after.

## Tool

Name: `sentra_preflight_check`

Inputs:

- `target` (required): 20-byte hex contract address.
- `calldata` (optional): full calldata the agent intends to propose.
- `skillHash` (optional): 0x-prefixed 32-byte hash of this skill file.

Example request:

```json
{
  "target": "0x1111111111111111111111111111111111111111",
  "calldata": "0x095ea7b30000000000000000000000002222222222222222222222222222222222222222000000000000000000000000000000000000000000000000ffffffffffffffffffffffff",
  "skillHash": "0x<64 hex characters>"
}
```

## Reading the result

- `HIGH_RISK`: Surface every high finding. Recommend that the user does not proceed. Never produce or send the transaction yourself.
- `CAUTION`: Explain the warning findings and ask the user to verify the details in their wallet.
- `UNRATED`: Sentra has no attestations for this target, or the registry is unavailable. Say that the target is unattested and that available checks are incomplete.
- `NO_FLAGS_FOUND`: No flags were found in the checks that ran. This is not proof of safety. Say so explicitly.

Never describe a target as "safe", "trusted", or "guaranteed". Never claim an attestation proves anything. Attestations are user-submitted signals.

Always include the report's `disclaimer` in your user-facing summary.

## Required agent behavior

1. Call the tool before proposing any BNB Chain contract interaction.
2. Show the `riskLevel`, the `findings`, and the `attestationCounts` to the user.
3. Keep the final decision with the user. The user must confirm every transaction in their wallet.
4. Never sign, send, approve, or broadcast a transaction. This tool is read-only.
5. Never ask for seed phrases, private keys, wallet passwords, or API secrets.
6. Never bypass or simulate a wallet confirmation.
7. If the tool is unavailable or errors, stop and tell the user. Do not guess or proceed without the check.
8. Do not look up Agent IDs by handle, username, or name. Sentra only checks `balanceOf` for the connected wallet.
9. Do not promise safety, returns, or passive income.

## Do not

- Do not use `sentra_preflight_check` as an endorsement.
- Do not treat `NO_FLAGS_FOUND` as a green light.
- Do not ask the user to paste keys or secrets into any prompt.
- Do not send funds or approvals to sandbox/test contracts.

## Disclaimer

This is a rule-based, read-only preflight report, not an audit and not financial advice. `NO_FLAGS_FOUND` is not a safety guarantee. The user must verify every detail and confirm every transaction.
