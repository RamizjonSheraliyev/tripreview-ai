import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripReview · AI Executive Dashboard",
  description: "AI workforce command center for TripReview.ae",
};

// Apply the saved theme before first paint so there's no dark→light flash.
const themeScript = `(function(){try{var t=localStorage.getItem('tr-theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
