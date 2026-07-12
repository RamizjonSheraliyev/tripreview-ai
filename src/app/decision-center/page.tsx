"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel, Loader2, Calendar, RefreshCw, CheckCircle2, X, AlertTriangle, Zap, Gauge,
  Search, ChevronLeft, ChevronRight, Check, Globe, ArrowRight, Sparkles, ShieldCheck, TrendingUp,
  Download, Pencil, PieChart, Clock, Eye,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getDecisionCenter, approveCeoProposal, rejectCeoProposal,
  type DecisionCenter, type DecisionItem, type DecisionHealth, type DecisionKpis,
  type DecisionCategory, type RecentDecision, type DecisionTrendPoint, type DecisionStatus,
} from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

// Public site for "view the affected page" links (never localhost).
const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae").replace(/\/+$/, "");
const pageUrl = (path?: string) => (path ? `${PUBLIC_SITE}/en${path === "/" ? "" : path}` : "");

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function fmtDate(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

const CAT_CHIP = "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-800 text-slate-300 border border-ink-700 whitespace-nowrap";
const impactPill = (i: string) => (i === "High" ? "bg-rose-500/15 text-rose-300" : i === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");
const prioPill = (p: string) => (p === "High" ? "bg-rose-500/15 text-rose-300" : p === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300");
const confColor = (c: number) => (c >= 85 ? "#34d399" : c >= 70 ? "#fbbf24" : "#fb7185");
const decisionChip = (d: RecentDecision["decision"]) =>
  d === "Approved" ? "bg-emerald-500/15 text-emerald-300" : d === "Rejected" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300";

function statusChip(s: DecisionStatus): { label: string; cls: string } {
  switch (s) {
    case "proposed": return { label: "Pending", cls: "bg-amber-500/15 text-amber-300" };
    case "applied": return { label: "Approved", cls: "bg-emerald-500/15 text-emerald-300" };
    case "rejected": return { label: "Rejected", cls: "bg-rose-500/15 text-rose-300" };
    case "failed": return { label: "Failed", cls: "bg-amber-500/15 text-amber-300" };
    default: return { label: String(s), cls: "bg-slate-500/15 text-slate-300" };
  }
}
const statusVerb = (s: DecisionStatus) =>
  s === "applied" ? "approved & executed" : s === "rejected" ? "rejected" : s === "failed" ? "attempted but failed" : "pending";

const TONE: Record<string, string> = {
  amber: "bg-amber-500/15 text-amber-300",
  rose: "bg-rose-500/15 text-rose-300",
  sky: "bg-sky-500/15 text-sky-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  brand: "bg-brand-500/15 text-brand-300",
  violet: "bg-violet-500/15 text-violet-300",
};
const CAT_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa", "#f472b6", "#22d3ee"];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Avatar({ name }: { name: string }) {
  const colors = ["from-brand-500 to-violet-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-sky-500 to-blue-600", "from-rose-500 to-pink-600"];
  const label = (name || "?").trim();
  const idx = label.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
  return <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx]} grid place-items-center text-[9px] font-bold text-white shrink-0`}>{(label.charAt(0) || "?").toUpperCase()}</span>;
}

// Static ring (used many times per table row).
function Ring({ pct, size = 38, stroke = 4, color, children }: { pct: number; size?: number; stroke?: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (p / 100) * circ} />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}

// Animated single-value donut (health score + drawer confidence).
function Donut({ pct, size = 120, stroke = 12, color, children }: { pct: number; size?: number; stroke?: number; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (Math.max(0, Math.min(100, pct)) / 100) * circ }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// Animated multi-segment donut (category breakdown).
function MultiDonut({ segments, total, size = 150, stroke = 18 }: { segments: { count: number; color: string }[]; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.count > 0).map((s, i) => {
          const pct = total ? (s.count / total) * 100 : 0;
          const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />;
          acc += pct; return node;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-extrabold text-white">{total}</div><div className="text-[9px] text-slate-500">Total</div></div></div>
    </div>
  );
}

// Hand-rolled area/line chart: created vs resolved over the last N weeks.
function TrendChart({ points }: { points: DecisionTrendPoint[] }) {
  const pts = points || [];
  if (pts.length === 0) return <div className="py-10 text-center text-[12px] text-slate-500">No volume data yet.</div>;
  const W = 520, H = 190, padX = 30, padTop = 14, padBottom = 30;
  const plotW = W - padX * 2, plotH = H - padTop - padBottom;
  const n = pts.length;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.created, p.resolved)));
  const X = (i: number) => padX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const Y = (v: number) => padTop + plotH - (v / max) * plotH;
  const path = (key: "created" | "resolved") => pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(" ");
  const area = (key: "created" | "resolved") => `${path(key)} L${X(n - 1).toFixed(1)},${(padTop + plotH).toFixed(1)} L${X(0).toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink-800">
        <defs>
          <linearGradient id="dcCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
          <linearGradient id="dcResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.28" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient>
        </defs>
        {grid.map((g, i) => { const yy = padTop + plotH * g; return <line key={i} x1={padX} y1={yy} x2={W - padX} y2={yy} stroke="currentColor" strokeWidth="1" />; })}
        <path d={area("created")} fill="url(#dcCreated)" />
        <path d={area("resolved")} fill="url(#dcResolved)" />
        <path d={path("resolved")} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("created")} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={`r${i}`} cx={X(i)} cy={Y(p.resolved)} r="2.4" fill="#34d399" />)}
        {pts.map((p, i) => <circle key={`c${i}`} cx={X(i)} cy={Y(p.created)} r="2.4" fill="#8b5cf6" />)}
        {pts.map((p, i) => <text key={`t${i}`} x={X(i)} y={H - 9} textAnchor="middle" fill="#64748b" fontSize={9}>{p.week}</text>)}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8b5cf6" }} /> Created</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#34d399" }} /> Resolved</span>
      </div>
    </div>
  );
}

