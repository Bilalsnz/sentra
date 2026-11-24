import type { Metadata } from "next";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sentra — preflight for BNB Chain contracts",
    template: "%s — Sentra",
  },
  description:
    "Read-only security attestation registry and preflight checks for BNB Chain contracts and agent skills.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <div className="page">{children}</div>
          <footer className="footer">
            <p>
              Sentra is ownerless and read-only. NO_FLAGS_FOUND is not a safety guarantee.
              Users confirm every transaction in their wallet.
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
