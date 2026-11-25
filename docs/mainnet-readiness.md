# BNB Smart Chain Mainnet Readiness

This is a **read-only pre-deployment gate**. It does not deploy contracts or broadcast transactions.

## What it verifies

- The configured RPC is BNB Smart Chain mainnet (chain ID 56).
- The proposed public deployer address is valid and has a non-zero BNB balance for gas.
- The official SPACE ID Agent ID contract at `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` has bytecode and responds to `name()`, `symbol()`, and `balanceOf(address)`.
- Foundry formatting, compilation, and all contract tests pass.
- Foundry can simulate the registry deployment with the official Agent ID address, without broadcasting.
- Mock Agent ID and sandbox deployment scripts remain restricted to chain 97.

## One-time GitHub setup

In the repository settings, add an Actions repository secret:

- Name: `BSC_MAINNET_RPC_URL`
- Value: a trusted BNB Smart Chain mainnet JSON-RPC HTTPS endpoint.

Do not put private keys in this secret. The readiness workflow does not need or read a private key.

## Run the checks

1. Open the repository's **Actions** tab.
2. Select **bsc-mainnet-readiness**.
3. Choose **Run workflow** on the `main` branch.
4. Set `confirm_checks` to `YES_RUN_READ_ONLY_CHECKS`.
5. Enter the public address intended to deploy the registry in `deployer_address`.
6. Run the workflow and inspect every step.

If `confirm_checks` is left at `NO`, the readiness job is skipped.

## What a successful run means

A successful run means the RPC, official Agent ID interface, contract build/tests, and a local deployment simulation passed at that moment. **It is not a deployment, a security audit, or permission to deploy.**

## Production deployment policy

- The production registry must use the official Agent ID address hard-coded in `DeployRegistry.s.sol`; mainnet overrides are not accepted.
- The three educational sandbox contracts and Mock Agent ID are testnet-only and must not be deployed to mainnet.
- The registry is immutable and ownerless. Confirm the final constructor address and deployer before any real deployment.
- Mainnet deployment requires a separate explicit approval step and a separately reviewed deployment procedure.
- After deployment, verify the exact source and constructor arguments on BscScan, then update production frontend and MCP configuration to the deployed registry address.