// Multi-line chart: recommendations vs approved vs rejected over N days.
function InsightsLineChart({ days }: { days: { label: string; created: number; approved: number; rejected: number }[] }) {
  const pts = days || [];
  if (pts.length === 0) return <div className="py-10 text-center text-[12px] text-slate-500">No activity in this window.</div>;
  const W = 560, H = 200, padX = 30, padTop = 12, padBottom = 26;
  const plotW = W - padX * 2, plotH = H - padTop - padBottom;
  const n = pts.length;
  const max = Math.max(1, ...pts.map((p) => Math.max(p.created, p.approved, p.rejected)));
  const X = (i: number) => padX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const Y = (v: number) => padTop + plotH - (v / max) * plotH;
  const line = (key: "created" | "approved" | "rejected") => pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p[key]).toFixed(1)}`).join(" ");
  const series: { key: "created" | "approved" | "rejected"; color: string; label: string }[] = [
    { key: "created", color: "#8b5cf6", label: "Recommendations" },
    { key: "approved", color: "#34d399", label: "Approved" },
    { key: "rejected", color: "#fb7185", label: "Rejected" },
  ];
  const labelEvery = Math.ceil(n / 8);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-ink-800">
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => { const yy = padTop + plotH * g; return <line key={i} x1={padX} y1={yy} x2={W - padX} y2={yy} stroke="currentColor" strokeWidth="1" />; })}
        {series.map((s) => <path key={s.key} d={line(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {series.map((s) => pts.map((p, i) => <circle key={`${s.key}${i}`} cx={X(i)} cy={Y(p[s.key])} r="1.8" fill={s.color} />))}
        {pts.map((p, i) => (i % labelEvery === 0 || i === n - 1) ? <text key={`t${i}`} x={X(i)} y={H - 8} textAnchor="middle" fill="#64748b" fontSize={9}>{p.label}</text> : null)}
      </svg>
      <div className="flex items-center gap-4 justify-center mt-1 flex-wrap">
        {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}</span>)}
      </div>
    </div>
  );
}

const pctI = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

// Insights tab — deep trends across every AI recommendation. 100% real, computed
// from the loaded decisions + decision health. No fabricated revenue or time-saved.
function InsightsView({ data, onOpen }: { data: DecisionCenter; onOpen: (d: DecisionItem) => void }) {
  const [tf, setTf] = useState<0 | 30 | 90>(30); // days; 0 = all time
  const all = data.decisions || [];
  const now = Date.now();
  const set = tf === 0 ? all : all.filter((d) => now - new Date(d.requestedAt).getTime() <= tf * 86400000);

  const approved = set.filter((d) => d.status === "applied").length;
  const rejected = set.filter((d) => d.status === "rejected").length;
  const decided = approved + rejected;
  const avgConf = set.length ? Math.round(set.reduce((s, d) => s + d.confidence, 0) / set.length) : 0;
  const autoExec = set.filter((d) => d.status === "applied" && d.autoExecutable).length;

  const span = tf === 0 ? 30 : Math.min(tf, 30);
  const days: { label: string; created: number; approved: number; rejected: number }[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const start = new Date(now - i * 86400000); start.setHours(0, 0, 0, 0);
    const s0 = start.getTime(), s1 = s0 + 86400000;
    const inDay = (iso?: string | null) => { if (!iso) return false; const t = new Date(iso).getTime(); return t >= s0 && t < s1; };
    days.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      created: all.filter((d) => inDay(d.requestedAt)).length,
      approved: all.filter((d) => d.status === "applied" && inDay(d.resolvedAt)).length,
      rejected: all.filter((d) => d.status === "rejected" && inDay(d.resolvedAt)).length,
    });
  }

  const catMap: Record<string, number> = {};
  set.forEach((d) => { catMap[d.category] = (catMap[d.category] || 0) + 1; });
  const cats = Object.entries(catMap).map(([name, count]) => ({ name, count, pct: pctI(count, set.length) })).sort((a, b) => b.count - a.count);
  const catTot = cats.reduce((s, c) => s + c.count, 0);

  const impacts = (["High", "Medium", "Low"] as const).map((label) => { const count = set.filter((d) => d.impact === label).length; return { label, count, pct: pctI(count, set.length) }; });

  const bandDefs: { label: string; test: (c: number) => boolean; color: string }[] = [
    { label: "90-100% (High)", test: (c) => c >= 90, color: "#34d399" },
    { label: "70-89% (Medium)", test: (c) => c >= 70 && c < 90, color: "#38bdf8" },
    { label: "50-69% (Low)", test: (c) => c >= 50 && c < 70, color: "#fbbf24" },
    { label: "Below 50%", test: (c) => c < 50, color: "#fb7185" },
  ];
  const bands = bandDefs.map((b) => { const count = set.filter((d) => b.test(d.confidence)).length; return { ...b, count, pct: pctI(count, set.length) }; });
  const bandTot = bands.reduce((s, c) => s + c.count, 0);

  const IR: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const top = [...set].sort((a, b) => (IR[b.impact] - IR[a.impact]) || (b.confidence - a.confidence)).slice(0, 6);

  const h = data.health;
  const healthBars: { label: string; v: number | null }[] = [
    { label: "Data Quality", v: h.accuracy },
    { label: "Model Accuracy", v: avgConf },
    { label: "Adoption Rate", v: h.adoption },
    { label: "Decision Velocity", v: h.timeliness },
  ];
  const healthColor = h.overall == null ? "#64748b" : h.overall >= 80 ? "#34d399" : h.overall >= 60 ? "#fbbf24" : "#fb7185";

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; tone: string }[] = [
    { label: "Total Recommendations", value: set.length, Icon: Sparkles, tone: "brand" },
    { label: "Approved Decisions", value: approved, Icon: CheckCircle2, tone: "emerald" },
    { label: "Approval Rate", value: `${pctI(approved, decided)}%`, Icon: TrendingUp, tone: "sky" },
    { label: "Rejection Rate", value: `${pctI(rejected, decided)}%`, Icon: X, tone: "rose" },
    { label: "Avg Confidence", value: `${avgConf}%`, Icon: Gauge, tone: "violet" },
    { label: "Auto-Executed", value: autoExec, Icon: Zap, tone: "amber" },
  ];

  const IMPACT_BAR: Record<string, string> = { High: "bg-violet-500", Medium: "bg-sky-500", Low: "bg-emerald-500" };
  const tf3: { v: 0 | 30 | 90; l: string }[] = [{ v: 30, l: "Last 30 Days" }, { v: 90, l: "Last 90 Days" }, { v: 0, l: "All Time" }];

  return (
    <div className="space-y-5">
      {/* Intro + timeframe */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-sm font-bold text-white">Insights</h2><p className="text-[11px] text-slate-500">Deep insights and trends from all AI recommendations and decisions.</p></div>
        <div className="flex items-center gap-1 rounded-lg border border-ink-700 p-0.5">
          {tf3.map((t) => <button key={t.v} onClick={() => setTf(t.v)} className={`px-2.5 h-7 rounded-md text-[11px] font-semibold ${tf === t.v ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"}`}>{t.l}</button>)}
        </div>
      </div>

      {/* KPI cards (real — no AED, no time-saved) */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${TONE[c.tone]}`}><c.Icon className="w-4.5 h-4.5" /></span>
            <div className="text-2xl font-extrabold text-white leading-tight">{c.value}</div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.label}</div>
          </Item>
        ))}
      </Stagger>

      {/* Row 1: over-time + category donut */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-1">Insights Over Time</h3>
            <p className="text-[11px] text-slate-500 mb-3">Daily recommendations, approvals & rejections</p>
            <InsightsLineChart days={days} />
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Decisions by Category</h3>
            {catTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No decisions in this window.</div> : (
              <div className="flex items-center gap-4">
                <MultiDonut segments={cats.map((c, i) => ({ count: c.count, color: CAT_COLORS[i % CAT_COLORS.length] }))} total={catTot} size={126} stroke={16} />
                <ul className="space-y-1.5 flex-1 min-w-0">
                  {cats.map((c, i) => <li key={c.name} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} /><span className="text-slate-400 flex-1 truncate">{c.name}</span><span className="text-white font-bold">{c.count}</span><span className="text-slate-600">({c.pct}%)</span></li>)}
                </ul>
              </div>
            )}
          </div>
        </FadeUp>
      </div>

      {/* Row 2: impact bars + confidence dist + health */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Insights by Impact Level</h3>
            <ul className="space-y-3">
              {impacts.map((im) => (
                <li key={im.label}>
                  <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{im.label} Impact</span><span className="text-white font-bold">{im.count} <span className="text-slate-600 font-normal">({im.pct}%)</span></span></div>
                  <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className={`h-full rounded-full ${IMPACT_BAR[im.label]}`} initial={{ width: 0 }} animate={{ width: `${im.pct}%` }} transition={{ duration: 0.7 }} /></div>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-600 mt-3">% of recommendations in this window.</p>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Confidence Score Distribution</h3>
            {bandTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No data.</div> : (
              <div className="flex items-center gap-4">
                <MultiDonut segments={bands.map((b) => ({ count: b.count, color: b.color }))} total={bandTot} size={120} stroke={15} />
                <ul className="space-y-1.5 flex-1 min-w-0">
                  {bands.map((b) => <li key={b.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} /><span className="text-slate-400 flex-1 truncate">{b.label}</span><span className="text-white font-bold">{b.count}</span><span className="text-slate-600">({b.pct}%)</span></li>)}
                </ul>
              </div>
            )}
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">Insights Health Score</h3></div>
            <div className="flex items-center gap-4 mb-3">
              <Donut pct={h.overall ?? 0} size={92} stroke={10} color={healthColor}><div><div className="text-lg font-extrabold text-white leading-none">{h.overall ?? "—"}</div><div className="text-[9px] text-slate-500">/ 100</div></div></Donut>
              <div><div className="text-[13px] font-bold text-white">{h.label}</div><div className="text-[11px] text-slate-500 mt-0.5">{h.resolvedTotal} resolved total</div></div>
            </div>
            <div className="space-y-2.5">
              {healthBars.map((b) => (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-400">{b.label}</span><span className="text-white font-semibold">{b.v ?? "—"}{b.v != null ? "/100" : ""}</span></div>
                  <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">{b.v != null && <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, b.v))}%` }} transition={{ duration: 0.8 }} />}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Row 3: top impactful + themes */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800"><h3 className="text-sm font-bold text-white">Top Impactful Insights</h3><span className="text-[10px] text-slate-600">by impact &amp; confidence</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-800"><th className="font-semibold py-2 pl-4 pr-3">Insight</th><th className="font-semibold px-3">Category</th><th className="font-semibold px-3">Impact</th><th className="font-semibold px-3">Confidence</th><th className="font-semibold px-3 pr-4">Status</th></tr></thead>
                <tbody>
                  {top.map((d) => { const sc = statusChip(d.status); return (
                    <tr key={d.id} onClick={() => onOpen(d)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer">
                      <td className="py-2.5 pl-4 pr-3"><div className="text-[12px] font-semibold text-white truncate max-w-[240px]">{d.title}</div><div className="text-[10px] text-slate-600">{d.decId}</div></td>
                      <td className="px-3"><span className={CAT_CHIP}>{d.category}</span></td>
                      <td className="px-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${impactPill(d.impact)}`}>{d.impact}</span></td>
                      <td className="px-3"><Ring pct={d.confidence} size={32} stroke={4} color={confColor(d.confidence)}><span className="text-[7px] font-bold text-white">{d.confidence}</span></Ring></td>
                      <td className="px-3 pr-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span></td>
                    </tr>
                  ); })}
                  {top.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[12px] text-slate-500">No insights in this window.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Key Insight Themes</h3>
            <p className="text-[10px] text-slate-600 mb-2">Where recommendations cluster (by category).</p>
            <ul className="space-y-2.5">
              {cats.length === 0 && <li className="text-[12px] text-slate-500 py-6 text-center">No themes yet.</li>}
              {cats.map((c, i) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{c.name}</span><span className="text-white font-bold">{c.count} <span className="text-slate-600 font-normal">({c.pct}%)</span></span></div>
                  <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.7 }} /></div>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Insights are computed live from real AI recommendations & decision history — no demo data.</div>
    </div>
  );
}

