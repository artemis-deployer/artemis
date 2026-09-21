import type { Metadata } from "next";
import "./globals.css";
import { PageTransitionProvider } from "../components/PageTransition";

export const metadata: Metadata = {
  title: "Artemis — Autonomous Non-Custodial Token Launchpad",
  description: "Deploy fixed-supply tokens directly into Robinhood Chain Uniswap V2 pools or Solana pump.fun. 100% non-custodial, zero platform fees.",
  icons: {
    icon: "/assets/icon.png",
    apple: "/assets/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Unbounded:wght@300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#131416] text-[#f8f6f0] antialiased selection:bg-[#fae8a4] selection:text-[#18191c] font-sans">
        <PageTransitionProvider>
          {children}
        </PageTransitionProvider>
      </body>
    </html>
  );
}
