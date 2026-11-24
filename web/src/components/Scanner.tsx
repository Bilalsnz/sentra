"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { DISCLAIMER } from "@/lib/contracts";
import type { PreflightReport } from "@/lib/preflight";
import { SANDBOXES } from "@/lib/sandboxes";
import RiskBadge from "./RiskBadge";

const EXAMPLE_CALLDATA = `0x095ea7b3${"0".repeat(24)}${"1".repeat(40)}${"f".repeat(64)}`;

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export default function Scanner() {
  const [target, setTarget] = useState("");
  const [calldata, setCalldata] = useState("");
  const [report, setReport] = useState<PreflightReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReport(null);

    if (!/^0x[0-9a-fA-F]{40}$/.test(target.trim())) {
      setError("Enter a valid 20-byte contract address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          calldata: calldata.trim() || undefined,
        }),
      });
      const data = (await response.json()) as PreflightReport & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Preflight request failed.");
      }
      setReport(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Preflight request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function fillExample() {
    setTarget("0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F");
    setCalldata(EXAMPLE_CALLDATA);
  }

  function fillSandbox(address: string) {
    setTarget(address);
    setCalldata("");
  }

  const counts = report?.attestationCounts;

  return (
    <section className="panel scanner">
      <div className="panel-head">
        <div>
          <h2>Pre-flight scanner</h2>
          <p className="muted">
            Paste a contract address and, optionally, the calldata an agent intends to
            propose. The scan is read-only and never connects to your wallet.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="form">
        <label className="field">
          <span>Contract address</span>
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
          />
        </label>
        <label className="field">
          <span>Calldata (optional)</span>
          <textarea
            value={calldata}
            onChange={(event) => setCalldata(event.target.value)}
            placeholder="0x095ea7b3…"
            spellCheck={false}
            autoComplete="off"
            rows={3}
          />
        </label>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? "Checking…" : "Run preflight"}
          </button>
          <button type="button" className="btn ghost" onClick={fillExample}>
            Unlimited approval example
          </button>
          <Link href="/queue" className="btn ghost">
            Audit sandbox queue
          </Link>
        </div>
      </form>

      {SANDBOXES.length > 0 ? (
        <div className="chips">
          <span className="chips-label">Labeled test targets</span>
          {SANDBOXES.map((sandbox) => (
            <button
              key={sandbox.id}
              type="button"
              className="chip"
              onClick={() => fillSandbox(sandbox.address)}
            >
              {sandbox.name}
            </button>
          ))}
        </div>
      ) : null}

      <p className="hint">
        Read-only. The scanner never signs, sends, or approves anything. It does not ask
        for keys, seed phrases, or wallet connections.
      </p>

      <div aria-live="polite">
        {error ? <div className="alert danger">{error}</div> : null}

        {report ? (
          <div className="report">
            <div className="report-head">
              <RiskBadge level={report.riskLevel} />
              <div>
                <p className="mono break">{report.target}</p>
                <p className="muted small">
                  Chain {report.chainId} · checked{" "}
                  {new Date(report.checkedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="summary">{report.summary}</p>

            <div className="stat-grid">
              <div className="stat">
                <span className="stat-label">Contract</span>
                <span className="stat-value">
                  {report.contract.exists
                    ? `${report.contract.codeSize} bytes`
                    : "No code"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Source</span>
                <span className="stat-value">
                  {report.sourceVerified === null
                    ? "Unavailable"
                    : report.sourceVerified
                      ? "Verified"
                      : "Unverified"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Proxy</span>
                <span className="stat-value">
                  {report.proxy.detected ? report.proxy.kind : "Not detected"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Owner hint</span>
                <span className="stat-value">
                  {report.ownerPrivilege.detected ? "Detected" : "Not detected"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Attestations</span>
                <span className="stat-value">
                  {counts?.available
                    ? `${counts.totalAttestations} total · ${counts.uniqueAttesters} unique`
                    : "Unavailable"}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Calldata</span>
                <span className="stat-value">
                  {report.calldata.provided
                    ? report.calldata.functionName || "Unknown selector"
                    : "Not provided"}
                </span>
              </div>
            </div>

            {report.ownerPrivilege.detected ? (
              <p className="muted small">
                Privilege functions:{" "}
                {report.ownerPrivilege.functions
                  .map((entry) => `${entry.signature} = ${entry.value}`)
                  .join(", ")}
              </p>
            ) : null}

            {report.calldata.provided && report.calldata.decoded ? (
              <pre className="code">
                {JSON.stringify(report.calldata.decoded, null, 2)}
              </pre>
            ) : null}

            <h3>Findings</h3>
            {report.findings.length === 0 ? (
              <p className="muted">No findings were produced by the checks that ran.</p>
            ) : (
              <ul className="findings">
                {report.findings.map((finding, index) => (
                  <li
                    key={`${finding.code}-${index}`}
                    className={`finding severity-${finding.severity}`}
                  >
                    <div className="finding-head">
                      <strong>{finding.title}</strong>
                      <span className={`severity severity-${finding.severity}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p>{finding.detail}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="disclaimer">{report.disclaimer || DISCLAIMER}</div>

            <details className="raw">
              <summary>Raw report JSON</summary>
              <pre className="code">{JSON.stringify(report, null, 2)}</pre>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
}
