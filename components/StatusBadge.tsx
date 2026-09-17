"use client";

import { useEffect, useState } from "react";

export default function StatusBadge() {
  const [label, setLabel] = useState("Connecting…");
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j: { configured: boolean }) => setLabel(j.configured ? "AI connected" : "AI offline · manual form works"))
      .catch(() => setLabel("AI offline · manual form works"));
  }, []);
  return <span role="status">{label}</span>;
}
