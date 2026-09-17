import { DM_Sans, Rancho } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const display = Rancho({ weight: "400", subsets: ["latin"], variable: "--font-display-next" });
const bodyFont = DM_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-body-next" });

export const metadata: Metadata = {
  title: "Kentir — launch your coin",
  description: "Chat an idea into a token draft, then launch it from your own wallet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
