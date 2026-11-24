import Link from "next/link";
import PublicCounter from "@/components/PublicCounter";
import Scanner from "@/components/Scanner";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Security attestations for BNB Chain</p>
          <h1>Check before you sign.</h1>
          <p className="lead">
            Sentra is an ownerless attestation registry and a read-only preflight check
            for contract and agent-skill interactions. Agent ID holders post structured
            signals. AI agents check those signals before proposing a transaction.
          </p>
          <div className="hero-actions">
            <a href="#scanner" className="btn primary">
              Run a preflight
            </a>
            <Link href="/queue" className="btn ghost">
              Attest a sandbox
            </Link>
          </div>
        </div>
        <div className="hero-side">
          <PublicCounter />
          <div className="mini-card">
            <span className="mini-label">Gate</span>
            <p>Agent ID balanceOf &gt; 0. One wallet, one attestation per target and category.</p>
          </div>
          <div className="mini-card">
            <span className="mini-label">Verdicts</span>
            <p>NO_FLAGS_FOUND, WARNING, DANGEROUS. Never presented as a guarantee.</p>
          </div>
        </div>
      </section>

      <div className="notice">
        Sentra is a signal registry, not an audit and not a safety guarantee. Every
        transaction decision stays with the user.
      </div>

      <div id="scanner">
        <Scanner />
      </div>

      <section className="how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">01</span>
            <h3>Scan</h3>
            <p>
              Rule-based checks look for contract code, unlimited approvals, operator
              approvals, proxy patterns, owner hints, and registry signals.
            </p>
          </div>
          <div className="step">
            <span className="step-number">02</span>
            <h3>Attest</h3>
            <p>
              Agent ID holders post a verdict with an evidence hash for a target and
              category. Duplicate signals from the same wallet are rejected.
            </p>
          </div>
          <div className="step">
            <span className="step-number">03</span>
            <h3>Ask the agent</h3>
            <p>
              The read-only MCP tool returns findings and attestation counts. It never
              signs, sends, or approves. The user confirms in their wallet.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
