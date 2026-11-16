"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRole } from "@/lib/RoleContext";

const LINKS = [
  { href: "/", label: "Jobs" },
  { href: "/sell", label: "Offer" },
  { href: "/admin", label: "Verify" },
];

export function Navbar() {
  const pathname = usePathname();
  const { role, label, canOperate, isOwner } = useRole();

  const links = canOperate
    ? [...LINKS, { href: "/owner", label: isOwner ? "Owner" : "Console" }]
    : LINKS;

  // Static export uses trailing slashes, so compare without them.
  const current = pathname?.replace(/\/$/, "") || "/";

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link href="/" className="navbar__brand">
          <span className="navbar__mark">TC</span>
          <span className="navbar__name">TrustCompute</span>
        </Link>

        <div className="navbar__links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar__link ${current === (link.href.replace(/\/$/, "") || "/") ? "is-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar__right">
          {role !== "guest" && (
            <span className={`role-badge role-badge--${role}`} title={`You are viewing NodeBridge as ${label}`}>
              {label}
            </span>
          )}
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>
    </nav>
  );
}
