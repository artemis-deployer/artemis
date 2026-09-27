"use client";

export type ZkBadgeState = "verified" | "verified-testnet" | "unverified" | "mismatch" | "revoked";

type Props = {
  state: ZkBadgeState;
  handle?: string;
  revokeReason?: string;
  size?: "sm" | "md" | "lg";
  onInspect?: () => void;
  title?: string;
};

const SIZES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
  lg: "px-3 py-1.5 text-xs",
} as const;

const STYLES: Record<ZkBadgeState, string> = {
  verified: "border-[#fae8a4]/50 bg-[#fae8a4]/10 text-[#fae8a4]",
  "verified-testnet": "border-white/20 bg-white/5 text-white/60",
  unverified: "border-white/10 bg-white/5 text-white/40",
  mismatch: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  revoked: "border-red-400/40 bg-red-400/10 text-red-300 line-through",
};

export default function ZkBadge({ state, handle, revokeReason, size = "sm", onInspect, title }: Props) {
  const label =
    state === "verified"
      ? `◆ ZK VERIFIED${handle ? ` @${handle}` : ""}`
      : state === "verified-testnet"
        ? "◆ ZK VERIFIED · TESTNET"
        : state === "mismatch"
          ? "⚠ HANDLE MISMATCH"
          : state === "revoked"
            ? "REVOKED"
            : "UNVERIFIED SOCIAL";
  const cls = `inline-flex shrink-0 items-center whitespace-nowrap rounded border font-mono font-bold uppercase ${onInspect ? "cursor-pointer" : "cursor-default"} ${SIZES[size]} ${STYLES[state]}`;
  const a11y =
    state === "verified" || state === "verified-testnet"
      ? `Zero-knowledge verified X account${handle ? ` @${handle}` : ""}`
      : label;
  if (!onInspect) {
    return (
      <span className={cls} aria-label={a11y} title={title ?? (revokeReason || undefined)}>
        {label}
      </span>
    );
  }
  return (
    <button type="button" onClick={onInspect} className={`${cls} hover:brightness-125`} aria-label={`${a11y}. Inspect proof`} title={title ?? "Inspect proof"}>
      {label}
    </button>
  );
}
