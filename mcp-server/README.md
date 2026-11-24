# Sentra MCP Server

Read-only preflight checks for BNB Chain contract interactions. The server exposes one MCP tool, `sentra_preflight_check`, and never signs, sends, or approves transactions.

## What it checks

- Whether the target has contract bytecode.
- Calldata for `approve(address,uint256)` with `uint256.max` and `setApprovalForAll(address,bool)` with `true`.
- Explorer source verification when an API key is configured.
- EIP-1967 proxy, EIP-1167 minimal proxy, and explorer-reported proxy hints.
- `owner()`, `getOwner()`, and `admin()` privilege hints.
- Sentra registry attestation counts and unique Agent ID attesters.

This is a rule-based tool. It does not use an LLM and does not replace an audit.

## Build and test

```sh
npm install
npm run typecheck
npm test
npm run build
```

Node 20 or newer is required.

## Configuration

Copy `.env.example` to `.env` or export the variables in the MCP client config.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BSC_CHAIN_ID` | no | `56` | Chain ID. Use `97` for testnet. |
| `BSC_RPC_URL` | no | public mainnet/testnet RPC | JSON-RPC endpoint. |
| `SENTRA_REGISTRY` | no | empty | Deployed Sentra registry address. Reports `UNRATED` when empty. |
| `BSCSCAN_API_URL` | no | `https://api.etherscan.io/v2/api` | Explorer API base URL. |
| `BSCSCAN_API_KEY` | no | empty | Keeps source verification optional. The key stays local. |

The server reads configuration from the environment only. It does not store sessions, keys, or wallet data.

## MCP client configuration

Build first, then point the client at the built entry point.

```json
{
  "mcpServers": {
    "sentra": {
      "command": "node",
      "args": ["/absolute/path/to/sentra/mcp-server/dist/index.js"],
      "env": {
        "BSC_CHAIN_ID": "56",
        "BSC_RPC_URL": "https://bsc-dataseed.binance.org",
        "SENTRA_REGISTRY": "0x<deployed registry address>"
      }
    }
  }
}
```

Do not put seed phrases, private keys, or wallet passwords in this config.

## Tool output

The tool returns a JSON report followed by a short readable summary. The report includes:

- `riskLevel`: `NO_FLAGS_FOUND`, `CAUTION`, `HIGH_RISK`, or `UNRATED`.
- `findings`: code, severity, title, and detail for each check.
- `attestationCounts`: per-verdict counts and unique attesters.
- `contract`, `sourceVerified`, `proxy`, `ownerPrivilege`, and `calldata` details.
- `disclaimer`: always present.

`NO_FLAGS_FOUND` is not a safety guarantee. `UNRATED` means Sentra has no attestation data and must not be read as approval.

## Skill

`skills/sentra-preflight/SKILL.md` tells an agent when to call the tool, how to interpret results, and which actions are forbidden. It requires the agent to leave every transaction decision to the user.

## Security boundaries

- The server only performs read-only JSON-RPC and explorer HTTP calls.
- It has no signing code, no private-key handling, and no transaction submission.
- It does not use QR login, pairing codes, or server-stored sessions.
- It never looks up Agent IDs by handle or name.
- It does not collect secrets. An explorer API key, if used, is read from the local environment.

## Disclaimer

This is a rule-based, read-only preflight report, not an audit and not financial advice. `NO_FLAGS_FOUND` is not a safety guarantee. Attestations are user-submitted signals. The user must verify every detail and confirm every transaction.