// Recommendations tab — actionable AI recommendations overview. 100% real from
// proposals; NO fabricated AED/revenue (Figma's money figures have no real source).
function RecommendationsView({ data, onOpen, onDecide, busyId }: { data: DecisionCenter; onOpen: (d: DecisionItem) => void; onDecide: (d: DecisionItem, x: "approve" | "reject") => void; busyId: string }) {
  const [q, setQ] = useState("");
  const [impF, setImpF] = useState("All Impact");
  const [statusF, setStatusF] = useState<DecisionStatus | "all">("all");
  const [sort, setSort] = useState<"Priority" | "Confidence" | "Newest">("Priority");
  const all = data.decisions || [];

  const total = all.length;
  const high = all.filter((d) => d.impact === "High").length;
  const pending = all.filter((d) => d.status === "proposed").length;
  const approved = all.filter((d) => d.status === "applied").length;
  const implRate = total ? Math.round((approved / total) * 100) : 0;
  const avgConf = total ? Math.round(all.reduce((s, d) => s + d.confidence, 0) / total) : 0;

  const IR: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const filtered = all
    .filter((d) => { const s = q.trim().toLowerCase(); return !s || d.title.toLowerCase().includes(s) || d.category.toLowerCase().includes(s) || d.decId.toLowerCase().includes(s); })
    .filter((d) => (impF === "All Impact" ? true : d.impact === impF))
    .filter((d) => (statusF === "all" ? true : d.status === statusF))
    .sort((a, b) => (sort === "Priority" ? (IR[b.priority] - IR[a.priority]) || (b.confidence - a.confidence) : sort === "Confidence" ? b.confidence - a.confidence : new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
  const rows = filtered.slice(0, 8);

  const catMap: Record<string, number> = {}; all.forEach((d) => { catMap[d.category] = (catMap[d.category] || 0) + 1; });
  const themes = Object.entries(catMap).map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count);

  const IMP_COLOR: Record<string, string> = { High: "#8b5cf6", Medium: "#38bdf8", Low: "#34d399" };
  const impacts = (["High", "Medium", "Low"] as const).map((label) => ({ label, count: all.filter((d) => d.impact === label).length, color: IMP_COLOR[label] }));
  const impTot = impacts.reduce((s, c) => s + c.count, 0);

  const srcMap: Record<string, number> = {}; all.forEach((d) => { srcMap[d.source] = (srcMap[d.source] || 0) + 1; });
  const ENABLERS: { key: string; label: string; desc: string; Icon: React.ElementType }[] = [
    { key: "audit", label: "Site Audit", desc: "Health & UX checks across the live site", Icon: ShieldCheck },
    { key: "seo", label: "SEO Crawl", desc: "Per-route on-page SEO signals", Icon: Search },
    { key: "chat", label: "Ops & Chat", desc: "Founder + agent conversations", Icon: Sparkles },
  ];
  const enablers = ENABLERS.map((e) => ({ ...e, count: srcMap[e.key] || 0 }));

  const accuracy = data.health.accuracy ?? avgConf;
  const accColor = accuracy >= 80 ? "#34d399" : accuracy >= 60 ? "#fbbf24" : "#fb7185";
  const accBullets = [
    `${avgConf}% average model confidence`,
    data.health.adoption != null ? `${data.health.adoption}% of advice adopted` : "Adoption baseline building",
    "Grounded in real site audit + SEO crawl data",
    `${data.health.resolvedTotal} decisions resolved to date`,
  ];

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; tone: string }[] = [
    { label: "Total Recommendations", value: total, Icon: Sparkles, tone: "brand" },
    { label: "High Impact", value: high, Icon: AlertTriangle, tone: "rose" },
    { label: "Pending Review", value: pending, Icon: Clock, tone: "amber" },
    { label: "Approved", value: approved, Icon: CheckCircle2, tone: "emerald" },
    { label: "Implementation Rate", value: `${implRate}%`, Icon: TrendingUp, tone: "sky" },
    { label: "Avg Confidence", value: `${avgConf}%`, Icon: Gauge, tone: "violet" },
  ];

  const selectCls = "rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const recent = data.recent || [];

  return (
    <div className="space-y-5">
      <div><h2 className="text-sm font-bold text-white">AI Recommendations Overview</h2><p className="text-[11px] text-slate-500">AI-generated recommendations to drive growth, efficiency, and better outcomes.</p></div>

      {/* KPI cards — real, no fabricated AED */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${TONE[c.tone]}`}><c.Icon className="w-4.5 h-4.5" /></span>
            <div className="text-2xl font-extrabold text-white leading-tight">{c.value}</div>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.label}</div>
          </Item>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
        {/* Recommendations table */}
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="p-4 flex items-center gap-2 flex-wrap border-b border-ink-800">
              <div className="relative flex-1 min-w-[160px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recommendations…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={impF} onChange={(e) => setImpF(e.target.value)} className={selectCls}>{["All Impact", "High", "Medium", "Low"].map((c) => <option key={c}>{c}</option>)}</select>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value as DecisionStatus | "all")} className={selectCls}><option value="all">All Statuses</option><option value="proposed">Pending</option><option value="applied">Approved</option><option value="rejected">Rejected</option><option value="failed">Failed</option></select>
              <select value={sort} onChange={(e) => setSort(e.target.value as "Priority" | "Confidence" | "Newest")} className={selectCls}>{["Priority", "Confidence", "Newest"].map((c) => <option key={c}>{c}</option>)}</select>
              <span className="text-[11px] text-slate-500 ml-auto">Recommendations ({filtered.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-800"><th className="font-semibold py-2.5 pl-4 pr-3">Recommendation</th><th className="font-semibold px-3">Category</th><th className="font-semibold px-3">Impact</th><th className="font-semibold px-3">Confidence</th><th className="font-semibold px-3">Priority</th><th className="font-semibold px-3">Status</th><th className="font-semibold px-3">Owner</th><th className="font-semibold px-3 pr-4 text-right">Actions</th></tr></thead>
                <tbody>
                  {rows.map((d) => { const sc = statusChip(d.status); return (
                    <tr key={d.id} onClick={() => onOpen(d)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer">
                      <td className="py-2.5 pl-4 pr-3"><div className="flex items-start gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[220px]">{d.title}</div><div className="text-[10px] text-slate-500 truncate max-w-[220px]">{d.summary}</div></div></div></td>
                      <td className="px-3"><span className={CAT_CHIP}>{d.category}</span></td>
                      <td className="px-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${impactPill(d.impact)}`}>{d.impact}</span></td>
                      <td className="px-3"><Ring pct={d.confidence} size={34} stroke={4} color={confColor(d.confidence)}><span className="text-[7px] font-bold text-white">{d.confidence}</span></Ring></td>
                      <td className="px-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prioPill(d.priority)}`}>{d.priority}</span></td>
                      <td className="px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span></td>
                      <td className="px-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><Avatar name={d.requestedBy} />{d.requestedBy}</span></td>
                      <td className="px-3 pr-4" onClick={(e) => e.stopPropagation()}>
                        {d.status === "proposed" ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => onDecide(d, "approve")} disabled={!!busyId} title="Approve & execute" className="w-8 h-8 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                            <button onClick={() => onDecide(d, "reject")} disabled={!!busyId} title="Reject" className="w-8 h-8 grid place-items-center rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex justify-end"><button onClick={() => onOpen(d)} title="View" className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-ink-800"><Eye className="w-4 h-4" /></button></div>
                        )}
                      </td>
                    </tr>
                  ); })}
                  {rows.length === 0 && <tr><td colSpan={8} className="py-12 text-center text-[12px] text-slate-500">No recommendations match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            {filtered.length > 8 && <div className="p-3 text-center text-[11px] text-slate-500 border-t border-ink-800">Showing top 8 of {filtered.length} — see the <span className="text-brand-400 font-semibold">All Decisions</span> tab for the full list.</div>}
          </div>
        </FadeUp>

        {/* Right rail: themes + accuracy */}
        <div className="space-y-5">
          <FadeUp>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <h3 className="text-sm font-bold text-white mb-3">Top Recommendation Themes</h3>
              <ul className="space-y-2.5">
                {themes.length === 0 && <li className="text-[12px] text-slate-500 py-4 text-center">No themes yet.</li>}
                {themes.map((t, i) => (
                  <li key={t.name}>
                    <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{t.name}</span><span className="text-white font-bold">{t.count} <span className="text-slate-600 font-normal">({t.pct}%)</span></span></div>
                    <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ duration: 0.7 }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">AI Recommendation Accuracy</h3></div>
              <div className="flex items-start gap-3">
                <Donut pct={accuracy} size={88} stroke={10} color={accColor}><div><div className="text-lg font-extrabold text-white leading-none">{accuracy}</div><div className="text-[9px] text-slate-500">/ 100</div></div></Donut>
                <ul className="space-y-1.5 flex-1 min-w-0">
                  {accBullets.map((b, i) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300"><Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /><span>{b}</span></li>)}
                </ul>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Bottom: impact donut + enablers + recent */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Recommendations by Impact</h3>
            {impTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No data.</div> : (
              <div className="flex items-center gap-4">
                <MultiDonut segments={impacts.map((im) => ({ count: im.count, color: im.color }))} total={impTot} size={120} stroke={15} />
                <ul className="space-y-1.5 flex-1 min-w-0">
                  {impacts.map((im) => <li key={im.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: im.color }} /><span className="text-slate-400 flex-1">{im.label} Impact</span><span className="text-white font-bold">{im.count}</span><span className="text-slate-600">({impTot ? Math.round((im.count / impTot) * 100) : 0}%)</span></li>)}
                </ul>
              </div>
            )}
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Recommendation Enablers</h3>
            <p className="text-[10px] text-slate-600 mb-2">Real data sources feeding the AI.</p>
            <ul className="space-y-2.5">
              {enablers.map((e) => (
                <li key={e.key} className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><e.Icon className="w-4 h-4" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold text-white">{e.label}</span><span className="text-[11px] font-bold text-brand-300">{e.count}</span></div><div className="text-[10px] text-slate-500 leading-tight">{e.desc}</div></div>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <h3 className="text-sm font-bold text-white mb-3">Recent Recommendation Activity</h3>
            <ul className="space-y-2.5">
              {recent.length === 0 && <li className="text-[12px] text-slate-500 py-6 text-center">No recent activity.</li>}
              {recent.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.decision === "Approved" ? "bg-emerald-400" : r.decision === "Rejected" ? "bg-rose-400" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white truncate">{r.title}</div><div className="flex items-center gap-1.5 mt-0.5"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${decisionChip(r.decision)}`}>{r.decision}</span><span className="text-[10px] text-slate-600">{timeAgo(r.at)}</span></div></div>
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Recommendations &amp; metrics are computed live from real AI proposals — no demo data, no fabricated revenue.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Types local to the page                                           */
/* ------------------------------------------------------------------ */

type TabKey = "pending" | "all" | "approved" | "rejected" | "insights" | "recommendations";
const STATUS_FOR_TAB: Record<TabKey, DecisionStatus | "all"> = { pending: "proposed", all: "all", approved: "applied", rejected: "rejected", insights: "all", recommendations: "all" };
const VIEW_TABS: TabKey[] = ["insights", "recommendations"]; // full-view tabs (no count pill)
type SortKey = "Priority" | "Confidence" | "Newest";
const PRIO_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const PER_PAGE = 10;

type DrawerTab = "Overview" | "Impact Analysis" | "Supporting Data" | "Activity";
const DRAWER_TABS: DrawerTab[] = ["Overview", "Impact Analysis", "Supporting Data", "Activity"];

// Confidence bands (real numeric field, no fabricated data).
const confBand = (c: number): "High" | "Medium" | "Low" => (c >= 85 ? "High" : c >= 70 ? "Medium" : "Low");

// What actually happens when a proposal is approved — keyed by real fixType.
const FIXTYPE_ACTION: Record<string, string> = {
  publish_blog_draft: "Publishes the drafted blog post live on the site",
  generate_blog: "Generates & drafts a new SEO blog post",
  write_listing_seo: "Writes SEO title & description for the listing",
  write_blog_meta: "Writes the blog's SEO meta title & description",
  compute_weekly_price: "Computes & fills the missing weekly/monthly price",
  publish_landing_page: "Publishes the landing page live & adds it to the sitemap",
  "": "Manual action — open the linked page to handle it",
};
const fixTypeAction = (ft?: string) => FIXTYPE_ACTION[ft || ""] ?? FIXTYPE_ACTION[""];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function DecisionCenterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();

  const [data, setData] = useState<DecisionCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("All Categories");
  const [impF, setImpF] = useState("All Impact");
  const [ownF, setOwnF] = useState("All Owners");
  const [statusF, setStatusF] = useState<DecisionStatus | "all">("all");
  const [confF, setConfF] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [sort, setSort] = useState<SortKey>("Priority");
  const [page, setPage] = useState(1);

  const [sel, setSel] = useState<DecisionItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("Overview");
  const [busyId, setBusyId] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useCallback(async () => {
    try { const d = await getDecisionCenter(); setData(d); }
    catch { /* keep previous data on failure */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  // Reset pagination whenever the working set changes.
  useEffect(() => { setPage(1); }, [tab, q, catF, impF, ownF, sort, statusF, confF]);
  // Open every decision on its Overview tab.
  useEffect(() => { setDrawerTab("Overview"); }, [sel?.id]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 3500); };

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const decide = async (d: DecisionItem, decision: "approve" | "reject") => {
    if (d.status !== "proposed") return;
    setBusyId(d.id);
    try {
      if (decision === "approve") await approveCeoProposal(d.id);
      else await rejectCeoProposal(d.id);
      note(decision === "approve" ? `Approved — ${d.title}` : `Rejected — ${d.title}`);
      if (sel?.id === d.id) setSel(null);
      await load();
    } catch (e) { note(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusyId(""); }
  };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  // ---- Derived data (all defensive) ----
  const k: DecisionKpis = data?.kpis ?? { pending: 0, highImpact: 0, avgConfidence: 0, autoExecuted: 0, resolvedThisWeek: 0, total: 0 };
  const health: DecisionHealth = data?.health ?? { overall: null, label: "Building baseline", accuracy: null, timeliness: null, impact: null, adoption: null, resolvedTotal: 0 };
  const decisions = data?.decisions ?? [];
  const byCat: DecisionCategory[] = data?.byCategory ?? [];
  const recent: RecentDecision[] = data?.recent ?? [];
  const trend: DecisionTrendPoint[] = data?.trend ?? [];
  const cats = data?.filters?.categories ?? [];
  const owners = data?.filters?.owners ?? [];

  const cnt: Record<TabKey, number> = {
    pending: k.pending,
    all: k.total,
    approved: decisions.filter((d) => d.status === "applied").length,
    rejected: decisions.filter((d) => d.status === "rejected").length,
    insights: k.total,
    recommendations: k.total,
  };

  const tabStatus = STATUS_FOR_TAB[tab];
  const filtered = decisions
    .filter((d) => (tabStatus === "all" ? true : d.status === tabStatus))
    .filter((d) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return d.title.toLowerCase().includes(s) || d.summary.toLowerCase().includes(s) || d.decId.toLowerCase().includes(s);
    })
    .filter((d) => (catF === "All Categories" ? true : d.category === catF))
    .filter((d) => (impF === "All Impact" ? true : d.impact === impF))
    .filter((d) => (ownF === "All Owners" ? true : d.requestedBy === ownF))
    .filter((d) => (statusF === "all" ? true : d.status === statusF))
    .filter((d) => (confF === "all" ? true : confBand(d.confidence) === confF));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Priority") return (PRIO_RANK[b.priority] - PRIO_RANK[a.priority]) || (b.confidence - a.confidence);
    if (sort === "Confidence") return b.confidence - a.confidence;
    return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const rows = sorted.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const start = sorted.length === 0 ? 0 : (curPage - 1) * PER_PAGE + 1;
  const end = Math.min(sorted.length, curPage * PER_PAGE);

  const kpiCards: { label: string; value: React.ReactNode; Icon: React.ElementType; tone: string }[] = [
    { label: "Pending Approvals", value: k.pending, Icon: Gavel, tone: "amber" },
    { label: "High Impact", value: k.highImpact, Icon: AlertTriangle, tone: "rose" },
    { label: "Avg Confidence", value: `${k.avgConfidence}%`, Icon: Gauge, tone: "sky" },
    { label: "Auto-Executed", value: k.autoExecuted, Icon: Zap, tone: "emerald" },
    { label: "Resolved (7d)", value: k.resolvedThisWeek, Icon: CheckCircle2, tone: "brand" },
  ];

  const healthColor = health.overall == null ? "#64748b" : health.overall >= 80 ? "#34d399" : health.overall >= 60 ? "#fbbf24" : "#fb7185";
  const healthBars: { label: string; v: number | null; c: string }[] = [
    { label: "Accuracy", v: health.accuracy, c: "bg-emerald-500" },
    { label: "Timeliness", v: health.timeliness, c: "bg-sky-500" },
    { label: "Impact", v: health.impact, c: "bg-violet-500" },
    { label: "Adoption", v: health.adoption, c: "bg-amber-500" },
  ];

  const catTotal = byCat.reduce((s, c) => s + c.count, 0);

  // Decision status breakdown (real counts across every decision).
  const STATUS_SEG: { key: DecisionStatus; label: string; color: string }[] = [
    { key: "proposed", label: "Pending", color: "#fbbf24" },
    { key: "applied", label: "Approved", color: "#34d399" },
    { key: "rejected", label: "Rejected", color: "#fb7185" },
    { key: "failed", label: "Failed", color: "#a78bfa" },
  ];
  const statusCounts = STATUS_SEG.map((s) => ({ ...s, count: decisions.filter((d) => d.status === s.key).length }));
  const statusTotal = decisions.length;

  // Export the currently-filtered decisions to CSV (client-side, real data).
  const exportCsv = () => {
    const cols = ["decId", "title", "category", "requestedBy", "impact", "confidence", "priority", "status", "requestedAt", "resolvedAt"];
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [cols.join(","), ...sorted.map((d) => cols.map((c) => esc((d as unknown as Record<string, unknown>)[c])).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `decisions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Pending Approvals" },
    { key: "all", label: "All Decisions" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "recommendations", label: "Recommendations" },
    { key: "insights", label: "Insights" },
  ];

  const selectCls = "rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shrink-0"><Gavel className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Decision Center</h1><p className="text-[11px] text-slate-500 truncate">Review AI recommendations, analyze impact, and make confident decisions.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <button onClick={refresh} title="Refresh" className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {flash && <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-[12px] text-brand-200">{flash}</div>}

          {loading && !data ? (
            <div className="grid place-items-center py-28"><Loader2 className="w-7 h-7 animate-spin text-amber-400" /></div>
          ) : !data ? (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white">Couldn&apos;t load the Decision Center.</div>
              <button onClick={refresh} className="mt-3 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-brand-600 text-white text-[12px] font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
            </div>
          ) : (
            <>
              {/* 1. Tabs bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {TABS.map((t) => {
                  const on = tab === t.key;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[12px] font-semibold transition-colors ${on ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-300 hover:text-white hover:bg-ink-800"}`}>
                      {t.label}
                      {!VIEW_TABS.includes(t.key) && <span className={`text-[10px] px-1.5 py-0.5 rounded ${on ? "bg-white/25 text-white" : "bg-ink-800 text-slate-400"}`}>{cnt[t.key]}</span>}
                    </button>
                  );
                })}
                <span className="ml-auto text-[10px] text-slate-600">Synced {timeAgo(data.generatedAt) || "just now"}</span>
              </div>

              {tab === "insights" ? <InsightsView data={data} onOpen={setSel} /> : tab === "recommendations" ? <RecommendationsView data={data} onOpen={setSel} onDecide={decide} busyId={busyId} /> : (<>

              {/* 2. KPI cards + Decision Health */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {kpiCards.map((c) => (
                    <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                      <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${TONE[c.tone]}`}><c.Icon className="w-4.5 h-4.5" /></span>
                      <div className="text-2xl font-extrabold text-white leading-tight">{c.value}</div>
                      <div className="text-[12px] text-slate-500">{c.label}</div>
                    </Item>
                  ))}
                </Stagger>

                <FadeUp>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">Decision Health</h3></div>
                    <div className="flex items-center gap-4">
                      <Donut pct={health.overall ?? 0} size={104} stroke={11} color={healthColor}>
                        <div><div className="text-xl font-extrabold text-white leading-none">{health.overall ?? "—"}</div><div className="text-[9px] text-slate-500 mt-0.5">/ 100</div></div>
                      </Donut>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-white leading-tight">{health.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{health.resolvedTotal} resolved total</div>
                      </div>
                    </div>
                    {health.overall == null && <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-1.5 text-[10px] text-slate-500">Building baseline — need ≥3 resolved decisions.</div>}
                    <div className="mt-3 space-y-2.5">
                      {healthBars.map((b) => (
                        <div key={b.label}>
                          <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-400">{b.label}</span><span className="text-white font-semibold">{b.v ?? "—"}</span></div>
                          <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">{b.v != null && <motion.div className={`h-full rounded-full ${b.c}`} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, b.v))}%` }} transition={{ duration: 0.8 }} />}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              </div>

              {/* 3 + 4. Toolbar + decisions table */}
              <FadeUp>
                <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                  {/* Toolbar */}
                  <div className="p-4 flex items-center gap-2 flex-wrap border-b border-ink-800">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recommendations…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </div>
                    <select value={catF} onChange={(e) => setCatF(e.target.value)} className={`${selectCls} max-w-[160px]`}><option>All Categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
                    <select value={impF} onChange={(e) => setImpF(e.target.value)} className={selectCls}>{["All Impact", "High", "Medium", "Low"].map((c) => <option key={c}>{c}</option>)}</select>
                    <select value={ownF} onChange={(e) => setOwnF(e.target.value)} className={`${selectCls} max-w-[160px]`}><option>All Owners</option>{owners.map((c) => <option key={c}>{c}</option>)}</select>
                    <select value={statusF} onChange={(e) => setStatusF(e.target.value as DecisionStatus | "all")} className={selectCls}>
                      <option value="all">All Statuses</option><option value="proposed">Pending</option><option value="applied">Approved</option><option value="rejected">Rejected</option><option value="failed">Failed</option>
                    </select>
                    <select value={confF} onChange={(e) => setConfF(e.target.value as "all" | "High" | "Medium" | "Low")} className={selectCls}>
                      <option value="all">All Confidence</option><option value="High">High (85+)</option><option value="Medium">Medium (70-84)</option><option value="Low">{"Low (<70)"}</option>
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectCls}>{["Priority", "Confidence", "Newest"].map((c) => <option key={c}>{c}</option>)}</select>
                    <button onClick={exportCsv} title="Export filtered decisions to CSV" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:text-white hover:bg-ink-800 ml-auto"><Download className="w-3.5 h-3.5" /> Export</button>
                    <span className="text-[11px] text-slate-500">{sorted.length} result{sorted.length === 1 ? "" : "s"}</span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[900px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-800">
                          <th className="font-semibold py-2.5 pl-4 pr-3">Decision / Recommendation</th>
                          <th className="font-semibold px-3">Category</th>
                          <th className="font-semibold px-3">Requested By</th>
                          <th className="font-semibold px-3">Impact</th>
                          <th className="font-semibold px-3">Confidence</th>
                          <th className="font-semibold px-3">Priority</th>
                          <th className="font-semibold px-3">Status</th>
                          <th className="font-semibold px-3">Requested On</th>
                          <th className="font-semibold px-3 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => {
                          const sc = statusChip(d.status);
                          return (
                            <tr key={d.id} onClick={() => setSel(d)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer">
                              <td className="py-3 pl-4 pr-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Sparkles className="w-4 h-4" /></span>
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-bold text-white truncate max-w-[300px]">{d.title}</div>
                                    <div className="text-[11px] text-slate-500 truncate max-w-[300px]">{d.summary}</div>
                                    <div className="text-[10px] text-slate-600 mt-0.5">{d.decId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3"><span className={CAT_CHIP}>{d.category}</span></td>
                              <td className="px-3 whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><Avatar name={d.requestedBy} />{d.requestedBy}</span></td>
                              <td className="px-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${impactPill(d.impact)}`}>{d.impact}</span></td>
                              <td className="px-3"><Ring pct={d.confidence} color={confColor(d.confidence)}><span className="text-[8px] font-bold text-white">{d.confidence}%</span></Ring></td>
                              <td className="px-3"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prioPill(d.priority)}`}>{d.priority}</span></td>
                              <td className="px-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span></td>
                              <td className="px-3 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(d.requestedAt)}</td>
                              <td className="px-3 pr-4" onClick={(e) => e.stopPropagation()}>
                                {d.status === "proposed" ? (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button onClick={() => decide(d, "approve")} disabled={!!busyId} title="Approve & execute" className="w-8 h-8 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busyId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                                    <button onClick={() => decide(d, "reject")} disabled={!!busyId} title="Reject" className="w-8 h-8 grid place-items-center rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /></button>
                                    <button onClick={() => setSel(d)} title="View detail" className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                                    <button onClick={() => setSel(d)} title="View detail" className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {rows.length === 0 && (
                          <tr><td colSpan={9} className="py-14 text-center text-[13px] text-slate-500"><CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />No decisions match these filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between p-4">
                    <div className="text-[10px] text-slate-600">Showing {start} to {end} of {sorted.length}</div>
                    <div className="flex items-center gap-1">
                      <button disabled={curPage <= 1} onClick={() => setPage(curPage - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <span className="text-[11px] text-slate-400 px-2">{curPage} / {totalPages}</span>
                      <button disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* 6. Bottom grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Decision Volume */}
                <FadeUp>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-brand-400" /><h3 className="text-sm font-bold text-white">Decision Volume</h3></div>
                    <p className="text-[11px] text-slate-500 mb-3">Last {trend.length || 8} weeks · created vs resolved</p>
                    <TrendChart points={trend} />
                  </div>
                </FadeUp>

                {/* Decisions by Category */}
                <FadeUp delay={0.05}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <h3 className="text-sm font-bold text-white mb-3">Decisions by Category</h3>
                    {byCat.length === 0 ? (
                      <div className="py-10 text-center text-[12px] text-slate-500">No categorized decisions yet.</div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <MultiDonut segments={byCat.map((c, i) => ({ count: c.count, color: CAT_COLORS[i % CAT_COLORS.length] }))} total={catTotal} size={126} stroke={16} />
                        <ul className="space-y-1.5 flex-1 min-w-0">
                          {byCat.map((c, i) => (
                            <li key={c.name} className="flex items-center gap-2 text-[11px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                              <span className="text-slate-400 flex-1 truncate">{c.name}</span>
                              <span className="text-white font-bold">{c.count}</span>
                              <span className="text-slate-600">({c.pct}%)</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FadeUp>

                {/* Decision Status Breakdown */}
                <FadeUp delay={0.08}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-3"><PieChart className="w-4 h-4 text-violet-400" /><h3 className="text-sm font-bold text-white">Decision Status Breakdown</h3></div>
                    {statusTotal === 0 ? (
                      <div className="py-10 text-center text-[12px] text-slate-500">No decisions yet.</div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <MultiDonut segments={statusCounts.map((s) => ({ count: s.count, color: s.color }))} total={statusTotal} size={126} stroke={16} />
                        <ul className="space-y-1.5 flex-1 min-w-0">
                          {statusCounts.map((s) => (
                            <li key={s.key} className="flex items-center gap-2 text-[11px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                              <span className="text-slate-400 flex-1 truncate">{s.label}</span>
                              <span className="text-white font-bold">{s.count}</span>
                              <span className="text-slate-600">({statusTotal ? Math.round((s.count / statusTotal) * 100) : 0}%)</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </FadeUp>

                {/* Recent Decisions */}
                <FadeUp delay={0.1}>
                  <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white">Recent Decisions</h3>
                      <button onClick={() => setTab("all")} className="text-[11px] text-brand-400 font-semibold hover:underline">View All</button>
                    </div>
                    <ul className="space-y-2.5">
                      {recent.length === 0 && <li className="text-[12px] text-slate-500 py-6 text-center">No resolved decisions yet.</li>}
                      {recent.slice(0, 7).map((r) => (
                        <li key={r.id} className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.decision === "Approved" ? "bg-emerald-400" : r.decision === "Rejected" ? "bg-rose-400" : "bg-amber-400"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-white truncate">{r.title}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={CAT_CHIP}>{r.category}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${decisionChip(r.decision)}`}>{r.decision}</span>
                              <span className="text-[10px] text-slate-600">{timeAgo(r.at)}</span>
                            </div>
                            {r.result && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{r.result}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeUp>
              </div>
              </>)}
            </>
          )}
        </div>

        {/* 5. Detail drawer */}
        {sel && (() => {
          const sc = statusChip(sel.status);
          const proposed = sel.status === "proposed";
          const meta: [string, React.ReactNode][] = [
            ["Category", sel.category],
            ["Requested By", sel.requestedBy],
            ["Source", sel.source],
            ["Confidence", `${sel.confidence}%`],
            ["Status", <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sc.cls}`}>{sc.label}</span>],
            ["Requested On", fmtDate(sel.requestedAt)],
          ];
          const tiles: [string, string][] = [
            ["Impact", sel.impact],
            ["Confidence", `${sel.confidence}%`],
            ["Auto-Execute", sel.autoExecutable ? "Yes" : "No"],
          ];
          const rationale: string[] = [
            `${sel.confidence}% model confidence (severity: ${sel.impact})`,
            `Source: ${sel.source}`,
            sel.autoExecutable ? "Can be auto-executed on approval" : "Needs manual handling",
            `Category: ${sel.category}`,
          ];
          return (
            <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
              <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${sc.cls}`}>{sc.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${impactPill(sel.impact)}`}>{sel.impact} impact</span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug mt-1.5">{sel.title}</h3>
                    <div className="text-[10px] text-slate-600 mt-0.5">{sel.decId}</div>
                  </div>
                  <button onClick={() => setSel(null)} className="text-slate-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-ink-800">
                  {DRAWER_TABS.map((dt) => (
                    <button key={dt} onClick={() => setDrawerTab(dt)} className={`px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap ${drawerTab === dt ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{dt}</button>
                  ))}
                </div>

                {drawerTab === "Overview" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {meta.map(([l, v]) => (
                        <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[12px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
                      <div className="text-[11px] font-bold text-white mb-1">Recommendation Summary</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{sel.detail || sel.summary}</p>
                    </div>
                  </div>
                )}

                {drawerTab === "Impact Analysis" && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-white mb-1.5">Estimated Impact</div>
                      <div className="grid grid-cols-3 gap-2">
                        {tiles.map(([l, v]) => (
                          <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
                      <div className="text-[11px] font-bold text-emerald-300 mb-1">What changes on approval</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{fixTypeAction(sel.fixType)}</p>
                    </div>
                    {sel.path && (
                      <a href={pageUrl(sel.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-400 hover:underline">
                        <Globe className="w-3.5 h-3.5" /> {sel.page ? `${sel.page} — ` : ""}/en{sel.path === "/" ? "" : sel.path} <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                    <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
                      <div className="text-[11px] font-bold text-white mb-2">Confidence &amp; Rationale</div>
                      <div className="flex items-start gap-3">
                        <Donut pct={sel.confidence} size={68} stroke={8} color={confColor(sel.confidence)}><span className="text-[12px] font-extrabold text-white">{sel.confidence}%</span></Donut>
                        <ul className="space-y-1.5 flex-1 min-w-0">
                          {rationale.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300"><span className="w-1 h-1 rounded-full bg-brand-400 mt-1.5 shrink-0" /><span>{r}</span></li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "Supporting Data" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
                      <div className="text-[11px] font-bold text-white mb-1">Details</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">{sel.detail || sel.summary || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-ink-800 bg-ink-900/50 divide-y divide-ink-800">
                      {([["Source", sel.source], ["Fix type", sel.fixType || "manual"], ["Auto-executable", sel.autoExecutable ? "Yes" : "No"], ["Decision ID", sel.decId], ["Category", sel.category], ["Created", fmtDate(sel.requestedAt)], ["Resolved", sel.resolvedAt ? fmtDate(sel.resolvedAt) : "—"]] as [string, string][]).map(([l, v]) => (
                        <div key={l} className="flex items-center justify-between gap-3 px-3 py-2"><span className="text-[11px] text-slate-500 shrink-0">{l}</span><span className="text-[11px] font-semibold text-slate-200 text-right truncate">{v}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {drawerTab === "Activity" && (
                  <ul className="space-y-3">
                    <li className="flex gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></span>
                      <div className="min-w-0"><div className="text-[12px] text-slate-200">Recommendation created</div><div className="text-[10px] text-slate-600">{fmtDate(sel.requestedAt)} · {timeAgo(sel.requestedAt)}</div></div>
                    </li>
                    {sel.resolvedAt && (
                      <li className="flex gap-2.5">
                        <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${sel.status === "applied" ? "bg-emerald-500/15 text-emerald-300" : sel.status === "rejected" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>{sel.status === "applied" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}</span>
                        <div className="min-w-0"><div className="text-[12px] text-slate-200 capitalize">{statusVerb(sel.status)}</div>{sel.result && <div className="text-[11px] text-slate-400 mt-0.5">{sel.result}</div>}<div className="text-[10px] text-slate-600">{fmtDate(sel.resolvedAt)} · {timeAgo(sel.resolvedAt)}</div></div>
                      </li>
                    )}
                  </ul>
                )}

                {/* Your decision */}
                <div className="pt-3 border-t border-ink-800">
                  <div className="text-[11px] font-bold text-white mb-2">Your Decision</div>
                  {proposed ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => decide(sel, "approve")} disabled={!!busyId} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busyId === sel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve &amp; Execute</button>
                      <button onClick={() => decide(sel, "reject")} disabled={!!busyId} className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /> Reject</button>
                      {(sel.link || sel.path) && (
                        <button onClick={() => window.open(sel.link || pageUrl(sel.path), "_blank", "noopener")} title="Open to edit manually before deciding" className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm font-semibold hover:bg-ink-800"><Pencil className="w-4 h-4" /> Modify</button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
                      <p className="text-[12px] text-slate-300">This decision was <span className="font-semibold text-white">{statusVerb(sel.status)}</span>{sel.result ? ` — ${sel.result}` : ""}.</p>
                      {sel.resolvedAt && <p className="text-[10px] text-slate-600 mt-1">Resolved {fmtDate(sel.resolvedAt)} · {timeAgo(sel.resolvedAt)}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
