const SRC = {
  hood: "/chains/hood.ico",
  solana: "/chains/solana.svg",
} as const;

export default function ChainLogo({ kind, size = 16 }: { kind: "hood" | "solana"; size?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- official chain marks served from /public */
    <img src={SRC[kind]} width={size} height={size} alt="" aria-hidden="true" />
  );
}
