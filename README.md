# Sentra

Sentra is an ownerless security attestation registry and a read-only preflight tool for
BNB Chain contracts and agent skills. Agent ID holders post structured attestations. AI
agents can run a read-only MCP preflight before proposing any contract interaction. The
user always confirms the transaction.

This repository is a hackathon build. It is not an audit, not financial advice, and does
not promise safety, returns, or passive income.

## Architecture

```text
Agent ID holder ──> web audit queue ──> SentraRegistry (BNB Chain)
                                              │
                                              │ getTargetStats / totalUniqueAttesters
                                              ▼
User or agent ──> MCP sentra_preflight_check ──> JSON-RPC + explorer
                                              │
                                              ▼
                                   findings + attestation counts
```

- The registry is ownerless. It holds no funds and has no admin, pause, upgrade, or
  withdrawal path.
- The MCP tool is read-only. It has no signing code and never sends or approves a
  transaction.
- The web app uses injected wallets only. There is no QR login, pairing code, or
  server-stored session.
- Sentra never asks for seed phrases, private keys, wallet passwords, or API secrets.

## Repository layout

```text
sentra/
├── contracts/        Foundry project: registry, sandbox contracts, tests, scripts
├── mcp-server/       TypeScript MCP server + skills/sentra-preflight/SKILL.md
├── web/              Next.js App Router frontend (wagmi + viem)
├── .github/          CI
└── README.md         Architecture, disclosures, setup, deployment, submission notes
```

## Contracts

### Agent ID gate

- Contract: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` (BNB Chain mainnet).
- Interface used: `balanceOf(address) view returns (uint256)` only.
- Confirmed on-chain: `name()` returns `SPACE ID Agent ID`, `symbol()` returns `AI`, and
  `balanceOf(address)` responds.
- Sentra never calls `handleOf` and never looks up an Agent ID by handle, username, or
  name. Eligibility is only `balanceOf(msg.sender) > 0`.

### Registry disclosures

| Property | Value |
| --- | --- |
| Owner | None |
| Admin role | None |
| Pause | None |
| Upgradeable | No |
| Holds funds | No |
| External calls | `balanceOf` on the configured Agent ID contract only |
| State-changing entry points | `attest` |
| Unbounded loops | None. Attestation reads are paginated with a 100-item cap. |

`SentraRegistry` is deployed with an immutable Agent ID address. There is no setter. A bug
cannot be patched; it requires a redeploy and loses prior interactions.

### Verdicts and categories

Verdicts:

- `0` `NO_FLAGS_FOUND`
- `1` `WARNING`
- `2` `DANGEROUS`

Categories:

- `0` Contract risk
- `1` Approval risk
- `2` Honeypot
- `3` Proxy / upgrade
- `4` Other

`NO_FLAGS_FOUND` is a signal, not a safety guarantee. The dashboard and MCP output always
include a disclaimer.

### Attestation rules

- One attestation per Agent ID wallet per target per category.
- `target != address(0)` and `target != msg.sender`.
- Verdict and category must be valid enum values.
- `evidenceHash` is stored as `bytes32`. No URLs or personal data are required.
- Per-target verdict counters and unique-attester counts are updated on-chain.
- A global `totalUniqueAttesters` counter increments once per wallet.
- Events are emitted with indexed `attester`, `target`, and `verdict`.

### Sandbox contracts

Three clearly labeled test contracts are included. They are for the public audit queue and
MCP demos. They hold no real value.

| Contract | Purpose |
| --- | --- |
| `SandboxCleanVault` | Clean, no-admin interaction target. |
| `SandboxApprovalTrap` | `approve()` always records `uint256.max`. |
| `SandboxHoneypotRouter` | Buys succeed and sells revert. |

Every sandbox exposes a public `LABEL` string starting with `SENTRA TEST CONTRACT`.

## MCP server

Tool: `sentra_preflight_check`

Inputs:

- `target`: 20-byte contract address.
- `calldata` (optional): full calldata to inspect.
- `skillHash` (optional): 0x-prefixed 32-byte skill hash.

Checks:

- Contract bytecode exists.
- `approve(address,uint256)` with `uint256.max`.
- `setApprovalForAll(address,bool)` with `true`.
- Explorer source verification when an API key is configured.
- EIP-1967 proxy, EIP-1167 minimal proxy, and explorer proxy hints.
- `owner()`, `getOwner()`, and `admin()` privilege hints.
- Sentra registry attestation counts and unique attesters.

Output: a JSON report plus a readable summary. Risk levels are `NO_FLAGS_FOUND`,
`CAUTION`, `HIGH_RISK`, and `UNRATED`. Every report includes a disclaimer.

Install and test:

```sh
cd mcp-server
npm install
npm run typecheck
npm test
npm run build
```

See `mcp-server/README.md` for client configuration and `mcp-server/skills/sentra-preflight/SKILL.md`
for agent instructions.

## Web app

Screens:

- `/` — read-only preflight scanner (address + optional calldata).
- `/queue` — sandbox audit queue with injected wallet, Agent ID badge, one-tap attest, and
  the public unique-attester counter.
- `/integration` — copyable MCP configuration and SKILL.md.

Run locally:

```sh
cd web
npm install
npm run dev
```

Production build:

```sh
npm run typecheck
npm run build
```

Environment variables are documented in `web/.env.example`. The scanner works without a
registry configured. Attestations require `NEXT_PUBLIC_SENTRA_REGISTRY`.

## Local development

Prerequisites: Node 20+, npm, and Foundry (`forge`, `cast`, `anvil`).

Contracts:

```sh
cd contracts
forge fmt --check
forge build --sizes
forge test -vvv
```

The Foundry project reads `forge-std` from the repository-level `lib/` directory.

## Deployment (operator steps)

Deployment is intentionally left to the operator. Use a dedicated funded deployer key and
never commit it.

### 1. Testnet first

```sh
cd contracts
export BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
export PRIVATE_KEY=0x...
export BSCSCAN_API_KEY=...

