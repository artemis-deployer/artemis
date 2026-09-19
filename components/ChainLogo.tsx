export default function ChainLogo({ kind, size = 16 }: { kind: "hood" | "solana"; size?: number }) {
  if (kind === "solana") {
    return (
      <svg width={size} height={size} viewBox="0 0 36 28" fill="currentColor" aria-hidden="true">
        <path d="M12 2h16l-4 6H8l4-6z" />
        <path d="M12 11h16l-4 6H8l4-6z" />
        <path d="M12 20h16l-4 6H8l4-6z" opacity="0.65" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="16" cy="16" r="13" />
      <path d="M11 10v12M21 10v12M11 16h10" strokeLinecap="round" />
    </svg>
  );
}
