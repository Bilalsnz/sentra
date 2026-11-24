"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Scanner" },
  { href: "/queue", label: "Audit queue" },
  { href: "/integration", label: "Integration" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Sentra home">
        <span className="brand-mark" aria-hidden="true" />
        <span>SENTRA</span>
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? "nav-link active" : "nav-link"}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <span className="pill">READ-ONLY</span>
    </header>
  );
}
