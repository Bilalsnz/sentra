"use client";

import { useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  CATEGORY_LABELS,
  CHAIN_ID,
  REGISTRY_ADDRESS,
  VERDICT_LABELS,
  registryAbi,
} from "@/lib/contracts";
import type { Sandbox } from "@/lib/sandboxes";

function friendlyError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "shortMessage" in error &&
    typeof (error as { shortMessage: unknown }).shortMessage === "string"
  ) {
    return (error as { shortMessage: string }).shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

export default function SandboxCard({
  sandbox,
  attester,
  agentReady,
  chainReady,
}: {
  sandbox: Sandbox;
  attester?: Address;
  agentReady: boolean;
  chainReady: boolean;
}) {
  const registry = REGISTRY_ADDRESS;
  const [hash, setHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | null>(null);

  const statsRead = useReadContract({
    address: registry,
    abi: registryAbi,
    functionName: "getTargetStats",
    args: [sandbox.address],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(registry),
      refetchInterval: 15_000,
    },
  });

  const hasRead = useReadContract({
    address: registry,
    abi: registryAbi,
    functionName: "hasAttested",
    args: attester ? [attester, sandbox.address, sandbox.category] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(registry && attester),
      refetchInterval: 15_000,
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: CHAIN_ID });

  useEffect(() => {
    if (receipt.isSuccess) {
      void statsRead.refetch();
      void hasRead.refetch();
    }
  }, [receipt.isSuccess]);

  async function attest() {
    if (!registry || !attester) return;
    setError(null);
    try {
      const transactionHash = await writeContractAsync({
        address: registry,
        abi: registryAbi,
        functionName: "attest",
        args: [
          sandbox.address,
          sandbox.verdict,
          sandbox.category,
          sandbox.evidenceHash,
        ],
        chainId: CHAIN_ID,
      });
      setHash(transactionHash);
    } catch (writeError) {
      setError(friendlyError(writeError));
    }
  }

  const stats = statsRead.data;
  const alreadyAttested = hasRead.data === true;
  const explorer = CHAIN_ID === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";
  const disabled = !chainReady || !agentReady || alreadyAttested || isPending || receipt.isLoading;

  let actionLabel = `Attest ${VERDICT_LABELS[sandbox.verdict]}`;
  if (!attester) actionLabel = "Connect wallet to attest";
  else if (!chainReady) actionLabel = `Switch to chain ${CHAIN_ID}`;
  else if (!agentReady) actionLabel = "Agent ID required";
  else if (alreadyAttested) actionLabel = "Already attested";

  return (
    <article className="sandbox-card">
      <div className="sandbox-top">
        <span className="tag test">TEST CONTRACT</span>
        <span className={`tag verdict-${sandbox.expected.toLowerCase()}`}>
          {sandbox.expected}
        </span>
      </div>

      <h3>{sandbox.name}</h3>
      <p className="muted">{sandbox.description}</p>
      <p className="mono small break">{sandbox.address}</p>

      <div className="sandbox-meta">
        <span>{CATEGORY_LABELS[sandbox.category]}</span>
        <span>·</span>
        <span>{sandbox.kind}</span>
      </div>

      <div className="sandbox-stats">
        <div>
          <span className="stat-label">No flags</span>
          <span>{stats ? stats[0].toString() : "—"}</span>
        </div>
        <div>
          <span className="stat-label">Warning</span>
          <span>{stats ? stats[1].toString() : "—"}</span>
        </div>
        <div>
          <span className="stat-label">Dangerous</span>
          <span>{stats ? stats[2].toString() : "—"}</span>
        </div>
        <div>
          <span className="stat-label">Unique</span>
          <span>{stats ? stats[3].toString() : "—"}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn primary full"
        disabled={disabled}
        onClick={attest}
      >
        {isPending ? "Confirm in wallet…" : receipt.isLoading ? "Waiting for receipt…" : actionLabel}
      </button>

      {error ? <p className="error-text">{error}</p> : null}

      {hash ? (
        <p className="muted small break">
          {receipt.isSuccess ? "Attested. " : "Submitted. "}
          <a className="link" href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
            View transaction
          </a>
        </p>
      ) : null}

      {alreadyAttested ? (
        <p className="muted small">
          This wallet already posted a {CATEGORY_LABELS[sandbox.category]} attestation for
          this sandbox.
        </p>
      ) : null}
    </article>
  );
}
