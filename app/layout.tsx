import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kentir — launch your coin",
  description: "Chat an idea into a token draft, then launch it from your own wallet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
