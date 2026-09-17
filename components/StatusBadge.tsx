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
  const label = state === "online" ? "AI connected" : state === "offline" ? "AI offline · manual form works" : "Connecting…";
  return (
    <span role="status" data-state={state}>
      {label}
    </span>
  );
}
