import type { Metadata } from "next";
import QueueClient from "@/components/queue/QueueClient";

export const metadata: Metadata = {
  title: "Sandbox audit queue",
};

export default function QueuePage() {
  return (
    <main>
      <section className="page-head">
        <p className="eyebrow">Sandbox audit queue</p>
        <h1>Attest a labeled test contract.</h1>
        <p className="lead">
          Connect an Agent ID wallet, review a labeled sandbox target, and post one
          structured attestation. Every wallet confirms the transaction itself.
        </p>
      </section>

      <div className="notice warn">
        Every target in this queue is a labeled test contract. Never send funds to a
        sandbox and never treat a NO_FLAGS_FOUND attestation as a safety guarantee.
      </div>

      <QueueClient />
    </main>
  );
}
