# Security Notes

## Scope

Sentra is an early-stage hackathon project. It is not a security audit, and a passing CI
run does not establish that the contracts, web app, MCP server, or their dependencies are
free of vulnerabilities.

## Dependency review (2026-11-24)

The web application was checked with both `npm audit --omit=dev` and the full
`npm audit`. The latest accepted lockfile state reported:

- 19 advisories total
- 12 high
- 7 moderate
- 0 critical

The findings are primarily transitive dependencies brought in by the Wagmi connector
ecosystem, including optional WalletConnect, MetaMask, Reown, Coinbase, and Gemini
connector packages. The application configures the injected connector through
`@wagmi/core`; it does not intentionally enable QR-based WalletConnect or MetaMask
pairing flows. However, packages present in the production dependency graph must not be
described as proven unreachable or harmless. A bundle-name scan found no literal package
markers in emitted bundles, but that is not proof of non-reachability.

Two targeted, same-major dependency corrections were accepted:

- `decode-uri-component` is pinned to patched `0.5.1` only within the affected
  WalletConnect `query-string` dependency path.
- Nested `viem` dependencies are aligned to the application's existing direct
  `viem` version range, avoiding an older vulnerable nested copy.

These changes reduced the audit count from 27 to 19 without forcing a major Wagmi upgrade.
The remaining findings include advisories associated with Wagmi/connectors, Reown,
Coinbase CDP, nested Zod 3 copies, and MetaMask-related packages.

A trial UUID 11.1.1 override was not accepted: the scoped override left nested UUID
versions outside their declared dependency ranges and caused `npm ls` to report invalid
packages. It was not merged into `main`. No `npm audit fix --force` or major-version
wallet-stack upgrade was applied.

## Application safeguards

- The MCP preflight tool is read-only and does not sign, broadcast, or approve transactions.
- The web application uses injected wallet access; it does not ask for seed phrases,
  private keys, passwords, pairing codes, or API secrets.
- The registry is designed to hold no funds and has no owner, admin, pause, upgrade, or
  withdrawal function.
- The registry checks Agent ID ownership using `balanceOf(address)`; it does not look up
  identities by username or handle.
- User-submitted attestations are signals, not proof that a contract is safe.
- Users must inspect findings and confirm all transactions themselves.

## Before mainnet

1. Re-run dependency audits against the exact release lockfile.
2. Review any newly disclosed advisories and update dependencies only with compatibility
   checks and passing CI.
3. Run the Foundry test suite and the full web/MCP CI workflow.
4. Deploy to BNB testnet first and test with real Agent ID holders.
5. Verify contract source and constructor configuration on BscScan before mainnet.
6. Publish deployed addresses and document immutable permissions and known limitations.

## Reporting

For a suspected vulnerability, open a GitHub Security Advisory for this repository when
private reporting is available. Do not publish exploit details or private user data in a
public issue.
