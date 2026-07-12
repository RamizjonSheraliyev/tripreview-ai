"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles, LogOut, ExternalLink,
  LayoutDashboard, Crown, MessageSquare, ListChecks, Gavel,
  Megaphone, Search, PenLine, Send, Share2, Radar, Briefcase, UserCheck, Network, Link2,
  BarChart3,
} from "lucide-react";
import { logout } from "@/lib/api";
import { StatusDot } from "@/components/motion";
import ThemeToggle from "@/components/ThemeToggle";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001/admin";

type NavItem = { label: string; icon: React.ElementType; href?: string; badge?: string; dot?: boolean };
type NavGroup = { title: string; items: NavItem[] };

// Matches the TripReview.ai Figma sidebar: AI Workforce (agents) / Growth / System.
const GROUPS: NavGroup[] = [
  {
    title: "AI Workforce",
    items: [
      { label: "AI Command Center", icon: LayoutDashboard, href: "/dashboard" },
      { label: "AI CEO / Orchestrator", icon: Crown, href: "/ceo", dot: true },
      { label: "Decision Center", icon: Gavel, href: "/decision-center", dot: true },
      { label: "Communication Center", icon: MessageSquare, href: "/communication", dot: true },
      { label: "Task Center", icon: ListChecks, href: "/tasks", dot: true },
      { label: "Marketing Director", icon: Megaphone, href: "/agents/marketing", dot: true },
      { label: "SEO Agent", icon: Search, href: "/agents/seo", dot: true },
      { label: "Copywriter Agent", icon: PenLine, href: "/agents/copywriter", dot: true },
      { label: "Publisher Agent", icon: Send, href: "/agents/publisher", dot: true },
      { label: "Sales Agent", icon: Briefcase, href: "/agents/sales", dot: true },
      { label: "Provider Onboarding", icon: UserCheck, href: "/agents/onboarding", dot: true },
      { label: "Marketplace Growth", icon: Network, href: "/agents/marketplace", dot: true },
      { label: "Content Distribution", icon: Share2, href: "/agents/distribution", dot: true },
      { label: "Competitive Intelligence", icon: Radar, href: "/agents/competitive", dot: true },
      { label: "Authority Growth", icon: Link2, href: "/agents/backlink", dot: true },
      { label: "Reports & Insights", icon: BarChart3, href: "/reports", dot: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-900/70 sticky top-0 h-screen self-start">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-800 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-white leading-none">TripReview<span className="text-brand-400">.ai</span></div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-1">AI Workforce Platform</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">{g.title}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = it.href && pathname === it.href;
                const common = "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px]";
                const body = (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-brand-400" : ""}`} />
                    <span className="flex-1 truncate font-medium">{it.label}</span>
                    {it.dot && <StatusDot tone="emerald" />}
                    {it.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-brand-600 text-white">{it.badge}</span>}
                  </>
                );
                return it.href ? (
                  <Link key={it.label} href={it.href} className={`${common} ${active ? "bg-brand-600/15 text-white" : "text-slate-400 hover:text-white hover:bg-ink-800"}`}>
                    {body}
                  </Link>
                ) : (
                  <div key={it.label} className={`${common} text-slate-600 cursor-default`} title="Coming soon">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* System Status — matches the Figma footer card */}
      <div className="px-3 pb-2 shrink-0">
        <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">System Status</div>
          <div className="flex items-center gap-1.5 text-[12px] text-emerald-400 font-semibold"><StatusDot tone="emerald" /> All Systems Operational</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Uptime: 99.98%</div>
          <svg viewBox="0 0 200 28" className="w-full mt-2" style={{ height: 22 }} preserveAspectRatio="none">
            <polyline points="0,20 22,18 44,21 66,14 88,16 110,11 132,13 154,8 176,10 200,5" fill="none" stroke="#34d399" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>

      <div className="px-3 pb-2 shrink-0"><ThemeToggle /></div>

      <div className="border-t border-ink-800 px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <a href={ADMIN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"><ExternalLink className="w-3.5 h-3.5" /> Admin</a>
          <button onClick={() => { logout(); router.replace("/"); }} className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"><LogOut className="w-3.5 h-3.5" /> Sign out</button>
        </div>
        <div className="text-[9px] text-slate-600 leading-tight">© 2025 TripReview.ai<br />All rights reserved.</div>
      </div>
    </aside>
  );
}
