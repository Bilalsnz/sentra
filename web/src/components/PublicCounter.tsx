"use client";

import { useReadContract } from "wagmi";
import { CHAIN_ID, REGISTRY_ADDRESS, registryAbi } from "@/lib/contracts";

export default function PublicCounter() {
  const { data } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: registryAbi,
    functionName: "totalUniqueAttesters",
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(REGISTRY_ADDRESS),
      refetchInterval: 15_000,
    },
  });

  return (
    <div className="counter" aria-live="polite">
      <span className="counter-number">
        {REGISTRY_ADDRESS ? (data !== undefined ? data.toString() : "—") : "—"}
      </span>
      <span className="counter-label">
        unique Agent ID wallets attested on-chain
      </span>
      {!REGISTRY_ADDRESS ? (
        <span className="counter-note">Registry not configured in this build.</span>
      ) : null}
    </div>
  );
}
