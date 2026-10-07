import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nimi-router — AI model router",
  description: "OpenAI-compatible AI router with smart fallback across providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
