"use client";

import { useEffect, useState } from "react";

type BadgeState = "connecting" | "online" | "offline";

export default function StatusBadge() {
  const [state, setState] = useState<BadgeState>("connecting");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j: { configured: boolean }) => setState(j.configured ? "online" : "offline"))
      .catch(() => setState("offline"));
  }, []);

  const label =
    state === "online"
      ? "AI Copilot: Online"
      : state === "offline"
      ? "AI Copilot: Offline (Manual Mode)"
      : "AI Copilot: Connecting…";

  return (
    <span
      role="status"
      data-state={state}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-xs font-mono border ${
        state === "online"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : state === "offline"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-white/20 bg-white/5 text-white/60"
      }`}
    >
      <span>{label}</span>
    </span>
  );
}
