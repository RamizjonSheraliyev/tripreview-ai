"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Dark/light theme switch. Persists to localStorage and toggles the `light`
// class on <html>; the whole dashboard re-themes via CSS variables.
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.setItem("tr-theme", next ? "light" : "dark"); } catch { /* ignore */ }
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
        title={light ? "Dark mode" : "Light mode"}
        className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800 transition-colors"
      >
        {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="w-full inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 transition-colors"
    >
      {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      {light ? "Dark mode" : "Light mode"}
    </button>
  );
}
