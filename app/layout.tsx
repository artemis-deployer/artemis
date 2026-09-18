import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kentir — Autonomous Non-Custodial Token Launchpad",
  description: "Deploy fixed-supply tokens directly into Robinhood Chain Uniswap V2 pools or Solana pump.fun. 100% non-custodial, zero platform fees.",
  icons: {
    icon: "/assets/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&family=Unbounded:wght@600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#121218] text-[#f5f3f7] antialiased selection:bg-[#e4cef7] selection:text-[#17131f] font-sans">
        {children}
      </body>
    </html>
  );
}
