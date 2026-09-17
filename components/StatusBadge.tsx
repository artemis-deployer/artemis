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
    <span role="status" data-state={state} className="status-badge">
      <span>{label}</span>
    </span>
  );
}
