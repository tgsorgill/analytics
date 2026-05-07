import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local-First Educational Analytics",
  description:
    "Browser-only CSV assessment analytics with transparent schema mapping and optional aggregated AI summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
