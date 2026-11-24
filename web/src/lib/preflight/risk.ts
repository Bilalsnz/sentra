import type { AttestationCounts, Finding, RiskLevel } from "./types";

export function computeRiskLevel(
  findings: Finding[],
  counts: AttestationCounts,
): RiskLevel {
  if (findings.some((finding) => finding.severity === "high")) return "HIGH_RISK";
  if (counts.dangerous > 0) return "HIGH_RISK";
  if (findings.some((finding) => finding.severity === "warning")) return "CAUTION";
  if (counts.warning > 0) return "CAUTION";
  if (counts.available && counts.totalAttestations > 0) return "NO_FLAGS_FOUND";
  return "UNRATED";
}
