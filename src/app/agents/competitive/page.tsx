"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radar, Loader2, Bell, TrendingUp, TrendingDown, Sparkles, Search, RefreshCw, ArrowRight, ArrowUpRight, ArrowDownRight,
  Globe, Link2, Megaphone, AlertTriangle, FileText, DollarSign, Users, Lightbulb, X, Target, PenLine, Activity,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getCompetitiveOverview, ciScan, getCompetitiveBriefing,
  type CompetitiveData, type Kpi, type Seg,
} from "@/lib/api";

const TABS = ["Overview", "Competitors", "Market Share", "Content Intelligence", "Content Gaps", "Keyword Opportunities", "SERP Analysis", "Pricing Intelligence", "Backlinks", "Reviews", "Social Intelligence", "Alerts", "Recommendations", "Reports"];
const SCAN_CATEGORIES = ["Car Rental", "Yacht Rental", "Activities", "Airport Transfer", "Desert Safari", "Helicopter Tours", "Water Sports", "Tour Operators"];

/* ── Shared primitives ──────────────────────────────────────────────────── */
function AnimatedNumber({ value, className, suffix, prefix }: { value: number; className?: string; suffix?: string; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { let raf = 0; const dur = 750, t0 = performance.now(); const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value]);
  const disp = Number.isInteger(value) ? Math.round(n).toLocaleString() : (n).toFixed(value < 10 && !Number.isInteger(value) ? 2 : 1);
  return <span className={className}>{prefix}{disp}{suffix}</span>;
}
function Card({ title, children, right, sub, className = "" }: { title?: string; children: React.ReactNode; right?: React.ReactNode; sub?: string; className?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className={`rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20 ${className}`}>{(title || right) && <div className="flex items-start justify-between gap-2 mb-3"><div>{title && <div className="text-[13px] font-bold text-white">{title}</div>}{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>}{children}</motion.div>;
}
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">vs last 7 days</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">vs 7d</span></span>; }
function KpiCard({ icon: Icon, label, kpi, color }: { icon: React.ElementType; label: string; kpi: Kpi; color: string }) {
  return <Item><motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-500/30"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span>{kpi.est && <span className="text-[9px] font-semibold text-slate-500 border border-ink-700 rounded px-1.5 py-0.5">est.</span>}</div><div className="text-[12px] text-slate-500 mb-0.5">{label}</div><div className="text-2xl font-extrabold text-white"><AnimatedNumber value={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix} /></div><div className="mt-1"><Trend n={kpi.trend} /></div></motion.div></Item>;
}
function Donut({ segments, centerValue, centerLabel, centerSuffix }: { segments: Seg[]; centerValue: number; centerLabel: string; centerSuffix?: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  const sum = Math.max(1, segments.reduce((a, s) => a + s.count, 0));
  return <div className="relative w-[120px] h-[120px] shrink-0"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />{segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / sum) * C; const el = <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="butt" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: "easeOut" }} />; off += len; return el; })}</svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><AnimatedNumber value={centerValue} suffix={centerSuffix} className="text-lg font-extrabold text-white" /><div className="text-[9px] text-slate-500">{centerLabel}</div></div></div></div>;
}
function MultiLine({ series, labels }: { series: { points: number[]; color: string; label: string }[]; labels: string[] }) {
  const w = 320, h = 150, n = Math.max(...series.map((s) => s.points.length), 1), max = Math.max(0.1, ...series.flatMap((s) => s.points));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - (v / max) * (h - 16) - 8;
  return <div><svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">{[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} y1={h - f * (h - 16) - 8} x2={w} y2={h - f * (h - 16) - 8} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}{series.map((s, si) => (<g key={si}><motion.polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: si * 0.12 }} />{s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={s.color} />)}</g>))}</svg><div className="flex items-center justify-between mt-1"><div className="flex flex-wrap gap-3">{series.map((s) => <span key={s.label} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</div><span className="text-[9px] text-slate-600">{labels[0]} – {labels[labels.length - 1]}</span></div></div>;
}
function Bar({ pct, color }: { pct: number; color: string }) { return <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>; }
const fmtK = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n));
const alertIcon = (k: string) => (k === "competitor" ? Radar : k === "backlink" ? Link2 : k === "pricing" ? DollarSign : Activity);

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function CompetitivePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<CompetitiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = useCallback(async () => { setLoading(true); try { setData(await getCompetitiveOverview()); } finally { setLoading(false); } }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 8000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{note}</div>}
        {scanOpen && <ScanModal onClose={() => setScanOpen(false)} flash={flash} onDone={load} />}
        {briefOpen && <BriefingModal onClose={() => setBriefOpen(false)} />}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center text-white"><Radar className="w-5 h-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Competitive Intelligence Agent</h1><span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span> Active</span></div><p className="text-[11px] text-slate-500 truncate">Monitor competitors, uncover opportunities, and stay ahead in the market</p></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setBriefOpen(true)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white text-sm font-medium"><Sparkles className="w-3.5 h-3.5 text-brand-400" /> Ask AI</button>
            <button onClick={() => setScanOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-sm font-semibold"><Search className="w-4 h-4" /> Scan Competitors</button>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white text-sm font-medium"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="ciTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-violet-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} flash={flash} onScan={() => setScanOpen(true)} />
            : <Stub name={tab} data={data} />}
        </div>
      </main>
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */
function Overview({ data, flash, onScan }: { data: CompetitiveData; flash: (m: string) => void; onScan: () => void }) {
  const k = data.kpis;
  const KPI = [
    { icon: Radar, label: "Competitors Monitored", kpi: k.competitorsMonitored, color: "bg-violet-500/15 text-violet-300" },
    { icon: Target, label: "Market Share (Est.)", kpi: k.marketShare, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: Megaphone, label: "Share of Voice", kpi: k.shareOfVoice, color: "bg-sky-500/15 text-sky-300" },
    { icon: Lightbulb, label: "Content Opportunities", kpi: k.contentOpportunities, color: "bg-amber-500/15 text-amber-300" },
    { icon: TrendingUp, label: "Ranking Opportunities", kpi: k.rankingOpportunities, color: "bg-brand-500/15 text-brand-300" },
    { icon: Users, label: "New Competitors Detected", kpi: k.newCompetitorsDetected, color: "bg-fuchsia-500/15 text-fuchsia-300" },
  ];
  return (
    <div className="space-y-4">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{KPI.map((x) => <KpiCard key={x.label} icon={x.icon} label={x.label} kpi={x.kpi} color={x.color} />)}</Stagger>

      {/* Market Share · Share of Voice · Top Competitors */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Market Share Overview" sub="Est. share of UAE travel traffic">
          <div className="flex items-center gap-3">
            <Donut segments={data.marketShare.segments} centerValue={data.marketShare.ourShare} centerSuffix="%" centerLabel="Our share" />
            <div className="flex-1 space-y-1 min-w-0">{data.marketShare.segments.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} /><span className="truncate">{s.label}</span></span><span className="text-slate-300 font-semibold shrink-0">{s.pct}%</span></div>
            ))}</div>
          </div>
        </Card></FadeUp>

        <FadeUp><Card title="Share of Voice" sub="All channels · last 7 days">
          {data.shareOfVoice.series.every((s) => s.points.every((p) => p === 0)) ? (
            <div className="grid place-items-center text-center py-8"><div><Megaphone className="w-6 h-6 text-slate-600 mx-auto mb-2" /><div className="text-[12px] text-slate-400">Building daily history…</div><div className="text-[10px] text-slate-600 mt-1">Snapshots accrue each day; trend fills in as data lands.</div></div></div>
          ) : <MultiLine labels={data.shareOfVoice.labels} series={data.shareOfVoice.series} />}
        </Card></FadeUp>

        <FadeUp><Card title="Top Competitors" sub="By estimated traffic">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1">Competitor</th><th className="font-medium px-1">Traffic</th><th className="font-medium text-right px-1">Share</th><th className="font-medium text-center px-1">Trend</th></tr></thead>
            <tbody>{data.topCompetitors.map((c) => (
              <tr key={c.name} className="border-b border-ink-900/60">
                <td className="py-1.5 px-1"><div className="text-slate-200 font-medium truncate max-w-[110px]">{c.name}</div><div className="text-[9px] text-slate-500">{c.category}</div></td>
                <td className="px-1 text-slate-300">{fmtK(c.estTraffic)}</td>
                <td className="px-1 text-right text-slate-300 font-semibold">{c.share}%</td>
                <td className="px-1 text-center">{c.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 inline" />}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>
      </div>

      {/* Recent Alerts · Top Content Opportunities · Content Gap Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Recent Alerts" sub="Competitor activity">
          {data.alerts.length === 0 ? <div className="text-slate-500 text-xs py-6 text-center">No alerts yet. Run a scan.</div> : (
            <div className="space-y-2">{data.alerts.map((a, i) => { const Ico = alertIcon(a.icon); return (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
                <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center shrink-0 mt-0.5"><Ico className="w-3.5 h-3.5" /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium leading-snug">{a.title}</div><div className="text-[10px] text-slate-500 truncate">{a.detail}</div></div>
                <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">{a.when}</span>
              </div>
            ); })}</div>
          )}
        </Card></FadeUp>

        <FadeUp><Card title="Top Content Opportunities" sub="Keywords competitors rank for — we don't">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1">Opportunity</th><th className="font-medium text-center px-1">Vol.</th><th className="font-medium text-center px-1">Diff.</th><th className="font-medium text-center px-1">Comp.</th><th className="font-medium px-1">Action</th></tr></thead>
            <tbody>{data.topContentOpps.map((o) => (
              <tr key={o.opportunity} className="border-b border-ink-900/60">
                <td className="py-1.5 px-1"><div className="text-slate-200 font-medium truncate max-w-[130px]">{o.opportunity}</div><div className="text-[9px] text-rose-300/80">{o.ourRanking == null ? "Not Ranked" : `Rank #${o.ourRanking}`}</div></td>
                <td className="text-center text-slate-300">{o.searchVolume.toLocaleString()}</td>
                <td className="text-center"><span className={o.difficulty < 20 ? "text-emerald-300" : o.difficulty < 30 ? "text-amber-300" : "text-rose-300"}>{o.difficulty}</span></td>
                <td className="text-center text-slate-400">{o.competitorsRanking}</td>
                <td className="px-1"><button onClick={() => flash(`Content brief queued: “${o.opportunity}” (vol ${o.searchVolume.toLocaleString()}, difficulty ${o.difficulty}). Hand to Copywriter Agent to draft.`)} className="inline-flex items-center gap-1 rounded-md bg-brand-500/15 border border-brand-500/30 hover:bg-brand-500/25 px-2 py-1 text-[10px] font-medium text-brand-200 whitespace-nowrap"><PenLine className="w-3 h-3" />Create Page</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <FadeUp><Card title="Content Gap Summary" sub="Underserved category × emirate combos">
          <div className="flex items-center gap-3">
            <Donut segments={data.contentGapSummary.segments} centerValue={data.contentGapSummary.total} centerLabel="Total gaps" />
            <div className="flex-1 space-y-2">{data.contentGapSummary.segments.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span><span className="text-slate-200 font-semibold">{s.count} <span className="text-slate-600">({s.pct}%)</span></span></div>
            ))}</div>
          </div>
        </Card></FadeUp>
      </div>

      {/* Pricing · Backlinks · Social · Recommendations */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Pricing Intelligence" sub="Our price vs market avg">
          <div className="space-y-2">{data.pricing.map((p) => (
            <div key={p.service} className="text-xs">
              <div className="flex items-center justify-between"><span className="text-slate-300 truncate max-w-[120px]">{p.service}</span><span className={`font-bold ${p.difference < 0 ? "text-emerald-300" : "text-rose-300"}`}>{p.difference > 0 ? "+" : ""}{p.difference}%</span></div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5"><span>AED {p.ourPrice.toLocaleString()}{p.real ? "" : " (est.)"}</span><span>mkt AED {p.competitorPrice.toLocaleString()}</span></div>
            </div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Backlink Intelligence" sub="Competitor link velocity">
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2"><div className="text-base font-extrabold text-emerald-300">{data.backlinks.newBacklinks7d}</div><div className="text-[9px] text-slate-500">New 7d</div></div>
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2"><div className="text-base font-extrabold text-rose-300">{data.backlinks.lostBacklinks7d}</div><div className="text-[9px] text-slate-500">Lost 7d</div></div>
            <div className="rounded-lg bg-ink-800/60 border border-ink-800 p-2"><div className="text-base font-extrabold text-white">{fmtK(data.backlinks.totalBacklinks)}</div><div className="text-[9px] text-slate-500">Total</div></div>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mb-1">Top Competitor Gains</div>
          <div className="space-y-1.5">{data.backlinks.topGains.map((g) => (
            <div key={g.name} className="flex items-center justify-between text-[11px]"><span className="text-slate-300 truncate max-w-[90px]">{g.name}</span><span className="text-emerald-300 font-semibold">+{g.gained}</span><span className="text-slate-600 truncate max-w-[90px]">{g.source}</span></div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Social Intelligence" sub="Followers & engagement">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1">Competitor</th><th className="font-medium text-right px-1">Followers</th><th className="font-medium text-right px-1">Eng.</th></tr></thead>
            <tbody>{data.social.map((s) => (
              <tr key={s.name} className={`border-b border-ink-900/60 ${s.isUs ? "bg-brand-500/5" : ""}`}>
                <td className="py-1.5 px-1 truncate max-w-[110px]"><span className={s.isUs ? "text-brand-300 font-semibold" : "text-slate-200"}>{s.name}</span>{s.isUs && <span className="ml-1 text-[8px] text-brand-400">YOU</span>}</td>
                <td className="px-1 text-right text-slate-300">{fmtK(s.followers)}</td>
                <td className="px-1 text-right text-slate-400">{s.engagementRate}%</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <FadeUp><Card title="Recommendations" sub="Top 5 · AI-prioritised">
          <div className="space-y-2">{data.recommendations.map((r) => (
            <div key={r.priority} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center text-[10px] font-bold text-white shrink-0 mt-0.5">{r.priority}</span>
              <div className="min-w-0"><div className="text-[12px] text-white font-medium leading-snug">{r.title}</div><div className="text-[10px] text-slate-500">{r.detail}</div></div>
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ── Stub for not-yet-built tabs ────────────────────────────────────────── */
function Stub({ name, data }: { name: string; data: CompetitiveData }) {
  return (
    <FadeUp><div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-12 text-center">
      <Radar className="w-10 h-10 text-violet-400/60 mx-auto mb-3" />
      <div className="text-lg font-bold text-white">{name}</div>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">This view is being built. Live data already flows through the agent — {data.summary.competitors} competitors tracked, {data.summary.ourShare}% est. share, {data.summary.totalGaps} ranking gaps open.</p>
    </div></FadeUp>
  );
}

/* ── Scan modal ─────────────────────────────────────────────────────────── */
function ScanModal({ onClose, flash, onDone }: { onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [category, setCategory] = useState("Car Rental");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message?: string; sources?: { title?: string; url?: string }[] } | null>(null);
  const run = async () => { setBusy(true); setResult(null); try { const r = await ciScan(category); setResult(r); flash(r.ok ? `✓ ${r.message}` : (r.message || "Scan failed.")); if (r.ok) onDone(); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white flex items-center gap-2"><Search className="w-4 h-4 text-violet-400" /> Scan Competitors</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <p className="text-[12px] text-slate-500 mb-3">Runs a real web search to detect new UAE competitors in a category and adds them to monitoring.</p>
        <label className="text-[11px] text-slate-400">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 mb-4 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white">{SCAN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        {result?.sources && result.sources.length > 0 && <div className="mb-3 text-[10px] text-slate-500"><div className="font-semibold mb-1">Sources</div>{result.sources.map((s, i) => <div key={i} className="truncate">• {s.title || s.url}</div>)}</div>}
        <div className="flex gap-2">
          <button onClick={run} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}{busy ? "Scanning…" : "Run Scan"}</button>
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Briefing modal (Ask AI) ────────────────────────────────────────────── */
function BriefingModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { getCompetitiveBriefing().then((r) => setText(r.text || "No briefing available.")).catch(() => setText("Briefing unavailable.")).finally(() => setLoading(false)); }, []);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-400" /> AI Competitive Briefing</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        {loading ? <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-brand-400" /></div> : <div className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</div>}
      </motion.div>
    </div>
  );
}
