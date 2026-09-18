"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { EMPTY_DRAFT, type Draft } from "../lib/draft";

const DraftCtx = createContext<{ draft: Draft; setDraft: Dispatch<SetStateAction<Draft>> }>({
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
