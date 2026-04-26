"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full border border-[var(--gold)]/35 bg-white/55 flex items-center justify-center group-hover:border-[var(--gold)] transition-colors">
            <span className="text-[var(--gold)] text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
              A
            </span>
          </div>
          <span
            className="text-[var(--text-primary)] text-sm font-medium tracking-[0.22em] uppercase opacity-80 group-hover:opacity-100 transition-opacity"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Celestial Archive
          </span>
        </Link>

        <div className="flex items-center gap-1 soft-panel p-1">
          <Link
            href="/"
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
              pathname === "/"
                ? "text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Dashboard
          </Link>
        </div>
      </div>
      <hr className="gold-divider opacity-50" />
    </nav>
  );
}
