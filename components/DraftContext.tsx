"use client";

import { createContext, useContext, useState } from "react";
import { EMPTY_DRAFT, type Draft } from "../lib/draft";

const DraftCtx = createContext<{ draft: Draft; setDraft: (d: Draft) => void }>({
  draft: EMPTY_DRAFT,
  setDraft: () => undefined,
});

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  return <DraftCtx.Provider value={{ draft, setDraft }}>{children}</DraftCtx.Provider>;
}

export function useDraft() {
  return useContext(DraftCtx);
}