forge script script/DeploySandboxes.s.sol \
  --rpc-url $BSC_RPC_URL --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY

forge script script/DeployRegistry.s.sol \
  --rpc-url $BSC_RPC_URL --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY
```

Deployment records are written to `contracts/deployments/<chainId>-*.json`.

### 2. Test with real wallets

- Run the full flow with 5+ real Agent ID wallets on testnet.
- Confirm holder succeeds and non-holder reverts.
- Confirm duplicate attestations revert.
- Confirm the public counter increments once per wallet.
- Confirm the web queue and MCP output against the deployed registry.

### 3. Mainnet

```sh
export BSC_RPC_URL=https://bsc-dataseed.binance.org
forge script script/DeploySandboxes.s.sol \
  --rpc-url $BSC_RPC_URL --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY
forge script script/DeployRegistry.s.sol \
  --rpc-url $BSC_RPC_URL --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY
```

Then set:

- `web/.env.local` → `NEXT_PUBLIC_SENTRA_REGISTRY`, `NEXT_PUBLIC_SANDBOX_*`
- MCP environment → `SENTRA_REGISTRY`
- Deployment links in this README and the submission form

### 4. Verify and disclose

- Verify all four contracts on BscScan.
- Publish the registry and sandbox addresses.
- Keep the owner-permission disclosure above accurate.
- Confirm there are no admin, pause, upgrade, or fund-withdrawal functions.

## Security checklist before mainnet

- [ ] CI is green (`forge fmt --check`, `forge build --sizes`, `forge test`, MCP tests, web
      build).
- [ ] Testnet run completed with 5+ real Agent ID wallets.
- [ ] Agent ID ABI confirmed and pinned to `balanceOf`.
- [ ] No unbounded loops in state-changing paths.
- [ ] No external calls beyond `balanceOf`.
- [ ] Contract source verified on BscScan.
- [ ] Owner-permission disclosure reviewed.
- [ ] No admin, pause, upgrade, or fund-holding code.
- [ ] Every sandbox is labeled as a test contract in the UI and on-chain.

## Recruitment (runs in parallel)

Goal: 30+ unique Agent ID wallets each send one attestation transaction. Target 50 to
allow for drop-off.

- First attestation should take under 90 seconds.
- Recruit in the official hackathon and wallet communities.
- Show the on-chain `totalUniqueAttesters` counter publicly.
- Confirm in the official rules what counts as a valid "interaction."
- Do not promise rewards, returns, or safety.

## Submission checklist

- [ ] Live app URL (Vercel).
- [ ] Verified registry and sandbox contracts on BscScan.
- [ ] README with architecture, setup, and owner-permission disclosure.
- [ ] MCP server and skill documentation.
- [ ] Demo video showing scan → attest → agent preflight.
- [ ] Public unique-attester counter with 30+ eligible wallets.
- [ ] Submit before the deadline with margin.

## Status

| Area | Status |
| --- | --- |
| Contracts + tests | Complete; 25 Foundry tests pass |
| Sandbox contracts + deploy scripts | Complete |
| MCP server + skill | Complete; 23 tests pass and a mainnet stdio smoke test passes |
| Web scanner + queue + integration | Complete in source; CI typecheck and production build pass |
| Dependency security | Targeted same-major fixes applied; remaining transitive wallet-connector advisories documented in `SECURITY.md` |\n| Deployment + BscScan verification | Deployment phase (testnet first) |
| Recruitment + submission | Pending |

## Disclaimer

This is a rule-based, read-only preflight system, not an audit and not financial advice.
`NO_FLAGS_FOUND` is not a safety guarantee. Attestations are user-submitted signals. The
user must verify every detail and confirm every transaction in their wallet.
