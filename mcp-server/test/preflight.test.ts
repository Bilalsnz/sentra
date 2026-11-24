import test from "node:test";
import assert from "node:assert/strict";
import { getAddress, type Hex } from "viem";
import { runPreflight } from "../src/preflight.js";
import type {
  AttestationCounts,
  PreflightDeps,
  SourceCheck,
} from "../src/types.js";

const TARGET = "0x1111111111111111111111111111111111111111";
const REGISTRY = "0x2222222222222222222222222222222222222222";
const NOW = new Date("2026-01-01T00:00:00.000Z");
const OPTIONS = { chainId: 56, now: () => NOW };

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

function source(overrides: Partial<SourceCheck> = {}): SourceCheck {
  return {
    available: true,
    verified: true,
    isProxy: false,
    contractName: "Demo",
    error: null,
    ...overrides,
  };
}

function deps(overrides: Partial<PreflightDeps> = {}): PreflightDeps {
  return {
    async getCode() {
      return "0x60006000" as Hex;
    },
    async getStorageAt() {
      return "0x" as Hex;
    },
    async ethCall() {
      return null;
    },
    async getAttestationCounts() {
      return counts();
    },
    async checkSource() {
      return source();
    },
    ...overrides,
  };
}

function word(value: bigint): Hex {
  return `0x${value.toString(16).padStart(64, "0")}` as Hex;
}

test("clean contract with no-flags attestations is NO_FLAGS_FOUND", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async getAttestationCounts() {
        return counts({ uniqueAttesters: 2, noFlagsFound: 2, totalAttestations: 2 });
      },
    }),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "NO_FLAGS_FOUND");
  assert.equal(report.contract.exists, true);
  assert.equal(report.checkedAt, NOW.toISOString());
  assert.equal(report.target, getAddress(TARGET));
  assert.match(report.summary, /NO_FLAGS_FOUND/);
  assert.match(report.disclaimer, /not a safety guarantee/);
  assert.equal(report.attestationCounts.uniqueAttesters, 2);
});

test("address with no code is HIGH_RISK", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({ async getCode() { return "0x"; } }),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "HIGH_RISK");
  assert.equal(report.contract.exists, false);
  assert.ok(report.findings.some((finding) => finding.code === "target_not_contract"));
});

test("unlimited approve calldata is HIGH_RISK", async () => {
  const max = (1n << 256n) - 1n;
  const calldata =
    "0x095ea7b3" +
    "0000000000000000000000003333333333333333333333333333333333333333" +
    max.toString(16).padStart(64, "0");

  const report = await runPreflight(
    { target: TARGET, calldata },
    deps({
      async getAttestationCounts() {
        return counts({ noFlagsFound: 5, totalAttestations: 5, uniqueAttesters: 5 });
      },
    }),
    OPTIONS,
  );

  assert.equal(report.calldata.unlimitedApproval, true);
  assert.equal(report.riskLevel, "HIGH_RISK");
  assert.ok(report.findings.some((finding) => finding.code === "unlimited_approval"));
});

test("unverified source is CAUTION when no safe attestations exist", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async checkSource() {
        return source({ verified: false });
      },
    }),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "CAUTION");
  assert.ok(report.findings.some((finding) => finding.code === "source_unverified"));
});

test("dangerous registry attestations are HIGH_RISK", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async getAttestationCounts() {
        return counts({ dangerous: 1, totalAttestations: 1, uniqueAttesters: 1 });
      },
    }),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "HIGH_RISK");
  assert.ok(report.findings.some((finding) => finding.code === "registry_dangerous"));
});

test("proxy and owner hints are reported without claiming malicious behaviour", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async getStorageAt(_address, slot) {
        if (slot.startsWith("0x360894")) return word(1n);
        return "0x" as Hex;
      },
      async ethCall() {
        return word(BigInt("0x3333333333333333333333333333333333333333"));
      },
    }),
    OPTIONS,
  );

  assert.equal(report.proxy.detected, true);
  assert.match(report.proxy.kind ?? "", /eip1967_implementation/);
  assert.equal(report.ownerPrivilege.detected, true);
  assert.equal(report.riskLevel, "CAUTION");
});

test("registry unavailable with no findings is UNRATED", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async getAttestationCounts() {
        return counts({ available: false, registry: null, error: "not configured" });
      },
    }),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "UNRATED");
  assert.ok(report.findings.some((finding) => finding.code === "registry_unavailable"));
});

test("invalid skill hash is flagged", async () => {
  const report = await runPreflight(
    { target: TARGET, skillHash: "0x1234" },
    deps(),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "CAUTION");
  assert.ok(report.findings.some((finding) => finding.code === "invalid_skill_hash"));
});

test("unknown selectors are informational only", async () => {
  const report = await runPreflight(
    { target: TARGET, calldata: "0xdeadbeef" },
    deps(),
    OPTIONS,
  );

  assert.equal(report.riskLevel, "UNRATED");
  assert.ok(report.findings.some((finding) => finding.code === "unknown_function"));
});

test("report never uses SAFE as a risk level", async () => {
  const report = await runPreflight(
    { target: TARGET },
    deps({
      async getAttestationCounts() {
        return counts({ noFlagsFound: 1, totalAttestations: 1, uniqueAttesters: 1 });
      },
    }),
    OPTIONS,
  );

  assert.notEqual(report.riskLevel, "SAFE");
  assert.equal(JSON.stringify(report).includes('"SAFE"'), false);
});

test("invalid target is rejected", async () => {
  await assert.rejects(
    runPreflight({ target: "0x1234" }, deps(), OPTIONS),
    /Address|address|hex/i,
  );
});
