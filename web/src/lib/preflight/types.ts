import type { Address, Hex } from "viem";

export type RiskLevel = "NO_FLAGS_FOUND" | "CAUTION" | "HIGH_RISK" | "UNRATED";

export type FindingSeverity = "info" | "warning" | "high";

export interface Finding {
  code: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface AttestationCounts {
  available: boolean;
  registry: string | null;
  uniqueAttesters: number;
  noFlagsFound: number;
  warning: number;
  dangerous: number;
  totalAttestations: number;
  error?: string;
}

export interface SourceCheck {
  available: boolean;
  verified: boolean | null;
  isProxy: boolean;
  contractName: string | null;
  error: string | null;
}

export interface CalldataCheck {
  provided: boolean;
  valid: boolean;
  selector: string | null;
  functionName: string | null;
  unlimitedApproval: boolean;
  approvalForAll: boolean;
  decoded: Record<string, string | boolean> | null;
  error: string | null;
}

export interface OwnerFunction {
  signature: string;
  value: string;
}

export interface PreflightInput {
  target: string;
  calldata?: string;
  skillHash?: string;
}

export interface PreflightReport {
  tool: "sentra_preflight_check";
  version: string;
  chainId: number;
  target: string;
  checkedAt: string;
  riskLevel: RiskLevel;
  contract: {
    exists: boolean;
    codeSize: number;
  };
  sourceVerified: boolean | null;
  sourceCheck: {
    available: boolean;
    error: string | null;
  };
  proxy: {
    detected: boolean;
    kind: string | null;
  };
  ownerPrivilege: {
    detected: boolean;
    functions: OwnerFunction[];
  };
  calldata: CalldataCheck;
  skillHash: string | null;
  findings: Finding[];
  attestationCounts: AttestationCounts;
  summary: string;
  disclaimer: string;
}

export interface PreflightDeps {
  getCode(address: Address): Promise<Hex>;
  getStorageAt(address: Address, slot: Hex): Promise<Hex>;
  ethCall(to: Address, data: Hex): Promise<Hex | null>;
  getAttestationCounts(target: Address): Promise<AttestationCounts>;
  checkSource(target: Address): Promise<SourceCheck>;
}
