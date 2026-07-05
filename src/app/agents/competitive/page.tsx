"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radar, Loader2, Bell, TrendingUp, TrendingDown, Sparkles, Search, RefreshCw, ArrowRight, ArrowUpRight, ArrowDownRight,
  Globe, Link2, Megaphone, AlertTriangle, FileText, DollarSign, Users, Lightbulb, X, Target, PenLine, Activity,
  Eye, BarChart3, MoreHorizontal, Star, Plus, SlidersHorizontal, ChevronLeft, ChevronRight,
  Bookmark, ExternalLink, Download, FileEdit, Layers, Zap, Send, Link2 as LinkIcon, Pause, Play, Trash2, Calendar, Mail,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getCompetitiveOverview, ciScan, getCompetitiveBriefing, getCompetitors, ciAddCompetitor, getContentIntelligence, ciScanContent, getPageOpportunities, getBacklinkIntel,
  getReports, ciGenerateReport, ciScheduleReport, ciToggleSchedule, ciDeleteSchedule,
  type CompetitiveData, type CompetitorsData, type CompetitorFull, type ContentIntelData, type PageOppsData, type BacklinkData, type ReportsData, type Kpi, type Seg,
} from "@/lib/api";

const TABS = ["Overview", "Competitors", "Content Intelligence", "Page Opportunities", "Backlinks", "Reports"];
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
            : tab === "Competitors" ? <CompetitorsTab flash={flash} />
            : tab === "Content Intelligence" ? <ContentIntelTab flash={flash} />
            : tab === "Page Opportunities" ? <PageOppsTab flash={flash} />
            : tab === "Backlinks" ? <BacklinksTab flash={flash} />
            : tab === "Reports" ? <ReportsTab flash={flash} />
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

