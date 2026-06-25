import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripReview · AI Executive Dashboard",
  description: "AI workforce command center for TripReview.ae",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
