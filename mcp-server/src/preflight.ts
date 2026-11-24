import { getAddress, type Address, type Hex } from "viem";
import { analyzeCalldata } from "./calldata.js";
import { computeRiskLevel } from "./risk.js";
import type {
  AttestationCounts,
  Finding,
  OwnerFunction,
  PreflightDeps,
  PreflightInput,
  PreflightReport,
  SourceCheck,
} from "./types.js";

export const TOOL_VERSION = "0.1.0";

export const DISCLAIMER =
  "SENTRA DISCLAIMER: This is a rule-based, read-only preflight report, not an audit and not financial advice. NO_FLAGS_FOUND is not a safety guarantee. Attestations are user-submitted signals. This tool never signs, sends, or approves transactions. The user must verify details in their wallet and confirm every transaction.";

const EIP1967_IMPLEMENTATION_SLOT: Hex =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const EIP1967_ADMIN_SLOT: Hex =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
const EIP1967_BEACON_SLOT: Hex =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
const MINIMAL_PROXY_PREFIX = /^0x363d3d373d3d3d363d73/i;

const OWNER_FUNCTIONS = [
  { signature: "owner()", selector: "0x8da5cb5b" as Hex },
  { signature: "getOwner()", selector: "0x893d20e8" as Hex },
  { signature: "admin()", selector: "0xf851a440" as Hex },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nonZeroWord(value: string | null | undefined): boolean {
  if (!value || value === "0x") return false;
  try {
    return BigInt(value) !== 0n;
  } catch {
    return false;
  }
}

function wordToAddress(value: string): string {
  return `0x${value.slice(-40)}`;
}

async function readSlot(
  deps: PreflightDeps,
  target: Address,
  slot: Hex,
): Promise<Hex> {
  try {
    return await deps.getStorageAt(target, slot);
  } catch {
    return "0x";
  }
}

async function readCounts(
  deps: PreflightDeps,
  target: Address,
): Promise<AttestationCounts> {
  try {
    return await deps.getAttestationCounts(target);
  } catch (error) {
    return {
      available: false,
      registry: null,
      uniqueAttesters: 0,
      noFlagsFound: 0,
      warning: 0,
      dangerous: 0,
      totalAttestations: 0,
      error: errorMessage(error),
    };
  }
}

async function readSource(
  deps: PreflightDeps,
  target: Address,
): Promise<SourceCheck> {
  try {
    return await deps.checkSource(target);
  } catch (error) {
    return {
      available: false,
      verified: null,
      isProxy: false,
      contractName: null,
      error: errorMessage(error),
    };
  }
}

export async function runPreflight(
  input: PreflightInput,
  deps: PreflightDeps,
  options: { chainId: number; now?: () => Date },
): Promise<PreflightReport> {
  const target = getAddress(input.target);
  const [code, counts, source] = await Promise.all([
    deps.getCode(target).catch(() => "0x" as Hex),
    readCounts(deps, target),
    readSource(deps, target),
  ]);

  const contractExists = code !== "0x" && code.length > 2;
  const codeSize = contractExists ? (code.length - 2) / 2 : 0;
  const calldata = analyzeCalldata(input.calldata);
  const findings: Finding[] = [];

  if (!contractExists) {
    findings.push({
      code: "target_not_contract",
      severity: "high",
      title: "No contract code at target",
      detail:
        "No bytecode was found at this address. It may be an externally owned account or an address on a different chain.",
    });
  }

  if (calldata.provided && !calldata.valid) {
    findings.push({
      code: "invalid_calldata",
      severity: "warning",
      title: "Calldata could not be decoded",
      detail: calldata.error ?? "The supplied calldata is not valid.",
    });
  }

  if (calldata.unlimitedApproval) {
    findings.push({
      code: "unlimited_approval",
      severity: "high",
      title: "Unlimited token approval",
      detail:
        "Calldata calls approve() with amount = 2^256 - 1. This grants an unlimited allowance to the spender and is a common drain vector.",
    });
  }

  if (calldata.approvalForAll) {
    findings.push({
      code: "approval_for_all",
      severity: "high",
      title: "Operator approval for all tokens",
      detail:
        "Calldata calls setApprovalForAll(..., true). This grants an operator control over every token in the collection.",
    });
  }

  if (calldata.provided && calldata.valid && !calldata.functionName) {
    findings.push({
      code: "unknown_function",
      severity: "info",
      title: "Selector not decoded",
      detail: `Selector ${calldata.selector} is not one of the approval patterns Sentra decodes. Review the calldata in your wallet before confirming.`,
    });
  }

  if (!source.available) {
    findings.push({
      code: "source_check_unavailable",
      severity: "info",
      title: "Source verification check unavailable",
      detail: source.error ?? "The explorer source check could not be completed.",
    });
  } else if (source.verified === false) {
    findings.push({
      code: "source_unverified",
      severity: "warning",
      title: "Source code not verified",
      detail:
        "The explorer does not report verified source code for this address. Its behaviour cannot be reviewed from source.",
    });
  }

  let implementation: Hex = "0x";
  let admin: Hex = "0x";
  let beacon: Hex = "0x";
  if (contractExists) {
    [implementation, admin, beacon] = await Promise.all([
      readSlot(deps, target, EIP1967_IMPLEMENTATION_SLOT),
      readSlot(deps, target, EIP1967_ADMIN_SLOT),
      readSlot(deps, target, EIP1967_BEACON_SLOT),
    ]);
  }

  const proxyKinds: string[] = [];
  if (nonZeroWord(implementation)) proxyKinds.push("eip1967_implementation");
  if (nonZeroWord(admin)) proxyKinds.push("eip1967_admin");
  if (nonZeroWord(beacon)) proxyKinds.push("eip1967_beacon");
  if (contractExists && MINIMAL_PROXY_PREFIX.test(code)) proxyKinds.push("eip1167_minimal");
  if (source.isProxy) proxyKinds.push("explorer_reported_proxy");

  if (proxyKinds.length > 0) {
    findings.push({
      code: "proxy_detected",
      severity: "warning",
      title: "Proxy or upgradeable pattern detected",
      detail: `Detected: ${proxyKinds.join(", ")}. Logic can change without moving the address, so previous reviews may not describe current behaviour.`,
    });
  }

  const owners: OwnerFunction[] = [];
  if (contractExists) {
    for (const ownerFunction of OWNER_FUNCTIONS) {
      let result: Hex | null = null;
      try {
        result = await deps.ethCall(target, ownerFunction.selector);
      } catch {
        result = null;
      }
      if (nonZeroWord(result)) {
        owners.push({
          signature: ownerFunction.signature,
          value: wordToAddress(result as string),
        });
      }
    }
  }

  if (owners.length > 0) {
    findings.push({
      code: "owner_privilege",
      severity: "info",
      title: "Owner-style privilege function responded",
      detail: `Privileged function(s) returned a non-zero address: ${owners
        .map((owner) => `${owner.signature}=${owner.value}`)
        .join(", ")}. This is a privilege hint, not proof of malicious behaviour.`,
    });
  }

  if (!counts.available) {
    findings.push({
      code: "registry_unavailable",
      severity: "info",
      title: "Sentra attestations unavailable",
      detail: counts.error ?? "Sentra attestation data could not be read.",
    });
  } else if (counts.totalAttestations === 0) {
    findings.push({
      code: "no_attestations",
      severity: "info",
      title: "No Sentra attestations",
      detail:
        "No Agent ID holder has attested this target in the configured Sentra registry.",
    });
  } else {
    if (counts.dangerous > 0) {
      findings.push({
        code: "registry_dangerous",
        severity: "high",
        title: "DANGEROUS attestations on record",
        detail: `${counts.dangerous} DANGEROUS attestation(s) were posted by Agent ID holders for this target.`,
      });
    }
    if (counts.warning > 0) {
      findings.push({
        code: "registry_warning",
        severity: "warning",
        title: "WARNING attestations on record",
        detail: `${counts.warning} WARNING attestation(s) were posted by Agent ID holders for this target.`,
      });
    }
    if (counts.noFlagsFound > 0) {
      findings.push({
        code: "registry_no_flags",
        severity: "info",
        title: "NO_FLAGS_FOUND attestations on record",
        detail: `${counts.noFlagsFound} NO_FLAGS_FOUND attestation(s) were posted. This is a user signal, not a safety guarantee.`,
      });
    }
  }

  const skillHash = input.skillHash?.trim() || null;
  if (skillHash && !/^0x[0-9a-fA-F]{64}$/.test(skillHash)) {
    findings.push({
      code: "invalid_skill_hash",
      severity: "warning",
      title: "Invalid skill hash",
      detail:
        "skillHash must be a 0x-prefixed 32-byte hex value (64 hex characters).",
    });
  }

  const riskLevel = computeRiskLevel(findings, counts);
  const alerts = findings.filter((finding) => finding.severity !== "info");
  const alertText =
    alerts.length > 0
      ? alerts.map((finding) => finding.title).join("; ")
      : "No blocking flags in the checks that ran";
  const attestationText = counts.available
    ? `${counts.totalAttestations} attestation(s) from ${counts.uniqueAttesters} unique Agent ID holder(s) (no flags: ${counts.noFlagsFound}, warning: ${counts.warning}, dangerous: ${counts.dangerous})`
    : "Sentra attestation data unavailable";

  const summary = `Sentra preflight for ${target} on chain ${options.chainId}: ${riskLevel}. ${attestationText}. ${alertText}. Read-only report; the user must confirm any transaction. NO_FLAGS_FOUND is not a safety guarantee.`;

  return {
    tool: "sentra_preflight_check",
    version: TOOL_VERSION,
    chainId: options.chainId,
    target,
    checkedAt: (options.now?.() ?? new Date()).toISOString(),
    riskLevel,
    contract: { exists: contractExists, codeSize },
    sourceVerified: source.verified,
    sourceCheck: { available: source.available, error: source.error },
    proxy: {
      detected: proxyKinds.length > 0,
      kind: proxyKinds.length > 0 ? proxyKinds.join("+") : null,
    },
    ownerPrivilege: { detected: owners.length > 0, functions: owners },
    calldata,
    skillHash: skillHash ? skillHash.toLowerCase() : null,
    findings,
    attestationCounts: counts,
    summary,
    disclaimer: DISCLAIMER,
  };
}
