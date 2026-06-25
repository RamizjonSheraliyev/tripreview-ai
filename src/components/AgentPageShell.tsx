"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchMe } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

export default function AgentPageShell({
  title,
  subtitle,
  icon,
  accent = "from-brand-500 to-violet-600",
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMe()
      .then((r) => {
        if (off) return;
        if (r.user?.role !== "Admin") { router.replace("/"); return; }
        setReady(true);
      })
      .catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ink-950">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="flex items-center gap-3 px-5 sm:px-8 py-5 border-b border-ink-800">
          {icon && <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white`}>{icon}</div>}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}

export function StatusPill({ status }: { status: "active" | "pending" | "soon" }) {
  const map = {
    active: { label: "Active", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 live-dot" },
    pending: { label: "Setup pending", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
    soon: { label: "Coming soon", cls: "text-slate-400 bg-ink-800 border-ink-700", dot: "bg-slate-500" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} /> {map.label}
    </span>
  );
}
