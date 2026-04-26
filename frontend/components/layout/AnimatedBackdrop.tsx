"use client";

import type { ReactNode } from "react";

export default function AnimatedBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="animated-backdrop-shell">
      <div className="animated-backdrop" aria-hidden="true">
        <div className="backdrop-orb orb-a" />
        <div className="backdrop-orb orb-b" />
        <div className="backdrop-orb orb-c" />
        <div className="backdrop-grid" />
        <div className="backdrop-noise" />
      </div>
      <div className="animated-backdrop-content">{children}</div>
    </div>
  );
}
