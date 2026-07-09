"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Crown, Sparkles, Loader2, Send, X, Bell, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, DollarSign, Building2, FileText, ListChecks,
  Search, PenLine, Share2, Radar, Megaphone, Handshake, UserCheck,
  RefreshCw, Filter, Plus, UserPlus2, FileBarChart2, Target, Lightbulb, ArrowRight,
  Eye, Clock, Zap, Wand2, ChevronDown, CircleDot, MessageSquare,
  MoreVertical, ChevronLeft, ChevronRight, Maximize2, Settings2,
  Mic, Volume2, VolumeX, ImagePlus, Globe, AlertTriangle,
  Cpu, Pause, Play, Calendar, ShieldCheck, FileEdit, Layers,
} from "lucide-react";
import {
  fetchMe, getStoredUser, getStats, getActivity, getSeries, getBrainTasks, approveBrainTask, dismissBrainTask,
  getCeoOverview, ceoAsk, getCeoOrchestration, executeCeoTask, taskChat, getCeoCompletedFixes,
  getCeoAudit, runCeoAudit, approveCeoProposal, rejectCeoProposal,
  getCeoSeo, runCeoSeo, getWorkforce, getRoi, getStrategy, generateStrategy, assignAgentTask, toggleAgentPause, agentChat, generateLandingPage, listLandingPages, getLandingPageById, editLandingPageAI, publishLandingPage, createBrief,
  type GeneratedPage, type LandingPageFull, type RoiData, type StrategyData,
  type Workforce, type WfAgent, type WfApproval, type AgentChatTurn,
  type Stats, type Activity, type SeriesPoint, type BrainTask, type CeoOverview, type CeoOpportunity,
  type Orchestration as OrchData, type OrchTask, type OrchStatus, type CompletedFix,
  type CeoAuditSnapshot, type CeoProposalItem, type CeoAction, type CeoSource, type SeoAuditSnapshot, type SeoIssue,
} from "@/lib/api";
import { speakUz } from "@/lib/voice";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, AnimatedNumber, StatusDot, motion } from "@/components/motion";
import { AGENTS, type AgentDef } from "@/lib/agents";

const AGENT_ICONS: Record<string, React.ElementType> = {
  Crown, Megaphone, Search, PenLine, Send, Share2, Radar, Building2, Handshake, UserCheck,
};

const TABS = ["Executive Overview", "Task Orchestration", "SEO Audit", "Agent Management", "Performance & ROI", "Strategy & Opportunities", "Approvals"] as const;
type Tab = (typeof TABS)[number];

const impactTone = (i: string) => (i === "High" ? "bg-rose-500/15 text-rose-300" : i === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");

// % change between first & last point of a real series — drives the green deltas.
function deltaPct(nums: number[]): number | null {
  const xs = nums.filter((n) => typeof n === "number");
  if (xs.length < 2) return null;
  const first = xs.find((n) => n > 0) ?? xs[0];
  const last = xs[xs.length - 1];
  if (!first) return null;
  return Math.round(((last - first) / first) * 100);
}
// Gentle rising curve when no real series exists — purely a visual trend hint.
function synthSpark(base: number): number[] {
  const b = Math.max(1, base);
  return [0.62, 0.55, 0.7, 0.66, 0.82, 0.9, 1].map((f, i) => Math.round(b * f * (0.9 + i * 0.015)));
}
function fmtDelta(p: number | null): string | null {
  if (p === null) return null;
  return `${p >= 0 ? "+" : ""}${p}% vs last 7 days`;
}
function clock(iso?: string): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}

export default function CeoPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();

  const [tab, setTab] = useState<Tab>("Executive Overview");
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [wf, setWf] = useState<Workforce | null>(null);
  const [strat, setStrat] = useState<StrategyData | null>(null);
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMe()
      .then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); })
      .catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useMemo(() => async () => {
    const [ov, st, ac, sr, tk, w, sg, ri] = await Promise.all([
      getCeoOverview().then((r) => r.overview).catch(() => null),
      getStats().catch(() => null),
      getActivity(12).then((r) => r.activities ?? []).catch(() => []),
      getSeries(7).then((r) => r.series ?? []).catch(() => []),
      getBrainTasks().then((r) => r.tasks ?? []).catch(() => []),
      getWorkforce().catch(() => null),
      getStrategy().catch(() => null),
      getRoi().catch(() => null),
    ]);
    setOverview(ov); setStats(st); setActs(ac as Activity[]); setSeries(sr); setTasks(tk);
    if (w) setWf(w); if (sg) setStrat(sg); if (ri) setRoi(ri);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [ready, load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const act = async (id: string, kind: "approve" | "dismiss") => {
    setTasks((p) => p.filter((t) => t._id !== id));
    try { kind === "approve" ? await approveBrainTask(id) : await dismissBrainTask(id); } catch { /* ignore */ }
  };

  const ctx = (overview?._ctx || {}) as unknown as Record<string, number>;

  if (!ready) {
    return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shrink-0"><Crown className="w-5 h-5 text-white" /></span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">AI CEO / Orchestrator</h1>
            <p className="text-[11px] text-slate-500 truncate">The brain of your AI workforce — assigns tasks, monitors performance, drives growth.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={refresh} className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setAskOpen(true)} className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90">
              <Sparkles className="w-4 h-4" /> Ask AI CEO
            </button>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div>
              <div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {t}
                {tab === t && <motion.span layoutId="ceoTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : tab === "Executive Overview" ? (
            <Overview overview={overview} stats={stats} acts={acts} series={series} tasks={tasks} ctx={ctx} wf={wf} strat={strat} roi={roi} onAct={act} onAsk={() => setAskOpen(true)} onNav={setTab} />
          ) : tab === "Task Orchestration" ? (
            <Orchestration />
          ) : tab === "SEO Audit" ? (
            <SeoAudit />
          ) : tab === "Agent Management" ? (
            <AgentManagement />
          ) : tab === "Performance & ROI" ? (
            <PerformanceROI />
          ) : tab === "Strategy & Opportunities" ? (
            <StrategyOpportunities />
          ) : (
            <ApprovalsCenter />
          )}
        </div>
      </main>

      {askOpen && <AskModal onClose={() => setAskOpen(false)} aiReady={!!overview?._ai} />}
    </div>
  );
}

/* ----------------------------- Panels ----------------------------- */

function Panel({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink-800 bg-ink-900/50 p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>{title && <h3 className="text-sm font-bold text-white">{title}</h3>}{sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function HealthRing({ score, label }: { score: number; label: string }) {
  const r = 46, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 110 110" className="w-32 h-32 -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth="9" />
        <motion.circle
          cx="55" cy="55" r={r} fill="none" stroke="url(#hg)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#10b981" /><stop offset="1" stopColor="#3b82f6" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="text-3xl font-extrabold text-white"><AnimatedNumber value={pct} /></div><div className="text-[10px] font-semibold text-emerald-400">{label}</div></div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, tone = "brand" }: { icon: React.ElementType; label: string; value: React.ReactNode; delta?: string; tone?: string }) {
  const tones: Record<string, string> = { brand: "from-brand-500/20 text-brand-300", emerald: "from-emerald-500/20 text-emerald-300", amber: "from-amber-500/20 text-amber-300", violet: "from-violet-500/20 text-violet-300", sky: "from-sky-500/20 text-sky-300" };
  return (
    <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tones[tone] || tones.brand} to-transparent grid place-items-center`}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
      {delta && <div className="mt-1 text-[11px] text-emerald-400 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {delta}</div>}
    </Item>
  );
}

function Overview({ overview, stats, acts, series, tasks, ctx, wf, strat, roi, onAct, onAsk, onNav }: { overview: CeoOverview | null; stats: Stats | null; acts: Activity[]; series: SeriesPoint[]; tasks: BrainTask[]; ctx: Record<string, number>; wf: Workforce | null; strat: StrategyData | null; roi: RoiData | null; onAct: (id: string, k: "approve" | "dismiss") => void; onAsk: () => void; onNav: (t: Tab) => void }) {
  const [actFilter, setActFilter] = useState("All");

  // Priorities / opportunities / insights — prefer the LLM overview, fall back to the real strategy aggregator.
  const imp = (s: string) => (s === "High" || s === "Medium" || s === "Low" ? s : "Medium") as "High" | "Medium" | "Low";
  const priorities: CeoOpportunity[] = (overview?.priorities && overview.priorities.length ? overview.priorities
    : (strat?.topOpportunities || []).map((o) => ({ title: o.title, detail: `Est. ${o.trafficPotential.toLocaleString()} traffic · ${o.confidence}% confidence`, impact: imp(o.impact), confidence: o.confidence }))).slice(0, 5);
  const opportunities: CeoOpportunity[] = (overview?.strategicOpportunities && overview.strategicOpportunities.length ? overview.strategicOpportunities
    : (strat?.topOpportunities || []).map((o) => ({ title: o.title, detail: `Est. AED ${o.revenueImpact.toLocaleString()} impact · ${o.trafficPotential.toLocaleString()} traffic`, impact: imp(o.impact), confidence: o.confidence }))).slice(0, 4);
  const insights: string[] = (overview?.insights && overview.insights.length ? overview.insights
    : (strat?.recommendations || []).map((r) => `${r.title} — ${r.body}`)).slice(0, 4);
  const ds = overview?.dailySummary;

  // Real sparklines from the ROI + workforce aggregators (no synthetic curves).
  const revSpark = roi?.kpis.revenueSpark?.length ? roi.kpis.revenueSpark : series.map((p) => p.revenue);
  const growthSpark = roi?.kpis.growthSpark?.length ? roi.kpis.growthSpark : series.map((p) => p.bookings);
  const actSpark = wf?.timeline?.length ? wf.timeline.map((t) => t.actions) : series.map((p) => p.users);
  const revenue = roi?.kpis.revenueImpact ?? stats?.revenue ?? 0;
  const providers = ctx.providers ?? stats?.providers ?? 0;
  const content = ctx.blogPublished ?? 0;
  const growthVal = overview?.growthMomentum ?? `+${roi?.kpis.revenueTrend ?? 0}%`;

  // Task counts — real brain queue.
  const done = ctx.tasksDone ?? 0;
  const waiting = ctx.pendingApprovalTasks ?? tasks.length ?? 0;
  const inProgress = ctx.blogDrafts ?? 0;
  const total = done + waiting + inProgress;
  const taskPct = total ? Math.round((done / total) * 100) : 0;
  const newThisWeek = strat?.kpis.newThisWeek ?? 0;

  // Real task table rows from the strategy aggregator (content + marketplace work).
  const taskRows = [
    ...(strat?.contentOpps || []).map((c) => ({ task: `Create content for "${c.topic}"`, agent: c.assignedTo, priority: c.priority, status: c.status, impact: c.priority })),
    ...(strat?.marketplaceOpps || []).filter((m) => m.potentialProviders > 0).map((m) => ({ task: m.opportunity, agent: m.assignedTo, priority: m.priority, status: m.status, impact: m.priority })),
  ].slice(0, 6);

  const actList = acts.filter((a) => actFilter === "All" || (a.action || "").toLowerCase().includes(actFilter.toLowerCase()));
  const exportReport = () => {
    const lines = [
      ["Metric", "Value"],
      ["Health Score", String(overview?.healthScore ?? "—")],
      ["Growth Momentum", String(growthVal)],
      ["Revenue Impact (Est. AED)", String(revenue)],
      ["Tasks Completed", `${done}/${total}`],
      ["Providers", String(providers)],
      ["Content Published", String(content)],
      ["Pending Approvals", String(tasks.length)],
      ["Open Opportunities", String(strat?.kpis.totalOpportunities ?? 0)],
    ];
    const csv = lines.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "ceo-summary.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const ViewAll = ({ to, label = "View All" }: { to: Tab; label?: string }) => (
    <button onClick={() => onNav(to)} className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold hover:underline">{label} <ArrowRight className="w-3 h-3" /></button>
  );

  return (
    <div className="space-y-5">
      {!overview?._ai && (
        <FadeUp><div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">⚠ AI brain running in fallback mode (heuristics). Add a valid <b>ANTHROPIC_API_KEY</b> to the backend .env for real Claude reasoning.</div></FadeUp>
      )}

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <HealthCard score={overview?.healthScore ?? 0} label={overview?.healthLabel ?? "—"} />
        <BigStat label="Growth Momentum" value={growthVal} sub={momentumWord(growthVal)} spark={growthSpark} color="#34d399" sparkId="sp-growth" delta={fmtDelta(deltaPct(growthSpark))} />
        <BigStat label="Revenue Impact (Est.)" value={<>AED <AnimatedNumber value={revenue} /></>} sub="This month" spark={revSpark} color="#fbbf24" sparkId="sp-rev" delta={`↑ ${roi?.kpis.revenueTrend ?? 0}% vs last 7 days`} />
        <BigStat label="Tasks Completed" value={<><AnimatedNumber value={done} /> / {total}</>} sub={`${taskPct}%`} color="#a78bfa" sparkId="sp-tasks" delta="brain queue">
          <div className="mt-2 h-1.5 rounded-full bg-ink-800 overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-brand-500" initial={{ width: 0 }} animate={{ width: `${taskPct}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </BigStat>
        <BigStat label="Providers Discovered" value={<AnimatedNumber value={providers} />} sub="On platform" spark={actSpark} color="#38bdf8" sparkId="sp-prov" delta={`${ctx.providersVerified ?? 0} verified`} />
        <BigStat label="Content Published" value={<AnimatedNumber value={content} />} sub="This month" spark={actSpark} color="#6366f1" sparkId="sp-content" delta={inProgress ? `${inProgress} in pipeline` : "live"} />
      </Stagger>

      {/* Row 2: Workforce Map | Live Activity | Today's Priorities */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <FadeUp className="xl:col-span-5"><WorkforceMap wf={wf} onNav={onNav} /></FadeUp>
        <FadeUp delay={0.04} className="xl:col-span-4">
          <Panel title="Live Activity Feed" sub="Real-time updates from your AI workforce"
            right={<select value={actFilter} onChange={(e) => setActFilter(e.target.value)} className="text-[10px] text-slate-300 bg-ink-900 border border-ink-700 rounded-lg px-2 py-1 focus:outline-none"><option>All</option><option>blog</option><option>seo</option><option>ceo</option><option>publish</option></select>}>
            <ul className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
              {actList.map((a, i) => (
                <motion.li key={a.id || i} className="flex items-start gap-3" initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <span className="mt-1"><StatusDot tone={i < 2 ? "emerald" : "sky"} pulse={i < 2} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-200 leading-snug">{a.action || "Activity"}</div>
                    {a.entityLabel && <div className="text-[11px] text-slate-500 truncate">{a.entityLabel}</div>}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">{clock(a.createdAt) || rel(a.createdAt)}</span>
                </motion.li>
              ))}
              {actList.length === 0 && <li className="text-xs text-slate-500">No matching activity.</li>}
            </ul>
            <div className="pt-2 mt-1 border-t border-ink-800/60 text-center"><ViewAll to="Agent Management" label="View Full Activity" /></div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.08} className="xl:col-span-3">
          <Panel title="Today's Priorities" sub="AI CEO recommended focus" right={<ViewAll to="Strategy & Opportunities" />}>
            <ul className="space-y-2.5">
              {priorities.map((p, i) => (
                <motion.li key={i} onClick={() => onNav("Strategy & Opportunities")} className="flex items-start gap-2.5 cursor-pointer group" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-brand-600/20 text-brand-300 text-[10px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                  <span className="flex-1 text-[12px] text-slate-300 leading-snug group-hover:text-white">{p.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(p.impact)} shrink-0`}>{p.impact}</span>
                </motion.li>
              ))}
              {priorities.length === 0 && <li className="text-xs text-slate-500">No priorities yet.</li>}
            </ul>
          </Panel>
        </FadeUp>
      </div>

      {/* Row 3: Task Orchestration | Strategic Opportunities | Pending Approvals + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <FadeUp className="xl:col-span-5">
          <Panel title="Task Orchestration Overview" sub="All tasks across the AI workforce" right={<ViewAll to="Task Orchestration" label="View All Tasks" />}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              <Chip label="Total" value={total} tone="slate" />
              <Chip label="Completed" value={done} tone="emerald" />
              <Chip label="In Progress" value={inProgress} tone="amber" />
              <Chip label="Waiting" value={waiting} tone="sky" />
              <Chip label="Failed" value={0} tone="rose" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[460px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 font-semibold">Task</th><th className="font-semibold">Agent</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th><th className="font-semibold">Impact</th></tr></thead>
                <tbody>
                  {taskRows.map((t, i) => (
                    <tr key={i} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer" onClick={() => onNav("Task Orchestration")}>
                      <td className="py-2 text-[11px] text-white font-semibold"><span className="block truncate max-w-[180px]">{t.task}</span></td>
                      <td className="text-[10px] text-slate-400 whitespace-nowrap">{t.agent}</td>
                      <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRI_TONE[t.priority] || ""}`}>{t.priority}</span></td>
                      <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STAT_TONE[t.status] || "bg-slate-500/15 text-slate-400"}`}>{t.status}</span></td>
                      <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(t.impact)}`}>{t.impact}</span></td>
                    </tr>
                  ))}
                  {taskRows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[11px] text-slate-500">No tasks queued.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.04} className="xl:col-span-4">
          <Panel title="Strategic Opportunities" sub="High-potential bets identified by AI CEO" right={<ViewAll to="Strategy & Opportunities" label="View All Opportunities" />}>
            <ul className="space-y-2.5">
              {opportunities.map((o, i) => (
                <motion.li key={i} onClick={() => onNav("Strategy & Opportunities")} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 cursor-pointer hover:border-brand-500/40" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0"><Target className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" /><div className="text-[12px] font-semibold text-white leading-tight">{o.title}</div></div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${impactTone(o.impact)}`}>{o.impact}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{o.detail}</div>
                  <div className="mt-2 flex items-center gap-2"><div className="flex-1 h-1 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${o.confidence}%` }} transition={{ duration: 0.9 }} /></div><span className="text-[9px] text-slate-500 shrink-0">Confidence {o.confidence}%</span></div>
                </motion.li>
              ))}
              {opportunities.length === 0 && <li className="text-xs text-slate-500">No opportunities yet.</li>}
            </ul>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.08} className="xl:col-span-3 space-y-5">
          <Panel title="Pending Approvals" right={<span className="inline-flex items-center gap-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{tasks.length}</span><ViewAll to="Approvals" /></span>}>
            <ul className="space-y-2.5">
              {tasks.slice(0, 3).map((t) => (
                <li key={t._id} className="rounded-xl border border-ink-800 p-2.5">
                  <div className="text-[12px] font-semibold text-white leading-tight">{t.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => onAct(t._id, "approve")} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                    <button onClick={() => onAct(t._id, "dismiss")} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800"><XCircle className="w-3 h-3" /> Reject</button>
                  </div>
                </li>
              ))}
              {tasks.length === 0 && <li className="text-xs text-slate-500">Nothing awaiting approval. 🎉</li>}
            </ul>
          </Panel>
          <Panel title="AI CEO Insights" sub="Key insights & recommendations" right={<ViewAll to="Strategy & Opportunities" label="View Full Insights" />}>
            <ul className="space-y-2.5">
              {insights.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug"><Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" /> {s}</li>
              ))}
              {insights.length === 0 && <li className="text-xs text-slate-500">No insights yet.</li>}
            </ul>
          </Panel>
        </FadeUp>
      </div>

      {/* Row 4: Daily Summary | Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <FadeUp className="xl:col-span-8">
          <Panel title="AI CEO Daily Summary" sub="Your executive summary for today">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Mini label="Top Achievements" value={ds?.topAchievements ?? done} hint="Tasks completed" />
              <Mini label="Key Progress" value={ds?.keyProgress ?? growthVal} hint="Growth momentum this week" />
              <Mini label="Focus Areas" value={ds?.focusAreas ?? (strat?.focusAreas.length ?? 0)} hint="High-impact priorities" />
              <Mini label="Risks / Issues" value={ds?.risks ?? tasks.length} hint="Requires your attention" />
              <Mini label="New Opportunities" value={newThisWeek} hint="Identified this week" />
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.05} className="xl:col-span-4">
          <Panel title="Quick Actions" sub="Shortcuts for common actions">
            <div className="grid grid-cols-1 gap-2">
              <QuickAction icon={Plus} label="Create New Task" onClick={() => onNav("Task Orchestration")} />
              <QuickAction icon={UserPlus2} label="Assign Task to Agent" onClick={() => onNav("Agent Management")} />
              <QuickAction icon={FileBarChart2} label="Generate Report" onClick={exportReport} />
              <QuickAction icon={Sparkles} label="Ask AI CEO" onClick={onAsk} />
            </div>
          </Panel>
        </FadeUp>
      </div>
    </div>
  );
}

function momentumWord(m?: string): string {
  const n = parseInt((m || "").replace(/[^\d-]/g, ""), 10);
  if (isNaN(n)) return "Steady";
  return n >= 20 ? "Strong" : n >= 8 ? "Healthy" : n > 0 ? "Steady" : "Flat";
}

function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-9 w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------- Chart primitives ----------------------------- */

function Donut({ segments, size = 132, stroke = 16, children }: { segments: { pct: number; color: string }[]; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const node = (
            <motion.circle
              key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              pathLength={100} strokeDasharray={`${s.pct} ${100 - s.pct}`} strokeDashoffset={-acc} strokeLinecap="butt"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
            />
          );
          acc += s.pct;
          return node;
        })}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}

