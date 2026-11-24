import test from "node:test";
import assert from "node:assert/strict";
import { computeRiskLevel } from "../src/risk.js";
import type { AttestationCounts, Finding } from "../src/types.js";

const REGISTRY = "0x2222222222222222222222222222222222222222";

function counts(overrides: Partial<AttestationCounts> = {}): AttestationCounts {
  return {
    available: true,
    registry: REGISTRY,
    uniqueAttesters: 0,
    noFlagsFound: 0,
    warning: 0,
    dangerous: 0,
    totalAttestations: 0,
    ...overrides,
  };
}

function finding(severity: Finding["severity"]): Finding {
  return { code: "x", severity, title: "x", detail: "x" };
}

test("high findings force HIGH_RISK", () => {
  assert.equal(computeRiskLevel([finding("high")], counts()), "HIGH_RISK");
});

test("dangerous attestations force HIGH_RISK", () => {
  assert.equal(
    computeRiskLevel([], counts({ dangerous: 1, totalAttestations: 1 })),
    "HIGH_RISK",
  );
});

test("warnings force CAUTION", () => {
  assert.equal(computeRiskLevel([finding("warning")], counts()), "CAUTION");
});

test("warning attestations force CAUTION", () => {
  assert.equal(
    computeRiskLevel([], counts({ warning: 1, totalAttestations: 1 })),
    "CAUTION",
  );
});

test("NO_FLAGS_FOUND requires at least one attestation", () => {
  assert.equal(computeRiskLevel([], counts()), "UNRATED");
  assert.equal(
    computeRiskLevel([], counts({ noFlagsFound: 2, totalAttestations: 2 })),
    "NO_FLAGS_FOUND",
  );
});

test("UNRATED when the registry is unavailable", () => {
  assert.equal(
    computeRiskLevel([], counts({ available: false })),
    "UNRATED",
  );
});
