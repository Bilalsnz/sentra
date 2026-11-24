"use client";

import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import PublicCounter from "@/components/PublicCounter";
import {
  AGENT_ID_ADDRESS,
  CHAIN_ID,
  REGISTRY_ADDRESS,
  agentIdAbi,
} from "@/lib/contracts";
import { SANDBOXES } from "@/lib/sandboxes";
import SandboxCard from "./SandboxCard";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function QueueClient() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: connecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { switchChain, isPending: switching } = useSwitchChain();
  const injectedConnector =
    connectors.find((connector) => connector.id === "injected") ?? connectors[0];

  const { data: agentBalance } = useReadContract({
    address: AGENT_ID_ADDRESS,
    abi: agentIdAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address && AGENT_ID_ADDRESS) },
  });

  const chainReady = isConnected && chainId === CHAIN_ID;
  const agentReady = agentBalance !== undefined && agentBalance > 0n;
  const explorer = CHAIN_ID === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";

  return (
    <div className="stack">
      <section className="wallet-panel">
        <div className="wallet-left">
          <span className="mini-label">Wallet</span>
          {isConnected && address ? (
            <div className="wallet-line">
              <span className="mono">{shorten(address)}</span>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="muted">
              Use an injected wallet inside your wallet app&apos;s browser. No QR login
              and no server-stored sessions.
            </p>
          )}

          {connectError ? (
            <p className="error-text">{connectError.message}</p>
          ) : null}

          {!isConnected && injectedConnector ? (
            <button
              type="button"
              className="btn primary"
              disabled={connecting}
              onClick={() => connect({ connector: injectedConnector })}
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          ) : null}

          {isConnected && !chainReady ? (
            <button
              type="button"
              className="btn primary"
              disabled={switching}
              onClick={() => switchChain({ chainId: CHAIN_ID })}
            >
              {switching ? "Switching…" : `Switch to chain ${CHAIN_ID}`}
            </button>
          ) : null}
        </div>

        <div className="wallet-right">
          <span className="mini-label">Agent ID</span>
          {!isConnected ? (
            <p className="muted">Connect to check balanceOf for this wallet.</p>
          ) : agentBalance === undefined ? (
            <span className="badge muted">Checking…</span>
          ) : agentBalance > 0n ? (
            <span className="badge ok">Agent ID detected · balance {agentBalance.toString()}</span>
          ) : (
            <span className="badge warn">No Agent ID detected for this wallet</span>
          )}
          <p className="muted small">
            Sentra only calls balanceOf. It never looks up an Agent ID by handle or name.
          </p>
        </div>
      </section>

      <PublicCounter />

      {!REGISTRY_ADDRESS ? (
        <div className="alert warn">
          <strong>Registry not configured.</strong> Set{" "}
          <code>NEXT_PUBLIC_SENTRA_REGISTRY</code> after deployment to enable attestations.
          The scanner still works without it.
        </div>
      ) : null}

      {SANDBOXES.length === 0 ? (
        <div className="alert warn">
          <strong>No sandbox targets configured.</strong> Deploy the three labeled test
          contracts, then set <code>NEXT_PUBLIC_SANDBOX_CLEAN_VAULT</code>,{" "}
          <code>NEXT_PUBLIC_SANDBOX_APPROVAL_TRAP</code>, and{" "}
          <code>NEXT_PUBLIC_SANDBOX_HONEYPOT_ROUTER</code>.
        </div>
      ) : (
        <section className="sandbox-grid">
          {SANDBOXES.map((sandbox) => (
            <SandboxCard
              key={sandbox.id}
              sandbox={sandbox}
              attester={address}
              agentReady={agentReady}
              chainReady={chainReady}
            />
          ))}
        </section>
      )}

      <section className="panel">
        <h2>Attestation rules</h2>
        <ul className="rules">
          <li>One attestation per Agent ID wallet, target, and category.</li>
          <li>Only your own Agent ID balance is checked on-chain.</li>
          <li>Your wallet asks you to confirm the transaction. Sentra cannot send it.</li>
          <li>Evidence is stored as a bytes32 hash, not a URL or personal data.</li>
          <li>
            The registry is ownerless: no admin, no pause, no upgrade, and no funds held.
          </li>
        </ul>
        {REGISTRY_ADDRESS ? (
          <p className="muted small break">
            Registry:{" "}
            <a
              className="link"
              href={`${explorer}/address/${REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              {REGISTRY_ADDRESS}
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