function RowSpark({ data, color = "#34d399", w = 60, h = 22 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniDelta({ value, suffix = "%", className = "" }: { value: number; suffix?: string; className?: string }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-400" : "text-rose-400"} ${className}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(value)}{suffix}
    </span>
  );
}

function WorkBar({ pct, className = "" }: { pct: number; className?: string }) {
  const tone = pct >= 70 ? "from-rose-500 to-rose-400" : pct >= 40 ? "from-amber-500 to-amber-400" : "from-emerald-500 to-emerald-400";
  return (
    <div className={`h-1.5 rounded-full bg-ink-800 overflow-hidden ${className}`}>
      <motion.div className={`h-full bg-gradient-to-r ${tone}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

function Funnel({ data }: { data: { stage: string; count: number; color: string }[] }) {
  const max = data[0]?.count || 1;
  return (
    <Stagger className="space-y-2">
      {data.map((d) => (
        <Item key={d.stage} className="flex justify-center">
          <div className="h-9 rounded-lg flex items-center justify-between px-3.5 text-white text-[11px] font-bold shadow-lg" style={{ width: `${Math.max(38, (d.count / max) * 100)}%`, background: d.color }}>
            <span>{d.stage}</span><span className="tabular-nums">{d.count}</span>
          </div>
        </Item>
      ))}
    </Stagger>
  );
}

function BigStat({ label, value, sub, delta, color, spark, sparkId, children }: { label: string; value: React.ReactNode; sub?: string; delta?: string | null; color?: string; spark?: number[]; sparkId?: string; children?: React.ReactNode }) {
  return (
    <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 flex flex-col">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-white leading-none">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
      {children}
      {spark && sparkId && <Sparkline data={spark} color={color || "#34d399"} id={sparkId} />}
      {delta && <div className="mt-auto pt-1 text-[10px] text-emerald-400 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {delta}</div>}
    </Item>
  );
}

function HealthCard({ score, label }: { score: number; label: string }) {
  return (
    <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 flex flex-col items-center justify-center text-center">
      <div className="text-[11px] text-slate-500 self-start">Business Health Score</div>
      <HealthRing score={score} label={label} />
    </Item>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = { slate: "text-slate-300", emerald: "text-emerald-400", amber: "text-amber-400", sky: "text-sky-400", rose: "text-rose-400" };
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-2.5 text-center">
      <div className={`text-xl font-extrabold ${tones[tone]}`}><AnimatedNumber value={value} /></div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function TaskTable({ rows }: { rows: CeoOpportunity[] }) {
  const agents = ["SEO Agent", "Copywriter Agent", "Publisher Agent", "Content Distribution", "Marketplace Growth"];
  const statuses = ["In Progress", "In Progress", "Completed", "In Progress", "Completed"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[440px]">
        <thead><tr className="text-left text-[10px] uppercase text-slate-500 border-b border-ink-800">
          <th className="py-2 pr-3 font-semibold">Task</th><th className="py-2 px-2 font-semibold">Agent</th><th className="py-2 px-2 font-semibold">Priority</th><th className="py-2 px-2 font-semibold">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-ink-800">
          {rows.slice(0, 5).map((p, i) => (
            <tr key={i} className="hover:bg-ink-900/50">
              <td className="py-2 pr-3 text-slate-200 text-[12px]">{p.title}</td>
              <td className="py-2 px-2 text-slate-400 text-[11px] whitespace-nowrap">{agents[i % agents.length]}</td>
              <td className="py-2 px-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(p.impact)}`}>{p.impact}</span></td>
              <td className="py-2 px-2 text-[11px]"><span className={statuses[i % statuses.length] === "Completed" ? "text-emerald-400" : "text-amber-400"}>{statuses[i % statuses.length]}</span></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500 text-xs">No tasks yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, onClick }: { icon: React.ElementType; label: string; href?: string; onClick?: () => void }) {
  const cls = "flex items-center gap-2.5 rounded-xl border border-ink-800 bg-ink-950/40 px-3 py-2.5 text-[12px] font-semibold text-slate-200 hover:border-brand-500/50 hover:bg-ink-800/60 transition group";
  const inner = <><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center group-hover:bg-brand-600/25"><Icon className="w-4 h-4" /></span>{label}<ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto group-hover:text-brand-400" /></>;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

function Mini({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/30 p-3">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-xl font-extrabold text-white mt-1">{value}</div>
      {hint && <div className="text-[9px] text-slate-600 mt-1 leading-tight">{hint}</div>}
    </div>
  );
}

const LEGEND: [string, string][] = [["Active", "emerald"], ["Busy", "amber"], ["Waiting", "sky"], ["Needs Attention", "rose"], ["Offline", "slate"]];

const WF_DOT: Record<string, "emerald" | "amber" | "sky" | "rose" | "slate"> = { Active: "emerald", Busy: "amber", Waiting: "sky", Error: "rose", Paused: "slate", Idle: "slate" };
function WorkforceMap({ wf, onNav }: { wf: Workforce | null; onNav: (t: Tab) => void }) {
  const growth = AGENTS.filter((a) => a.dept === "Growth");
  const market = AGENTS.filter((a) => a.dept === "Marketplace");
  const stateOf = (id: string) => { const a = wf?.agents.find((x) => x.id === id); return (a?.state || a?.status || "Idle"); };
  const ceoState = stateOf("ceo");
  const coordinating = wf?.agentStateSummary?.online ?? wf?.summary.active ?? (AGENTS.length - 1);
  return (
    <Panel title="AI Workforce Map" sub="All agents and their current status"
      right={<button onClick={() => onNav("Agent Management")} className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold hover:underline">View All Agents <ArrowRight className="w-3 h-3" /></button>}>
      <div className="flex flex-col items-center gap-4">
        <motion.div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-center"
          animate={{ boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 0 6px rgba(245,158,11,0.06)", "0 0 0 0 rgba(245,158,11,0)"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-white"><Crown className="w-4 h-4 text-amber-400" /> AI CEO / Orchestrator</div>
          <div className={`text-[10px] inline-flex items-center gap-1 mt-0.5 ${(WF_STATE_TONE[ceoState] || WF_STATE_TONE.Idle).text}`}><StatusDot tone={WF_DOT[ceoState]} pulse={ceoState === "Active" || ceoState === "Busy"} /> {ceoState} · Coordinating {coordinating} agents</div>
        </motion.div>
        <div className="h-4 w-px bg-gradient-to-b from-amber-500/50 to-ink-800 -my-2" />
        <div className="grid sm:grid-cols-2 gap-3 w-full">
          <DeptBox title={`Growth Department · ${growth.length}`} agents={growth} stateOf={stateOf} />
          <DeptBox title={`Marketplace Department · ${market.length}`} agents={market} stateOf={stateOf} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 w-full border-t border-ink-800/60">
          {([["Active", "emerald"], ["Busy", "amber"], ["Waiting", "sky"], ["Needs Attention", "rose"], ["Offline", "slate"]] as [string, "emerald"][]).map(([name, tone]) => (
            <span key={name} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><StatusDot tone={tone} /> {name}</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DeptBox({ title, agents, stateOf }: { title: string; agents: AgentDef[]; stateOf: (id: string) => string }) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
      <div className="text-[11px] font-bold text-slate-400 mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {agents.map((a) => {
          const Icon = AGENT_ICONS[a.icon] || Sparkles; const st = stateOf(a.id); const t = WF_STATE_TONE[st] || WF_STATE_TONE.Idle;
          return (
            <div key={a.id} className="rounded-lg border border-ink-800 bg-ink-900/60 p-2">
              <Icon className="w-4 h-4 text-brand-300" />
              <div className="text-[11px] font-semibold text-white mt-1 leading-tight">{a.name}</div>
              <div className={`text-[9px] inline-flex items-center gap-1 mt-0.5 ${t.text}`}>
                <StatusDot tone={WF_DOT[st]} pulse={st === "Active" || st === "Busy"} /> {st}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statusTone = (s: OrchStatus) =>
  s === "Completed" ? "bg-emerald-500/15 text-emerald-300"
  : s === "In Progress" ? "bg-amber-500/15 text-amber-300"
  : s === "Waiting Approval" ? "bg-sky-500/15 text-sky-300"
  : s === "Failed/Blocked" ? "bg-rose-500/15 text-rose-300"
  : "bg-slate-500/15 text-slate-300";
const statusDotTone = (s: OrchStatus) =>
  s === "Completed" ? "emerald" : s === "In Progress" ? "amber" : s === "Waiting Approval" ? "sky" : s === "Failed/Blocked" ? "rose" : "slate";

function dateShort(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }); } catch { return "—"; }
}
function dateTime(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}
function agentIco(name: string): React.ElementType {
  const n = name.toLowerCase();
  if (n.includes("ceo")) return Crown;
  if (n.includes("seo")) return Search;
  if (n.includes("copywriter")) return PenLine;
  if (n.includes("publisher")) return Send;
  if (n.includes("distribution")) return Share2;
  if (n.includes("intelligence")) return Radar;
  if (n.includes("marketing")) return Megaphone;
  if (n.includes("marketplace")) return Building2;
  if (n.includes("sales")) return Handshake;
  if (n.includes("onboarding")) return UserCheck;
  return Sparkles;
}

function Orchestration() {
  const [data, setData] = useState<OrchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<OrchTask | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [deptF, setDeptF] = useState("All");
  const [agentF, setAgentF] = useState("All");
  const [priorityF, setPriorityF] = useState("All");
  const [flowView, setFlowView] = useState<"Flow View" | "Timeline View">("Flow View");
  const [fixes, setFixes] = useState<CompletedFix[]>([]);
  const [selFix, setSelFix] = useState<CompletedFix | null>(null);

  const load = useMemo(() => async () => {
    const [d, f] = await Promise.all([
      getCeoOrchestration().catch(() => null),
      getCeoCompletedFixes().catch(() => null),
    ]);
    setData(d);
    if (f) setFixes(f.fixes);
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const exec = async (t: OrchTask) => {
    setBusyId(t.id);
    try {
      const r = await executeCeoTask(t.id);
      if (r.ok === false) setToast(`Failed: ${r.error || "could not apply"}`);
      else if (r.autoFixed) setToast(`✓ Auto-fixed: ${r.result || t.task}`);
      else if (r.result) setToast(`✓ ${r.result}`);
      else if (r.alreadyClear) setToast("Already resolved.");
      else setToast("Queued — opening admin to finish.");
      if (r.ok !== false && !r.autoFixed && r.link) window.open(r.link, "_blank");
      await load();
      setSel(null);
    } catch { setToast("Could not execute. Check the AI CEO backend."); }
    finally { setBusyId(null); setTimeout(() => setToast(""), 4000); }
  };

  const tasks = (data?.tasks || []).filter((t) =>
    (statusF === "All" || t.status === statusF) &&
    (deptF === "All" || t.department === deptF) &&
    (agentF === "All" || t.agent === agentF) &&
    (priorityF === "All" || t.priority === priorityF) &&
    (!q || t.task.toLowerCase().includes(q.toLowerCase()) || t.description.toLowerCase().includes(q.toLowerCase()))
  );
  const depts = ["All", ...Array.from(new Set((data?.tasks || []).map((t) => t.department)))];
  const agentList = ["All", ...Array.from(new Set((data?.tasks || []).map((t) => t.agent)))];
  const st = data?.stats;

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {toast && <FadeUp><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">{toast}</div></FadeUp>}
      {!data?._ai && <FadeUp><div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">⚠ Running in fallback mode — add ANTHROPIC_API_KEY for full AI reasoning. Task detection & auto-fix still work.</div></FadeUp>}

      {/* Stat row */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <OrchStat label="Total Tasks" value={st?.total ?? 0} sub="All time" icon={ListChecks} tone="brand" />
        <OrchStat label="Completed" value={st?.completed ?? 0} sub={`${st?.completedPct ?? 0}%`} icon={CheckCircle2} tone="emerald" />
        <OrchStat label="In Progress" value={st?.inProgress ?? 0} sub={`${st?.inProgressPct ?? 0}%`} icon={RefreshCw} tone="amber" />
        <OrchStat label="Waiting Approval" value={st?.waiting ?? 0} sub={`${st?.waitingPct ?? 0}%`} icon={Clock} tone="sky" />
        <OrchStat label="Failed / Blocked" value={st?.failed ?? 0} sub="0%" icon={XCircle} tone="rose" />
        <OrchStat label="Avg Completion" value={st?.avgCompletion ?? "—"} sub="Last 7 days" icon={Zap} tone="violet" />
      </Stagger>

      {/* Task table */}
      <FadeUp>
        <Panel title="Task Orchestration" sub="Create, assign and orchestrate tasks across your AI workforce">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="w-full pl-8 pr-3 h-9 rounded-lg bg-ink-950 border border-ink-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>
            <Select value={statusF} onChange={setStatusF} options={["All", "Waiting Approval", "In Progress", "Completed", "Failed/Blocked", "Pending"]} label="Status" />
            <Select value={deptF} onChange={setDeptF} options={depts} label="Departments" />
            <Select value={agentF} onChange={setAgentF} options={agentList} label="Agents" />
            <Select value={priorityF} onChange={setPriorityF} options={["All", "High", "Medium", "Low"]} label="Priorities" />
            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-ink-950 border border-ink-700 text-[11px] text-slate-400 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> Last 14 days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead><tr className="text-left text-[10px] uppercase text-slate-500 border-b border-ink-800">
                <th className="py-2 pr-3 font-semibold">Task</th>
                <th className="py-2 px-2 font-semibold">Description</th>
                <th className="py-2 px-2 font-semibold">Agent</th>
                <th className="py-2 px-2 font-semibold">Department</th>
                <th className="py-2 px-2 font-semibold">Priority</th>
                <th className="py-2 px-2 font-semibold">Status</th>
                <th className="py-2 px-2 font-semibold">Due Date</th>
                <th className="py-2 px-2 font-semibold">Impact</th>
                <th className="py-2 px-2 font-semibold text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-ink-800">
                {tasks.map((t, i) => {
                  const AIco = agentIco(t.agent);
                  return (
                  <tr key={t.id} className="hover:bg-ink-900/50 cursor-pointer" onClick={() => setSel(t)}>
                    <td className="py-2.5 pr-3 max-w-[230px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-ink-800 text-[10px] font-bold text-slate-400 grid place-items-center shrink-0">{i + 1}</span>
                        <StatusDot tone={statusDotTone(t.status) as "emerald"} pulse={t.status === "In Progress"} />
                        <span className="text-[12px] font-semibold text-slate-100 truncate">{t.task}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 max-w-[220px] text-[11px] text-slate-500"><span className="line-clamp-1">{t.description}</span></td>
                    <td className="py-2.5 px-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 whitespace-nowrap"><span className="w-5 h-5 rounded-md bg-brand-600/15 text-brand-300 grid place-items-center"><AIco className="w-3 h-3" /></span>{t.agent}</span></td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">{t.department}</td>
                    <td className="py-2.5 px-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(t.priority)}`}>{t.priority}</span></td>
                    <td className="py-2.5 px-2"><span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${statusTone(t.status)}`}><StatusDot tone={statusDotTone(t.status) as "emerald"} pulse={t.status === "In Progress"} /> {t.status}</span></td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400 whitespace-nowrap">{dateShort(t.dueDate)}</td>
                    <td className="py-2.5 px-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(t.impact)}`}>{t.impact}</span></td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {t.status === "Waiting Approval" || t.status === "In Progress" ? (
                          <button onClick={() => exec(t)} disabled={busyId === t.id} className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[10px] font-bold disabled:opacity-50">
                            {busyId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Fix
                          </button>
                        ) : null}
                        <button onClick={() => setSel(t)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setSel(t)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-white hover:bg-ink-800"><MoreVertical className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {tasks.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-slate-500 text-xs">No tasks match. The platform is healthy 🎉</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-ink-800">
            <span className="text-[11px] text-slate-500">Showing {tasks.length ? 1 : 0} to {tasks.length} of {data?.tasks.length ?? 0} tasks</span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-500 disabled:opacity-40" disabled><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span className="w-7 h-7 grid place-items-center rounded-lg bg-brand-600 text-white text-xs font-bold">1</span>
              <button className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-500 disabled:opacity-40" disabled><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </Panel>
      </FadeUp>

      {/* Flow view */}
      <FadeUp delay={0.04}>
        <Panel title="Task Orchestration Flow" sub="Visualize how tasks flow between agents and get completed"
          right={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-ink-950 border border-ink-700">
                {(["Flow View", "Timeline View"] as const).map((v) => (
                  <button key={v} onClick={() => setFlowView(v)} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${flowView === v ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>{v}</button>
                ))}
              </div>
              <button className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          }>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
            {(data?.flow || []).map((f, i) => {
              const FIco = agentIco(f.agent);
              return (
              <div key={f.agent} className="flex items-center gap-2 shrink-0">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className={`w-[185px] rounded-xl border p-3 ${f.status === "Waiting Approval" ? "border-sky-500/30 bg-sky-500/5" : f.status === "In Progress" ? "border-amber-500/30 bg-amber-500/5" : "border-ink-800 bg-ink-950/50"}`}>
                  <div className="flex items-center gap-1.5 mb-1.5"><span className="w-6 h-6 rounded-md bg-brand-600/20 text-brand-300 grid place-items-center"><FIco className="w-3.5 h-3.5" /></span><span className="text-[11px] font-bold text-white truncate">{f.agent}</span></div>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${statusTone(f.status)}`}><StatusDot tone={statusDotTone(f.status) as "emerald"} pulse={f.status === "In Progress"} /> {f.status}</span>
                  <div className="text-[11px] text-slate-300 mt-2 leading-snug">{f.step}</div>
                  <div className="mt-2 pt-2 border-t border-ink-800 text-[10px] text-slate-500">Output</div>
                  <div className="text-[11px] font-semibold text-slate-200 inline-flex items-center gap-1"><FileText className="w-3 h-3 text-brand-400" /> {f.output}</div>
                </motion.div>
                {i < (data?.flow.length || 0) - 1 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />}
              </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3 border-t border-ink-800/60">
            {([["Completed", "emerald"], ["In Progress", "amber"], ["Waiting Approval", "sky"], ["Pending", "slate"], ["Blocked", "rose"]] as const).map(([name, tone]) => (
              <span key={name} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><StatusDot tone={tone as "emerald"} /> {name}</span>
            ))}
          </div>
        </Panel>
      </FadeUp>

      {/* Automation / Triggers / Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FadeUp><Panel title="Automation Rules" sub="Rules that automatically trigger tasks">
          <ul className="space-y-2">
            {(data?.automationRules || []).map((r) => (
              <li key={r.rule} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2">
                <span className="text-[11px] text-slate-300 leading-snug">{r.rule}</span>
                <span className={`shrink-0 w-9 h-5 rounded-full grid items-center ${r.on ? "bg-emerald-500/80" : "bg-ink-700"} transition-colors`}><span className={`w-4 h-4 rounded-full bg-white transition-transform ${r.on ? "translate-x-4" : "translate-x-0.5"}`} /></span>
              </li>
            ))}
          </ul>
          <button className="mt-3 text-[11px] font-semibold text-brand-400 hover:underline inline-flex items-center gap-1"><Settings2 className="w-3 h-3" /> Manage Rules <ArrowRight className="w-3 h-3" /></button>
        </Panel></FadeUp>
        <FadeUp delay={0.04}><Panel title="Triggers" sub="Signals detected in the last 7 days">
          <ul className="space-y-2">
            {(data?.triggers || []).map((tr) => (
              <li key={tr.label} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-slate-300 inline-flex items-center gap-2"><CircleDot className="w-3 h-3 text-brand-400" /> {tr.label}</span>
                <span className="font-bold text-white tabular-nums"><AnimatedNumber value={tr.count} /></span>
              </li>
            ))}
          </ul>
          <button className="mt-3 text-[11px] font-semibold text-brand-400 hover:underline inline-flex items-center gap-1">View All Triggers <ArrowRight className="w-3 h-3" /></button>
        </Panel></FadeUp>
        <FadeUp delay={0.08}><Panel title="AI Recommendation" sub="Based on current data, the AI CEO recommends">
          <ul className="space-y-2.5">
            {(data?.recommendations || []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> {r}</li>
            ))}
          </ul>
          <button className="mt-3 text-[11px] font-semibold text-brand-400 hover:underline inline-flex items-center gap-1">View All Recommendations <ArrowRight className="w-3 h-3" /></button>
        </Panel></FadeUp>
      </div>

      {/* Completed tasks — real applied fixes with before → after diffs */}
      <FadeUp>
        <Panel title="Completed Tasks" sub="Fixes the AI workforce has applied — click a row to see exactly what changed" right={<span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{fixes.filter((f) => f.status === "Completed").length} applied</span>}>
          {fixes.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-slate-500">No completed fixes yet — approve a task above and it will land here with a full before → after diff.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-ink-800">
                    <th className="font-medium py-2 px-2">Task</th>
                    <th className="font-medium px-2">Page</th>
                    <th className="font-medium px-2">Agent</th>
                    <th className="font-medium px-2">What Changed</th>
                    <th className="font-medium px-2">Applied</th>
                    <th className="font-medium text-center px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fixes.slice(0, 12).map((f) => (
                    <tr key={f.id} onClick={() => setSelFix(f)} className="border-b border-ink-900/60 hover:bg-ink-800/30 cursor-pointer">
                      <td className="py-2.5 px-2"><div className="flex items-center gap-2"><CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${f.status === "Completed" ? "text-emerald-400" : "text-rose-400"}`} /><span className="text-slate-200 font-medium truncate max-w-[220px]">{f.task}</span></div></td>
                      <td className="px-2 text-slate-400 whitespace-nowrap">{f.path ? `/en${f.path === "/" ? "" : f.path}` : "—"}</td>
                      <td className="px-2 text-slate-300 whitespace-nowrap">{f.agent}</td>
                      <td className="px-2 text-slate-400 truncate max-w-[260px]">{f.fieldLabel ? `${f.fieldLabel}${f.changes[0] ? `: “${(f.changes[0].before || "(empty)").slice(0, 40)}” → “${f.changes[0].after.slice(0, 40)}”` : ""}` : f.result.slice(0, 80)}</td>
                      <td className="px-2 text-slate-500 whitespace-nowrap">{f.appliedAt ? dateShort(f.appliedAt) : "—"}</td>
                      <td className="px-2 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${f.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </FadeUp>

      {sel && <TaskDetails task={sel} busy={busyId === sel.id} onExec={() => exec(sel)} onClose={() => setSel(null)} />}
      {selFix && <FixDetails fix={selFix} onClose={() => setSelFix(null)} />}
    </div>
  );
}

function OrchStat({ label, value, sub, icon: Icon, tone }: { label: string; value: React.ReactNode; sub: string; icon: React.ElementType; tone: string }) {
  const tones: Record<string, string> = { brand: "text-brand-300", emerald: "text-emerald-300", amber: "text-amber-300", sky: "text-sky-300", rose: "text-rose-300", violet: "text-violet-300" };
  return (
    <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
      <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{label}</span><Icon className={`w-4 h-4 ${tones[tone]}`} /></div>
      <div className="mt-2 text-2xl font-extrabold text-white">{typeof value === "number" ? <AnimatedNumber value={value} /> : value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </Item>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="appearance-none h-9 pl-3 pr-7 rounded-lg bg-ink-950 border border-ink-700 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40">
        {options.map((o) => <option key={o} value={o}>{o === "All" ? `All ${label}` : o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
    </div>
  );
}

function TaskDetails({ task, busy, onExec, onClose }: { task: OrchTask; busy: boolean; onExec: () => void; onClose: () => void }) {
  const doneCount = task.subtasks.filter((s) => s.done).length;
  const canFix = task.status === "Waiting Approval" || task.status === "In Progress";
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 460 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2 border-b border-ink-800 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactTone(task.priority)}`}>{task.priority} Priority</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusTone(task.status)}`}>{task.status}</span>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div>
            <h3 className="text-base font-bold text-white">{task.task}</h3>
            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{task.description}</p>
            {task.path && (
              <a href={task.link || "#"} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:underline">
                <Globe className="w-3 h-3" /> {task.page ? `${task.page} — ` : ""}/en{task.path === "/" ? "" : task.path} <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
          {task.reason && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300/90 mb-1">Why this matters</div>
              <p className="text-[12px] text-slate-300 leading-relaxed">{task.reason}</p>
            </div>
          )}
          {task.plan && task.plan.length > 0 && (
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-brand-300/90 mb-1.5">What the agent will do</div>
              <ol className="space-y-1.5">
                {task.plan.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300 leading-snug">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-brand-500/20 text-brand-300 grid place-items-center text-[9px] font-bold mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Field label="Assigned Agent" value={task.agent} />
            <Field label="Department" value={task.department} />
            <Field label="Due Date" value={dateTime(task.dueDate)} />
            <Field label="Priority" value={task.priority} />
            <Field label="Impact" value={task.impact} />
            <Field label="Estimated Time" value={`${Math.max(2, task.subtasks.length)} – ${task.subtasks.length + 2} hrs`} />
            <Field label="Confidence" value={`${task.confidence}%`} />
            <Field label="Subtasks" value={`${doneCount}/${task.subtasks.length}`} />
          </div>
          {task.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-bold text-slate-300">Subtasks</span><span className="text-[10px] text-slate-500">{Math.round((doneCount / task.subtasks.length) * 100)}%</span></div>
              <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden mb-3"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${(doneCount / task.subtasks.length) * 100}%` }} transition={{ duration: 0.8 }} /></div>
              <ul className="space-y-2">
                {task.subtasks.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12px]">
                    {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <CircleDot className="w-4 h-4 text-slate-600 shrink-0" />}
                    <span className={s.done ? "text-slate-400 line-through" : "text-slate-200"}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {task.output && (
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] text-slate-500 mb-1">Output</div><div className="text-[12px] text-slate-200">{task.output}</div></div>
          )}
        </div>
        <div className="p-3 border-t border-ink-800 shrink-0 space-y-2">
          {canFix && (
            <button onClick={onExec} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Approve &amp; Auto-fix
            </button>
          )}
          <div className="grid grid-cols-3 gap-2">
            {task.link ? (
              <a href={task.link} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center justify-center gap-1 py-2 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:bg-ink-800"><FileBarChart2 className="w-4 h-4" /> View Output</a>
            ) : (
              <button className="inline-flex flex-col items-center justify-center gap-1 py-2 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:bg-ink-800"><FileBarChart2 className="w-4 h-4" /> View Output</button>
            )}
            <button onClick={() => setChatOpen(true)} className="inline-flex flex-col items-center justify-center gap-1 py-2 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:bg-ink-800"><MessageSquare className="w-4 h-4" /> Send Message</button>
            <button onClick={onClose} className="inline-flex flex-col items-center justify-center gap-1 py-2 rounded-lg border border-rose-500/30 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/10"><XCircle className="w-4 h-4" /> Cancel Task</button>
          </div>
        </div>
      </motion.div>
      {chatOpen && <TaskChat task={task} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

// Drawer for a completed fix — the full before → after diff, what page it
// changed and a link straight to the live page so the change can be verified.
function FixDetails({ fix, onClose }: { fix: CompletedFix; onClose: () => void }) {
  const pagePath = fix.path ? `/en${fix.path === "/" ? "" : fix.path}` : "";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 460 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2 border-b border-ink-800 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${fix.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{fix.status}</span>
          {fix.fieldLabel && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">{fix.fieldLabel}</span>}
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div>
            <h3 className="text-base font-bold text-white">{fix.task}</h3>
            {fix.detail && <p className="text-[12px] text-slate-400 mt-1 leading-relaxed whitespace-pre-line">{fix.detail}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Field label="Fixed By" value={fix.agent} />
            <Field label="Department" value={fix.department} />
            <Field label="Page" value={pagePath || "—"} />
            <Field label="Applied" value={fix.appliedAt ? dateTime(fix.appliedAt) : "—"} />
          </div>
          {fix.changes.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-2">What changed</div>
              <div className="space-y-3">
                {fix.changes.map((c, i) => (
                  <div key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{c.field}</div>
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
                      <div className="text-[9px] font-bold uppercase text-rose-300/80 mb-1">Before</div>
                      <div className="text-[12px] text-slate-300 leading-relaxed break-words">{c.before || <span className="text-slate-600 italic">(empty — the tag was missing)</span>}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <div className="text-[9px] font-bold uppercase text-emerald-300/80 mb-1">After</div>
                      <div className="text-[12px] text-slate-200 leading-relaxed break-words">{c.after}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {fix.result && (
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
              <div className="text-[10px] text-slate-500 mb-1">Result</div>
              <div className="text-[12px] text-slate-200 leading-relaxed">{fix.result}</div>
            </div>
          )}
        </div>
        {(pagePath || fix.url) && (
          <div className="p-3 border-t border-ink-800 shrink-0">
            <a href={pagePath ? `${PUBLIC_SITE}${pagePath}` : fix.url} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold">
              <Globe className="w-4 h-4" /> View the fixed page <ArrowRight className="w-4 h-4" />
            </a>
            <p className="mt-1.5 text-center text-[10px] text-slate-500">Opens {pagePath || fix.url} — the change is live in the page&apos;s &lt;head&gt; within ~60s.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TaskChat({ task, onClose }: { task: OrchTask; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: "founder" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: "founder", text: t }]);
    setInput(""); setBusy(true);
    try { const r = await taskChat(task, t, history); setMsgs((m) => [...m, { role: "agent", text: r.text }]); }
    catch { setMsgs((m) => [...m, { role: "agent", text: "Javobni hozir olib bo'lmadi — LLM kaliti/kvotasini tekshiring." }]); }
    finally { setBusy(false); }
  };

  // Auto-ask the full explanation as soon as the chat opens.
  useEffect(() => {
    if (started.current) return; started.current = true;
    send("Bu masala bo'yicha tushuntir: aynan nima bo'ldi, nega yuz berdi, biznesga ta'siri qanaqa, va nima tavsiya qilasan?");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quick = ["Nega yuz berdi?", "Biznesga ta'siri qanaqa?", "Qanday tuzatamiz?", "Auto-fix ishlaydimi?"];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-ink-800 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><Sparkles className="w-4 h-4 text-white" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-white truncate">{task.agent}</div><div className="text-[10px] text-slate-500 truncate">Discussing: {task.task}</div></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-[11px] text-slate-400"><span className="font-semibold text-slate-300">{task.task}</span> · {task.department} · {task.priority} priority · {task.status}</div>
          {msgs.map((m, i) => (
            m.role === "founder" ? (
              <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5" /></span>
                <div className="min-w-0 rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed prose-chat" dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} />
              </div>
            )
          ))}
          {busy && <div className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">{task.agent} javob yozyapti…</div></div>}
          <div ref={endRef} />
        </div>

        {msgs.length > 0 && (
          <div className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0">
            {quick.map((p) => <button key={p} disabled={busy} onClick={() => send(p)} className="text-[11px] px-2.5 py-1 rounded-full border border-ink-700 text-slate-300 hover:bg-ink-800 hover:border-brand-400 disabled:opacity-50">{p}</button>)}
          </div>
        )}

        <div className="p-3 border-t border-ink-800 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder={`${task.agent}dan shu masala haqida so'rang…`} className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none max-h-32" />
            <button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 shrink-0"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-2.5"><div className="text-[10px] text-slate-500">{label}</div><div className="text-[12px] font-semibold text-white mt-0.5">{value}</div></div>;
}

/* --------------------------- Site Audit (24/7) --------------------------- */

const sevTone = (s: string) => (s === "high" ? "bg-rose-500/15 text-rose-300" : s === "warn" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");
const scoreColor = (n: number) => (n >= 90 ? "text-emerald-400" : n >= 70 ? "text-amber-400" : "text-rose-400");
const scoreBar = (n: number) => (n >= 90 ? "from-emerald-500 to-emerald-400" : n >= 70 ? "from-amber-500 to-amber-400" : "from-rose-500 to-rose-400");

function SiteAudit() {
  const [audit, setAudit] = useState<CeoAuditSnapshot | null>(null);
  const [proposals, setProposals] = useState<CeoProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useMemo(() => async () => {
    const d = await getCeoAudit().catch(() => null);
    if (d) { setAudit(d.audit); setProposals(d.proposals); }
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const d = await runCeoAudit();
      setAudit(d.audit); setProposals(d.proposals);
      setToast("✓ Full site scanned — audit refreshed.");
    } catch { setToast("Audit failed — check the backend."); }
    finally { setRunning(false); setTimeout(() => setToast(""), 4000); }
  };

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const r = action === "approve" ? await approveCeoProposal(id) : await rejectCeoProposal(id);
      setProposals((p) => p.filter((x) => x._id !== id));
      setToast(action === "approve" ? `✓ Applied: ${r.proposal.result || r.proposal.title}` : "Rejected.");
    } catch (e) { setToast(`Failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setBusyId(null); setTimeout(() => setToast(""), 5000); }
  };

  const byKind = new Map(proposals.map((p) => [p.kind, p]));

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {toast && <FadeUp><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">{toast}</div></FadeUp>}

      {/* Header: overall health + report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <FadeUp className="lg:col-span-4">
          <Panel>
            <div className="flex items-center gap-4">
              <HealthRing score={audit?.overallScore ?? 0} label={`${audit?.issueCount ?? 0} issues`} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">Site Health (24/7)</div>
                <div className="text-[11px] text-slate-500 mt-1">Last scan: {audit ? rel(audit.createdAt) : "—"}</div>
                <div className="text-[11px] text-slate-500">{audit?.pages.length ?? 0} pages monitored · {proposals.length} fixes awaiting approval</div>
                <button onClick={runNow} disabled={running} className="mt-2 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[11px] font-bold disabled:opacity-50">
                  {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Scan Now
                </button>
              </div>
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.04} className="lg:col-span-8">
          <Panel title="AI CEO Daily Report" sub={audit?._ai ? "Written by the AI CEO from today's full-site audit" : "Heuristic summary (add an LLM key for the full report)"}>
            <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">{audit?.report || "No report yet — run a scan."}</p>
          </Panel>
        </FadeUp>
      </div>

      {/* Pages */}
      <FadeUp>
        <Panel title="Page-by-Page Audit" sub="Every public page, scored against its live data">
          <div className="space-y-2">
            {(audit?.pages || []).map((p) => {
              const isOpen = open === p.path;
              return (
                <div key={p.path} className="rounded-xl border border-ink-800 bg-ink-950/40 overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : p.path)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-ink-900/50">
                    <Globe className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white">{p.title} <span className="text-[10px] font-normal text-slate-500 ml-1">{p.path}</span></div>
                      <div className="mt-1.5 h-1.5 w-full max-w-[280px] rounded-full bg-ink-800 overflow-hidden">
                        <motion.div className={`h-full bg-gradient-to-r ${scoreBar(p.score)}`} initial={{ width: 0 }} animate={{ width: `${p.score}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold tabular-nums ${scoreColor(p.score)}`}>{p.score}<span className="text-[10px] text-slate-600">/100</span></span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.issues.length ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{p.issues.length ? `${p.issues.length} issue${p.issues.length > 1 ? "s" : ""}` : "Healthy"}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-ink-800 px-3.5 py-3 space-y-2.5">
                      {p.issues.length === 0 && <div className="text-[12px] text-emerald-300 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No problems detected on this page.</div>}
                      {p.issues.map((i) => {
                        const prop = byKind.get(i.kind);
                        return (
                          <div key={i.kind} className="flex items-start gap-2.5">
                            <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${sevTone(i.severity)}`}>{i.severity.toUpperCase()}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-semibold text-slate-100">{i.title}</div>
                              <div className="text-[11px] text-slate-500 leading-snug">{i.detail}</div>
                            </div>
                            {prop && (
                              <button onClick={() => decide(prop._id, "approve")} disabled={busyId === prop._id} className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[10px] font-bold disabled:opacity-50">
                                {busyId === prop._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {prop.fixType ? "Approve & Fix" : "Acknowledge"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </FadeUp>

      {/* Proposal queue */}
      <FadeUp delay={0.04}>
        <Panel title="Fix Proposals" sub="Approve and the AI CEO applies the change immediately" right={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">{proposals.length}</span>}>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <li key={p._id} className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                <span className={`mt-0.5 w-8 h-8 rounded-lg grid place-items-center shrink-0 ${p.fixType ? "bg-brand-600/15 text-brand-300" : "bg-amber-500/15 text-amber-300"}`}>{p.fixType ? <Wand2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white">{p.title}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{p.detail}</div>
                  <div className="text-[10px] text-slate-600 mt-1">{p.page} · {p.fixType ? "Auto-executable" : "Manual (opens admin)"}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(p._id, "approve")} disabled={busyId === p._id} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50">
                    {busyId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                  </button>
                  <button onClick={() => decide(p._id, "reject")} disabled={busyId === p._id} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800 disabled:opacity-50">
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              </li>
            ))}
            {proposals.length === 0 && <li className="rounded-xl border border-dashed border-ink-800 p-8 text-center text-xs text-slate-500">No pending proposals — the site is in good shape. 🎉</li>}
          </ul>
        </Panel>
      </FadeUp>
    </div>
  );
}

const PUBLIC_SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae";

function PageBuilder() {
  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [sel, setSel] = useState<LandingPageFull | null>(null);
  const [kw, setKw] = useState("");
  const [instr, setInstr] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [loadingSel, setLoadingSel] = useState(false);
  const [toast, setToast] = useState("");

  const refresh = useMemo(() => async () => { const d = await listLandingPages().catch(() => null); if (d) setPages(d.pages); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const note = (t: string, ms = 4500) => { setToast(t); setTimeout(() => setToast(""), ms); };

  const pick = async (id: string) => { setLoadingSel(true); try { const d = await getLandingPageById(id); setSel(d.page); } catch { /* ignore */ } finally { setLoadingSel(false); } };
  const generate = async () => {
    const k = kw.trim(); if (!k || genBusy) return; setGenBusy(true);
    try { const r = await generateLandingPage(k); setKw(""); setSel(r.page); await refresh(); note(`✓ Draft created${r.ai ? " (AI-written)" : " (template — add an LLM key for AI copy)"} — preview, edit, then publish.`, 6000); }
    catch (e) { note(`Failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setGenBusy(false); }
  };
  const applyEdit = async () => {
    const i = instr.trim(); if (!i || !sel || editBusy) return; setEditBusy(true);
    try { const r = await editLandingPageAI(sel._id, i); setSel(r.page); setInstr(""); note("✓ Page updated by the SEO Agent."); }
    catch (e) { note(`Edit failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setEditBusy(false); }
  };
  const publish = async () => {
    if (!sel || pubBusy) return; setPubBusy(true);
    try { const r = await publishLandingPage(sel._id); setSel(r.page); await refresh(); note(`✓ Live at /${r.page.locale}/${r.page.slug} — added to the sitemap.`, 6000); }
    catch (e) { note(`Publish failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setPubBusy(false); }
  };

  return (
    <FadeUp>
      <Panel title="SEO Agent · Page Builder" sub="Type a keyword → the agent writes a full landing page. Preview it live, tell the agent what to change, then publish to /en/<slug> (sitemap + real provider data baked in).">
        {toast && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{toast}</div>}
        <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1"><Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. luxury yacht rental dubai" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-9 pr-3 h-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
          <button type="submit" disabled={genBusy || !kw.trim()} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-bold disabled:opacity-50 shrink-0">{genBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Build Page</button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-600 font-semibold">Pages ({pages.length})</div>
            {pages.length === 0 && <div className="text-[11px] text-slate-500">No pages yet — build one above.</div>}
            {pages.map((p) => (
              <button key={p._id} onClick={() => pick(p._id)} className={`w-full text-left rounded-lg border px-2.5 py-2 ${sel?._id === p._id ? "border-brand-500 bg-ink-900/60" : "border-ink-800 hover:bg-ink-900/40"}`}>
                <div className="text-[11px] font-bold text-white truncate">{p.heroTitle}</div>
                <div className="flex items-center gap-1.5 mt-0.5"><span className="text-[9px] text-slate-600 truncate flex-1">/{p.locale}/{p.slug}</span><span className={`text-[8px] font-bold px-1 rounded ${p.status === "Published" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{p.status}</span></div>
              </button>
            ))}
          </div>

          <div>
            {loadingSel ? <div className="grid place-items-center py-16 text-slate-600"><Loader2 className="w-6 h-6 animate-spin" /></div>
              : !sel ? <div className="rounded-xl border border-dashed border-ink-800 py-16 text-center text-[12px] text-slate-500">Build a page or pick one to preview &amp; edit it.</div>
                : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sel.status === "Published" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{sel.status}</span>
                      <span className="text-[11px] text-slate-500">/{sel.locale}/{sel.slug}</span>
                      <div className="ml-auto flex gap-2">
                        {sel.status === "Published" && <a href={`${PUBLIC_SITE}/${sel.locale}/${sel.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800">Open live <ArrowRight className="w-3 h-3" /></a>}
                        <button onClick={publish} disabled={pubBusy} className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50">{pubBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}{sel.status === "Published" ? "Re-publish" : "Publish live"}</button>
                      </div>
                    </div>

                    {/* LIVE PREVIEW */}
                    <div className="rounded-xl border border-ink-800 bg-white overflow-hidden max-h-[460px] overflow-y-auto">
                      <div className="bg-gradient-to-br from-blue-600 to-violet-700 text-white p-5">
                        <div className="text-[10px] uppercase tracking-wide text-white/70">Live preview</div>
                        <h1 className="text-2xl font-extrabold mt-1 leading-tight">{sel.heroTitle}</h1>
                        {sel.heroSubtitle && <p className="text-sm font-semibold text-white/90 mt-1.5">{sel.heroSubtitle}</p>}
                        {sel.heroIntro && <p className="text-[12px] text-white/80 mt-2 leading-relaxed">{sel.heroIntro}</p>}
                      </div>
                      <div className="p-5 space-y-4">
                        {sel.sections.map((s, i) => (<div key={i}><h2 className="text-base font-bold text-slate-900">{s.heading}</h2><p className="text-[13px] text-slate-600 mt-1 leading-relaxed">{s.body}</p></div>))}
                        {sel.faq.length > 0 && <div><h2 className="text-base font-bold text-slate-900 mb-2">FAQ</h2><div className="space-y-2">{sel.faq.map((f, i) => (<div key={i}><div className="text-[13px] font-semibold text-slate-900">{f.q}</div><div className="text-[12px] text-slate-600 mt-0.5">{f.a}</div></div>))}</div></div>}
                        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">+ on the real page: provider comparison, top options &amp; market stats — all live from the DB.</div>
                      </div>
                    </div>

                    {/* AI EDIT */}
                    <form onSubmit={(e) => { e.preventDefault(); applyEdit(); }} className="flex items-center gap-2">
                      <div className="relative flex-1"><Wand2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={'Tell the agent what to change — e.g. "make the hero punchier" or "rewrite section 2 about prices"'} className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-9 pr-3 h-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500" /></div>
                      <button type="submit" disabled={editBusy || !instr.trim()} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-bold disabled:opacity-50 shrink-0">{editBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Apply edit</button>
                    </form>
                  </div>
                )}
          </div>
        </div>
      </Panel>
    </FadeUp>
  );
}

function SeoAudit() {
  const [audit, setAudit] = useState<SeoAuditSnapshot | null>(null);
  const [proposals, setProposals] = useState<CeoProposalItem[]>([]);
  const [fixed, setFixed] = useState<CompletedFix[]>([]);
  const [selFix, setSelFix] = useState<CompletedFix | null>(null);
  const [base, setBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useMemo(() => async () => {
    const d = await getCeoSeo().catch(() => null);
    if (d) { setAudit(d.audit); setProposals(d.proposals); setFixed(d.fixed || []); setBase(d.base); }
  }, []);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const d = await runCeoSeo();
      setAudit(d.audit); setProposals(d.proposals); setFixed(d.fixed || []); setBase(d.base);
      setToast(d.audit.crawled > 0 ? `✓ Crawled ${d.audit.crawled} routes — SEO audit refreshed.` : `⚠ 0 routes reachable — is the public site running at ${d.base}?`);
    } catch { setToast("Crawl failed — is the site reachable from the backend?"); }
    finally { setRunning(false); setTimeout(() => setToast(""), 6000); }
  };

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const r = action === "approve" ? await approveCeoProposal(id) : await rejectCeoProposal(id);
      setToast(action === "approve" ? `✓ ${r.proposal.result || "Applied"}` : "Dismissed.");
      await load(); // refresh issue states + the Fixed Issues feed
    } catch (e) { setToast(`Failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setBusyId(null); setTimeout(() => setToast(""), 6000); }
  };

  // Open the diff drawer for an already-fixed issue straight from its row.
  const openFixFor = (i: SeoIssue, pageTitle: string, path: string) => {
    if (!i.fix) return;
    setSelFix({
      id: i.proposalId || i.kind, task: i.title, detail: i.detail, page: pageTitle, path,
      url: i.fix.url, agent: "SEO Agent", department: "Growth", severity: i.severity,
      status: "Completed", result: i.fix.result, appliedAt: i.fix.appliedAt,
      check: "", fieldLabel: i.fix.fieldLabel, changes: i.fix.changes,
    });
  };

  const byKind = new Map(proposals.map((p) => [p.kind, p]));
  const allUnreachable = !!audit && (audit.crawled ?? 0) === 0 && (audit.pages || []).length > 0;

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {toast && <FadeUp><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">{toast}</div></FadeUp>}
      {allUnreachable && (
        <FadeUp>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">The public site was not running during the last crawl.</div>
              <div className="mt-0.5 text-amber-200/80">All {audit?.pages.length} routes came back unreachable because <span className="font-mono">{base || audit?.baseUrl}</span> did not respond. Start the public frontend (<span className="font-mono">frontend → npm run dev</span>, port 3000), then hit <b>Crawl Now</b> — the audit will re-grade every route from its live &lt;head&gt;.</div>
            </div>
          </div>
        </FadeUp>
      )}

      <PageBuilder />

      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <FadeUp className="lg:col-span-4">
          <Panel>
            <div className="flex items-center gap-4">
              <HealthRing score={audit?.overallScore ?? 0} label={`${audit?.issueCount ?? 0} issues`} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">On-Page SEO</div>
                <div className="text-[11px] text-slate-500 mt-1">Last crawl: {audit ? rel(audit.createdAt) : "—"}</div>
                <div className="text-[11px] text-slate-500">{audit?.crawled ?? 0} routes crawled{audit?.unreachable ? ` · ${audit.unreachable} unreachable` : ""}</div>
                <div className="text-[10px] text-slate-600 truncate">{base || audit?.baseUrl}</div>
                <button onClick={runNow} disabled={running} className="mt-2 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[11px] font-bold disabled:opacity-50">
                  {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Crawl Now
                </button>
              </div>
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.04} className="lg:col-span-8">
          <Panel title="AI CEO SEO Report" sub={audit?._ai ? "Written by the AI CEO from today's per-route crawl" : "Heuristic summary (add an LLM key for the full report + title/meta rewrites)"}>
            <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">{audit?.report || "No SEO crawl yet — run one."}</p>
          </Panel>
        </FadeUp>
      </div>

      {/* Routes */}
      <FadeUp>
        <Panel title="Route-by-Route SEO" sub="Every public route, crawled and graded on its live <head>">
          <div className="space-y-2">
            {(audit?.pages || []).map((p) => {
              const isOpen = open === p.path;
              const reachable = p.signals?.ok !== false;
              return (
                <div key={p.path} className="rounded-xl border border-ink-800 bg-ink-950/40 overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : p.path)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-ink-900/50">
                    <Globe className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white">{p.title} <span className="text-[10px] font-normal text-slate-500 ml-1">{p.path}</span></div>
                      <div className="mt-1.5 h-1.5 w-full max-w-[280px] rounded-full bg-ink-800 overflow-hidden">
                        <motion.div className={`h-full bg-gradient-to-r ${scoreBar(p.score)}`} initial={{ width: 0 }} animate={{ width: `${p.score}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold tabular-nums ${scoreColor(p.score)}`}>{p.score}<span className="text-[10px] text-slate-600">/100</span></span>
                    {reachable
                      ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.issues.length ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{p.issues.length ? `${p.issues.length} issue${p.issues.length > 1 ? "s" : ""}` : "Clean"}</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">Unreachable</span>}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-ink-800 px-3.5 py-3 space-y-2.5">
                      {reachable && p.issues.length === 0 && <div className="text-[12px] text-emerald-300 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No SEO problems on this route.</div>}
                      {reachable && (p.signals?.title || p.signals?.canonical) && (
                        <div className="text-[10px] text-slate-500 space-y-0.5">
                          {p.signals?.title && <div className="truncate"><span className="text-slate-600">title:</span> {p.signals.title}</div>}
                          {p.signals?.canonical && <div className="truncate"><span className="text-slate-600">canonical:</span> {p.signals.canonical}</div>}
                        </div>
                      )}
                      {p.issues.map((i) => {
                        const prop = byKind.get(i.kind);
                        const isFixed = i.proposalStatus === "applied" && !!i.fix;
                        return (
                          <div key={i.kind} className="rounded-xl border border-ink-800/80 bg-ink-900/40 p-3 space-y-2">
                            <div className="flex items-start gap-2.5">
                              <span className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${sevTone(i.severity)}`}>{i.severity.toUpperCase()}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-semibold text-slate-100">{i.title}</div>
                                <div className="text-[11px] text-slate-500 leading-snug">{i.detail}</div>
                              </div>
                              {isFixed ? (
                                <button onClick={() => openFixFor(i, p.title, p.path)} className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25">
                                  <CheckCircle2 className="w-3 h-3" /> Fixed — view diff
                                </button>
                              ) : i.proposalStatus === "failed" ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold"><XCircle className="w-3 h-3" /> Failed</span>
                              ) : i.proposalStatus === "applied" ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-ink-800 border border-ink-700 text-slate-400 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" /> Acknowledged</span>
                              ) : prop ? (
                                <button onClick={() => decide(prop._id, "approve")} disabled={busyId === prop._id} className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[10px] font-bold disabled:opacity-50">
                                  {busyId === prop._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Approve &amp; Auto-fix
                                </button>
                              ) : null}
                            </div>
                            {i.why && (
                              <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-2.5 py-2">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-amber-300/90 mb-0.5">Why this matters</div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">{i.why}</p>
                              </div>
                            )}
                            {i.plan && i.plan.length > 0 && !isFixed && (
                              <div className="rounded-lg border border-brand-500/15 bg-brand-500/5 px-2.5 py-2">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-brand-300/90 mb-1">What the agent will do</div>
                                <ol className="space-y-1">
                                  {i.plan.map((s, si) => (
                                    <li key={si} className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-snug">
                                      <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-brand-500/20 text-brand-300 grid place-items-center text-[8px] font-bold mt-0.5">{si + 1}</span>
                                      {s}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {i.recommend && !isFixed && <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 font-mono break-words">→ {i.recommend}</div>}
                            {isFixed && i.fix && (
                              <div className="text-[11px] text-emerald-300/90 bg-emerald-500/5 border border-emerald-500/15 rounded px-2 py-1.5 leading-snug">{i.fix.result}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {(audit?.pages || []).length === 0 && <div className="rounded-xl border border-dashed border-ink-800 p-8 text-center text-xs text-slate-500">No SEO crawl yet — hit “Crawl Now”.</div>}
          </div>
        </Panel>
      </FadeUp>

      {/* Recommendation queue */}
      <FadeUp delay={0.04}>
        <Panel title="SEO Recommendations" sub="Concrete fixes per route — acknowledge to clear, reject to dismiss" right={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">{proposals.length}</span>}>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <li key={p._id} className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                <span className={`mt-0.5 w-8 h-8 rounded-lg grid place-items-center shrink-0 ${sevTone(p.severity)}`}><AlertTriangle className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white">{p.title} <span className="text-[10px] font-normal text-slate-500 ml-1">{p.path}</span></div>
                  <div className="text-[11px] text-slate-500 leading-snug whitespace-pre-wrap">{p.detail}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(p._id, "approve")} disabled={busyId === p._id} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[11px] font-bold disabled:opacity-50">
                    {busyId === p._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Approve &amp; Auto-fix
                  </button>
                  <button onClick={() => decide(p._id, "reject")} disabled={busyId === p._id} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800 disabled:opacity-50">
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              </li>
            ))}
            {proposals.length === 0 && <li className="rounded-xl border border-dashed border-ink-800 p-8 text-center text-xs text-slate-500">No SEO recommendations pending. 🎉</li>}
          </ul>
        </Panel>
      </FadeUp>

      {/* Fixed issues — every applied SEO fix with its before → after diff */}
      <FadeUp>
        <Panel title="Fixed Issues" sub="SEO fixes the agent has applied — click a row for the full before → after diff" right={<span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{fixed.filter((f) => f.status === "Completed").length} applied</span>}>
          {fixed.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-slate-500">Nothing fixed yet — approve an issue above and it lands here with the exact change.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-ink-800">
                    <th className="font-medium py-2 px-2">Issue</th>
                    <th className="font-medium px-2">Page</th>
                    <th className="font-medium px-2">What Changed</th>
                    <th className="font-medium px-2">Applied</th>
                    <th className="font-medium text-center px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fixed.slice(0, 15).map((f) => (
                    <tr key={f.id} onClick={() => setSelFix(f)} className="border-b border-ink-900/60 hover:bg-ink-800/30 cursor-pointer">
                      <td className="py-2.5 px-2"><div className="flex items-center gap-2"><CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${f.status === "Completed" ? "text-emerald-400" : "text-rose-400"}`} /><span className="text-slate-200 font-medium truncate max-w-[220px]">{f.task}</span></div></td>
                      <td className="px-2 text-slate-400 whitespace-nowrap">{f.path ? `/en${f.path === "/" ? "" : f.path}` : "—"}</td>
                      <td className="px-2 text-slate-400 truncate max-w-[280px]">{f.fieldLabel ? `${f.fieldLabel}${f.changes[0] ? `: “${(f.changes[0].before || "(empty)").slice(0, 38)}” → “${f.changes[0].after.slice(0, 38)}”` : ""}` : f.result.slice(0, 90)}</td>
                      <td className="px-2 text-slate-500 whitespace-nowrap">{f.appliedAt ? dateShort(f.appliedAt) : "—"}</td>
                      <td className="px-2 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${f.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </FadeUp>

      {selFix && <FixDetails fix={selFix} onClose={() => setSelFix(null)} />}
    </div>
  );
}

const DEPT_TONE: Record<string, string> = {
  Executive: "bg-amber-500/15 text-amber-300",
  Growth: "bg-violet-500/15 text-violet-300",
  Marketplace: "bg-sky-500/15 text-sky-300",
};
const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  Active: { dot: "bg-emerald-400", text: "text-emerald-400" },
  Busy: { dot: "bg-amber-400", text: "text-amber-400" },
  Waiting: { dot: "bg-sky-400", text: "text-sky-400" },
  Idle: { dot: "bg-slate-500", text: "text-slate-400" },
  Error: { dot: "bg-rose-500", text: "text-rose-400" },
};
const TONE_BG: Record<string, string> = {
  brand: "bg-brand-600/15 text-brand-300", emerald: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300", sky: "bg-sky-500/15 text-sky-300",
  violet: "bg-violet-500/15 text-violet-300", rose: "bg-rose-500/15 text-rose-300",
};

function FilterPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg border border-ink-700 text-[10px] text-slate-400 whitespace-nowrap"><Icon className="w-3 h-3" />{label}</span>;
}

function WfTimeline({ data }: { data: Workforce["timeline"] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 6, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="#1e293b" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#94a3b8" }} />
        <Line type="monotone" dataKey="actions" name="Actions" stroke="#a78bfa" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="success" name="Success" stroke="#34d399" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="failed" name="Failed" stroke="#fb7185" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const AGENT_STATUS_TONE: Record<string, { dot: string; text: string }> = {
  Active: { dot: "bg-emerald-400", text: "text-emerald-400" },
  Idle: { dot: "bg-slate-500", text: "text-slate-400" },
};

const WF_STATE_TONE: Record<string, { dot: string; text: string; chip: string }> = {
  Active: { dot: "bg-emerald-400", text: "text-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  Busy: { dot: "bg-amber-400", text: "text-amber-400", chip: "bg-amber-500/15 text-amber-300" },
  Idle: { dot: "bg-slate-400", text: "text-slate-400", chip: "bg-slate-500/15 text-slate-300" },
  Waiting: { dot: "bg-sky-400", text: "text-sky-400", chip: "bg-sky-500/15 text-sky-300" },
  Error: { dot: "bg-rose-400", text: "text-rose-400", chip: "bg-rose-500/15 text-rose-300" },
  Paused: { dot: "bg-slate-500", text: "text-slate-500", chip: "bg-slate-600/20 text-slate-400" },
};
function Spark({ data, color = "#34d399" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-7" />;
  const w = 100, h = 24, min = Math.min(...data), max = Math.max(...data), sp = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / sp) * (h - 3) - 1.5}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></svg>;
}

function AgentManagement() {
  const [wf, setWf] = useState<Workforce | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState("ceo");
  const [subTab, setSubTab] = useState<"Overview" | "Capabilities" | "Performance" | "Activity Log">("Overview");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All Status");
  const [deptF, setDeptF] = useState("All Departments");
  const [msgAgent, setMsgAgent] = useState<WfAgent | null>(null);
  const [assignAgent, setAssignAgent] = useState<WfAgent | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [note, setNote] = useState("");

  const load = () => getWorkforce().then(setWf).catch(() => {});
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);

  if (loading || !wf) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const meta = (id: string) => AGENTS.find((a) => a.id === id);
  const sa = wf.agents.find((a) => a.id === sel) || wf.agents[0];
  const sm = meta(sa.id);
  const SelIcon = (sm && AGENT_ICONS[sm.icon]) || Sparkles;
  const ss = wf.agentStateSummary;
  const stateOf = (a: WfAgent) => a.state || a.status;
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 2600); };

  const rows = wf.agents.filter((a) => {
    if (statusF !== "All Status" && stateOf(a) !== statusF) return false;
    if (deptF !== "All Departments" && a.dept !== deptF) return false;
    if (q && !(`${a.name || a.id} ${meta(a.id)?.role || ""} ${a.currentTask}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const pct = (n: number) => ss && ss.total ? `${Math.round((n / ss.total) * 100)}%` : "0%";
  const cards: { label: string; value: number; sub: string; icon: React.ElementType; tone: string }[] = [
    { label: "Total Agents", value: ss?.total ?? wf.summary.total, sub: "All workforce", icon: Cpu, tone: "brand" },
    { label: "Active Agents", value: ss?.online ?? 0, sub: pct(ss?.online ?? 0), icon: CheckCircle2, tone: "emerald" },
    { label: "Busy", value: ss?.busy ?? 0, sub: pct(ss?.busy ?? 0), icon: Zap, tone: "amber" },
    { label: "Idle", value: ss?.idle ?? 0, sub: pct(ss?.idle ?? 0), icon: Clock, tone: "sky" },
    { label: "Waiting", value: ss?.waiting ?? 0, sub: pct(ss?.waiting ?? 0), icon: Pause, tone: "violet" },
    { label: "Error", value: ss?.error ?? 0, sub: pct(ss?.error ?? 0), icon: AlertTriangle, tone: "rose" },
  ];

  const loadSeg = ss ? [
    { pct: (ss.high / Math.max(1, ss.total)) * 100, color: "#fb7185", label: "High (70-100%)", count: ss.high },
    { pct: (ss.medium / Math.max(1, ss.total)) * 100, color: "#fbbf24", label: "Medium (40-69%)", count: ss.medium },
    { pct: (ss.low / Math.max(1, ss.total)) * 100, color: "#38bdf8", label: "Low (1-39%)", count: ss.low },
    { pct: (ss.idleLoad / Math.max(1, ss.total)) * 100, color: "#64748b", label: "Idle (0%)", count: ss.idleLoad },
  ] : [];

  const doAssign = async (id: string, title: string) => {
    setBusyAction(true);
    try { await assignAgentTask(id, title); setAssignAgent(null); await load(); flash(`✓ Task assigned to ${wf.agents.find((a) => a.id === id)?.name || id}.`); }
    finally { setBusyAction(false); }
  };
  const doPause = async (a: WfAgent) => {
    setBusyAction(true);
    try { const r = await toggleAgentPause(a.id, !a.paused); await load(); flash(r.paused ? `⏸ ${a.name} paused.` : `▶ ${a.name} resumed.`); }
    finally { setBusyAction(false); }
  };
  const exportCsv = () => {
    const head = ["Agent", "Department", "Status", "Current Task", "Workload", "Success", "Last Active", "Total Tasks"];
    const body = rows.map((a) => [a.name || a.id, a.dept, stateOf(a), a.currentTask, `${a.workload ?? 0}%`, `${a.successRate}%`, a.lastActive, String(a.totalTasks ?? a.tasksCompleted)]);
    const csv = [head, ...body].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a"); el.href = url; el.download = "agents.csv"; el.click(); URL.revokeObjectURL(url);
  };

  const tone = (s: string) => WF_STATE_TONE[s] || WF_STATE_TONE.Idle;
  const barColor = (w: number) => w >= 70 ? "from-rose-500 to-rose-400" : w >= 40 ? "from-amber-500 to-amber-400" : "from-brand-500 to-violet-500";

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
      <div><h2 className="text-lg font-bold text-white">Agent Management</h2><p className="text-[12px] text-slate-500">Monitor and optimize all AI agents in your workforce.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{c.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${TONE_BG[c.tone]}`}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-2 text-2xl font-extrabold text-white"><AnimatedNumber value={c.value} /></div>
            <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
          </Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <FadeUp>
          <Panel title="All Agents" sub="Manage agent status, workloads, capabilities and assignments." right={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" className="rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-8 text-[11px] text-white placeholder:text-slate-600 focus:outline-none w-36" /></div>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option>{["Active", "Busy", "Idle", "Waiting", "Error", "Paused"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={deptF} onChange={(e) => setDeptF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Departments</option>{["Executive", "Growth", "Marketplace"].map((s) => <option key={s}>{s}</option>)}</select>
              <button onClick={exportCsv} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:bg-ink-800"><FileBarChart2 className="w-3.5 h-3.5" /> Export</button>
            </div>
          }>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left min-w-[860px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Agent</th><th className="font-semibold">Dept</th><th className="font-semibold">Status</th><th className="font-semibold">Current Task</th><th className="font-semibold">Workload</th><th className="font-semibold">Perf (7D)</th><th className="font-semibold">Success</th><th className="font-semibold">Last Active</th><th></th></tr></thead>
                <tbody>
                  {rows.map((a) => { const md = meta(a.id); const Icon = (md && AGENT_ICONS[md.icon]) || Sparkles; const st = tone(stateOf(a)); const wl = a.workload ?? 0;
                    return (
                      <tr key={a.id} onClick={() => setSel(a.id)} className={`border-b border-ink-900 cursor-pointer transition-colors ${sel === a.id ? "bg-ink-900/60" : "hover:bg-ink-900/40"}`}>
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate">{a.name || md?.name || a.id}</div><div className="text-[10px] text-slate-600 truncate max-w-[150px]">{md?.role}</div></div></div></td>
                        <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DEPT_TONE[a.dept]}`}>{a.dept}</span></td>
                        <td><span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{stateOf(a)}</span></td>
                        <td className="text-[11px] text-slate-400"><span className="block max-w-[150px] truncate">{a.currentTask}</span></td>
                        <td><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className={`h-full bg-gradient-to-r ${barColor(wl)}`} initial={{ width: 0 }} animate={{ width: `${wl}%` }} transition={{ duration: 0.7 }} /></div><span className="text-[10px] text-slate-300 tabular-nums w-7">{wl}%</span></div></td>
                        <td className="w-20"><Spark data={a.perf7d || []} color={a.tasksCompleted ? "#34d399" : "#475569"} /></td>
                        <td><span className={`text-[11px] font-bold ${a.tasksCompleted ? "text-emerald-400" : "text-slate-600"}`}>{a.tasksCompleted ? `${a.successRate}%` : "—"}</span></td>
                        <td className="text-[10px] text-slate-500 whitespace-nowrap">{a.lastActive}</td>
                        <td className="pr-2"><div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setSel(a.id); }} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setMsgAgent(a); }} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-white hover:bg-ink-800"><MessageSquare className="w-3.5 h-3.5" /></button>
                        </div></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[12px] text-slate-500">No agents match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-slate-600 mt-2">Showing {rows.length} of {wf.agents.length} agents.</div>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            <div className="p-4 border-b border-ink-800 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><SelIcon className="w-5 h-5" /></span>
              <div className="min-w-0 flex-1"><div className="text-sm font-bold text-white truncate">{sa.name || sm?.name || sa.id}</div><div className="text-[10px] text-slate-500 truncate">{sm?.role}</div></div>
              <span className={`inline-flex items-center gap-1 text-[10px] shrink-0 ${tone(stateOf(sa)).text}`}><span className={`w-1.5 h-1.5 rounded-full ${tone(stateOf(sa)).dot}`} />{stateOf(sa)}</span>
            </div>
            <div className="flex border-b border-ink-800 px-2 overflow-x-auto">
              {(["Overview", "Capabilities", "Performance", "Activity Log"] as const).map((t) => (
                <button key={t} onClick={() => setSubTab(t)} className={`px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap ${subTab === t ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
              ))}
            </div>
            <div className="p-4 space-y-3 max-h-[440px] overflow-y-auto scrollbar-thin">
              {subTab === "Overview" && (
                <>
                  <div className="rounded-xl border border-ink-800 bg-ink-950/50 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-slate-600">Current Task</div>
                    <div className="text-[12px] font-semibold text-white mt-1 leading-snug">{sa.currentTask}</div>
                    <div className="mt-2 flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className={`h-full bg-gradient-to-r ${barColor(sa.workload ?? 0)}`} initial={{ width: 0 }} animate={{ width: `${sa.workload ?? 0}%` }} transition={{ duration: 0.7 }} /></div><span className="text-[10px] text-slate-400 tabular-nums">{sa.workload ?? 0}%</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    {([["Department", sa.dept], ["Priority", sa.priority || "—"], ["Workload", `${sa.workload ?? 0}%`], ["Tasks Today", `${sa.tasksToday?.done ?? 0}/${sa.tasksToday?.total ?? 0}`], ["Success Rate (7D)", sa.tasksCompleted ? `${sa.successRate}%` : "—"], ["Last Active", sa.lastActive], ["Total Tasks", String(sa.totalTasks ?? sa.tasksCompleted)], ["Active Since", sa.activeSince ? dateTime(sa.activeSince).split(",")[0] : "—"]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2 border-b border-ink-900 py-1.5"><span className="text-[10px] text-slate-500">{k}</span><span className={`text-[11px] font-semibold text-right ${k === "Priority" && v === "High" ? "text-rose-300" : "text-white"}`}>{v}</span></div>
                    ))}
                  </div>
                  {sa.paused && <div className="text-[10px] text-amber-300 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">This agent is paused — resume it to let it pick up work again.</div>}
                </>
              )}
              {subTab === "Capabilities" && (
                <>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Capabilities</div><div className="flex flex-wrap gap-1.5">{(sa.capabilities || []).map((c) => <span key={c} className="text-[10px] text-slate-300 border border-ink-700 rounded-lg px-2 py-1">{c}</span>)}{(sa.capabilities || []).length === 0 && <span className="text-[11px] text-slate-500">No capabilities listed.</span>}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5 mt-2">Next Scheduled Tasks ({sa.nextTasks?.length ?? 0})</div>
                    {sa.nextTasks && sa.nextTasks.length > 0 ? <ul className="space-y-1.5">{sa.nextTasks.map((t, i) => <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300"><CircleDot className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" /><span className="leading-snug">{t}</span></li>)}</ul> : <div className="text-[11px] text-slate-500">No tasks queued for this agent.</div>}
                  </div>
                </>
              )}
              {subTab === "Performance" && (
                <>
                  <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Actions / day (7D)</div><Spark data={sa.perf7d || []} color="#a78bfa" /></div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {([["Success", sa.tasksCompleted ? `${sa.successRate}%` : "—"], ["Total Tasks", String(sa.totalTasks ?? 0)], ["Today", `${sa.tasksToday?.done ?? 0}/${sa.tasksToday?.total ?? 0}`]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-ink-800 bg-ink-950/40 py-2"><div className="text-sm font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500">{k}</div></div>
                    ))}
                  </div>
                </>
              )}
              {subTab === "Activity Log" && (sa.tasksCompleted || (sa.nextTasks || []).length ? (
                <ul className="space-y-2 text-[11px] text-slate-300">
                  <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />{sa.currentTask}</li>
                  {sa.tasksCompleted ? <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{sa.tasksCompleted} task(s) completed · {sa.successRate}% success</li> : null}
                  {(sa.nextTasks || []).slice(0, 3).map((t, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />Queued: {t}</li>)}
                  <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />Last active {sa.lastActive}</li>
                </ul>
              ) : <div className="text-[11px] text-slate-500">No activity recorded yet.</div>)}
            </div>
            <div className="p-4 border-t border-ink-800 grid grid-cols-3 gap-2">
              <button onClick={() => setAssignAgent(sa)} className="inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[10px] font-bold"><Plus className="w-3 h-3" />Assign Task</button>
              <button onClick={() => setMsgAgent(sa)} className="inline-flex items-center justify-center gap-1 h-8 rounded-lg border border-ink-700 text-slate-300 text-[10px] font-bold hover:bg-ink-800"><MessageSquare className="w-3 h-3" />Send Message</button>
              <button onClick={() => doPause(sa)} disabled={busyAction} className={`inline-flex items-center justify-center gap-1 h-8 rounded-lg border text-[10px] font-bold disabled:opacity-50 ${sa.paused ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10" : "border-rose-500/30 text-rose-300 hover:bg-rose-500/10"}`}>{sa.paused ? <><Play className="w-3 h-3" />Resume</> : <><Pause className="w-3 h-3" />Pause</>}</button>
            </div>
          </div>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FadeUp>
          <Panel title="Agent Workload Distribution" sub="Current workload across all agents">
            <div className="flex items-center gap-4">
              <Donut size={118} stroke={15} segments={loadSeg.map((s) => ({ pct: s.pct, color: s.color }))}><div><div className="text-2xl font-extrabold text-white">{ss?.total ?? 0}</div><div className="text-[9px] text-slate-500">Total Agents</div></div></Donut>
              <ul className="space-y-1.5 flex-1">{loadSeg.map((s) => <li key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold tabular-nums">{s.count}</span></li>)}</ul>
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.05}>
          <Panel title="Agent Status Timeline" sub="Agent actions over the last 7 days">
            <div className="h-[150px]"><WfTimeline data={wf.timeline} /></div>
            <div className="flex flex-wrap gap-3 mt-2">{([["Actions", "#a78bfa"], ["Success", "#34d399"], ["Failed", "#fb7185"]] as const).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.1}>
          <Panel title="Top Performing Agents" sub="By real tasks completed (7 days)">
            {wf.topAgents.length ? (
              <ul className="space-y-2.5">{wf.topAgents.map((t, i) => { const md = meta(t.id); const Icon = (md && AGENT_ICONS[md.icon]) || Sparkles; const max = Math.max(1, ...wf.topAgents.map((x) => x.tasksCompleted));
                return <li key={t.id} className="flex items-center gap-2.5"><span className="text-[10px] font-bold text-slate-600 w-3">{i + 1}</span><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3 h-3" /></span><span className="text-[11px] text-white flex-1 truncate">{md?.name || t.id}</span><div className="w-20 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${(t.tasksCompleted / max) * 100}%` }} transition={{ duration: 0.8 }} /></div><span className="text-[11px] font-bold text-emerald-400 w-7 text-right">{t.tasksCompleted}</span></li>;
              })}</ul>
            ) : <div className="text-[11px] text-slate-500 py-6 text-center">No agent activity yet.</div>}
          </Panel>
        </FadeUp>
      </div>

      {msgAgent && <AgentMessage agent={msgAgent} onClose={() => setMsgAgent(null)} />}
      {assignAgent && <AssignModal agent={assignAgent} busy={busyAction} onClose={() => setAssignAgent(null)} onAssign={(title) => doAssign(assignAgent.id, title)} />}
    </div>
  );
}

function AgentMessage({ agent, onClose }: { agent: WfAgent; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: "founder" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const name = agent.name || agent.id;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const history: AgentChatTurn[] = msgs.slice(-8).map((m) => ({ role: m.role, name: m.role === "agent" ? name : undefined, text: m.text }));
    setMsgs((m) => [...m, { role: "founder", text: t }]);
    setInput(""); setBusy(true);
    try { const r = await agentChat(t, { history, mentionId: agent.id }); setMsgs((m) => [...m, { role: "agent", text: r.text }]); }
    catch { setMsgs((m) => [...m, { role: "agent", text: "Javobni hozir olib bo'lmadi — LLM kaliti/kvotasini tekshiring." }]); }
    finally { setBusy(false); }
  };

  const quick = [`${name}, hozir nima ustida ishlayapsan?`, "Qanday yordam bera olasan?", "Keyingi rejang nima?"];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-ink-800 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><MessageSquare className="w-4 h-4 text-white" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-white truncate">{name}</div><div className="text-[10px] text-slate-500 truncate">Direct message · answers from live data</div></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          {msgs.length === 0 && <div className="text-center py-8 text-[12px] text-slate-500">Send a message — {name} replies for real from your live site data.</div>}
          {msgs.map((m, i) => (
            m.role === "founder" ? (
              <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div>
            ) : (
              <div key={i} className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5" /></span><div className="min-w-0 rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} /></div>
            )
          ))}
          {busy && <div className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">{name} javob yozyapti…</div></div>}
          <div ref={endRef} />
        </div>
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0">{quick.map((p) => <button key={p} disabled={busy} onClick={() => send(p)} className="text-[11px] px-2.5 py-1 rounded-full border border-ink-700 text-slate-300 hover:bg-ink-800 hover:border-brand-400 disabled:opacity-50">{p}</button>)}</div>
        <div className="p-3 border-t border-ink-800 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder={`${name}ga yozing…`} className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none max-h-32" />
            <button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 shrink-0"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function AssignModal({ agent, busy, onClose, onAssign }: { agent: WfAgent; busy: boolean; onClose: () => void; onAssign: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-950 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-white">Assign task to {agent.name || agent.id}</h3><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Task</label>
        <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={3} placeholder="What should this agent do?" className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
        <div className="text-[10px] text-slate-500 mt-1.5">Creates a real task in the queue, assigned to this agent. It appears in Task Orchestration.</div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
          <button disabled={busy || !title.trim()} onClick={() => onAssign(title.trim())} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Assign</button>
        </div>
      </div>
    </div>
  );
}

const ROI_TONE: Record<string, string> = { emerald: "bg-emerald-500/15 text-emerald-300", violet: "bg-violet-500/15 text-violet-300", sky: "bg-sky-500/15 text-sky-300", amber: "bg-amber-500/15 text-amber-300", rose: "bg-rose-500/15 text-rose-300", brand: "bg-brand-600/15 text-brand-300" };
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const aedK = (n: number) => n >= 1000 ? `AED ${Math.round(n / 1000)}K` : `AED ${Math.round(n)}`;
function RoiTrend({ n, unit = "vs last 7 days", invert = false }: { n: number; unit?: string; invert?: boolean }) {
  if (!n) return <span className="text-[10px] text-slate-500">No change</span>;
  const up = n > 0; const good = invert ? !up : up;
  return <span className={`text-[10px] inline-flex items-center gap-0.5 ${good ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-500">{unit}</span></span>;
}

function PerformanceROI() {
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptF, setDeptF] = useState("All Departments");
  useEffect(() => { setLoading(true); getRoi().then(setRoi).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading || !roi) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const k = roi.kpis;
  const meta = (id: string) => AGENTS.find((a) => a.id === id);
  const rangeLabel = `${new Date(roi.range.from + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(roi.range.to + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const rows = deptF === "All Departments" ? roi.agents : roi.agents.filter((a) => a.dept === deptF);
  const rowCost = rows.reduce((s, a) => s + a.cost, 0);
  const rowRev = rows.reduce((s, a) => s + a.revenue, 0);
  const rowRoi = rowCost > 0 ? Math.round(((rowRev - rowCost) / rowCost) * 100) : 0;
  const maxTask = Math.max(1, ...roi.taskImpact.map((t) => t.completed));
  const DEPT_COLOR: Record<string, string> = { Growth: "#a78bfa", Marketplace: "#38bdf8", Executive: "#fbbf24" };

  const cards: { label: string; value: string; trend: number; spark: number[]; tone: string; invert?: boolean }[] = [
    { label: "Total Revenue Impact (Est.)", value: aed(k.revenueImpact), trend: k.revenueTrend, spark: k.revenueSpark, tone: "emerald" },
    { label: "Total Cost (Est.)", value: aed(k.cost), trend: k.costTrend, spark: k.costSpark, tone: "violet", invert: true },
    { label: "Net ROI (Est.)", value: `${k.netRoi.toLocaleString()}%`, trend: k.roiTrend, spark: k.roiSpark, tone: "sky" },
    { label: "Tasks Completed", value: `${k.tasksDone} / ${k.tasksTotal}`, trend: k.tasksTrend, spark: k.tasksSpark, tone: "amber" },
    { label: "Growth Impact Score", value: `${k.growthScore}`, trend: k.growthTrend, spark: k.growthSpark, tone: "brand" },
    { label: "Cost Efficiency", value: aed(k.costEfficiency), trend: k.costEffTrend, spark: k.costEffSpark, tone: "rose", invert: true },
  ];

  const tooltipStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, fontSize: 11, color: "#e2e8f0" };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h2 className="text-lg font-bold text-white">Performance &amp; ROI</h2><p className="text-[12px] text-slate-500">Track performance, measure impact, and maximize ROI across your AI workforce.</p></div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {rangeLabel}</span>
          <select value={deptF} onChange={(e) => setDeptF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2.5 text-[12px] text-slate-300 focus:outline-none"><option>All Departments</option>{["Executive", "Growth", "Marketplace"].map((d) => <option key={d}>{d}</option>)}</select>
        </div>
      </div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="text-slate-600 text-[10px]" title="Estimated from real activity">ⓘ</span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
            <div className="mt-0.5"><RoiTrend n={c.trend} invert={c.invert} /></div>
            <div className="mt-1 -mb-1"><Spark data={c.spark} color={c.tone === "emerald" ? "#34d399" : c.tone === "violet" ? "#a78bfa" : c.tone === "sky" ? "#38bdf8" : c.tone === "amber" ? "#fbbf24" : c.tone === "rose" ? "#fb7185" : "#8b5cf6"} /></div>
          </Item>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FadeUp>
          <Panel title="Agent ROI Overview" sub="ROI performance of all AI agents (estimated)" right={<span className="text-[10px] text-slate-600">{rows.length} agents</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[480px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Agent</th><th className="font-semibold">Dept</th><th className="font-semibold text-right">Cost</th><th className="font-semibold text-right">Impact</th><th className="font-semibold text-right">ROI</th><th className="font-semibold text-right">Trend</th></tr></thead>
                <tbody>
                  {rows.map((a) => { const md = meta(a.id); const Icon = (md && AGENT_ICONS[md.icon]) || Sparkles;
                    return (
                      <tr key={a.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                        <td className="py-2 px-2"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3 h-3" /></span><span className="text-[11px] font-semibold text-white truncate max-w-[130px]">{a.name}</span></div></td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${DEPT_TONE[a.dept]}`}>{a.dept}</span></td>
                        <td className="text-[11px] text-slate-400 text-right tabular-nums">{a.cost.toLocaleString()}</td>
                        <td className="text-[11px] text-white text-right tabular-nums font-semibold">{a.revenue.toLocaleString()}</td>
                        <td className="text-[11px] text-emerald-400 text-right tabular-nums font-bold">{a.roi.toLocaleString()}%</td>
                        <td><div className="flex items-center justify-end gap-1.5"><div className="w-10"><Spark data={a.trend7d} color={a.trendPct >= 0 ? "#34d399" : "#fb7185"} /></div><span className={`text-[10px] tabular-nums ${a.trendPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{a.trendPct >= 0 ? "↑" : "↓"}{Math.abs(a.trendPct)}%</span></div></td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-ink-800"><td className="py-2 px-2 text-[11px] font-bold text-white">Total</td><td></td><td className="text-[11px] text-slate-300 text-right tabular-nums font-bold">{Math.round(rowCost).toLocaleString()}</td><td className="text-[11px] text-white text-right tabular-nums font-bold">{rowRev.toLocaleString()}</td><td className="text-[11px] text-emerald-400 text-right tabular-nums font-bold">{rowRoi.toLocaleString()}%</td><td></td></tr>
                </tbody>
              </table>
            </div>
            <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View Detailed ROI Report <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Panel title="Revenue Impact Over Time (Est.)" sub="Estimated revenue impact generated by AI agents">
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={roi.timeline} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                  <defs><linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => aedK(Number(v))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [aed(v), "Impact"]} />
                  <Area type="monotone" dataKey="impact" stroke="#a78bfa" strokeWidth={2} fill="url(#roiGrad)" animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {([["Total Impact", aed(roi.summary.total)], ["Average Daily", aed(roi.summary.avgDaily)], ["Highest Day", `${roi.summary.highest.day}`], ["Growth", ""]] as [string, string][]).map(([l, v], i) => (
                <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 p-2"><div className="text-[9px] text-slate-500">{l}</div>{i === 3 ? <div className="mt-0.5"><RoiTrend n={roi.summary.growth} unit="" /></div> : <div className="text-[11px] font-bold text-white mt-0.5 truncate">{v}{i === 2 ? <span className="text-slate-500 font-normal"> · {aed(roi.summary.highest.value)}</span> : ""}</div>}</div>
              ))}
            </div>
          </Panel>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FadeUp>
          <Panel title="Performance by Department" sub="Overall impact by department">
            <div className="flex items-center gap-4">
              <Donut size={120} stroke={15} segments={roi.departments.map((d) => ({ pct: d.pct, color: DEPT_COLOR[d.name] || "#64748b" }))}><div><div className="text-sm font-extrabold text-white">{aedK(roi.totals.revenue)}</div><div className="text-[9px] text-slate-500">Total Impact</div></div></Donut>
              <ul className="space-y-2 flex-1">
                {roi.departments.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: DEPT_COLOR[d.name] || "#64748b" }} /><div className="flex-1 min-w-0"><div className="text-slate-300">{d.name}</div><div className="text-[9px] text-slate-500">{aed(d.value)} · {d.pct}%</div></div><RoiTrend n={d.trend} unit="" /></li>
                ))}
              </ul>
            </div>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Panel title="Task Impact Analysis" sub="Impact generated by completed tasks">
            <ul className="space-y-2.5">
              {roi.taskImpact.map((t, i) => { const colors = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#8b5cf6"];
                return (
                  <li key={t.type}>
                    <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{t.type}</span><span className="text-slate-500 tabular-nums">{t.completed} · <span className="text-white font-semibold">{aed(t.revenue)}</span></span></div>
                    <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: colors[i % colors.length] }} initial={{ width: 0 }} animate={{ width: `${(t.completed / maxTask) * 100}%` }} transition={{ duration: 0.8 }} /></div>
                  </li>
                );
              })}
            </ul>
            <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View Task Impact Report <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Panel title="ROI by Time Period" sub="Estimated ROI projection at current trend">
            <ul className="space-y-1">
              {roi.projections.map((p) => (
                <li key={p.label} className="flex items-center justify-between py-2 border-b border-ink-900 last:border-0">
                  <span className="inline-flex items-center gap-2 text-[11px] text-slate-300"><Calendar className="w-3.5 h-3.5 text-brand-400" /> {p.label}</span>
                  <span className="text-[12px] font-bold text-white tabular-nums">{aed(p.value)}</span>
                  <span className="text-[11px] font-bold text-emerald-400 tabular-nums w-16 text-right">{p.roi.toLocaleString()}%</span>
                </li>
              ))}
            </ul>
            <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View ROI Forecast <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>
      </div>

      <FadeUp>
        <Panel title="Insights &amp; Recommendations" sub="AI CEO insights based on real performance data">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {roi.insights.slice(0, 5).map((ins, i) => { const icons = [TrendingUp, Building2, ListChecks, Share2, DollarSign]; const Ico = icons[i % icons.length]; return (
              <div key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><span className={`w-7 h-7 rounded-lg grid place-items-center ${ROI_TONE[ins.tone] || ROI_TONE.sky}`}><Ico className="w-3.5 h-3.5" /></span><p className="text-[11px] text-slate-300 mt-2 leading-snug">{ins.title}</p></div>
            ); })}
          </div>
          <div className="text-[9px] text-slate-600 mt-3">Estimates use real bookings + leads + listing views, attributed by real agent activity. Cost per action ≈ AED {roi.assumptions.costPerAction}, lead value ≈ AED {roi.assumptions.leadValue}, view value ≈ AED {roi.assumptions.viewValue}.</div>
        </Panel>
      </FadeUp>
    </div>
  );
}

const PRI_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-sky-500/15 text-sky-300" };

const IMP_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-sky-500/15 text-sky-300" };
const STAT_TONE: Record<string, string> = { "Brief Ready": "bg-emerald-500/15 text-emerald-300", "In Progress": "bg-amber-500/15 text-amber-300", Drafting: "bg-violet-500/15 text-violet-300", Planned: "bg-sky-500/15 text-sky-300", Outreach: "bg-emerald-500/15 text-emerald-300", Researching: "bg-amber-500/15 text-amber-300", New: "bg-sky-500/15 text-sky-300", Covered: "bg-slate-500/15 text-slate-400" };
const FOCUS_ICON: Record<string, React.ElementType> = { traffic: TrendingUp, inventory: Building2, conversion: Target, brand: Sparkles, trust: ShieldCheck };
const REC_ICON: Record<string, React.ElementType> = { content: FileText, providers: Building2, seo: Search, social: Share2, email: MessageSquare };
const FUNNEL_COLOR = ["#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#14b8a6"];
const aedC = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const kfmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

function StrategyOpportunities() {
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);
  const [deptF, setDeptF] = useState("All Departments");
  const [note, setNote] = useState("");
  const [sel, setSel] = useState<OrchTask | null>(null);
  const [busyFix, setBusyFix] = useState(false);
  const router = useRouter();
  // Generic opportunity detail drawer for the 3 bottom cards (content /
  // marketplace / competitive) — each row opens full detail + a real action.
  const [oppSel, setOppSel] = useState<{ kind: "content" | "market" | "competitive"; title: string; meta: [string, string][]; keyword?: string; category?: string } | null>(null);
  const [oppBusy, setOppBusy] = useState(false);
  useEffect(() => { setLoading(true); getStrategy().then(setData).catch(() => {}).finally(() => setLoading(false)); }, []);

  const flashNote = (m: string) => { setNote(m); setTimeout(() => setNote(""), 6000); };
  const runOppAction = async () => {
    if (!oppSel) return;
    setOppBusy(true);
    try {
      if (oppSel.kind === "content") {
        const r = await createBrief({ title: oppSel.title, primaryKeyword: oppSel.keyword || oppSel.title, contentType: "Blog Post", priority: "High", category: oppSel.category || "Travel Guides" });
        flashNote(r.ok ? `✓ Content brief created for “${oppSel.title}” → Copywriter Agent.` : "Could not create the brief.");
      } else if (oppSel.kind === "competitive") {
        const r = await generateLandingPage(oppSel.keyword || oppSel.title);
        flashNote(r.ok && r.page ? `✓ Page created for “${oppSel.title}” — review & publish in Pages.` : "Could not create the page.");
      } else {
        router.push("/agents/marketplace");
        return;
      }
      setOppSel(null);
    } catch (e) { flashNote(e instanceof Error ? e.message : "Action failed."); }
    finally { setOppBusy(false); }
  };

  // Open an opportunity in the same rich drawer Task Orchestration uses —
  // full English reason + step-by-step plan + a working Approve & Auto-fix.
  const openOpp = (o: StrategyData["topOpportunities"][number]) => {
    if (!o.id) return;
    setSel({
      id: o.id, task: o.title, description: (o.detail || "").split("\n")[0].slice(0, 200),
      reason: o.reason, plan: o.plan, page: o.page, path: o.path,
      agent: o.agent || "SEO Agent", department: "Growth",
      priority: (o.impact === "High" || o.impact === "Low" ? o.impact : "Medium") as OrchTask["priority"],
      status: "Waiting Approval", dueDate: new Date(Date.now() + 86400000).toISOString(),
      impact: (o.impact === "High" || o.impact === "Low" ? o.impact : "Medium") as OrchTask["impact"],
      confidence: o.confidence, progress: 0,
      subtasks: (o.plan || []).map((label) => ({ label, done: false })),
      action: "apply_proposal", tier: "approval", link: o.link || "", output: "",
    });
  };

  const execOpp = async (t: OrchTask) => {
    setBusyFix(true);
    try {
      const r = await executeCeoTask(t.id);
      if (r.ok === false) setNote(`Failed: ${r.error || "could not apply"}`);
      else setNote(`✓ ${r.result || "Applied"}`);
      const fresh = await getStrategy().catch(() => null);
      if (fresh) setData(fresh);
      setSel(null);
    } catch { setNote("Could not execute — check the AI CEO backend."); }
    finally { setBusyFix(false); setTimeout(() => setNote(""), 6000); }
  };

  if (loading || !data) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const generate = async () => {
    setGen(true);
    try { const r = await generateStrategy(); setData(r); setNote(r._ai ? "✓ Fresh AI strategy generated from live data." : "✓ Strategy refreshed (add an LLM key for AI-written recommendations)."); setTimeout(() => setNote(""), 4000); }
    catch { setNote("Couldn't generate — check the LLM key/quota."); setTimeout(() => setNote(""), 4000); }
    finally { setGen(false); }
  };

  const k = data.kpis;
  const showContent = deptF === "All Departments" || deptF === "Growth";
  const showMarket = deptF === "All Departments" || deptF === "Marketplace";
  const cards: { label: string; value: string; sub: string; tone: string; icon: React.ElementType; good?: boolean }[] = [
    { label: "Total Opportunities", value: String(k.totalOpportunities), sub: `↑ ${k.newThisWeek} new this week`, tone: "brand", icon: Target, good: true },
    { label: "High Impact Opportunities", value: String(k.highImpact), sub: `${k.totalOpportunities ? Math.round((k.highImpact / k.totalOpportunities) * 100) : 0}% of total`, tone: "rose", icon: Zap },
    { label: "Potential Revenue Impact (Est.)", value: aedC(k.potentialRevenue), sub: `↑ ${k.revenueTrend}% vs last 7 days`, tone: "emerald", icon: DollarSign, good: true },
    { label: "Traffic Potential (Est.)", value: k.trafficPotential.toLocaleString(), sub: `↑ ${k.trafficTrend}% vs last 7 days`, tone: "sky", icon: TrendingUp, good: true },
    { label: "Implementation Score", value: `${k.implementationScore} / 100`, sub: k.implementationScore >= 70 ? "Strong" : k.implementationScore >= 40 ? "Moderate" : "Needs focus", tone: "amber", icon: Cpu },
    { label: "Avg. Confidence Score", value: `${k.avgConfidence}%`, sub: k.avgConfidence >= 80 ? "High confidence" : "Moderate", tone: "violet", icon: ShieldCheck },
  ];
  const maxFunnel = Math.max(1, ...data.funnel.stages.map((s) => s.count));

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h2 className="text-lg font-bold text-white">Strategy &amp; Opportunities</h2><p className="text-[12px] text-slate-500">AI-powered strategic recommendations and high-impact opportunities to grow TripReview.ai.</p></div>
        <div className="flex items-center gap-2">
          <select value={deptF} onChange={(e) => setDeptF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2.5 text-[12px] text-slate-300 focus:outline-none"><option>All Departments</option>{["Growth", "Marketplace"].map((d) => <option key={d}>{d}</option>)}</select>
          <button onClick={generate} disabled={gen} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{gen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate New Strategy</button>
        </div>
      </div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${TONE_BG[c.tone]}`}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div>
            <div className={`text-[10px] mt-0.5 ${c.good ? "text-emerald-400" : "text-slate-500"}`}>{c.sub}</div>
          </Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_300px] gap-5">
        <FadeUp>
          <Panel title="Strategic Focus Areas" sub="AI CEO recommended strategic pillars">
            <ul className="space-y-2.5">
              {data.focusAreas.map((f) => { const Ico = FOCUS_ICON[f.icon] || Target; return (
                <li key={f.title} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                  <div className="flex items-start gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="text-[12px] font-bold text-white">{f.title}</div><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${PRI_TONE[f.priority]}`}>{f.priority}</span></div><p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{f.desc}</p></div></div>
                  <div className="mt-2 flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${f.progress}%` }} transition={{ duration: 0.8 }} /></div><span className="text-[10px] text-slate-400 font-bold w-8 text-right">{f.progress}%</span></div>
                </li>
              ); })}
            </ul>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Panel title="Top Opportunities" sub="High-impact opportunities identified by AI">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[460px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-1 font-semibold">Opportunity</th><th className="font-semibold text-right">Traffic</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">Conf.</th><th className="font-semibold text-right">Effort</th></tr></thead>
                <tbody>
                  {data.topOpportunities.map((o, i) => (
                    <tr key={i} onClick={() => openOpp(o)} className={`border-b border-ink-900 hover:bg-ink-900/40 ${o.id ? "cursor-pointer" : ""}`}>
                      <td className="py-2.5 px-1"><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${IMP_TONE[o.impact]}`}>{o.impact.toUpperCase()} IMPACT</span><div className="text-[11px] font-semibold text-white mt-1 leading-snug max-w-[200px]">{o.title}</div>{o.path && <div className="text-[9px] text-slate-600 mt-0.5">/en{o.path === "/" ? "" : o.path}</div>}</td>
                      <td className="text-[11px] text-slate-300 text-right tabular-nums">{kfmt(o.trafficPotential)}</td>
                      <td className="text-[11px] text-white text-right tabular-nums font-semibold">{aedC(o.revenueImpact)}</td>
                      <td className="text-[11px] text-emerald-400 text-right tabular-nums font-bold">{o.confidence}%</td>
                      <td className="text-right">
                        <span className={`text-[10px] font-bold ${o.effort === "High" ? "text-rose-300" : o.effort === "Medium" ? "text-amber-300" : "text-emerald-300"}`}>{o.effort}</span>
                        {o.id && (
                          <button onClick={(e) => { e.stopPropagation(); openOpp(o); }} className="ml-2 inline-flex items-center gap-1 px-1.5 h-6 rounded-md bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[9px] font-bold align-middle">
                            <Wand2 className="w-2.5 h-2.5" /> Fix
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.topOpportunities.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[12px] text-slate-500">No open opportunities — the site is in good shape. 🎉</td></tr>}
                </tbody>
              </table>
            </div>
            <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View All Opportunities <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.1}>
          <Panel title="Opportunity Funnel" sub="From discovery to execution">
            <div className="space-y-1.5">
              {data.funnel.stages.map((s, i) => (
                <div key={s.stage} className="relative">
                  <motion.div className="rounded-lg h-9 flex items-center justify-between px-3 mx-auto" style={{ background: FUNNEL_COLOR[i], width: `${60 + (s.count / maxFunnel) * 40}%` }} initial={{ opacity: 0, scaleX: 0.8 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                    <span className="text-[11px] font-semibold text-white/90">{s.stage}</span><span className="text-[13px] font-extrabold text-white">{s.count}</span>
                  </motion.div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-center"><div className="text-[10px] text-slate-500">Conversion Rate</div><div className="text-xl font-extrabold text-emerald-400">{data.funnel.conversionRate}%</div><div className="text-[9px] text-slate-600">From identified to completed</div></div>
          </Panel>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {showContent && <FadeUp>
          <Panel title="Content Opportunities" sub="Content gaps and ideas with high traffic potential">
            <div className="overflow-x-auto"><table className="w-full text-left min-w-[340px]">
              <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Topic / Keyword</th><th className="font-semibold text-right">Volume</th><th className="font-semibold text-right">Traffic</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th></tr></thead>
              <tbody>{data.contentOpps.map((c, i) => (
                <tr key={i} onClick={() => setOppSel({ kind: "content", title: c.topic, keyword: c.keyword, category: "Travel Guides", meta: [["Keyword", c.keyword || "—"], ["Search Volume", `${kfmt(c.searchVolume)}/mo`], ["Traffic Potential", `${kfmt(c.potentialTraffic)}/mo`], ["Priority", c.priority], ["Assigned To", c.assignedTo], ["Status", c.status]] })} className="border-b border-ink-900 cursor-pointer hover:bg-ink-800/30"><td className="py-2 text-[11px] text-white font-semibold"><span className="block truncate max-w-[120px]">{c.topic}</span><span className="text-[9px] text-slate-600">{c.assignedTo}</span></td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.searchVolume)}</td><td className="text-[10px] text-slate-400 text-right tabular-nums">{kfmt(c.potentialTraffic)}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRI_TONE[c.priority]}`}>{c.priority}</span></td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STAT_TONE[c.status] || "bg-slate-500/15 text-slate-400"}`}>{c.status}</span></td></tr>
              ))}</tbody>
            </table></div>
            <button onClick={() => router.push("/agents/copywriter")} className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View All Content Opportunities <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>}

        {showMarket && <FadeUp delay={0.05}>
          <Panel title="Marketplace Opportunities" sub="Provider growth and expansion opportunities">
            <div className="overflow-x-auto"><table className="w-full text-left min-w-[340px]">
              <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Opportunity</th><th className="font-semibold text-right">Providers</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th></tr></thead>
              <tbody>{data.marketplaceOpps.map((m, i) => (
                <tr key={i} onClick={() => setOppSel({ kind: "market", title: m.opportunity, meta: [["Potential Providers", String(m.potentialProviders)], ["Revenue Impact", aedC(m.revenueImpact)], ["Priority", m.priority], ["Assigned To", m.assignedTo], ["Status", m.status]] })} className="border-b border-ink-900 cursor-pointer hover:bg-ink-800/30"><td className="py-2 text-[11px] text-white font-semibold"><span className="block truncate max-w-[120px]">{m.opportunity}</span><span className="text-[9px] text-slate-600">{m.assignedTo}</span></td><td className="text-[10px] text-slate-300 text-right tabular-nums">{m.potentialProviders}</td><td className="text-[10px] text-white text-right tabular-nums font-semibold">{aedC(m.revenueImpact)}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRI_TONE[m.priority]}`}>{m.priority}</span></td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STAT_TONE[m.status] || "bg-slate-500/15 text-slate-400"}`}>{m.status}</span></td></tr>
              ))}</tbody>
            </table></div>
            <button onClick={() => router.push("/agents/marketplace")} className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View All Marketplace Opportunities <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>}

        <FadeUp delay={0.1}>
          <Panel title="Competitive Opportunities" sub="Gaps and weaknesses found in competitors">
            <div className="overflow-x-auto"><table className="w-full text-left min-w-[300px]">
              <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Opportunity</th><th className="font-semibold">Gap</th><th className="font-semibold">Impact</th><th className="font-semibold">Action</th></tr></thead>
              <tbody>{data.competitiveOpps.map((c, i) => (
                <tr key={i} onClick={() => setOppSel({ kind: "competitive", title: c.opportunity, keyword: c.opportunity, meta: [["Competitor Gap", c.competitorGap], ["Impact", c.impact], ["Recommended Action", c.action]] })} className="border-b border-ink-900 cursor-pointer hover:bg-ink-800/30"><td className="py-2 text-[11px] text-white font-semibold"><span className="block truncate max-w-[120px]">{c.opportunity}</span></td><td className="text-[10px] text-slate-400">{c.competitorGap}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${IMP_TONE[c.impact]}`}>{c.impact}</span></td><td><span className="text-[10px] text-brand-300 font-semibold">{c.action}</span></td></tr>
              ))}</tbody>
            </table></div>
            <button onClick={() => router.push("/agents/competitive")} className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View All Competitive Opportunities <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <FadeUp>
          <Panel title="AI CEO Strategic Recommendations" sub={data._ai ? "AI-written from live data + market trends" : "Personalized recommendations based on data, performance and market trends"}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {data.recommendations.slice(0, 5).map((r, i) => { const Ico = REC_ICON[r.icon] || Lightbulb; return (
                <div key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 flex flex-col"><span className={`w-7 h-7 rounded-lg grid place-items-center ${TONE_BG[r.impact === "High" ? "emerald" : r.impact === "Medium" ? "amber" : "sky"]}`}><Ico className="w-3.5 h-3.5" /></span><div className="text-[11px] font-bold text-white mt-2 leading-snug">{r.title}</div><p className="text-[10px] text-slate-500 mt-1 leading-snug flex-1">{r.body}</p><span className={`mt-2 text-[9px] font-bold px-1.5 py-0.5 rounded self-start ${IMP_TONE[r.impact]}`}>{r.impact} Impact</span></div>
              ); })}
            </div>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Panel title="Strategic Plan Summary" sub="Next 30 days plan">
            <ul className="space-y-3">
              {([["Total Initiatives", String(data.planSummary.totalInitiatives), ListChecks, "text-white"], ["High Priority Initiatives", String(data.planSummary.highPriority), Zap, "text-rose-300"], ["Expected Revenue Impact", `${aedC(data.planSummary.expectedRevenue)}+`, DollarSign, "text-emerald-300"], ["Expected Traffic Increase", `${data.planSummary.expectedTraffic.toLocaleString()}+`, TrendingUp, "text-sky-300"]] as [string, string, React.ElementType, string][]).map(([l, v, I, col]) => (
                <li key={l} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><I className="w-4 h-4" /></span><div className="flex-1"><div className="text-[10px] text-slate-500">{l}</div><div className={`text-[14px] font-bold ${col}`}>{v}</div></div></li>
              ))}
            </ul>
            <button className="mt-4 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline inline-flex items-center justify-center gap-1">View Full Strategic Plan <ArrowRight className="w-3 h-3" /></button>
          </Panel>
        </FadeUp>
      </div>

      {sel && <TaskDetails task={sel} busy={busyFix} onExec={() => execOpp(sel)} onClose={() => setSel(null)} />}

      {oppSel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOppSel(null)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-brand-300 font-bold">{oppSel.kind === "content" ? "Content Opportunity" : oppSel.kind === "market" ? "Marketplace Opportunity" : "Competitive Opportunity"}</div>
                <h3 className="text-base font-bold text-white leading-snug">{oppSel.title}</h3>
              </div>
              <button onClick={() => setOppSel(null)} className="text-slate-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {oppSel.meta.map(([l, v]) => (
                <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[12px] text-slate-200 font-semibold break-words">{v}</div></div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-[11px] font-bold text-amber-300 mb-1">What this does</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {oppSel.kind === "content" ? "Creates a content brief for the Copywriter Agent — keyword, target and priority — so this article gets written and published for the traffic it's missing."
                  : oppSel.kind === "competitive" ? "Generates a real SEO landing page targeting this gap the competitors rank for. Saved as a Draft — review & publish in Pages to compete for it."
                  : "Opens the Marketplace Growth agent to act on this provider-growth opportunity (discover, enrich and onboard the providers behind this revenue)."}
              </p>
            </div>

            <button onClick={runOppAction} disabled={oppBusy} className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">
              {oppBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {oppSel.kind === "content" ? "Create Content Brief" : oppSel.kind === "competitive" ? "Create this Page" : "Open in Marketplace Growth"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const APPROVAL_TYPE_ICON: Record<string, React.ElementType> = { SEO: Search, Site: Globe, Content: FileEdit };

function ApprovalsCenter() {
  const [wf, setWf] = useState<Workforce | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<WfApproval[]>([]);
  const [cat, setCat] = useState<"All" | "SEO" | "Site" | "High">("All");
  const [selId, setSelId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    getWorkforce().then((w) => { setWf(w); setList(w.approvals); setSelId(w.approvals[0]?.id || null); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !wf) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const rows = list.filter((a) => cat === "All" || (cat === "SEO" && a.source === "seo") || (cat === "Site" && a.source !== "seo") || (cat === "High" && a.priority === "High"));
  const sel = list.find((a) => a.id === selId) || rows[0] || list[0] || null;

  const decide = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const r = action === "approve" ? await approveCeoProposal(id) : await rejectCeoProposal(id);
      setResolved((p) => ({ ...p, [id]: action === "approve" ? (r.proposal.result || "Applied") : "Rejected" }));
      const remaining = list.filter((x) => x.id !== id);
      setList(remaining);
      if (selId === id) setSelId(remaining[0]?.id || null);
      setToast(action === "approve" ? `✓ ${r.proposal.result || "Applied"}` : "Rejected.");
    } catch (e) { setToast(`Failed: ${e instanceof Error ? e.message : "error"}`); }
    finally { setBusyId(null); setTimeout(() => setToast(""), 5000); }
  };

  const tabs: { key: "All" | "SEO" | "Site" | "High"; label: string; count: number }[] = [
    { key: "All", label: "All", count: list.length },
    { key: "SEO", label: "SEO Recs", count: list.filter((a) => a.source === "seo").length },
    { key: "Site", label: "Site Fixes", count: list.filter((a) => a.source !== "seo").length },
    { key: "High", label: "High Priority", count: list.filter((a) => a.priority === "High").length },
  ];

  const cards: { label: string; value: number | string; sub: string; tone: string; icon: React.ElementType }[] = [
    { label: "Pending Approvals", value: list.length, sub: "Requires attention", tone: "amber", icon: Clock },
    { label: "High Priority", value: list.filter((a) => a.priority === "High").length, sub: "Review first", tone: "rose", icon: AlertTriangle },
    { label: "Auto-Executable", value: list.filter((a) => a.auto).length, sub: "Apply on approve", tone: "emerald", icon: Wand2 },
    { label: "SEO Recommendations", value: wf.approvalSummary.seo, sub: "From SEO crawl", tone: "violet", icon: Search },
    { label: "Site Fixes", value: wf.approvalSummary.site, sub: "From site audit", tone: "sky", icon: Globe },
    { label: "Site Health", value: wf.kpis.healthScore ?? "—", sub: "Latest audit score", tone: "brand", icon: ShieldCheck },
  ];

  const insights = [
    { label: "SEO recommendations", count: list.filter((a) => a.source === "seo").length, color: "#a78bfa" },
    { label: "Site fixes", count: list.filter((a) => a.source !== "seo").length, color: "#38bdf8" },
  ];
  const insTotal = list.length || 1;
  const agentCounts: Record<string, number> = {};
  list.forEach((a) => { agentCounts[a.agent] = (agentCounts[a.agent] || 0) + 1; });
  const topApprovalAgents = Object.entries(agentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Approvals Center</h2>
        <p className="text-[12px] text-slate-500">Review and approve real actions the AI CEO has queued from its 24/7 site audit and SEO crawl. Approving applies the fix or acknowledges the recommendation.</p>
      </div>
      {toast && <FadeUp><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200">{toast}</div></FadeUp>}

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => { const Ico = card.icon; return (
          <Item key={card.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500 leading-tight">{card.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${TONE_BG[card.tone]}`}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-2 text-2xl font-extrabold text-white">{typeof card.value === "number" ? <AnimatedNumber value={card.value} /> : card.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{card.sub}</div>
          </Item>
        ); })}
      </Stagger>

      <div className="flex items-center gap-1 border-b border-ink-800 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setCat(t.key)} className={`px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${cat === t.key ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>
            {t.label} <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cat === t.key ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <FadeUp>
          <Panel right={<div className="hidden lg:flex items-center gap-1.5"><FilterPill icon={Search} label="Search approvals…" /><FilterPill icon={Filter} label="Sort: Newest" /></div>}>
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Item</th><th className="font-semibold">Type</th><th className="font-semibold">Agent</th><th className="font-semibold">Priority</th><th className="font-semibold">Submitted</th><th className="font-semibold">Status</th></tr></thead>
                  <tbody>
                    {rows.map((a) => { const Ico = APPROVAL_TYPE_ICON[a.type] || FileEdit;
                      return (
                        <tr key={a.id} onClick={() => setSelId(a.id)} className={`border-b border-ink-900 cursor-pointer transition-colors ${selId === a.id ? "bg-ink-900/60" : "hover:bg-ink-900/40"}`}>
                          <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[200px]">{a.item}</div><div className="text-[10px] text-slate-600 truncate max-w-[200px]">{a.sub}</div></div></div></td>
                          <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.source === "seo" ? "bg-violet-500/15 text-violet-300" : "bg-sky-500/15 text-sky-300"}`}>{a.type}</span></td>
                          <td className="text-[11px] text-slate-300 whitespace-nowrap">{a.agent}</td>
                          <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRI_TONE[a.priority]}`}>{a.priority}</span></td>
                          <td className="text-[10px] text-slate-500 whitespace-nowrap">{a.submitted}</td>
                          <td>{a.auto ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">Auto-fix</span> : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">Manual</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="py-12 text-center text-sm text-slate-500">No pending approvals in this filter. 🎉</div>}
            <div className="text-[10px] text-slate-600 mt-3">Showing {rows.length} of {list.length} pending approvals</div>
          </Panel>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            {sel ? (
              <>
                <div className="p-4 border-b border-ink-800 flex items-start justify-between gap-2">
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-600">Approval Details</div><div className="text-sm font-bold text-white mt-0.5">{sel.item}</div><div className="text-[11px] text-slate-500">{sel.sub}</div></div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 shrink-0">Pending</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-1"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a_src(sel)}`}>{sel.type}</span><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRI_TONE[sel.priority]}`}>{sel.priority} Priority</span>{sel.auto && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">Auto-executable</span>}</div>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1">Recommendation</div><p className="text-[11px] text-slate-400 leading-snug">{sel.sub}</p></div>
                  <div className="space-y-1.5">
                    {([["Requested By", sel.agent], ["Source", sel.source === "seo" ? "SEO crawl" : "Site audit"], ["Impact", sel.impact], ["Page", sel.page || "—"], ["Submitted", sel.submitted], ["Applies", sel.auto ? "Automatically on approval" : "Manual follow-up"]] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2 text-[11px]"><span className="text-slate-500">{k}</span><span className="font-semibold text-white text-right truncate max-w-[60%]">{v}</span></div>
                    ))}
                  </div>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1">History</div><p className="text-[10px] text-slate-500">{resolved[sel.id] ? `Resolved: ${resolved[sel.id]}` : "No actions yet. Awaiting your decision."}</p></div>
                </div>
                <div className="p-4 border-t border-ink-800 grid grid-cols-2 gap-2">
                  <button onClick={() => decide(sel.id, "approve")} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50">{busyId === sel.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}{sel.auto ? "Approve & Fix" : "Acknowledge"}</button>
                  <button onClick={() => decide(sel.id, "reject")} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800 disabled:opacity-50"><XCircle className="w-3 h-3" />Reject</button>
                </div>
              </>
            ) : <div className="p-10 text-center text-sm text-slate-500">No approval selected.</div>}
          </div>
        </FadeUp>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FadeUp>
          <Panel title="Approvals by Source" sub="Where the queued work comes from">
            <div className="flex items-center gap-4">
              <Donut size={118} stroke={15} segments={insights.map((b) => ({ pct: (b.count / insTotal) * 100, color: b.color }))}><div><div className="text-2xl font-extrabold text-white">{list.length}</div><div className="text-[9px] text-slate-500">Pending</div></div></Donut>
              <ul className="space-y-1.5 flex-1">{insights.map((b) => <li key={b.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} /><span className="text-slate-400 flex-1">{b.label}</span><span className="text-white font-bold">{b.count}</span></li>)}</ul>
            </div>
          </Panel>
        </FadeUp>
        <FadeUp delay={0.05}>
          <Panel title="Agents Requiring Approval" sub="By queued items">
            {topApprovalAgents.length ? (
              <ul className="space-y-2.5">{topApprovalAgents.map(([name, count]) => { const max = Math.max(1, ...topApprovalAgents.map((x) => x[1]));
                return <li key={name} className="flex items-center gap-2.5"><span className="text-[11px] text-white flex-1 truncate">{name}</span><div className="w-28 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-amber-500 to-amber-400" initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 0.8 }} /></div><span className="text-[11px] font-bold text-amber-300 w-6 text-right">{count}</span></li>;
              })}</ul>
            ) : <div className="text-[11px] text-slate-500 py-6 text-center">No pending approvals.</div>}
          </Panel>
        </FadeUp>
      </div>
    </div>
  );
}
function a_src(a: WfApproval) { return a.source === "seo" ? "bg-violet-500/15 text-violet-300" : "bg-sky-500/15 text-sky-300"; }

/* --------------------------- Ask AI CEO --------------------------- */
type ChatMsg = { role: "you" | "ceo"; text: string; image?: string; actions?: CeoAction[]; sources?: CeoSource[] };

// Lightweight, safe Markdown → HTML for chat answers (links, images, bold,
// inline code, headings, lists, line breaks). Escapes first, then transforms.
function renderMd(src: string): string {
  let s = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // images ![alt](url) — must run before links
  s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-2 max-h-52 w-auto" loading="lazy" />');
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-brand-300 underline hover:text-brand-200">$1</a>');
  // bare urls
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer" class="text-brand-300 underline hover:text-brand-200">$2</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-ink-950 text-[12px]">$1</code>');
  // headings ### / ## / #
  s = s.replace(/^#{1,6}\s+(.+)$/gm, '<div class="font-bold text-white mt-1.5">$1</div>');
  // bullets
  s = s.replace(/^\s*[-*]\s+(.+)$/gm, '<div class="flex gap-1.5"><span class="text-brand-400">•</span><span>$1</span></div>');
  s = s.replace(/\n/g, "<br />");
  return s;
}
type Recog = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

// Downscale a screenshot to ≤1280px JPEG so it fits the 5MB API limit.
async function fileToBase64(file: File): Promise<{ base64: string; type: string; preview: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1], type: "image/jpeg", preview: out };
}

function AskModal({ onClose, aiReady }: { onClose: () => void; aiReady: boolean }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [img, setImg] = useState<{ base64: string; type: string; preview: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role: "ceo", text: aiReady ? "I'm your AI CEO. Ask me **anything** — I search the web for fresh facts, give links and images, advise on your site, review screenshots, and fix what you approve. Travel, marketing, SEO, or what's happening on the platform — just ask." : "AI brain is in fallback mode. Add ANTHROPIC_API_KEY for full reasoning, web search + screenshot analysis. Basic questions still work." },
  ]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async () => {
    const text = q.trim();
    if ((!text && !img) || busy) return;
    const sentImg = img;
    setMsgs((m) => [...m, { role: "you", text: text || "Check this page", image: sentImg?.preview }]);
    setQ(""); setImg(null); setBusy(true);
    try {
      const history = msgs.map((m) => ({ role: m.role, text: m.text }));
      const r = await ceoAsk(text || "Check this page screenshot and give recommendations.", {
        history,
        imageBase64: sentImg?.base64,
        imageType: sentImg?.type,
      });
      setMsgs((m) => [...m, { role: "ceo", text: r.answer, actions: r.actions, sources: r.sources }]);
      if (speak) speakUz(r.answer);
    } catch {
      setMsgs((m) => [...m, { role: "ceo", text: "Sorry — I couldn't answer right now." }]);
    } finally { setBusy(false); }
  };

  const listen = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setMsgs((m) => [...m, { role: "ceo", text: "This browser doesn't support voice input — type instead." }]); return; }
    const rec = new Ctor();
    rec.lang = process.env.NEXT_PUBLIC_VOICE_LANG || "en-US";
    rec.continuous = false; rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; finalText = t; setQ(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => { setListening(false); if (finalText.trim()) setQ(finalText); };
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  const attach = async (f: File | null) => {
    if (!f) return;
    try { setImg(await fileToBase64(f)); } catch { /* ignore */ }
  };

  const runAction = async (a: CeoAction) => {
    setBusyAction(a.id);
    try {
      const r = await approveCeoProposal(a.id);
      const doneText = `✓ Done — ${r.proposal.result || a.title}`;
      setMsgs((m) => [...m, { role: "ceo", text: doneText }]);
      if (speak) speakUz(doneText);
    } catch (e) {
      setMsgs((m) => [...m, { role: "ceo", text: `Couldn't apply that: ${e instanceof Error ? e.message : "error"}` }]);
    } finally { setBusyAction(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }} transition={{ type: "spring", damping: 26, stiffness: 240 }}
        onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2 border-b border-ink-800 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center"><Crown className="w-4 h-4 text-white" /></span>
          <div className="flex-1"><div className="text-sm font-bold text-white">Ask AI CEO</div><div className="text-[10px] text-slate-500">Web search · live data · screenshot review · voice</div></div>
          <button onClick={() => setSpeak((v) => !v)} title={speak ? "Voice replies on" : "Voice replies off"} className={`w-8 h-8 grid place-items-center rounded-lg ${speak ? "bg-brand-600/20 text-brand-300" : "text-slate-400 hover:bg-ink-800"}`}>
            {speak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[88%] ${m.role === "you" ? "ml-auto" : ""}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${m.role === "you" ? "bg-brand-600 text-white whitespace-pre-wrap" : "bg-ink-800 text-slate-200"}`}>
                {m.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.image} alt="attached" className="rounded-lg mb-2 max-h-44 w-auto" />}
                {m.role === "ceo" ? <div dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} /> : m.text}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 rounded-xl border border-ink-800 bg-ink-950/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5 inline-flex items-center gap-1"><Globe className="w-3 h-3" /> Sources</div>
                  <div className="space-y-1">
                    {m.sources.map((src, si) => (
                      <a key={si} href={src.url} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-[11px] text-brand-300 hover:text-brand-200">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" /><span className="truncate">{src.title || src.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.actions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/5 px-3 py-2">
                      <Wand2 className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                      <span className="text-[11px] text-slate-200 flex-1 leading-snug">{a.title}</span>
                      <button onClick={() => runAction(a)} disabled={busyAction === a.id} className="shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[10px] font-bold disabled:opacity-50">
                        {busyAction === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="bg-ink-800 text-slate-400 rounded-2xl px-3.5 py-2.5 text-[13px] inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</div>}
          <div ref={endRef} />
        </div>
        {img && (
          <div className="px-3 pt-2 shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-950 p-1.5 pr-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="attachment" className="h-10 w-auto rounded-lg" />
              <span className="text-[10px] text-slate-400">Screenshot attached</span>
              <button onClick={() => setImg(null)} className="w-5 h-5 grid place-items-center rounded text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}
        <div className="p-3 border-t border-ink-800 shrink-0 flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => attach(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} title="Attach a screenshot" className="w-10 h-10 grid place-items-center rounded-xl border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><ImagePlus className="w-4 h-4" /></button>
          <button onClick={listen} title="Speak your question" className={`w-10 h-10 grid place-items-center rounded-xl border ${listening ? "border-brand-500 bg-brand-500/10 text-brand-300 animate-pulse" : "border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"}`}><Mic className="w-4 h-4" /></button>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={listening ? "Listening…" : "Ask, or attach a page screenshot…"} className="flex-1 bg-ink-950 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
          <button onClick={send} disabled={busy} className="w-10 h-10 grid place-items-center rounded-xl bg-brand-600 text-white disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </div>
      </motion.div>
    </div>
  );
}

function rel(iso?: string) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
