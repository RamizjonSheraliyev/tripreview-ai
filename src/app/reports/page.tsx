"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, Loader2, Calendar, RefreshCw, Download, FileText, CheckCircle2, Sparkles,
  Gauge, Zap, ShieldCheck, TrendingUp, TrendingDown, Users, ArrowRight, AlertTriangle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getDecisionCenter, getWorkforce,
  type DecisionCenter, type DecisionItem, type Workforce,
} from "@/lib/api";

/* ---------------- helpers & tiny charts (real data only) ---------------- */
const TONE: Record<string, string> = {
  brand: "bg-brand-500/15 text-brand-300", emerald: "bg-emerald-500/15 text-emerald-300",
  sky: "bg-sky-500/15 text-sky-300", amber: "bg-amber-500/15 text-amber-300",
  rose: "bg-rose-500/15 text-rose-300", violet: "bg-violet-500/15 text-violet-300",
};
const CAT_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa", "#f472b6", "#22d3ee"];
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function Donut({ pct: p, size = 110, stroke = 12, color, children }: { pct: number; size?: number; stroke?: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (Math.max(0, Math.min(100, p)) / 100) * circ }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
function MultiDonut({ segments, total, size = 150, stroke = 18 }: { segments: { count: number; color: string }[]; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.count > 0).map((s, i) => {
          const p = total ? (s.count / total) * 100 : 0;
          const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${p} ${100 - p}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />;
          acc += p; return node;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-extrabold text-white">{total}</div><div className="text-[9px] text-slate-500">Total</div></div></div>
    </div>
  );
}
function VolumeChart({ points }: { points: { label: string; created: number; resolved: number }[] }) {
  const pts = points || [];
  if (!pts.length) return <div className="py-10 text-center text-[12px] text-slate-500">No data yet.</div>;
  const W = 560, H = 200, padX = 30, padTop = 12, padBottom = 26, plotW = W - padX * 2, plotH = H - padTop - padBottom, n = pts.length;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.created, p.resolved)));
  const X = (i: number) => padX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const Y = (v: number) => padTop + plotH - (v / max) * plotH;
  const line = (k: "created" | "resolved") => pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(" ");
  const area = (k: "created" | "resolved") => `${line(k)} L${X(n - 1).toFixed(1)},${(padTop + plotH).toFixed(1)} L${X(0).toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink-800">
        <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => { const yy = padTop + plotH * g; return <line key={i} x1={padX} y1={yy} x2={W - padX} y2={yy} stroke="currentColor" strokeWidth="1" />; })}
        <path d={area("created")} fill="url(#rv)" />
        <path d={line("resolved")} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("created")} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fill="#64748b" fontSize={9}>{p.label}</text>)}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-1"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8b5cf6" }} /> Recommendations</span><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#34d399" }} /> Resolved</span></div>
    </div>
  );
}
function Avatar({ name }: { name: string }) {
  const colors = ["from-brand-500 to-violet-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-sky-500 to-blue-600", "from-rose-500 to-pink-600"];
  const label = (name || "?").trim();
  const idx = label.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
  return <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx]} grid place-items-center text-[9px] font-bold text-white shrink-0`}>{(label.charAt(0) || "?").toUpperCase()}</span>;
}
function Delta({ v }: { v: number }) {
  const up = v >= 0;
  return <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{up ? "+" : ""}{v}%</span>;
}