/* ── Competitors tab ────────────────────────────────────────────────────── */
const CAT_PILL: Record<string, string> = { "Car Rental": "bg-blue-500/15 text-blue-300", "Yacht Rental": "bg-cyan-500/15 text-cyan-300", Activities: "bg-emerald-500/15 text-emerald-300", "Airport Transfer": "bg-violet-500/15 text-violet-300", "Desert Safari": "bg-amber-500/15 text-amber-300", "Helicopter Tours": "bg-fuchsia-500/15 text-fuchsia-300", "Water Sports": "bg-sky-500/15 text-sky-300", "Tour Operators": "bg-rose-500/15 text-rose-300" };
const catPill = (c: string) => CAT_PILL[c] || "bg-slate-500/15 text-slate-300";
const scoreBg = (s: number) => (s >= 80 ? "bg-emerald-500/15 text-emerald-300" : s >= 60 ? "bg-sky-500/15 text-sky-300" : s >= 40 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300");
const threatBg = (t: string) => (t === "High" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : t === "Medium" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30");
function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 60, h = 22, n = data.length, max = Math.max(...data), min = Math.min(...data), range = Math.max(0.01, max - min);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" className="inline-block"><polyline points={data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}
function Logo({ name }: { name: string }) { return <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center text-[10px] font-bold text-white shrink-0">{(name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>; }

function CompetitorsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<CompetitorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getCompetitors({ category, q, page, perPage: 10 })); } finally { setLoading(false); } }, [category, q, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No competitor data.</div>;

  const k = d.kpis;
  const KPI = [
    { icon: Radar, label: "Total Competitors", kpi: k.totalCompetitors, color: "bg-violet-500/15 text-violet-300" },
    { icon: Activity, label: "Active Competitors", kpi: k.activeCompetitors, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: Sparkles, label: "New Competitors", kpi: k.newCompetitors, color: "bg-sky-500/15 text-sky-300" },
    { icon: AlertTriangle, label: "High Threat Competitors", kpi: k.highThreat, color: "bg-rose-500/15 text-rose-300" },
    { icon: Globe, label: "Market Coverage", kpi: k.marketCoverage, color: "bg-amber-500/15 text-amber-300" },
  ];
  const pills = ["All Categories", ...d.categories];
  const scoreMax = Math.max(1, ...d.scoreDistribution.map((s) => s.count));

  return (
    <div className="space-y-4">
      {addOpen && <AddCompetitorModal onClose={() => setAddOpen(false)} flash={flash} onDone={fetchData} />}
      <div><h2 className="text-lg font-bold text-white">Competitors</h2><p className="text-[12px] text-slate-500">Track & analyze all direct and indirect competitors across the UAE travel & mobility market.</p></div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">{pills.map((p) => { const active = (p === "All Categories" && !category) || p === category; return <button key={p} onClick={() => { setPage(1); setCategory(p === "All Categories" ? "" : p); }} className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${active ? "bg-violet-500/20 border-violet-500/40 text-violet-200" : "border-ink-700 text-slate-400 hover:text-white"}`}>{p}</button>; })}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search competitors…" className="w-52 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Add Competitor</button>
        </div>
      </div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">{KPI.map((x) => <KpiCard key={x.label} icon={x.icon} label={x.label} kpi={x.kpi} color={x.color} />)}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Competitor Overview table */}
        <FadeUp className="xl:col-span-2"><Card title="Competitor Overview" sub={`${d.table.total} tracked · sorted by traffic`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800">
              <th className="font-medium py-2 px-1">Competitor</th><th className="font-medium px-1">Category</th><th className="font-medium px-1">Traffic</th><th className="font-medium text-right px-1">Share</th><th className="font-medium text-center px-1">DR</th><th className="font-medium text-right px-1">Links</th><th className="font-medium text-center px-1">Reviews</th><th className="font-medium text-center px-1">Score</th><th className="font-medium text-center px-1">Trend</th><th className="font-medium text-center px-1">Actions</th>
            </tr></thead>
            <tbody>{d.table.rows.length === 0 ? <tr><td colSpan={10} className="text-center text-slate-500 py-8">No competitors match.</td></tr> : d.table.rows.map((c) => (
              <tr key={c.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="flex items-center gap-2"><Logo name={c.name} /><div className="min-w-0"><div className="text-slate-200 font-medium truncate max-w-[120px]">{c.name}</div><div className="text-[9px] text-slate-500 truncate max-w-[120px]">{c.website}</div></div></div></td>
                <td className="px-1"><span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${catPill(c.category)}`}>{c.category}</span></td>
                <td className="px-1 text-slate-300">{fmtK(c.estTraffic)}</td>
                <td className="px-1 text-right text-slate-300 font-semibold">{c.marketShare}%</td>
                <td className="px-1 text-center text-sky-300">{c.domainRating}</td>
                <td className="px-1 text-right text-slate-300">{fmtK(c.backlinks)}</td>
                <td className="px-1 text-center whitespace-nowrap"><span className="text-amber-300">{c.avgRating}</span> <Star className="w-3 h-3 text-amber-400 inline -mt-0.5" fill="currentColor" /></td>
                <td className="px-1 text-center"><span className={`inline-grid place-items-center min-w-[28px] rounded-md px-1.5 py-0.5 text-[11px] font-bold ${scoreBg(c.competitiveScore)}`}>{c.competitiveScore}</span></td>
                <td className="px-1 text-center"><Spark data={c.sparkline} color={c.trend === "up" ? "#34d399" : "#fb7185"} /></td>
                <td className="px-1"><div className="flex items-center justify-center gap-1 text-slate-500">
                  <button onClick={() => flash(`${c.name}: ${fmtK(c.estTraffic)} traffic · ${c.marketShare}% share · score ${c.competitiveScore} · ${c.threat} threat.`)} title="View profile" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => flash(`Analytics for ${c.name}: DR ${c.domainRating}, ${fmtK(c.backlinks)} backlinks, ${c.reviewCount.toLocaleString()} reviews (${c.avgRating}★).`)} title="Analytics" className="hover:text-white"><BarChart3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => flash(`${c.name} — source: ${c.source}. Use Scan to refresh metrics.`)} title="More" className="hover:text-white"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {d.table.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
            <span>Showing {(d.table.page - 1) * d.table.perPage + 1}–{Math.min(d.table.page * d.table.perPage, d.table.total)} of {d.table.total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: d.table.pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-violet-500/20 border border-violet-500/40 text-violet-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}
              <button disabled={page >= d.table.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Competitors by Category">
            <div className="flex items-center gap-3">
              <Donut segments={d.byCategory.segments} centerValue={d.byCategory.total} centerLabel="Total" />
              <div className="flex-1 space-y-1">{d.byCategory.segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} ({s.pct}%)</span></div>
              ))}</div>
            </div>
          </Card></FadeUp>

          <FadeUp><Card title="Competitive Score Distribution">
            <div className="space-y-2.5">{d.scoreDistribution.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{s.label}</span><span className="font-bold text-white">{s.count} <span className="text-slate-500 font-normal">({s.pct}%)</span></span></div>
                <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(s.count / scoreMax) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
              </div>
            ))}</div>
          </Card></FadeUp>

          <FadeUp><Card title="Top Competitor Threats">
            <div className="space-y-2">{d.threats.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
                <span className="text-[12px] text-slate-200 font-medium truncate">{t.name}</span>
                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${threatBg(t.threat)}`}>{t.threat} Threat</span>
              </div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Quick comparison */}
      <FadeUp><Card title="Competitor Quick Comparison" sub="Top 5 by traffic">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{d.quickComparison.map((c) => (
          <div key={c.name} className="rounded-xl border border-ink-800 bg-ink-800/30 p-3">
            <div className="flex items-center gap-2 mb-2"><Logo name={c.name} /><div className="min-w-0"><div className="text-[12px] text-white font-semibold truncate">{c.name}</div><div className="text-[9px] text-slate-500 truncate">{c.category}</div></div></div>
            <div className="grid grid-cols-3 gap-1 text-center mb-2">
              <div><div className="text-[9px] text-slate-500">Traffic</div><div className="text-[11px] font-bold text-slate-200">{fmtK(c.estTraffic)}</div></div>
              <div><div className="text-[9px] text-slate-500">Share</div><div className="text-[11px] font-bold text-slate-200">{c.share}%</div></div>
              <div><div className="text-[9px] text-slate-500">Score</div><div className={`text-[11px] font-bold ${c.score >= 70 ? "text-emerald-300" : c.score >= 50 ? "text-sky-300" : "text-amber-300"}`}>{c.score}</div></div>
            </div>
            <Spark data={c.sparkline} color="#8b5cf6" />
            <button onClick={() => flash(`${c.name} profile — ${fmtK(c.estTraffic)} monthly traffic, ${c.share}% share, competitive score ${c.score}.`)} className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"><Eye className="w-3 h-3" /> View Profile</button>
          </div>
        ))}</div>
      </Card></FadeUp>
    </div>
  );
}

/* ── Add competitor modal ───────────────────────────────────────────────── */
function AddCompetitorModal({ onClose, flash, onDone }: { onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", website: "", category: "Car Rental", estTraffic: "", domainRating: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.name.trim()) { flash("Enter a competitor name."); return; }
    setBusy(true);
    try { const r = await ciAddCompetitor({ name: form.name.trim(), website: form.website.trim(), category: form.category, estTraffic: Number(form.estTraffic) || 0, domainRating: Number(form.domainRating) || 0 }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); if (r.ok) { onDone(); onClose(); } }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-violet-400" /> Add Competitor</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <div className="space-y-3">
          <div><label className="text-[11px] text-slate-400">Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. SIXT UAE" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          <div><label className="text-[11px] text-slate-400">Website</label><input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="sixt.ae" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] text-slate-400">Category</label><select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white">{SCAN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="text-[11px] text-slate-400">Domain Rating</label><input value={form.domainRating} onChange={(e) => set("domainRating", e.target.value)} placeholder="0-100" inputMode="numeric" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          </div>
          <div><label className="text-[11px] text-slate-400">Est. Monthly Traffic</label><input value={form.estTraffic} onChange={(e) => set("estTraffic", e.target.value)} placeholder="e.g. 250000" inputMode="numeric" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add</button>
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Content Intelligence tab ───────────────────────────────────────────── */
const CTYPE_PILL: Record<string, string> = { "Blog Post": "bg-emerald-500/15 text-emerald-300", "Landing Page": "bg-blue-500/15 text-blue-300", Guide: "bg-violet-500/15 text-violet-300", "Comparison Page": "bg-amber-500/15 text-amber-300", "Updated Page": "bg-slate-500/15 text-slate-300" };
const CTYPE_ICON_BG: Record<string, string> = { "Blog Post": "from-emerald-500 to-teal-600", "Landing Page": "from-blue-500 to-indigo-600", Guide: "from-violet-500 to-purple-600", "Comparison Page": "from-amber-500 to-orange-600", "Updated Page": "from-slate-500 to-slate-600" };
const PLAT_BADGE: Record<string, { t: string; c: string }> = { Web: { t: "Web", c: "text-sky-300" }, Instagram: { t: "IG", c: "text-fuchsia-300" }, YouTube: { t: "YT", c: "text-rose-300" }, Blog: { t: "Blog", c: "text-emerald-300" } };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });

function ContentIntelTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ContentIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitor, setCompetitor] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getContentIntelligence({ competitor, category, type, q, page, perPage: 8 })); } finally { setLoading(false); } }, [competitor, category, type, q, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const scan = async () => { setBusy("scan"); try { const r = await ciScanContent(6); flash(r.ok ? `✓ ${r.message}` : (r.message || "Scan failed.")); if (r.ok) await fetchData(); } finally { setBusy(""); } };
  const exportCsv = async () => {
    setBusy("export");
    try {
      const full = await getContentIntelligence({ competitor, category, type, q, page: 1, perPage: 999 });
      const head = ["Title", "Competitor", "Type", "Category", "Target Keyword", "Platforms", "Engagement", "Published", "URL"];
      const rows = full.table.rows.map((r) => [r.title, r.competitorName, r.type, r.category, r.targetKeyword, r.platforms.join("|"), r.engagement, fmtDate(r.publishedAt), r.url].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const csv = [head.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "competitor-content.csv"; a.click(); URL.revokeObjectURL(url);
      flash(`✓ Exported ${full.table.rows.length} content items to CSV.`);
    } finally { setBusy(""); }
  };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No content data.</div>;

  const k = d.kpis;
  const KPI = [
    { icon: Layers, label: "Total New Content", kpi: k.totalNewContent, color: "bg-violet-500/15 text-violet-300" },
    { icon: FileText, label: "New Blog Posts", kpi: k.newBlogPosts, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: Globe, label: "New Landing Pages", kpi: k.newLandingPages, color: "bg-blue-500/15 text-blue-300" },
    { icon: Bookmark, label: "New Guides", kpi: k.newGuides, color: "bg-fuchsia-500/15 text-fuchsia-300" },
    { icon: BarChart3, label: "New Comparison Pages", kpi: k.newComparisonPages, color: "bg-amber-500/15 text-amber-300" },
    { icon: FileEdit, label: "Updated Pages", kpi: k.updatedPages, color: "bg-sky-500/15 text-sky-300" },
  ];
  const catOpts = ["All Categories", "Car Rental", "Yacht Rental", "Activities", "Airport Transfer", "Desert Safari"];

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-white">Competitor Content</h2><p className="text-[12px] text-slate-500">Track new content competitors publish across channels & content types.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{KPI.map((x) => <KpiCard key={x.label} icon={x.icon} label={x.label} kpi={x.kpi} color={x.color} />)}</Stagger>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={competitor} onChange={(e) => { setPage(1); setCompetitor(e.target.value === "All Competitors" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Competitors</option>{d.competitors.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value === "All Categories" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white">{catOpts.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value === "All Content Types" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Content Types</option>{d.types.map((t) => <option key={t}>{t}</option>)}</select>
        <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search content…" className="w-44 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportCsv} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white text-[12px] font-medium disabled:opacity-50">{busy === "export" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export Data</button>
          <button onClick={scan} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "scan" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Scan Content</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Latest content table */}
        <FadeUp className="xl:col-span-2"><Card title="Latest Content Published by Competitors" sub={`${d.table.total} items tracked`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Content</th><th className="font-medium px-1">Competitor</th><th className="font-medium px-1">Type</th><th className="font-medium px-1">Keyword</th><th className="font-medium px-1">Platform</th><th className="font-medium px-1">Published</th><th className="font-medium text-right px-1">Eng.</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
            <tbody>{d.table.rows.length === 0 ? <tr><td colSpan={8} className="text-center text-slate-500 py-8">No content matches.</td></tr> : d.table.rows.map((c) => (
              <tr key={c.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="flex items-center gap-2"><span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${CTYPE_ICON_BG[c.type] || "from-slate-500 to-slate-600"} grid place-items-center shrink-0`}><FileText className="w-3.5 h-3.5 text-white" /></span><div className="min-w-0"><div className="text-slate-200 font-medium truncate max-w-[190px]">{c.title}</div><div className="text-[9px] text-slate-500 truncate max-w-[190px]">{(c.website || "") + (c.url.split(c.website)[1] || "")}</div></div></div></td>
                <td className="px-1 text-slate-300 truncate max-w-[90px]">{c.competitorName}</td>
                <td className="px-1"><span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${CTYPE_PILL[c.type] || "bg-slate-500/15 text-slate-300"}`}>{c.type}</span></td>
                <td className="px-1 text-slate-400 truncate max-w-[110px]">{c.targetKeyword}</td>
                <td className="px-1"><div className="flex gap-1">{c.platforms.map((p) => { const b = PLAT_BADGE[p] || { t: p.slice(0, 3), c: "text-slate-400" }; return <span key={p} className={`text-[9px] font-bold ${b.c}`}>{b.t}</span>; })}</div></td>
                <td className="px-1 text-slate-400 whitespace-nowrap"><div>{fmtDate(c.publishedAt)}</div><div className="text-[9px] text-slate-600">{fmtTime(c.publishedAt)}</div></td>
                <td className="px-1 text-right whitespace-nowrap"><span className="text-slate-200 font-semibold">{fmtK(c.engagement)}</span> {c.trendUp ? <TrendingUp className="w-3 h-3 text-emerald-400 inline" /> : <TrendingDown className="w-3 h-3 text-rose-400 inline" />}</td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => flash(`${c.title} — ${c.type} by ${c.competitorName}, targeting “${c.targetKeyword}”. Est. engagement ${fmtK(c.engagement)}.`)} title="Preview" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => flash(`Saved “${c.title}” to watchlist.`)} title="Save" className="hover:text-white"><Bookmark className="w-3.5 h-3.5" /></button>
                  {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" title="Open" className="hover:text-white"><ExternalLink className="w-3.5 h-3.5" /></a> : <ExternalLink className="w-3.5 h-3.5 opacity-30" />}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {d.table.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
            <span>Showing {(d.table.page - 1) * d.table.perPage + 1}–{Math.min(d.table.page * d.table.perPage, d.table.total)} of {d.table.total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: d.table.pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-violet-500/20 border border-violet-500/40 text-violet-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}
              <button disabled={page >= d.table.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Content Type Distribution">
            <div className="flex items-center gap-3">
              <Donut segments={d.typeDistribution.segments} centerValue={d.typeDistribution.total} centerLabel="Total" />
              <div className="flex-1 space-y-1">{d.typeDistribution.segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} ({s.pct}%)</span></div>
              ))}</div>
            </div>
          </Card></FadeUp>

          <FadeUp><Card title="Top Content Topics">
            <div className="space-y-2">{d.topTopics.map((t, i) => (
              <div key={t.topic} className="flex items-center justify-between text-[12px]">
                <span className="text-slate-300 flex items-center gap-1.5 truncate"><span className="w-4 text-slate-600 text-[10px]">{i + 1}.</span>{t.topic}</span>
                <span className="flex items-center gap-2 shrink-0"><span className="text-white font-semibold">{t.mentions}</span>{t.trendUp ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}</span>
              </div>
            ))}</div>
          </Card></FadeUp>

          <FadeUp><Card title="Content Alerts">
            <div className="space-y-2">{d.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
                <span className="w-6 h-6 rounded-md bg-violet-500/15 text-violet-300 grid place-items-center shrink-0 mt-0.5"><FileText className="w-3 h-3" /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200 leading-snug">{a.title}</div></div>
                <span className="text-[10px] text-slate-600 shrink-0">{a.when}</span>
              </div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Recent highlights */}
      <FadeUp><Card title="Recent Content Highlights" sub="Newest competitor publications">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{d.recentHighlights.slice(0, 5).map((h) => (
          <div key={h.title} className="rounded-xl border border-ink-800 bg-ink-800/30 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-semibold text-slate-300 truncate">{h.competitorName}</span><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">New</span></div>
            <div className="text-[12px] text-white font-semibold leading-snug mb-1 line-clamp-2">{h.title}</div>
            <div className={`inline-block w-fit rounded px-1.5 py-0.5 text-[9px] font-medium mb-2 ${CTYPE_PILL[h.type] || "bg-slate-500/15 text-slate-300"}`}>{h.type} · {h.category}</div>
            <div className="mt-auto pt-2 text-[10px] text-slate-500 flex items-center justify-between"><span>{fmtDate(h.publishedAt)}</span><span className="text-slate-400">{fmtK(h.engagement)}</span></div>
            {h.url ? <a href={h.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"><ExternalLink className="w-3 h-3" /> View Content</a> : <span className="mt-1 text-[11px] text-slate-600">No link</span>}
          </div>
        ))}</div>
      </Card></FadeUp>
    </div>
  );
}

/* ── Page Opportunities tab ─────────────────────────────────────────────── */
const prioPill = (p: string) => (p === "High" ? "bg-rose-500/15 text-rose-300" : p === "Medium" ? "bg-amber-500/15 text-amber-300" : p === "Low" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300");
const kdColor = (kd: number) => (kd < 20 ? "text-emerald-300" : kd < 30 ? "text-amber-300" : "text-rose-300");
function KpiBox({ icon: Icon, label, value, trend, color, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; trend?: number; color: string; sub?: React.ReactNode }) {
  return <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span></div><div className="text-[12px] text-slate-500 mb-0.5">{label}</div><div className="text-2xl font-extrabold text-white leading-tight">{value}</div>{sub ? <div className="mt-1 text-[11px] text-slate-400 leading-tight truncate">{sub}</div> : trend != null ? <div className="mt-1"><Trend n={trend} /></div> : null}</div>;
}

function PageOppsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<PageOppsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(""); const [type, setType] = useState(""); const [priority, setPriority] = useState(""); const [competitor, setCompetitor] = useState(""); const [q, setQ] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getPageOpportunities({ category, type, priority, competitor, q, page, perPage: 10 })); } finally { setLoading(false); } }, [category, type, priority, competitor, q, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const exportCsv = async () => {
    setBusy("export");
    try {
      const full = await getPageOpportunities({ category, type, priority, competitor, q, page: 1, perPage: 999 });
      const head = ["Keyword", "Category", "Content Type", "Search Volume", "KD", "Competitor 1", "Competitor 2", "Competitor 3", "Our Ranking", "Traffic Potential", "Priority"];
      const rows = full.table.rows.map((r) => [r.keyword, r.category, r.contentType, r.searchVolume, r.kd, r.ranking[0], r.ranking[1], r.ranking[2], r.ourRanking ?? "Not Ranked", r.trafficPotential, r.priority].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "page-opportunities.csv"; a.click(); URL.revokeObjectURL(url);
      flash(`✓ Exported ${full.table.rows.length} page opportunities to CSV.`);
    } finally { setBusy(""); }
  };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No opportunity data.</div>;

  const k = d.kpis;
  const catOpts = ["All Categories", "Car Rental", "Yacht Rental", "Activities", "Airport Transfer", "Tour Operators"];
  const catMax = Math.max(1, ...d.topCategories.map((c) => c.count));

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-white">Page Opportunities</h2><p className="text-[12px] text-slate-500">Discover high-value pages competitors rank for that you don&apos;t. Create these pages to capture more traffic & leads.</p></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiBox icon={Layers} label="Total Page Opportunities" value={k.totalPageOpportunities.value.toLocaleString()} trend={k.totalPageOpportunities.trend} color="bg-violet-500/15 text-violet-300" />
        <KpiBox icon={Zap} label="High Priority Opportunities" value={k.highPriority.value.toLocaleString()} trend={k.highPriority.trend} color="bg-rose-500/15 text-rose-300" />
        <KpiBox icon={TrendingUp} label="Estimated Traffic Potential" value={fmtK(k.estTrafficPotential.value)} trend={k.estTrafficPotential.trend} color="bg-emerald-500/15 text-emerald-300" />
        <KpiBox icon={Target} label="Avg. Keyword Difficulty" value={k.avgKeywordDifficulty.value} trend={k.avgKeywordDifficulty.trend} color="bg-amber-500/15 text-amber-300" />
        <KpiBox icon={Radar} label="Top 3 Competitors" value={<span className="text-sm">{k.top3Competitors[0] || "—"}</span>} color="bg-sky-500/15 text-sky-300" sub={k.top3Competitors.slice(1).join(", ")} />
        <KpiBox icon={Plus} label="Page Opportunities Added" value={k.pageOppsAdded.value} trend={k.pageOppsAdded.trend} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value === "All Categories" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white">{catOpts.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value === "All Content Types" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Content Types</option>{d.types.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value === "All Priority Levels" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Priority Levels</option>{["High", "Medium", "Low", "Informational"].map((p) => <option key={p}>{p}</option>)}</select>
        <select value={competitor} onChange={(e) => { setPage(1); setCompetitor(e.target.value === "All Competitors" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white max-w-[150px]"><option>All Competitors</option>{d.competitors.map((c) => <option key={c}>{c}</option>)}</select>
        <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search keyword or topic…" className="w-48 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
        <button onClick={exportCsv} disabled={!!busy} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "export" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export Data</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Table */}
        <FadeUp className="xl:col-span-2"><Card title="Top Page Opportunities" sub={`${d.table.total} opportunities`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Page / Keyword</th><th className="font-medium px-1">Type</th><th className="font-medium text-center px-1">Vol.</th><th className="font-medium text-center px-1">KD</th><th className="font-medium px-1">Competitors Ranking</th><th className="font-medium px-1">Our Rank</th><th className="font-medium text-right px-1">Traffic</th><th className="font-medium text-center px-1">Priority</th><th className="font-medium text-center px-1">Act.</th></tr></thead>
            <tbody>{d.table.rows.length === 0 ? <tr><td colSpan={9} className="text-center text-slate-500 py-8">No opportunities match.</td></tr> : d.table.rows.map((o) => (
              <tr key={o.keyword} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="text-slate-200 font-medium truncate max-w-[180px]">{o.keyword}</div><div className="text-[9px] text-slate-500 truncate max-w-[180px]">{o.slug} · {o.category}</div></td>
                <td className="px-1"><span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${CTYPE_PILL[o.contentType] || "bg-slate-500/15 text-slate-300"}`}>{o.contentType}</span></td>
                <td className="px-1 text-center text-slate-300">{o.searchVolume.toLocaleString()}</td>
                <td className="px-1 text-center"><span className={`font-bold ${kdColor(o.kd)}`}>{o.kd}</span></td>
                <td className="px-1"><div className="flex flex-col gap-0.5">{o.ranking.map((n, i) => <span key={i} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-3.5 h-3.5 rounded-full bg-ink-700 grid place-items-center text-[7px] font-bold text-slate-300 shrink-0">{i + 1}</span><span className="truncate max-w-[90px]">{n}</span></span>)}</div></td>
                <td className="px-1"><span className="text-[10px] text-rose-300/90 whitespace-nowrap">{o.ourRanking == null ? "Not Ranked" : `#${o.ourRanking}`}</span></td>
                <td className="px-1 text-right text-emerald-300 font-semibold">{fmtK(o.trafficPotential)}</td>
                <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${prioPill(o.priority)}`}>{o.priority}</span></td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => flash(`${o.keyword}: vol ${o.searchVolume.toLocaleString()}, KD ${o.kd}, ${fmtK(o.trafficPotential)} traffic potential. Competitors: ${o.ranking.join(", ")}.`)} title="Details" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => flash(`✓ Page brief queued for “${o.keyword}” → handed to Copywriter Agent.`)} title="Create page" className="hover:text-white"><Plus className="w-3.5 h-3.5" /></button>
                  <button onClick={() => flash(`Saved “${o.keyword}” to opportunity watchlist.`)} title="Save" className="hover:text-white"><Bookmark className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {d.table.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
            <span>Showing {(d.table.page - 1) * d.table.perPage + 1}–{Math.min(d.table.page * d.table.perPage, d.table.total)} of {d.table.total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: Math.min(d.table.pages, 6) }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-violet-500/20 border border-violet-500/40 text-violet-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}
              {d.table.pages > 6 && <span className="text-slate-600">… {d.table.pages}</span>}
              <button disabled={page >= d.table.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Opportunities by Priority">
            <div className="flex items-center gap-3">
              <Donut segments={d.byPriority.segments} centerValue={d.byPriority.total} centerLabel="Total" />
              <div className="flex-1 space-y-1.5">{d.byPriority.segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span><span className="text-slate-200 font-semibold">{s.count} ({s.pct}%)</span></div>
              ))}</div>
            </div>
          </Card></FadeUp>

          <FadeUp><Card title="Estimated Traffic Potential" sub="Visits / month forecast">
            <div className="text-2xl font-extrabold text-white mb-1">{fmtK(d.trafficForecast.total)}<span className="text-[11px] font-normal text-slate-500 ml-1">visits/mo</span></div>
            <MultiLine labels={d.trafficForecast.labels} series={[{ points: d.trafficForecast.points, color: "#3b82f6", label: "Projected" }]} />
          </Card></FadeUp>

          <FadeUp><Card title="Top Opportunity Categories">
            <div className="space-y-2.5">{d.topCategories.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{c.label}</span><span className="font-bold text-white">{c.count} <span className="text-slate-500 font-normal">({c.pct}%)</span></span></div>
                <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: c.color }} initial={{ width: 0 }} animate={{ width: `${(c.count / catMax) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
              </div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Recommended next steps */}
      <FadeUp><Card title="Recommended Next Steps">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="rounded-xl border border-ink-800 bg-ink-800/30 p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-300 grid place-items-center"><Zap className="w-3.5 h-3.5" /></span><span className="text-[12px] font-semibold text-white">Create High Priority Pages</span></div>
            <p className="text-[10px] text-slate-500 flex-1">Start with {d.counts.high} high-priority opportunities that can drive the most traffic.</p>
            <button onClick={() => { setPriority("High"); setPage(1); }} className="mt-2 text-[11px] text-violet-300 hover:text-violet-200 text-left">View High Priority Pages →</button>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-800/30 p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center"><FileText className="w-3.5 h-3.5" /></span><span className="text-[12px] font-semibold text-white">Content Briefs</span></div>
            <p className="text-[10px] text-slate-500 flex-1">Generate AI content briefs for your top {d.counts.total} page opportunities.</p>
            <button onClick={() => flash(`✓ ${d.counts.high} content briefs queued → handed to Copywriter Agent.`)} className="mt-2 text-[11px] text-violet-300 hover:text-violet-200 text-left">Generate Briefs →</button>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-800/30 p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-300 grid place-items-center"><BarChart3 className="w-3.5 h-3.5" /></span><span className="text-[12px] font-semibold text-white">Track Progress</span></div>
            <p className="text-[10px] text-slate-500 flex-1">Monitor rankings & traffic after publishing new opportunity pages.</p>
            <button onClick={() => flash("Progress tracking is wired to the SEO Agent's rank monitor.")} className="mt-2 text-[11px] text-violet-300 hover:text-violet-200 text-left">Track →</button>
          </div>
          <div className="rounded-xl border border-ink-800 bg-ink-800/30 p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 grid place-items-center"><Download className="w-3.5 h-3.5" /></span><span className="text-[12px] font-semibold text-white">Export Opportunities</span></div>
            <p className="text-[10px] text-slate-500 flex-1">Export this list to CSV or share with your content team.</p>
            <button onClick={exportCsv} className="mt-2 text-[11px] text-violet-300 hover:text-violet-200 text-left">Export to CSV →</button>
          </div>
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-3 flex flex-col">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 grid place-items-center"><Sparkles className="w-3.5 h-3.5" /></span><span className="text-[12px] font-semibold text-white">AI Insight</span><span className="text-[8px] font-bold px-1 py-0.5 rounded bg-brand-500/20 text-brand-300">BETA</span></div>
            <p className="text-[10px] text-slate-400 flex-1">{d.aiInsight}</p>
            <button onClick={() => flash(d.aiInsight)} className="mt-2 text-[11px] text-brand-300 hover:text-brand-200 text-left">View Full AI Analysis →</button>
          </div>
        </div>
      </Card></FadeUp>
    </div>
  );
}

/* ── Backlinks tab ──────────────────────────────────────────────────────── */
const linkTypePill = (t: string) => (t === "Dofollow" ? "bg-emerald-500/15 text-emerald-300" : t === "Nofollow" ? "bg-sky-500/15 text-sky-300" : t === "UGC" ? "bg-violet-500/15 text-violet-300" : "bg-amber-500/15 text-amber-300");

function BacklinksTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<BacklinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitor, setCompetitor] = useState(""); const [type, setType] = useState(""); const [q, setQ] = useState("");
  const [page, setPage] = useState(1); const [subTab, setSubTab] = useState("New"); const [busy, setBusy] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getBacklinkIntel({ competitor, type, q, page, perPage: 6 })); } finally { setLoading(false); } }, [competitor, type, q, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const full = await getBacklinkIntel({ competitor, type, q, page: 1, perPage: 999 });
      const head = ["Referring Domain", "DR", "Traffic", "Link Type", "Anchor Text", "Linked Page", "First Seen", "Competitor"];
      const rows = full.newBacklinks.rows.map((r) => [r.domain, r.dr, r.traffic, r.linkType, r.anchor, r.linkedPage, fmtDate(r.firstSeen), r.competitor].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "backlinks.csv"; a.click(); URL.revokeObjectURL(url);
      flash(`✓ Exported ${full.newBacklinks.rows.length} backlinks to CSV.`);
    } finally { setBusy(false); }
  };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No backlink data.</div>;

  const k = d.kpis;
  const KPI = [
    { icon: LinkIcon, label: "Total Backlinks (All Competitors)", kpi: k.totalBacklinks, color: "bg-violet-500/15 text-violet-300" },
    { icon: TrendingUp, label: "New Backlinks", kpi: k.newBacklinks, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: TrendingDown, label: "Lost Backlinks", kpi: k.lostBacklinks, color: "bg-rose-500/15 text-rose-300" },
    { icon: Globe, label: "Referring Domains", kpi: k.referringDomains, color: "bg-sky-500/15 text-sky-300" },
    { icon: Star, label: "Avg. Domain Rating", kpi: k.avgDomainRating, color: "bg-amber-500/15 text-amber-300" },
    { icon: Target, label: "Links to TripReview.ai", kpi: k.linksToUs, color: "bg-brand-500/15 text-brand-300" },
  ];
  const anchorMax = Math.max(1, ...d.topAnchors.map((a) => a.backlinks));

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-white">Backlink Intelligence</h2><p className="text-[12px] text-slate-500">Track, analyze & compare backlink profiles to uncover link-building opportunities and strengthen domain authority.</p></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{KPI.map((x) => (
        <div key={x.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${x.color}`}><x.icon className="w-4.5 h-4.5" /></span>{x.kpi.est && <span className="text-[9px] font-semibold text-slate-500 border border-ink-700 rounded px-1.5 py-0.5">est.</span>}</div><div className="text-[12px] text-slate-500 mb-0.5 leading-tight">{x.label}</div><div className="text-2xl font-extrabold text-white">{fmtK(x.kpi.value)}</div><div className="mt-1"><Trend n={x.kpi.trend} /></div></div>
      ))}</div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={competitor} onChange={(e) => { setPage(1); setCompetitor(e.target.value === "All Competitors" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white max-w-[160px]"><option>All Competitors</option>{d.competitors.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={type} onChange={(e) => { setPage(1); setType(e.target.value === "All Link Types" ? "" : e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Link Types</option>{d.linkTypes.map((t) => <option key={t}>{t}</option>)}</select>
        <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search domain, URL or anchor…" className="w-56 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
        <button onClick={exportCsv} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export Data</button>
      </div>

      {/* Growth · By Type · Anchors */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Backlink Growth Over Time" sub="Total backlinks · last 8 days"><MultiLine labels={d.growthOverTime.labels} series={d.growthOverTime.series} /></Card></FadeUp>
        <FadeUp><Card title="Backlinks by Type">
          <div className="flex items-center gap-3"><Donut segments={d.byType.segments} centerValue={d.byType.total} centerLabel="Total" /><div className="flex-1 space-y-1.5">{d.byType.segments.map((s) => (<div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{fmtK(s.count)} ({s.pct}%)</span></div>))}</div></div>
        </Card></FadeUp>
        <FadeUp><Card title="Top Anchor Texts">
          <div className="space-y-2">{d.topAnchors.map((a) => (
            <div key={a.anchor}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300 truncate max-w-[130px]">{a.anchor}</span><span className="font-semibold text-white">{a.backlinks} <span className="text-slate-500 font-normal">{a.pct}%</span></span></div><Bar pct={(a.backlinks / anchorMax) * 100} color="#8b5cf6" /></div>
          ))}</div>
        </Card></FadeUp>
      </div>

      {/* New backlinks table + Top linking domains */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Backlinks" right={<div className="flex gap-1">{["New", "Lost", "Broken"].map((t) => <button key={t} onClick={() => setSubTab(t)} className={`px-2.5 h-7 rounded-md text-[11px] font-medium ${subTab === t ? "bg-violet-500/20 text-violet-200 border border-violet-500/40" : "text-slate-500 hover:text-white"}`}>{t}</button>)}</div>}>
          {subTab !== "New" ? <div className="text-slate-500 text-xs py-10 text-center">{subTab === "Lost" ? `${k.lostBacklinks.value} links lost in range. Row-level detail needs a live backlink API (Ahrefs/Majestic).` : "No broken backlinks detected in range."}</div> : (
            <><div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Referring Domain</th><th className="font-medium text-center px-1">DR</th><th className="font-medium px-1">Traffic</th><th className="font-medium px-1">Type</th><th className="font-medium px-1">Anchor</th><th className="font-medium px-1">Linked Page</th><th className="font-medium px-1">First Seen</th><th className="font-medium px-1">Competitor</th><th className="font-medium text-center px-1">Act.</th></tr></thead>
              <tbody>{d.newBacklinks.rows.length === 0 ? <tr><td colSpan={9} className="text-center text-slate-500 py-8">No backlinks match.</td></tr> : d.newBacklinks.rows.map((r, i) => (
                <tr key={i} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="py-2 px-1 text-slate-200 font-medium">{r.domain}</td>
                  <td className="px-1 text-center text-sky-300 font-semibold">{r.dr}</td>
                  <td className="px-1 text-slate-400">{r.traffic}</td>
                  <td className="px-1"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${linkTypePill(r.linkType)}`}>{r.linkType}</span></td>
                  <td className="px-1 text-slate-400 truncate max-w-[120px]">{r.anchor}</td>
                  <td className="px-1 text-slate-500 truncate max-w-[110px]">{r.linkedPage}</td>
                  <td className="px-1 text-slate-500 whitespace-nowrap">{fmtDate(r.firstSeen)}</td>
                  <td className="px-1 text-slate-300 truncate max-w-[90px]">{r.competitor}</td>
                  <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500"><a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="hover:text-white"><ExternalLink className="w-3.5 h-3.5" /></a><button onClick={() => flash(`Saved ${r.domain} → outreach list.`)} className="hover:text-white"><Bookmark className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}</tbody>
            </table></div>
            {d.newBacklinks.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500"><span>Showing {(d.newBacklinks.page - 1) * d.newBacklinks.perPage + 1}–{Math.min(d.newBacklinks.page * d.newBacklinks.perPage, d.newBacklinks.total)} of {d.newBacklinks.total}</span><div className="flex items-center gap-1"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>{Array.from({ length: d.newBacklinks.pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-violet-500/20 border border-violet-500/40 text-violet-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}<button disabled={page >= d.newBacklinks.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>}</>
          )}
        </Card></FadeUp>

        <FadeUp><Card title="Top Linking Domains">
          <div className="space-y-2">{d.topLinkingDomains.map((t) => (
            <div key={t.domain} className="flex items-center gap-2">
              <div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200 font-medium truncate">{t.domain}</div><div className="text-[10px] text-slate-500">DR {t.dr} · {fmtK(t.backlinks)} backlinks</div></div>
              <Spark data={t.trend} color="#34d399" />
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>

      {/* Profile comparison · Sources · Opportunities */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Backlink Profile Comparison">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Domain</th><th className="font-medium text-right px-1">Links</th><th className="font-medium text-right px-1">Ref Dom</th><th className="font-medium text-center px-1">DR</th><th className="font-medium text-center px-1">DF%</th></tr></thead>
            <tbody>{d.profileComparison.map((p) => (
              <tr key={p.name} className={`border-b border-ink-900/60 ${p.isUs ? "bg-brand-500/5" : ""}`}>
                <td className="py-2 px-1 truncate max-w-[110px]"><span className={p.isUs ? "text-brand-300 font-semibold" : "text-slate-200"}>{p.name}</span>{p.isUs && <span className="ml-1 text-[8px] text-brand-400">YOU</span>}</td>
                <td className="px-1 text-right text-slate-300">{fmtK(p.backlinks)}</td>
                <td className="px-1 text-right text-slate-400">{fmtK(p.referringDomains)}</td>
                <td className="px-1 text-center text-sky-300 font-semibold">{p.dr}</td>
                <td className="px-1 text-center text-emerald-300">{p.dofollowPct}%</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <FadeUp><Card title="Backlink Sources Distribution">
          <div className="flex items-center gap-3"><Donut segments={d.sourcesDistribution.segments} centerValue={d.sourcesDistribution.total} centerLabel="Total" /><div className="flex-1 space-y-1">{d.sourcesDistribution.segments.map((s) => (<div key={s.label} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold shrink-0">{fmtK(s.count)} ({s.pct}%)</span></div>))}</div></div>
        </Card></FadeUp>

        <FadeUp><Card title="Backlink Opportunities" sub="Domains linking to rivals, not you">
          <div className="space-y-2">{d.opportunities.map((o) => (
            <div key={o.domain} className="flex items-center gap-2 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
              <div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200 font-medium truncate">{o.domain}</div><div className="text-[10px] text-slate-500">DR {o.dr} · {o.reason}</div></div>
              <button onClick={() => flash(o.action === "Reclaim" ? `Reclaim task created for ${o.domain}.` : `Outreach email drafted for ${o.domain} → handed to Sales Agent.`)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${o.action === "Reclaim" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-brand-500/15 text-brand-200 border border-brand-500/30"}`}>{o.action === "Reclaim" ? <RefreshCw className="w-3 h-3" /> : <Send className="w-3 h-3" />}{o.action}</button>
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ── Reports tab ────────────────────────────────────────────────────────── */
const reportTypePill = (t: string) => (t === "Weekly" ? "bg-violet-500/15 text-violet-300" : t === "Daily" ? "bg-sky-500/15 text-sky-300" : t === "Monthly" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300");
const insightIcon = (k: string) => (k === "content" ? FileText : k === "opportunity" ? Lightbulb : k === "backlink" ? LinkIcon : DollarSign);

function ReportsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("All Reports");
  const [busy, setBusy] = useState("");
  const [schedOpen, setSchedOpen] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getReports({ period })); } finally { setLoading(false); } }, [period]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const download = async (key: string, name: string) => {
    setBusy("dl-" + key);
    try {
      const r = await ciGenerateReport({ key, name });
      if (r.ok) { const blob = new Blob([r.content], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = r.filename; a.click(); URL.revokeObjectURL(url); flash(`✓ ${r.message}`); fetchData(); }
      else flash(r.message || "Failed.");
    } finally { setBusy(""); }
  };
  const toggle = async (id: string) => { setBusy("t-" + id); try { const r = await ciToggleSchedule(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };
  const del = async (id: string) => { setBusy("d-" + id); try { const r = await ciDeleteSchedule(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No report data.</div>;

  const k = d.kpis;
  const areaMax = Math.max(1, ...d.topOpportunityAreas.map((a) => a.traffic));

  return (
    <div className="space-y-4">
      {schedOpen && <ScheduleReportModal onClose={() => setSchedOpen(false)} flash={flash} onDone={fetchData} />}
      <div><h2 className="text-lg font-bold text-white">Reports</h2><p className="text-[12px] text-slate-500">Comprehensive competitive-intelligence reports and insights.</p></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiBox icon={FileText} label="Total Reports Generated" value={k.totalReportsGenerated.value.toLocaleString()} trend={k.totalReportsGenerated.trend} color="bg-violet-500/15 text-violet-300" />
        <KpiBox icon={Activity} label="This Week Changes Detected" value={k.thisWeekChanges.value.toLocaleString()} trend={k.thisWeekChanges.trend} color="bg-emerald-500/15 text-emerald-300" />
        <KpiBox icon={Lightbulb} label="Opportunities Identified" value={k.opportunitiesIdentified.value.toLocaleString()} trend={k.opportunitiesIdentified.trend} color="bg-sky-500/15 text-sky-300" />
        <KpiBox icon={TrendingUp} label="Potential Traffic" value={fmtK(k.potentialTraffic.value)} trend={k.potentialTraffic.trend} color="bg-amber-500/15 text-amber-300" />
        <KpiBox icon={DollarSign} label="Potential Value" value={`$${fmtK(k.potentialValue.value)}`} trend={k.potentialValue.trend} color="bg-brand-500/15 text-brand-300" />
        <KpiBox icon={Target} label="Avg. Confidence Score" value={`${k.avgConfidence.value}%`} trend={k.avgConfidence.trend} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div>

      {/* Sub-tabs + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">{d.periods.map((p) => <button key={p} onClick={() => setPeriod(p)} className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${period === p ? "bg-violet-500/20 border-violet-500/40 text-violet-200" : "border-ink-700 text-slate-400 hover:text-white"}`}>{p}</button>)}</div>
        <button onClick={() => setSchedOpen(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Create Custom Report</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent reports */}
        <FadeUp className="xl:col-span-2"><Card title="Recent Reports" sub={`${d.recentReports.total} generated`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Report</th><th className="font-medium px-1">Type</th><th className="font-medium px-1">Period</th><th className="font-medium px-1">Key Insights</th><th className="font-medium px-1">Generated</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
            <tbody>{d.recentReports.rows.length === 0 ? <tr><td colSpan={6} className="text-center text-slate-500 py-8">No reports for this period.</td></tr> : d.recentReports.rows.map((r) => (
              <tr key={r.key} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="flex items-start gap-2"><span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-slate-200 font-medium leading-snug">{r.name}</div><div className="text-[9px] text-slate-500">{r.desc} · {r.competitors}</div></div></div></td>
                <td className="px-1"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${reportTypePill(r.type)}`}>{r.type}</span></td>
                <td className="px-1 text-slate-400 whitespace-nowrap">{r.period}</td>
                <td className="px-1"><ul className="space-y-0.5">{r.insights.map((ins, i) => <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1"><span className="text-violet-400 mt-1.5 w-1 h-1 rounded-full bg-violet-400 shrink-0" />{ins}</li>)}</ul></td>
                <td className="px-1 text-slate-500 whitespace-nowrap">{fmtDate(r.generatedOn)}<div className="text-[9px] text-slate-600">{fmtTime(r.generatedOn)}</div></td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => flash(`${r.name}: ${r.insights.join(" · ")}`)} title="View" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => download(r.key, r.name)} disabled={!!busy} title="Download" className="hover:text-white disabled:opacity-40">{busy === "dl-" + r.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => flash(`Report “${r.name}” — ${r.type}, ${r.period}.`)} title="More" className="hover:text-white"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Reports Overview" sub="Generated vs opportunities"><MultiLine labels={d.reportsOverview.labels} series={d.reportsOverview.series} /></Card></FadeUp>
          <FadeUp><Card title="Top Opportunity Areas">
            <div className="space-y-2.5">{d.topOpportunityAreas.map((a) => (
              <div key={a.label}>
                <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{a.label}</span><span className="text-slate-400">{fmtK(a.traffic)} · <span className="text-emerald-300 font-semibold">${fmtK(a.value)}</span></span></div>
                <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: a.color }} initial={{ width: 0 }} animate={{ width: `${(a.traffic / areaMax) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
              </div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Scheduled reports + insights */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Scheduled Reports" sub="Automated reports delivered to your team" right={<button onClick={() => setSchedOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"><Plus className="w-3 h-3" /> Schedule New</button>}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Report</th><th className="font-medium px-1">Frequency</th><th className="font-medium px-1">Next Run</th><th className="font-medium px-1">Status</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
            <tbody>{d.scheduledReports.map((s) => (
              <tr key={s.id} className="border-b border-ink-900/60">
                <td className="py-2 px-1"><div className="text-slate-200 font-medium">{s.name}</div><div className="text-[9px] text-slate-500 truncate max-w-[160px]">{s.recipients.join(", ")}</div></td>
                <td className="px-1 text-slate-400">{s.frequency}</td>
                <td className="px-1 text-slate-400 whitespace-nowrap">{fmtDate(s.nextRun)} {fmtTime(s.nextRun)}</td>
                <td className="px-1"><span className={`inline-flex items-center gap-1 text-[10px] font-medium ${s.status === "Active" ? "text-emerald-300" : "text-slate-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${s.status === "Active" ? "bg-emerald-400" : "bg-slate-500"}`} />{s.status}</span></td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => toggle(s.id)} disabled={!!busy} title={s.status === "Active" ? "Pause" : "Resume"} className="hover:text-white disabled:opacity-40">{busy === "t-" + s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : s.status === "Active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => del(s.id)} disabled={!!busy} title="Delete" className="hover:text-rose-300 disabled:opacity-40">{busy === "d-" + s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <FadeUp><Card title="Report Insights">
          <div className="space-y-2.5">{d.reportInsights.map((ins, i) => { const Ico = insightIcon(ins.icon); return (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2.5">
              <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-300 grid place-items-center shrink-0 mt-0.5"><Ico className="w-3.5 h-3.5" /></span>
              <div className="min-w-0"><div className="text-[12px] text-slate-200 leading-snug">{ins.text}</div><div className="text-[10px] text-slate-500">{ins.sub}</div></div>
            </div>
          ); })}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

function ScheduleReportModal({ onClose, flash, onDone }: { onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", frequency: "Weekly (Mon 9:00 AM)", recipients: "", reportType: "weekly_summary" });
  const [busy, setBusy] = useState(false);
  const set = (key: string, v: string) => setForm((f) => ({ ...f, [key]: v }));
  const submit = async () => {
    if (!form.name.trim()) { flash("Enter a report name."); return; }
    setBusy(true);
    try { const r = await ciScheduleReport({ name: form.name.trim(), frequency: form.frequency, recipients: form.recipients.split(/[,\s]+/).filter(Boolean), reportType: form.reportType }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); if (r.ok) { onDone(); onClose(); } }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-violet-400" /> Schedule Report</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <div className="space-y-3">
          <div><label className="text-[11px] text-slate-400">Report Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Weekly Car Rental Intel" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          <div><label className="text-[11px] text-slate-400">Report Type</label><select value={form.reportType} onChange={(e) => set("reportType", e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white"><option value="weekly_summary">Competitive Summary</option><option value="content_opps">Content Opportunities</option><option value="backlink">Backlink Intelligence</option><option value="pricing">Pricing Intelligence</option><option value="monthly_exec">Executive Summary</option></select></div>
          <div><label className="text-[11px] text-slate-400">Frequency</label><select value={form.frequency} onChange={(e) => set("frequency", e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white"><option>Daily (9:00 AM)</option><option>Weekly (Mon 9:00 AM)</option><option>Weekly (Fri 6:00 PM)</option><option>Monthly (1st, 9:00 AM)</option></select></div>
          <div><label className="text-[11px] text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Recipients</label><input value={form.recipients} onChange={(e) => set("recipients", e.target.value)} placeholder="marketing@tripreview.ai, ceo@tripreview.ai" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}Schedule</button>
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}
