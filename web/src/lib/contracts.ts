import { getAddress, parseAbi, type Address } from "viem";

function optionalAddress(value: string | undefined): Address | undefined {
  if (!value || value.trim() === "") return undefined;
  try {
    return getAddress(value.trim());
  } catch {
    return undefined;
  }
}

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_SENTRA_CHAIN_ID ?? "56");

export const AGENT_ID_ADDRESS = optionalAddress(
  process.env.NEXT_PUBLIC_AGENT_ID_ADDRESS ||
    "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
);

export const REGISTRY_ADDRESS = optionalAddress(
  process.env.NEXT_PUBLIC_SENTRA_REGISTRY,
);

export const agentIdAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

export const registryAbi = parseAbi([
  "function attest(address target, uint8 verdict, uint8 category, bytes32 evidenceHash) returns (uint256)",
  "function getTargetStats(address target) view returns (uint256 noFlagsFound, uint256 warning, uint256 dangerous, uint256 uniqueAttesters, uint256 totalAttestations)",
  "function totalUniqueAttesters() view returns (uint256)",
  "function hasAttested(address attester, address target, uint8 category) view returns (bool)",
]);

export const VERDICT_LABELS = [
  "NO_FLAGS_FOUND",
  "WARNING",
  "DANGEROUS",
] as const;

export const CATEGORY_LABELS = [
  "Contract risk",
  "Approval risk",
  "Honeypot",
  "Proxy / upgrade",
  "Other",
] as const;

export const DISCLAIMER =
  "This is a rule-based, read-only preflight report, not an audit and not financial advice. NO_FLAGS_FOUND is not a safety guarantee. Attestations are user-submitted signals. The user must verify every detail and confirm every transaction.";