function csvDownload(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

/* ------------------------------------ page ------------------------------------ */
export default function ReportsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [dc, setDc] = useState<DecisionCenter | null>(null);
  const [wf, setWf] = useState<Workforce | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useCallback(async () => {
    const [d, w] = await Promise.all([getDecisionCenter().catch(() => null), getWorkforce().catch(() => null)]);
    setDc(d); setWf(w); setLoading(false);
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const decisions: DecisionItem[] = dc?.decisions ?? [];
  const health = dc?.health;
  const byCat = dc?.byCategory ?? [];
  const recent = dc?.recent ?? [];
  const trend = dc?.trend ?? [];

  const now = Date.now();
  const inWin = (iso: string | null | undefined, from: number, to: number) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= from && t < to; };
  const win30 = [now - 30 * 86400000, now] as const;
  const win60 = [now - 60 * 86400000, now - 30 * 86400000] as const;
  const createdIn = (w: readonly [number, number]) => decisions.filter((d) => inWin(d.requestedAt, w[0], w[1])).length;
  const approvedIn = (w: readonly [number, number]) => decisions.filter((d) => d.status === "applied" && inWin(d.resolvedAt, w[0], w[1])).length;
  const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : (a ? 100 : 0));

  const total = decisions.length;
  const approved = decisions.filter((d) => d.status === "applied").length;
  const rejected = decisions.filter((d) => d.status === "rejected").length;
  const autoExec = decisions.filter((d) => d.status === "applied" && d.autoExecutable).length;
  const resolved = approved + rejected + decisions.filter((d) => d.status === "failed").length;
  const implRate = total ? pct(approved, total) : 0;
  const avgConf = total ? Math.round(decisions.reduce((s, d) => s + d.confidence, 0) / total) : 0;

  const recDelta = delta(createdIn(win30), createdIn(win60));
  const appDelta = delta(approvedIn(win30), approvedIn(win60));

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; tone: string; delta?: number }[] = [
    { label: "Total AI Recommendations", value: total, Icon: Sparkles, tone: "brand", delta: recDelta },
    { label: "Approved Decisions", value: approved, Icon: CheckCircle2, tone: "emerald", delta: appDelta },
    { label: "Implementation Rate", value: `${implRate}%`, Icon: TrendingUp, tone: "sky" },
    { label: "Avg Confidence", value: `${avgConf}%`, Icon: Gauge, tone: "violet" },
    { label: "Auto-Executed", value: autoExec, Icon: Zap, tone: "amber" },
    { label: "Resolved", value: resolved, Icon: ShieldCheck, tone: "rose" },
  ];

  const impacts = (["High", "Medium", "Low"] as const).map((label, i) => ({ label, count: decisions.filter((d) => d.impact === label).length, color: ["#8b5cf6", "#38bdf8", "#34d399"][i] }));
  const impTot = impacts.reduce((s, c) => s + c.count, 0);
  const catTot = byCat.reduce((s, c) => s + c.count, 0);

  const perfRows: { metric: string; current: React.ReactNode; delta?: number }[] = [
    { metric: "Total Recommendations", current: total, delta: recDelta },
    { metric: "Approved Decisions", current: approved, delta: appDelta },
    { metric: "Implementation Rate", current: `${implRate}%` },
    { metric: "Avg Confidence", current: `${avgConf}%` },
    { metric: "Auto-Executed", current: autoExec },
    { metric: "Resolved Total", current: resolved },
  ];

  const topAgents = (wf?.topAgents ?? []).slice(0, 6);
  const healthColor = health?.overall == null ? "#64748b" : health.overall >= 80 ? "#34d399" : health.overall >= 60 ? "#fbbf24" : "#fb7185";
  const healthBars: { label: string; v: number | null }[] = [
    { label: "Data Quality", v: health?.accuracy ?? null },
    { label: "Model Accuracy", v: avgConf },
    { label: "Adoption Rate", v: health?.adoption ?? null },
    { label: "Decision Velocity", v: health?.timeliness ?? null },
  ];

  // Real, downloadable reports (client-side CSV of live data).
  const reports = [
    {
      key: "exec", title: "Executive Summary Report", desc: "KPIs, health & category mix", cadence: "On demand",
      run: () => csvDownload("executive-summary", [
        ["Metric", "Value"],
        ["Total Recommendations", total], ["Approved", approved], ["Rejected", rejected], ["Implementation Rate %", implRate], ["Avg Confidence %", avgConf], ["Auto-Executed", autoExec], ["Resolved", resolved],
        ["Health Overall", health?.overall ?? "—"], ["Accuracy", health?.accuracy ?? "—"], ["Adoption", health?.adoption ?? "—"], ["Timeliness", health?.timeliness ?? "—"],
        [], ["Category", "Count", "Pct%"], ...byCat.map((c) => [c.name, c.count, c.pct]),
      ]),
    },
    {
      key: "decisions", title: "Decision Impact Report", desc: "Every recommendation & its outcome", cadence: "On demand",
      run: () => csvDownload("decisions", [
        ["ID", "Title", "Category", "Requested By", "Impact", "Confidence", "Priority", "Status", "Requested", "Resolved"],
        ...decisions.map((d) => [d.decId, d.title, d.category, d.requestedBy, d.impact, d.confidence, d.priority, d.status, fmtDate(d.requestedAt), fmtDate(d.resolvedAt)]),
      ]),
    },
    {
      key: "agents", title: "Agent Performance Report", desc: "Per-agent tasks & success rate", cadence: "On demand",
      run: () => csvDownload("agent-performance", [
        ["Agent", "Department", "Tasks Completed", "Success Rate %", "Status"],
        ...(wf?.agents ?? []).map((a) => [a.name, a.dept, a.tasksCompleted, a.successRate, a.status]),
      ]),
    },
  ];

  const volume = trend.map((t) => ({ label: t.week, created: t.created, resolved: t.resolved }));

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 grid place-items-center shrink-0"><BarChart3 className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Reports &amp; Insights</h1><p className="text-[11px] text-slate-500 truncate">Track performance, measure impact, and uncover actionable insights.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <button onClick={() => reports[0].run()} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800"><Download className="w-3.5 h-3.5" /> Export</button>
            <button onClick={refresh} title="Refresh" className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {loading && !dc ? (
            <div className="grid place-items-center py-28"><Loader2 className="w-7 h-7 animate-spin text-sky-400" /></div>
          ) : !dc ? (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-10 text-center"><AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" /><div className="text-sm font-semibold text-white">Couldn&apos;t load reports.</div><button onClick={refresh} className="mt-3 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-brand-600 text-white text-[12px] font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Retry</button></div>
          ) : (
            <>
              {/* KPI cards (real — no AED revenue, no invented time-saved) */}
              <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {kpis.map((c) => (
                  <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                    <div className="flex items-center justify-between"><span className={`w-9 h-9 rounded-xl grid place-items-center ${TONE[c.tone]}`}><c.Icon className="w-4.5 h-4.5" /></span>{c.delta !== undefined && <Delta v={c.delta} />}</div>
                    <div className="text-2xl font-extrabold text-white leading-tight mt-3">{c.value}</div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.label}</div>
                  </Item>
                ))}
              </Stagger>

              {/* Impact Over Time + Insights by Category + Performance Summary */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <FadeUp>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-1">Impact Over Time</h3>
                    <p className="text-[11px] text-slate-500 mb-3">Recommendation & resolution volume by week</p>
                    <VolumeChart points={volume} />
                  </div>
                </FadeUp>
                <FadeUp delay={0.05}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-3">Insights by Category</h3>
                    {catTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No data.</div> : (
                      <div className="flex items-center gap-4">
                        <MultiDonut segments={byCat.map((c, i) => ({ count: c.count, color: CAT_COLORS[i % CAT_COLORS.length] }))} total={catTot} size={120} stroke={15} />
                        <ul className="space-y-1.5 flex-1 min-w-0">{byCat.map((c, i) => <li key={c.name} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} /><span className="text-slate-400 flex-1 truncate">{c.name}</span><span className="text-white font-bold">{c.count}</span><span className="text-slate-600">({c.pct}%)</span></li>)}</ul>
                      </div>
                    )}
                  </div>
                </FadeUp>
                <FadeUp delay={0.1}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-3">Performance Summary</h3>
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-800"><th className="font-semibold py-1.5">Metric</th><th className="font-semibold text-right">Current</th><th className="font-semibold text-right pl-2">30d</th></tr></thead>
                      <tbody>{perfRows.map((r) => <tr key={r.metric} className="border-b border-ink-900"><td className="py-2 text-[11px] text-slate-300">{r.metric}</td><td className="text-[12px] font-bold text-white text-right">{r.current}</td><td className="text-right pl-2">{r.delta !== undefined ? <Delta v={r.delta} /> : <span className="text-[10px] text-slate-600">—</span>}</td></tr>)}</tbody>
                    </table>
                  </div>
                </FadeUp>
              </div>

              {/* Impact by Level + Top Agents + Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <FadeUp>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-3">Impact by Level</h3>
                    {impTot === 0 ? <div className="py-8 text-center text-[12px] text-slate-500">No data.</div> : (
                      <ul className="space-y-3">{impacts.map((im) => <li key={im.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{im.label} Impact</span><span className="text-white font-bold">{im.count} <span className="text-slate-600 font-normal">({pct(im.count, impTot)}%)</span></span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: im.color }} initial={{ width: 0 }} animate={{ width: `${pct(im.count, impTot)}%` }} transition={{ duration: 0.7 }} /></div></li>)}</ul>
                    )}
                  </div>
                </FadeUp>
                <FadeUp delay={0.05}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-brand-400" /><h3 className="text-sm font-bold text-white">Top Performing Agents</h3></div>
                    <table className="w-full text-left">
                      <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-800"><th className="font-semibold py-1.5">Agent</th><th className="font-semibold text-right">Tasks</th><th className="font-semibold text-right pl-2">Success</th></tr></thead>
                      <tbody>
                        {topAgents.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-[12px] text-slate-500">No agent activity yet.</td></tr>}
                        {topAgents.map((a) => <tr key={a.id} className="border-b border-ink-900"><td className="py-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><Avatar name={a.name ?? ""} />{a.name ?? a.id}</span></td><td className="text-[12px] font-bold text-white text-right">{a.tasksCompleted}</td><td className="text-right pl-2 text-[11px] text-emerald-400 font-semibold">{a.successRate}%</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </FadeUp>
                <FadeUp delay={0.1}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">Insights Health Score</h3></div>
                    <div className="flex items-center gap-4 mb-3">
                      <Donut pct={health?.overall ?? 0} size={88} stroke={10} color={healthColor}><div><div className="text-lg font-extrabold text-white leading-none">{health?.overall ?? "—"}</div><div className="text-[9px] text-slate-500">/ 100</div></div></Donut>
                      <div><div className="text-[13px] font-bold text-white">{health?.label ?? "—"}</div><div className="text-[11px] text-slate-500 mt-0.5">{health?.resolvedTotal ?? 0} resolved total</div></div>
                    </div>
                    <div className="space-y-2.5">{healthBars.map((b) => <div key={b.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-400">{b.label}</span><span className="text-white font-semibold">{b.v ?? "—"}{b.v != null ? "/100" : ""}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">{b.v != null && <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, b.v))}%` }} transition={{ duration: 0.8 }} />}</div></div>)}</div>
                  </div>
                </FadeUp>
              </div>

              {/* Recent Insights + Reports Library */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <FadeUp>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-3">Recent Insights</h3>
                    <ul className="space-y-2.5">
                      {recent.length === 0 && <li className="text-[12px] text-slate-500 py-6 text-center">No resolved decisions yet.</li>}
                      {recent.slice(0, 6).map((r) => <li key={r.id} className="flex items-start gap-2.5"><span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.decision === "Approved" ? "bg-emerald-400" : r.decision === "Rejected" ? "bg-rose-400" : "bg-amber-400"}`} /><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white truncate">{r.title}</div><div className="text-[10px] text-slate-500">{r.category} · {r.decision} · {fmtDate(r.at)}</div></div></li>)}
                    </ul>
                  </div>
                </FadeUp>
                <FadeUp delay={0.05}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-1">Reports Library</h3>
                    <p className="text-[10px] text-slate-600 mb-3">Download live reports built from real data (CSV).</p>
                    <ul className="space-y-2">
                      {reports.map((rep) => (
                        <li key={rep.key} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                          <span className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-300 grid place-items-center shrink-0"><FileText className="w-4 h-4" /></span>
                          <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white truncate">{rep.title}</div><div className="text-[10px] text-slate-500">{rep.desc} · {rep.cadence}</div></div>
                          <button onClick={rep.run} className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:text-white hover:bg-ink-800"><Download className="w-3.5 h-3.5" /> CSV</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeUp>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Every number is computed live from real AI recommendations, decisions & agent activity — no demo data, no fabricated revenue.</div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
