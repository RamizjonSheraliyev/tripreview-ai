"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Network, Loader2, Bell, TrendingUp, TrendingDown, Sparkles, MapPin, Target, Gauge as GaugeIcon, Boxes,
  RefreshCw, CheckCircle2, ArrowRight, Search, Send, Globe, Building2, Zap, Star, Compass, DollarSign, Info, X, Eye, Plus, ChevronLeft, ChevronRight, Phone, Trash2, UserCheck, AlertTriangle, GitMerge, Settings, Database,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getMarketplaceGrowth, getMarketplaceProviders, discoverProviders, mktPublish, mktToSales, getProviderDiscovery, mktBulkPublish,
  getUnclaimedProfiles, mktDelete, mktToOnboarding, mktEnrich, getClaimFunnel, mktClaimInvite, getLeadScoring, getCategoryCoverage, getLocationCoverage,
  getDataQuality, mktEnrichBatch, mktMergeDuplicates, getExpansionOpportunities, mktEnrichAll,
  type MarketplaceData, type MktProvider, type DiscoveryData, type DiscoveryRow, type UnclaimedData, type UnclaimedRow, type ClaimFunnelData, type LeadScoringData, type CategoryCoverageData, type LocationCoverageData, type DataQualityData, type ExpansionData, type Kpi, type Seg,
} from "@/lib/api";

// Tabs render full Figma layouts (Provider Discovery · Unclaimed · Claim Funnel · Lead Scoring · Category Coverage — all live & data-backed).
const TABS = ["Overview", "Provider Discovery", "Unclaimed Profiles", "Claim Funnel", "Lead Scoring", "High-Value Providers", "Category Coverage", "Location Coverage", "Data Quality", "Expansion Opportunities", "All Providers"];
const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);
const aed = (n: number) => `AED ${n.toLocaleString()}`;
const ago = (d?: string | null) => { if (!d) return "—"; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };

function AnimatedNumber({ value, className, suffix, prefix }: { value: number; className?: string; suffix?: string; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { let raf = 0; const dur = 750, t0 = performance.now(); const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)) * 10) / 10); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value]);
  return <span className={className}>{prefix}{Number.isInteger(value) ? Math.round(n).toLocaleString() : n.toFixed(1)}{suffix}</span>;
}
function Card({ title, children, right, sub }: { title?: string; children: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20">{(title || right) && <div className="flex items-start justify-between gap-2 mb-3"><div>{title && <div className="text-[13px] font-bold text-white">{title}</div>}{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>}{children}</motion.div>;
}
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">vs last 7 days</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">vs 7d</span></span>; }
function KpiCard({ icon: Icon, label, kpi, color }: { icon: React.ElementType; label: string; kpi: Kpi; color: string }) {
  return <Item><motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-500/30"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span></div><div className="text-[12px] text-slate-500 mb-0.5">{label}</div><div className="text-2xl font-extrabold text-white"><AnimatedNumber value={kpi.value} suffix={kpi.suffix} prefix={kpi.prefix} /></div><div className="mt-1"><Trend n={kpi.trend} /></div></motion.div></Item>;
}
function Donut({ segments, total, label }: { segments: Seg[]; total: number; label: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  return <div className="relative w-[120px] h-[120px] shrink-0"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />{segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / Math.max(1, total)) * C; const el = <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="round" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: "easeOut" }} />; off += len; return el; })}</svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><AnimatedNumber value={total} className="text-xl font-extrabold text-white" /><div className="text-[9px] text-slate-500">{label}</div></div></div></div>;
}
function Gauge({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "#34d399" : value >= 60 ? "#38bdf8" : value >= 40 ? "#fbbf24" : "#fb7185";
  const R = 52, C = Math.PI * R, len = (Math.min(100, value) / 100) * C;
  return <div className="relative w-[160px] h-[92px]"><svg viewBox="0 0 130 74" className="w-full h-full"><path d="M9 70 A56 56 0 0 1 121 70" fill="none" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" /><motion.path d="M9 70 A56 56 0 0 1 121 70" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C}` }} transition={{ duration: 0.9, ease: "easeOut" }} /></svg><div className="absolute inset-x-0 bottom-0 text-center"><AnimatedNumber value={value} className="text-3xl font-extrabold text-white" suffix="%" /><div className="text-[10px] font-semibold" style={{ color }}>{label}</div></div></div>;
}
function MultiLine({ series, labels }: { series: { points: number[]; color: string; label: string }[]; labels: string[] }) {
  const w = 320, h = 150, n = Math.max(...series.map((s) => s.points.length), 1), max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - (v / max) * (h - 16) - 8;
  return <div><svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">{series.map((s, si) => (<g key={si}><motion.polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: si * 0.12 }} />{s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={s.color} />)}</g>))}</svg><div className="flex items-center justify-between mt-1"><div className="flex gap-3">{series.map((s) => <span key={s.label} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</div><span className="text-[9px] text-slate-600">{labels[0]} – {labels[labels.length - 1]}</span></div></div>;
}
function Mini({ series, color }: { series: number[]; color: string }) {
  const w = 120, h = 40, n = series.length, max = Math.max(1, ...series); const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - (v / max) * (h - 6) - 3;
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none"><motion.polyline points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} /></svg>;
}
function Bar({ pct, color }: { pct: number; color: string }) { return <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>; }
function Logo({ url, name }: { url?: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  if (url && !err) return <img src={url} alt={name} onError={() => setErr(true)} className="w-9 h-9 rounded-lg object-cover bg-white border border-ink-800 shrink-0" />;
  return <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-[10px] font-bold text-white shrink-0">{initials}</span>;
}
function Score({ s }: { s: number }) { return <span className={`w-8 h-8 inline-grid place-items-center rounded-full border text-[11px] font-bold ${s >= 70 ? "border-emerald-500/40 text-emerald-300" : s >= 50 ? "border-amber-500/40 text-amber-300" : "border-slate-600 text-slate-400"}`}>{s}</span>; }

export default function MarketplacePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<MarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [discOpen, setDiscOpen] = useState(false);
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = useCallback(async () => { setLoading(true); try { setData(await getMarketplaceGrowth()); } finally { setLoading(false); } }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 7000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{note}</div>}
        {discOpen && <DiscoverModal categories={data?.categories || []} onClose={() => setDiscOpen(false)} flash={flash} onDone={load} />}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white"><Network className="w-5 h-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Marketplace Growth Agent</h1><span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span> Active</span></div><p className="text-[11px] text-slate-500 truncate">Discovers providers & creates unclaimed profiles to grow the marketplace</p></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setDiscOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Sparkles className="w-4 h-4" /> Discover Providers</button>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white text-sm font-medium"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="mktTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} flash={flash} reload={load} />
            : tab === "Provider Discovery" ? <DiscoveryTab onOpen={() => setDiscOpen(true)} flash={flash} />
            : tab === "Unclaimed Profiles" ? <UnclaimedTab flash={flash} />
            : tab === "Claim Funnel" ? <ClaimFunnelTab flash={flash} />
            : tab === "Lead Scoring" ? <LeadScoringTab flash={flash} />
            : tab === "High-Value Providers" ? <ProvidersTab filter="highValue" flash={flash} />
            : tab === "Category Coverage" ? <CategoryCoverageTab />
            : tab === "Location Coverage" ? <LocationCoverageTab />
            : tab === "Data Quality" ? <DataQualityView flash={flash} />
            : tab === "Expansion Opportunities" ? <ExpansionView flash={flash} />
            : <ProvidersTab filter="all" flash={flash} />}
        </div>
      </main>
    </div>
  );
}

/* ============================== OVERVIEW ============================== */
function Overview({ data, flash, reload }: { data: MarketplaceData; flash: (m: string) => void; reload: () => void }) {
  const k = data.kpis;
  const maxPipe = Math.max(...data.pipeline.map((p) => p.count), 1);
  const send = async (name: string, id?: string) => { if (!id) { flash("Open a provider list to act."); return; } const r = await mktToSales(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); reload(); };
  void send;
  return (
    <div className="space-y-4">
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Building2} label="Providers Discovered" kpi={k.providersDiscovered} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Boxes} label="Unclaimed Created" kpi={k.unclaimedCreated} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={CheckCircle2} label="Profiles Claimed" kpi={k.profilesClaimed} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Star} label="High Value Providers" kpi={k.highValueProviders} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Compass} label="Coverage Score" kpi={k.coverageScore} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={TrendingUp} label="Growth Rate" kpi={k.growthRate} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Growth Overview" sub="Discovery → unclaimed → claimed">
          <MultiLine labels={data.overview.map((o) => o.label)} series={[{ points: data.overview.map((o) => o.discovered), color: "#818cf8", label: "Discovered" }, { points: data.overview.map((o) => o.unclaimed), color: "#38bdf8", label: "Unclaimed" }, { points: data.overview.map((o) => o.claimed), color: "#34d399", label: "Claimed" }]} />
        </Card></FadeUp>
        <FadeUp><Card title="Marketplace Health">
          <div className="grid place-items-center py-1"><Gauge value={data.health.score} label={data.health.label} /></div>
          <div className="space-y-1.5 mt-2">{data.health.metrics.map((m) => (<div key={m.label} className="flex items-center gap-2 text-[11.5px]"><span className="text-slate-400 flex-1">{m.label}</span><span className={`font-bold ${m.good ? "text-emerald-300" : m.value > 20 ? "text-rose-300" : "text-white"}`}>{m.value}%</span></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Providers by Category" right={<span className="text-[10px] text-slate-500">{data.byCategory.total} total</span>}>
          <div className="flex items-center gap-3"><Donut segments={data.byCategory.items} total={data.byCategory.total} label="Total" /><div className="space-y-1 flex-1 max-h-[130px] overflow-y-auto scrollbar-thin">{data.byCategory.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Top Locations Coverage">
          <div className="space-y-2.5">{data.topLocations.map((l) => (<div key={l.location}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-300">{l.location}</span><span className="text-slate-500">{l.coverageScore}% · {l.total} <span className="text-emerald-400">+{l.newThisWeek}</span></span></div><Bar pct={l.coverageScore} color={l.coverageScore >= 75 ? "#34d399" : l.coverageScore >= 45 ? "#fbbf24" : "#fb7185"} /></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="High Value Providers" sub="Top opportunities">
          <div className="space-y-2">{data.highValueProviders.map((h, i) => (<div key={i} className="flex items-center gap-2.5"><Logo url={h.logoUrl} name={h.name} /><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{h.name}</div><div className="text-[10px] text-slate-500 truncate">{h.category}</div></div><Score s={h.growthScore} /><span className="text-[11px] text-emerald-400 font-semibold w-[68px] text-right">{aed(h.revenue)}/mo</span></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Recent Activities">
          {data.activities.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No activity yet — run discovery.</div> :
            <div className="space-y-2.5">{data.activities.map((a, i) => (<div key={i} className="flex items-start gap-2.5"><span className="w-6 h-6 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-3 h-3" /></span><div className="min-w-0 flex-1"><div className="text-[11.5px] text-white truncate">{a.detail}</div><div className="text-[10px] text-slate-500">{ago(a.at)}</div></div></div>))}</div>}
        </Card></FadeUp>
      </div>

      <FadeUp><Card title="Marketplace Growth Pipeline" sub="Discovered → live subscribers">
        <div className="flex flex-wrap gap-2">{data.pipeline.map((p, i) => (
          <div key={p.label} className="flex items-center gap-2 flex-1 min-w-[130px]">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex-1 rounded-xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${p.color}28, ${p.color}10)`, border: `1px solid ${p.color}40` }}>
              <div className="text-[10px] text-slate-400 font-medium">{p.label}</div>
              <div className="text-xl font-extrabold text-white mt-0.5"><AnimatedNumber value={p.count} /></div>
              <div className="text-[10px]" style={{ color: p.color }}>{maxPipe ? Math.round((p.count / maxPipe) * 100) : 0}%</div>
            </motion.div>
            {i < data.pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden xl:block" />}
          </div>
        ))}</div>
      </Card></FadeUp>

      <FadeUp><Card title="Growth Forecast" sub="Projected from current run-rate">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{data.forecast.map((f) => (<div key={f.label} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[11px] text-slate-500">{f.label}</div><div className="text-2xl font-extrabold text-emerald-400">+<AnimatedNumber value={f.value} /></div><div className="text-[10px] text-slate-500 mb-1">New Providers</div><Mini series={f.series} color="#34d399" /></div>))}</div>
      </Card></FadeUp>
    </div>
  );
}

/* ============================== DISCOVER MODAL ============================== */
function DiscoverModal({ categories, onClose, flash, onDone }: { categories: string[]; onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [category, setCategory] = useState(categories[0] || "Car Rental");
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ name: string; category: string; location: string; growthScore: number; source: string }[] | null>(null);
  const run = async () => { setBusy(true); setResult(null); try { const r = await discoverProviders({ category, count }); if (r.ok) { setResult(r.created || []); flash(`✓ ${r.message}`); onDone(); } else flash(r.message || "Failed."); } finally { setBusy(false); } };
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 z-[199]" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(94vw,480px)] bg-ink-950 border border-ink-800 rounded-2xl z-[200] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center"><Sparkles className="w-4 h-4" /></span><div className="font-bold text-white">Discover Providers</div></div><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-800"><X className="w-4 h-4 text-slate-400" /></button></div>
        <p className="text-[12px] text-slate-400 mb-4">The agent searches the web for real Dubai/UAE provider companies and creates <span className="text-slate-200">unclaimed profiles</span> for them.</p>
        <div className="flex gap-2 mb-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1 bg-ink-900 border border-ink-800 rounded-lg px-3 h-10 text-[13px] text-white outline-none">{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="bg-ink-900 border border-ink-800 rounded-lg px-3 h-10 text-[13px] text-white outline-none">{[3, 6, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </div>
        <button onClick={run} disabled={busy} className="w-full h-11 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching the web…</> : <><Search className="w-4 h-4" /> Discover {count} {category}</>}</button>
        {result && <div className="mt-4 max-h-[240px] overflow-y-auto scrollbar-thin space-y-1.5">{result.length === 0 ? <div className="text-[12px] text-slate-500 text-center py-2">No new providers found (all already known).</div> : result.map((r, i) => (<div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-ink-900/50 text-[12px]"><span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-300 grid place-items-center"><CheckCircle2 className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-white font-medium truncate">{r.name}</div><div className="text-[10px] text-slate-500 truncate">{r.category} · {r.location} · {r.source}</div></div><Score s={r.growthScore} /></div>))}</div>}
      </motion.div>
    </>
  );
}

/* ============================== DISCOVERY TAB (full Figma) ============================== */
const DSTAT_TONE: Record<string, string> = { New: "bg-emerald-500/15 text-emerald-300", Review: "bg-amber-500/15 text-amber-300", Converted: "bg-sky-500/15 text-sky-300" };
const confColor = (c: number) => (c >= 80 ? "#34d399" : c >= 60 ? "#38bdf8" : c >= 40 ? "#fbbf24" : "#fb7185");

function DiscoveryTab({ onOpen, flash }: { onOpen: () => void; flash: (m: string) => void }) {
  const [d, setD] = useState<DiscoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [source, setSource] = useState(""); const [confidence, setConfidence] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set());
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getProviderDiscovery({ q, category, source, confidence, status, page, perPage: 10 })); } finally { setLoading(false); } }, [q, category, source, confidence, status, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); setSel(new Set()); }, [q, category, source, confidence, status]);
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => { setBusy(id + lbl); try { const r = await fn(); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); } finally { setBusy(""); } };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkPublish = async () => { if (!sel.size) { flash("Select providers first."); return; } setBusy("bulk"); try { const r = await mktBulkPublish(Array.from(sel)); flash(r.ok ? `✓ ${r.message}` : "Failed"); setSel(new Set()); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Discover new travel-service providers from multiple sources across the UAE and create unclaimed profiles. Each is scored by <span className="text-slate-200">confidence</span> (how complete the web match is). Publish good ones or hand them to Sales.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Building2} label="New Providers Found" kpi={k.newProvidersFound} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={CheckCircle2} label="High Confidence (80%+)" kpi={k.highConfidence} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Globe} label="Sources Scanned" kpi={k.sourcesScanned} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Boxes} label="Total Opportunities" kpi={k.totalOpportunities} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Zap} label="Converted to Profiles" kpi={k.convertedToProfiles} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Target} label="Success Rate" kpi={k.successRate} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-[160px] max-w-xs"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers, websites…" className="w-full bg-ink-900 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Sources</option>{d.sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Confidence</option><option value="high">High (80%+)</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Status</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <button onClick={onOpen} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-semibold"><Sparkles className="w-3.5 h-3.5" /> Discover</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Discovery Sources Performance">
          {d.sourcesPerformance.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No sources yet.</div> :
            <table className="w-full text-[11.5px]"><thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1.5">Source</th><th className="font-medium text-right">Found</th><th className="font-medium text-right">High Conf</th><th className="font-medium text-right">Success</th></tr></thead>
              <tbody>{d.sourcesPerformance.map((s) => (<tr key={s.source} className="border-t border-ink-800/60"><td className="py-1.5 text-slate-300 truncate max-w-[120px]">{s.source}</td><td className="text-right text-white font-semibold">{s.found}</td><td className="text-right text-emerald-300">{s.highConfidence}</td><td className="text-right"><span className="inline-flex items-center gap-1.5"><span className="w-8"><Bar pct={s.successRate} color="#34d399" /></span>{s.successRate}%</span></td></tr>))}</tbody>
            </table>}
        </Card></FadeUp>
        <FadeUp><Card title="Providers Found Trend"><MultiLine labels={d.foundTrend.map((t) => t.label)} series={[{ points: d.foundTrend.map((t) => t.totalFound), color: "#818cf8", label: "Total Found" }, { points: d.foundTrend.map((t) => t.highConfidence), color: "#38bdf8", label: "High Confidence" }, { points: d.foundTrend.map((t) => t.converted), color: "#34d399", label: "Converted" }]} /></Card></FadeUp>
        <FadeUp><Card title="Providers by Category" right={<span className="text-[10px] text-slate-500">{d.byCategory.total}</span>}><div className="flex items-center gap-3"><Donut segments={d.byCategory.items} total={d.byCategory.total} label="Total" /><div className="space-y-1 flex-1 max-h-[130px] overflow-y-auto scrollbar-thin">{d.byCategory.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div></Card></FadeUp>
      </div>

      <Card title="New Provider Opportunities" sub={`${d.table.total} discovered`} right={sel.size > 0 ? <button onClick={bulkPublish} disabled={!!busy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/25">{busy === "bulk" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Publish {sel.size} selected</button> : undefined}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="px-2 py-2 w-6"></th><th className="font-medium px-2">Company</th><th className="font-medium px-2">Category</th><th className="font-medium px-2">Location</th><th className="font-medium px-2">Source</th><th className="font-medium px-2">Confidence</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Contact</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {d.table.rows.length === 0 ? <tr><td colSpan={9} className="text-center text-slate-600 py-10">No opportunities yet — click Discover to find providers.</td></tr> :
                d.table.rows.map((r) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                    <td className="px-2"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="accent-brand-500" /></td>
                    <td className="py-2 px-2"><div className="min-w-0"><div className="font-semibold text-white truncate max-w-[160px]">{r.company}</div>{r.website && <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" className="text-[10px] text-brand-400 truncate inline-block max-w-[160px]">{r.website.replace(/^https?:\/\//, "")}</a>}</div></td>
                    <td className="px-2 text-slate-400">{r.category}</td>
                    <td className="px-2 text-slate-400 truncate max-w-[100px]">{r.location}</td>
                    <td className="px-2 text-slate-400 truncate max-w-[110px]">{r.source}</td>
                    <td className="px-2"><div className="flex items-center gap-1.5 w-[80px]"><div className="flex-1"><Bar pct={r.confidence} color={confColor(r.confidence)} /></div><span className="text-[10px] text-slate-400 w-7">{r.confidence}%</span></div></td>
                    <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DSTAT_TONE[r.status]}`}>{r.status}</span></td>
                    <td className="px-2 text-slate-400 whitespace-nowrap">{r.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone.slice(-9)}</span> : "—"}</td>
                    <td className="px-2"><div className="flex items-center justify-end gap-1">
                      {!r.converted && <button onClick={() => act(r.id, () => mktPublish(r.id), "p")} disabled={!!busy} title="Publish to marketplace" className="w-7 h-7 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busy === r.id + "p" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}</button>}
                      <button onClick={() => act(r.id, () => mktToSales(r.id), "s")} disabled={!!busy} title="Send to Sales" className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 text-slate-400 hover:text-white hover:border-ink-700 disabled:opacity-50">{busy === r.id + "s" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}</button>
                    </div></td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
          <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} results</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
            <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Discovery by Location" sub="Top 5">
          {d.byLocation.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No locations yet.</div> :
            <div className="space-y-2.5">{d.byLocation.map((l) => (<div key={l.location}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-300 truncate max-w-[200px]">{l.location}</span><span className="text-slate-500">{l.count} · {l.pct}%</span></div><Bar pct={l.pct} color="#818cf8" /></div>))}</div>}
        </Card></FadeUp>
        <FadeUp><Card title="Confidence Distribution">
          <div className="flex items-center gap-4"><Donut segments={d.confidenceDist.segments} total={d.confidenceDist.total} label="Total" /><div className="space-y-1.5 flex-1">{d.confidenceDist.segments.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div>))}</div></div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== PROVIDERS TAB ============================== */
function ProvidersTab({ filter, flash }: { filter: string; flash: (m: string) => void }) {
  const [rows, setRows] = useState<MktProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState("");
  const fetchRows = useCallback(async () => { setLoading(true); try { const r = await getMarketplaceProviders({ filter, q }); setRows(r.providers); } finally { setLoading(false); } }, [filter, q]);
  useEffect(() => { fetchRows(); }, [fetchRows]);
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => { setBusy(id + lbl); try { const r = await fn(); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchRows(); } finally { setBusy(""); } };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><div className="relative flex-1 max-w-xs"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers…" className="w-full bg-ink-900 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div><span className="text-[11px] text-slate-500">{rows.length} providers</span></div>
      {loading ? <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div> :
        rows.length === 0 ? <div className="text-center text-slate-500 py-20 text-[13px]">No providers in this view. Run discovery to add some.</div> :
          <Stagger><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((p) => (
              <Item key={p.id}><motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 hover:border-ink-700">
                <div className="flex items-start gap-3">
                  <Logo url={p.logoUrl} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold text-white truncate">{p.name}</span>{p.claimed ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">Claimed</span> : <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">Unclaimed</span>}</div>
                    <div className="text-[11px] text-slate-500 truncate">{p.category} · {p.location} · {p.source}</div>
                    {p.website && <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" className="text-[10px] text-brand-400 inline-flex items-center gap-1 truncate max-w-[200px]"><Globe className="w-3 h-3" />{p.website.replace(/^https?:\/\//, "")}</a>}
                  </div>
                  <Score s={p.growthScore} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px]"><span className="text-slate-400">Revenue est. <span className="text-emerald-400 font-semibold">{aed(p.revenue)}/mo</span></span><span className="text-slate-500">Profile {p.strength}%</span></div>
                <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-2">
                  {!p.published && <button onClick={() => act(p.id, () => mktPublish(p.id), "p")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50">{busy === p.id + "p" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Publish</button>}
                  <button onClick={() => act(p.id, () => mktToSales(p.id), "s")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-brand-500/15 text-brand-300 text-[12px] font-semibold hover:bg-brand-500/25 disabled:opacity-50">{busy === p.id + "s" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />} To Sales</button>
                </div>
              </motion.div></Item>
            ))}
          </div></Stagger>}
    </div>
  );
}

/* ============================== COVERAGE / DATA QUALITY ============================== */
function CoverageTab({ data, kind }: { data: MarketplaceData; kind: "category" | "location" }) {
  if (kind === "category") return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Providers by Category"><div className="flex items-center gap-4"><Donut segments={data.byCategory.items} total={data.byCategory.total} label="Total" /><div className="space-y-1.5 flex-1">{data.byCategory.items.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div>))}</div></div></Card>
      <Card title="Category Bars">{data.byCategory.items.map((s) => (<div key={s.label} className="mb-2.5"><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-300">{s.label}</span><span className="font-bold text-white">{s.count}</span></div><Bar pct={s.pct} color={s.color} /></div>))}</Card>
    </div>
  );
  return <Card title="Location Coverage"><div className="space-y-3">{data.topLocations.map((l) => (<div key={l.location}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-300">{l.location}</span><span className="text-slate-500">{l.total} providers · <span className="text-emerald-400">+{l.newThisWeek} this week</span></span></div><div className="flex items-center gap-2"><div className="flex-1"><Bar pct={l.coverageScore} color={l.coverageScore >= 75 ? "#34d399" : l.coverageScore >= 45 ? "#fbbf24" : "#fb7185"} /></div><span className="text-[11px] font-bold text-white w-10 text-right">{l.coverageScore}%</span></div></div>))}</div></Card>;
}
function DataQualityTab({ data }: { data: MarketplaceData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Health Score"><div className="grid place-items-center py-2"><Gauge value={data.health.score} label={data.health.label} /></div></Card>
      <div className="lg:col-span-2"><Card title="Quality Metrics"><div className="space-y-3 py-1">{data.health.metrics.map((m) => (<div key={m.label}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-400">{m.label}</span><span className={`font-bold ${m.good ? "text-emerald-300" : m.value > 20 ? "text-rose-300" : "text-white"}`}>{m.value}%</span></div><Bar pct={m.value} color={m.good ? "#34d399" : m.value > 20 ? "#fb7185" : "#fbbf24"} /></div>))}</div></Card></div>
    </div>
  );
}

/* ============================== UNCLAIMED PROFILES (full Figma) ============================== */
const USTAT_TONE: Record<string, string> = { Published: "bg-emerald-500/15 text-emerald-300", "Pending Review": "bg-amber-500/15 text-amber-300", "Requiring Attention": "bg-rose-500/15 text-rose-300", Claimed: "bg-sky-500/15 text-sky-300", Rejected: "bg-slate-500/15 text-slate-300" };
const PILLS: [string, string][] = [["All Profiles", "all"], ["New", "New"], ["Published", "Published"], ["Pending Review", "Pending Review"], ["Requiring Attention", "Requiring Attention"], ["Claimed", "Claimed"], ["Rejected", "Rejected"]];
function Ring({ v }: { v: number }) { const R = 12, C = 2 * Math.PI * R, col = v >= 70 ? "#34d399" : v >= 40 ? "#fbbf24" : "#fb7185"; return <span className="relative inline-grid place-items-center w-8 h-8"><svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90"><circle cx="16" cy="16" r={R} fill="none" stroke="#1e293b" strokeWidth="3" /><motion.circle cx="16" cy="16" r={R} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${(v / 100) * C} ${C}` }} transition={{ duration: 0.7 }} /></svg><span className="absolute text-[8px] font-bold text-white">{v}</span></span>; }

function UnclaimedTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<UnclaimedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [source, setSource] = useState(""); const [confidence, setConfidence] = useState(""); const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set());
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getUnclaimedProfiles({ q, category, source, confidence, status: status === "all" ? "" : status, page, perPage: 10 })); } finally { setLoading(false); } }, [q, category, source, confidence, status, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); setSel(new Set()); }, [q, category, source, confidence, status]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => { setBusy(id + lbl); try { const r = await fn(); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); } finally { setBusy(""); } };
  const bulk = async (fn: (ids: string[]) => Promise<{ ok: boolean; message?: string }>, lbl: string) => { if (!sel.size) { flash("Select profiles first."); return; } setBusy(lbl); try { const r = await fn(Array.from(sel)); flash(r.ok ? `✓ ${r.message}` : "Failed"); setSel(new Set()); await fetchData(); } finally { setBusy(""); } };
  const enrichSel = async () => { if (!sel.size) { flash("Select profiles first."); return; } setBusy("enrich"); flash(`Enriching ${sel.size} profiles from the web (logo · description · reviews)…`); try { let n = 0; for (const id of Array.from(sel)) { const r = await mktEnrich(id); if (r.ok) n++; } flash(`✓ Enriched ${n} profiles — logos, descriptions & real web reviews added.`); setSel(new Set()); await fetchData(); } finally { setBusy(""); } };
  // Enrich ALL thin providers (no logo / no reviews / no description) in one go —
  // pulls logo, description and real web reviews, recomputes trust score.
  const enrichAll = async () => { setBusy("enrichAll"); flash("Enriching providers from the web (logo · description · real reviews)… this can take a minute."); try { const r = await mktEnrichAll(12); flash(r.ok ? `✓ ${r.message}` : (r.message || "Enrichment failed.")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">All auto-created unclaimed company profiles. Enrich missing info, publish good ones, send promising ones to the Onboarding Agent, or delete junk. Select rows to run bulk actions.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Boxes} label="Total Unclaimed" kpi={k.totalUnclaimed} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Star} label="New This Week" kpi={k.newThisWeek} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={CheckCircle2} label="Published" kpi={k.published} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={UserCheck} label="Claimed This Month" kpi={k.claimedThisMonth} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Compass} label="Pending Review" kpi={k.pendingReview} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Zap} label="Requiring Attention" kpi={k.requiringAttention} color="bg-rose-500/15 text-rose-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {PILLS.map(([label, val]) => <button key={val} onClick={() => setStatus(val)} className={`px-3 h-8 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 ${status === val ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400 hover:text-white"}`}>{label}<span className={`text-[10px] ${status === val ? "text-brand-100" : "text-slate-600"}`}>{d.counts[val === "all" ? "all" : val] ?? 0}</span></button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative flex-1 min-w-[150px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, website, phone…" className="w-full bg-ink-900 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Sources</option>{d.sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <select value={confidence} onChange={(e) => setConfidence(e.target.value)} className="bg-ink-900 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Confidence</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            <button onClick={enrichAll} disabled={!!busy} title="Auto-fill logos, descriptions & real web reviews for providers that are missing them, then recompute trust scores" className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "enrichAll" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Enrich All from Web</button>
          </div>

          {sel.size > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/5 px-3 py-2">
            <span className="text-[12px] text-brand-200 font-semibold">{sel.size} selected:</span>
            <button onClick={enrichSel} disabled={!!busy} title="Web search: logo, description & real customer reviews (Google/Trustpilot) + trust score" className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-ink-800 text-slate-200 text-[12px] font-semibold hover:bg-ink-700 disabled:opacity-50">{busy === "enrich" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Enrich from Web (logo · reviews)</button>
            <button onClick={() => bulk(mktToOnboarding, "onb")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-ink-800 text-slate-200 text-[12px] font-semibold hover:bg-ink-700 disabled:opacity-50">{busy === "onb" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />} Send to Onboarding</button>
            <button onClick={() => bulk(mktBulkPublish, "pub")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50">{busy === "pub" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Bulk Publish</button>
            <button onClick={() => bulk(mktDelete, "del")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-rose-500/15 text-rose-300 text-[12px] font-semibold hover:bg-rose-500/25 disabled:opacity-50">{busy === "del" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete</button>
          </div>}

          <Card>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="px-2 py-2 w-6"></th><th className="font-medium px-2">Company</th><th className="font-medium px-2">Category</th><th className="font-medium px-2">Source</th><th className="font-medium px-2">Conf</th><th className="font-medium px-2">Quality</th><th className="font-medium px-2">Status</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={8} className="text-center text-slate-600 py-10">No profiles in this view.</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="px-2"><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="accent-brand-500" /></td>
                        <td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.company} /><div className="min-w-0"><div className="font-semibold text-white truncate flex items-center gap-1.5 max-w-[170px]">{r.company}{r.isNew && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-sky-500/15 text-sky-300">NEW</span>}</div><div className="text-[10px] text-slate-500 truncate max-w-[170px]">{r.website || r.location}</div></div></div></td>
                        <td className="px-2 text-slate-400">{r.category}</td>
                        <td className="px-2 text-slate-400 truncate max-w-[100px]">{r.source}</td>
                        <td className="px-2"><div className="flex items-center gap-1 w-[60px]"><div className="flex-1"><Bar pct={r.confidence} color={confColor(r.confidence)} /></div><span className="text-[10px] text-slate-400">{r.confidence}</span></div></td>
                        <td className="px-2"><Ring v={r.quality} /></td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${USTAT_TONE[r.status]}`}>{r.status}</span></td>
                        <td className="px-2"><div className="flex items-center justify-end gap-1">
                          {r.missing.length > 0 && <button onClick={() => act(r.id, () => mktEnrich(r.id), "e")} disabled={!!busy} title="Generate missing info" className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 text-slate-400 hover:text-white hover:border-ink-700 disabled:opacity-50">{busy === r.id + "e" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}</button>}
                          {r.status !== "Published" && <button onClick={() => act(r.id, () => mktPublish(r.id), "p")} disabled={!!busy} title="Publish" className="w-7 h-7 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busy === r.id + "p" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}</button>}
                        </div></td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} results</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Status Breakdown"><div className="flex items-center gap-3"><Donut segments={d.statusBreakdown.segments} total={d.statusBreakdown.total} label="Total" /><div className="space-y-1 flex-1">{d.statusBreakdown.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div></Card></FadeUp>
          <FadeUp><Card title="Average Profile Quality">
            <div className="grid place-items-center py-1"><Gauge value={d.avgQuality} label="Average" /></div>
            <div className="space-y-1 mt-2">{d.starDist.map((s) => (<div key={s.star} className="flex items-center gap-2 text-[11px]"><span className="text-amber-300 inline-flex">{Array.from({ length: s.star }).map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-amber-300" />)}</span><div className="flex-1"><Bar pct={s.pct} color="#fbbf24" /></div><span className="text-white font-bold w-7 text-right">{s.count}</span></div>))}</div>
          </Card></FadeUp>
          <FadeUp><Card title="Top Missing Information">
            {d.topMissing.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">All complete. ✓</div> :
              <div className="space-y-1.5">{d.topMissing.map((m) => (<div key={m.label} className="flex items-center gap-2 text-[11.5px]"><span className="text-slate-300 flex-1">{m.label}</span><span className="font-bold text-white">{m.count}</span><span className="text-slate-600 text-[10px]">{m.pct}%</span></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ============================== CLAIM FUNNEL (full Figma) ============================== */
const FSTEP_ICONS = [Building2, Globe, Eye, Send, CheckCircle2, Star];
function ClaimFunnelTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ClaimFunnelData | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getClaimFunnel()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const invite = async () => { if (!d) return; const ids = d.recentClaims.filter((r) => r.status !== "Verified").map((r) => r.id); if (!ids.length) { flash("No pending claims to invite."); return; } setBusy(true); try { const r = await mktClaimInvite(ids); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(false); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const sm = d.summary, maxConv = 100;
  const claimTone: Record<string, string> = { Verified: "bg-emerald-500/15 text-emerald-300", "In Review": "bg-amber-500/15 text-amber-300", New: "bg-sky-500/15 text-sky-300" };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">How unclaimed profiles move through claim & verification: Created → Published → Viewed → Claim Requested → Verified → Subscriber. Spot the biggest drop-off and act on it.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Claim Funnel Overview">
          <div className="flex flex-wrap gap-2">{d.funnel.map((s, i) => { const Ic = FSTEP_ICONS[i]; return (
            <div key={s.label} className="flex items-center gap-2 flex-1 min-w-[130px]">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex-1 rounded-xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${s.color}28, ${s.color}10)`, border: `1px solid ${s.color}40` }}>
                <Ic className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                <div className="text-[10px] text-slate-400 font-medium leading-tight">{s.label}</div>
                <div className="text-lg font-extrabold text-white mt-0.5"><AnimatedNumber value={s.count} /></div>
                <div className="text-[10px]" style={{ color: s.color }}>{s.pct}%</div>
              </motion.div>
              {i < d.funnel.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden xl:block" />}
            </div>
          ); })}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-ink-800">
            {d.conversions.map((c) => (<div key={c.to} className="text-center"><div className="text-[14px] font-bold text-white">{c.rate}%</div><div className="text-[9px] text-slate-600">Conv. Rate</div></div>))}
          </div>
        </Card></div>
        <FadeUp><Card title="Funnel Summary">
          <div className="space-y-2">
            {[["Total Created", sm.totalCreated], ["Total Claimed", sm.totalClaimed], ["Total Verified", sm.totalVerified], ["Total Subscribers", sm.totalSubscribers]].map(([l, kpi]) => { const v = kpi as Kpi; return (<div key={l as string} className="flex items-center justify-between text-[12px]"><span className="text-slate-400">{l as string}</span><span className="flex items-center gap-2"><span className="font-bold text-white">{v.value}</span><Trend n={v.trend} /></span></div>); })}
            <div className="border-t border-ink-800 pt-2 space-y-2">
              {[["Overall Claim Rate", sm.overallClaimRate], ["Overall Verification Rate", sm.overallVerificationRate], ["Overall Subscription Rate", sm.overallSubscriptionRate]].map(([l, kpi]) => { const v = kpi as Kpi; return (<div key={l as string} className="flex items-center justify-between text-[12px]"><span className="text-slate-400">{l as string}</span><span className="font-bold text-emerald-300">{v.value}%</span></div>); })}
            </div>
          </div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Funnel Trend" sub="Each stage over time"><MultiLine labels={d.trend.map((t) => t.label)} series={[{ points: d.trend.map((t) => t.created), color: "#6366f1", label: "Created" }, { points: d.trend.map((t) => t.published), color: "#3b82f6", label: "Published" }, { points: d.trend.map((t) => t.viewed), color: "#06b6d4", label: "Viewed" }, { points: d.trend.map((t) => t.claimRequested), color: "#f59e0b", label: "Claimed" }, { points: d.trend.map((t) => t.verified), color: "#10b981", label: "Verified" }, { points: d.trend.map((t) => t.subscriber), color: "#8b5cf6", label: "Subscriber" }]} /></Card></div>
        <FadeUp><Card title="Conversion Rate by Stage">
          <div className="space-y-2.5">{d.conversions.map((c) => (<div key={c.to}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-400 truncate">{c.from} → {c.to}</span><span className="font-bold text-white">{c.rate}%</span></div><Bar pct={(c.rate / maxConv) * 100} color="#818cf8" /></div>))}</div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Claim Funnel Insights">
          <div className="space-y-2.5">{d.insights.map((ins, i) => (<div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-ink-800/40"><Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" /><span className="text-[12px] text-slate-300">{ins.text}</span></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Top Drop-Off Stage">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-center"><div className="text-[12px] text-slate-400">{d.topDrop.from} → {d.topDrop.to}</div><div className="text-3xl font-extrabold text-rose-400 my-1">{d.topDrop.drop}%</div><div className="text-[11px] text-slate-500">drop-off — improve this step to lift conversion</div></div>
        </Card></FadeUp>
        <FadeUp><Card title="Quick Actions">
          <div className="space-y-2">
            <button onClick={invite} disabled={busy} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-ink-800/40 hover:bg-ink-800 text-[12px] text-slate-200 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-brand-400" />} Send Claim Invitations</button>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-ink-800/40 text-[12px] text-slate-400"><Compass className="w-4 h-4" /> Overall claim rate: <span className="text-white font-semibold">{sm.overallClaimRate.value}%</span></div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-ink-800/40 text-[12px] text-slate-400"><CheckCircle2 className="w-4 h-4" /> Verification rate: <span className="text-white font-semibold">{sm.overallVerificationRate.value}%</span></div>
          </div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Funnel Performance by Category">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[11.5px]"><thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1.5">Category</th><th className="font-medium text-right">Created</th><th className="font-medium text-right">Pub</th><th className="font-medium text-right">Claimed</th><th className="font-medium text-right">Verified</th><th className="font-medium text-right">Rate</th></tr></thead>
            <tbody>{d.byCategory.map((c) => (<tr key={c.name} className="border-b border-ink-800/60"><td className="py-1.5 px-1.5"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-slate-300 truncate max-w-[110px]">{c.name}</span></span></td><td className="text-right text-white">{c.created}</td><td className="text-right text-slate-400">{c.published}</td><td className="text-right text-slate-400">{c.claimed}</td><td className="text-right text-slate-400">{c.verified}</td><td className="text-right text-emerald-300 font-semibold">{c.claimRate}%</td></tr>))}</tbody></table></div>
        </Card></FadeUp>
        <FadeUp><Card title="Funnel Performance by Location">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[11.5px]"><thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1.5">Location</th><th className="font-medium text-right">Created</th><th className="font-medium text-right">Pub</th><th className="font-medium text-right">Claimed</th><th className="font-medium text-right">Verified</th><th className="font-medium text-right">Rate</th></tr></thead>
            <tbody>{d.byLocation.map((c) => (<tr key={c.name} className="border-b border-ink-800/60"><td className="py-1.5 px-1.5 text-slate-300 truncate max-w-[120px]">{c.name}</td><td className="text-right text-white">{c.created}</td><td className="text-right text-slate-400">{c.published}</td><td className="text-right text-slate-400">{c.claimed}</td><td className="text-right text-slate-400">{c.verified}</td><td className="text-right text-emerald-300 font-semibold">{c.claimRate}%</td></tr>))}</tbody></table></div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Recent Claim Requests">
          {d.recentClaims.length === 0 ? <div className="text-[13px] text-slate-500 py-6 text-center">No claim requests yet.</div> :
            <div className="overflow-x-auto -mx-1"><table className="w-full text-[12px]"><thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Company</th><th className="font-medium px-2">Category</th><th className="font-medium px-2">Contact</th><th className="font-medium px-2">Email</th><th className="font-medium px-2">Status</th></tr></thead>
              <tbody>{d.recentClaims.map((r) => (<tr key={r.id} className="border-b border-ink-800/60 hover:bg-ink-800/30"><td className="py-2 px-2"><div className="flex items-center gap-2"><Logo url={r.logoUrl} name={r.company} /><span className="text-white font-medium truncate max-w-[140px]">{r.company}</span></div></td><td className="px-2 text-slate-400">{r.category}</td><td className="px-2 text-slate-400 truncate max-w-[110px]">{r.contact}</td><td className="px-2 text-slate-500 truncate max-w-[150px]">{r.email}</td><td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${claimTone[r.status] || "bg-slate-500/15 text-slate-300"}`}>{r.status}</span></td></tr>))}</tbody></table></div>}
        </Card></div>
        <FadeUp><Card title="Claim Rate Over Time"><MultiLine labels={d.claimRateOverTime.map((t) => t.label)} series={[{ points: d.claimRateOverTime.map((t) => t.value), color: "#8b5cf6", label: "Claim Rate %" }]} /></Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== LEAD SCORING (full Figma) ============================== */
const scoreColor = (s: number) => (s >= 80 ? "#34d399" : s >= 50 ? "#38bdf8" : s >= 30 ? "#fbbf24" : "#fb7185");
const TIER_TONE: Record<string, string> = { High: "bg-emerald-500/15 text-emerald-300", Medium: "bg-sky-500/15 text-sky-300", Low: "bg-slate-500/15 text-slate-300" };
function LeadScoringTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<LeadScoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [location, setLocation] = useState(""); const [minScore, setMinScore] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getLeadScoring({ q, category, location, minScore: minScore ? Number(minScore) : undefined, page, perPage: 10 })); } finally { setLoading(false); } }, [q, category, location, minScore, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, category, location, minScore]);
  const send = async (id: string, name: string) => { setBusy(id); try { const r = await mktToSales(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage, maxSrc = Math.max(...d.sources.map((s) => s.score), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">AI-powered lead scoring ranks providers by how valuable they are for outreach — a weighted blend of review volume, traffic, search demand, category value, profile completeness and more. Send hot leads straight to Sales.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={Boxes} label="Total Leads Scored" kpi={k.totalScored} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Star} label="High Value Leads" kpi={k.highValue} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Target} label="Medium Value Leads" kpi={k.mediumValue} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Compass} label="Low Value Leads" kpi={k.lowValue} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Zap} label="Avg Lead Score" kpi={k.avgScore} color="bg-violet-500/15 text-violet-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-2"><Card title="Lead Scoring Components" sub="Weighted signals the AI scores on">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">{d.components.map((c) => (<div key={c.label}><div className="flex items-center justify-between text-[11.5px] mb-1"><span className="text-slate-300">{c.label} <span className="text-slate-600">{c.weight}%</span></span><span className="font-bold text-white">{c.value}/100</span></div><Bar pct={c.value} color="#818cf8" /></div>))}</div>
        </Card></div>
        <FadeUp><Card title="Lead Score Distribution"><div className="flex flex-col items-center gap-2"><Donut segments={d.distribution.segments} total={d.distribution.total} label="Total Leads" /><div className="space-y-1 w-full">{d.distribution.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[10.5px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div></Card></FadeUp>
        <FadeUp><Card title="Lead Score Breakdown"><div className="space-y-2">{d.breakdown.map((b) => (<div key={b.label} className="flex items-center gap-2 text-[11px]"><span className="text-slate-300 flex-1 truncate">{b.label}</span><span className="font-bold text-white">{b.count}</span><span className="text-slate-600 text-[10px] w-9 text-right">{b.pct}%</span></div>))}</div></Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Top Leads by Score" sub="Highest-scoring leads ranked by value & conversion potential" right={
          <div className="flex items-center gap-1.5">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-8 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select value={minScore} onChange={(e) => setMinScore(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-8 text-[11px] text-slate-300 outline-none"><option value="">Min Score</option>{[80, 50, 30].map((n) => <option key={n} value={n}>{n}+</option>)}</select>
          </div>}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px]">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">#</th><th className="font-medium px-2">Company</th><th className="font-medium px-2">Score</th><th className="font-medium px-2">7D</th><th className="font-medium px-2">Reviews</th><th className="font-medium px-2">Est. Revenue</th><th className="font-medium px-2 text-right">Action</th></tr></thead>
              <tbody>
                {d.table.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-600 py-10">No leads match.</td></tr> :
                  d.table.rows.map((r) => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                      <td className="px-2 text-slate-500">{r.rank}</td>
                      <td className="py-2 px-2"><div className="flex items-center gap-2"><Logo url={r.logoUrl} name={r.company} /><div className="min-w-0"><div className="font-semibold text-white truncate max-w-[150px]">{r.company}</div><div className="text-[10px] text-slate-500 truncate">{r.category} · {r.location}</div></div></div></td>
                      <td className="px-2"><span className="inline-flex items-center gap-1.5"><span className="font-bold" style={{ color: scoreColor(r.score) }}>{r.score}</span><span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TIER_TONE[r.tier]}`}>{r.tier}</span></span></td>
                      <td className="px-2">{r.trend7d > 0 ? <span className="text-emerald-400 inline-flex items-center"><TrendingUp className="w-3 h-3" />{r.trend7d}</span> : r.trend7d < 0 ? <span className="text-rose-400 inline-flex items-center"><TrendingDown className="w-3 h-3" />{Math.abs(r.trend7d)}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-2 text-slate-300">{r.reviews}</td>
                      <td className="px-2 text-emerald-300 font-semibold">${r.revenue}/mo</td>
                      <td className="px-2 text-right"><button onClick={() => send(r.id, r.company)} disabled={busy === r.id} title="Send to Sales" className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-brand-500/15 text-brand-300 text-[11px] font-semibold hover:bg-brand-500/25 disabled:opacity-50 ml-auto">{busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}</button></td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
            <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} results</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
              {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
              <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </Card></div>

        <div className="space-y-4">
          <FadeUp><Card title="Top Lead Sources by Score">
            {d.sources.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No sources yet.</div> :
              <div className="space-y-2">{d.sources.map((s) => (<div key={s.source}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300 truncate max-w-[150px]">{s.source}</span><span className="font-bold text-white">{s.score}</span></div><Bar pct={(s.score / maxSrc) * 100} color="#8b5cf6" /></div>))}</div>}
          </Card></FadeUp>
          <FadeUp><Card title="High Value Opportunities">
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between"><span className="text-slate-400">Score 90+ not yet contacted</span><span className="font-bold text-white">{d.highValueOpps.notContacted}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Potential Monthly Revenue</span><span className="font-bold text-emerald-400">${d.highValueOpps.potentialRevenue.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-400">Avg Lead Score</span><span className="font-bold text-white">{d.highValueOpps.avgScore}</span></div>
            </div>
          </Card></FadeUp>
          <FadeUp><Card title="Lead Score Improvement Tips">
            <div className="space-y-1.5">{d.tips.map((t, i) => (<div key={i} className="flex items-start gap-2 text-[11.5px]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /><span className="text-slate-300">{t}</span></div>))}</div>
          </Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ============================== CATEGORY COVERAGE (full Figma) ============================== */
const heatBg = (v: number) => (v >= 75 ? "bg-emerald-500/30 text-emerald-200" : v >= 50 ? "bg-sky-500/25 text-sky-200" : v >= 25 ? "bg-amber-500/25 text-amber-200" : v > 0 ? "bg-rose-500/20 text-rose-200" : "bg-ink-800/40 text-slate-600");
function CategoryCoverageTab() {
  const [d, setD] = useState<CategoryCoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let off = false; getCategoryCoverage().then((r) => { if (!off) setD(r); }).finally(() => { if (!off) setLoading(false); }); return () => { off = true; }; }, []);
  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Provider inventory and coverage across all 8 target categories vs the marketplace goal. Low coverage + big gaps = where to focus discovery next — see the opportunity revenue per category.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Boxes} label="Total Categories" kpi={k.totalCategories} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Building2} label="Total Providers" kpi={k.totalProviders} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Compass} label="Avg Coverage Score" kpi={k.avgCoverage} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={CheckCircle2} label="Fully Covered" kpi={k.fullyCovered} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Zap} label="Needs Improvement" kpi={k.needsImprovement} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Star} label="High Value Opportunities" kpi={k.highValueOpps} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Coverage by Category" sub="Providers vs target">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Category</th><th className="font-medium px-2 text-right">Providers</th><th className="font-medium px-2 text-right">Coverage</th><th className="font-medium px-2 text-right">vs 7D</th><th className="font-medium px-2">Progress (Target)</th></tr></thead>
            <tbody>{d.coverageByCategory.map((c) => (<tr key={c.category} className="border-b border-ink-800/60 hover:bg-ink-800/30">
              <td className="py-2 px-2"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-white font-medium">{c.category}</span></span></td>
              <td className="px-2 text-right text-white font-semibold">{c.count.toLocaleString()}</td>
              <td className="px-2 text-right"><span className="font-bold" style={{ color: c.coverage >= 75 ? "#34d399" : c.coverage >= 50 ? "#fbbf24" : "#fb7185" }}>{c.coverage}%</span></td>
              <td className="px-2 text-right">{c.vs7d > 0 ? <span className="text-emerald-400 inline-flex items-center"><TrendingUp className="w-3 h-3" />{c.vs7d}</span> : <span className="text-slate-600">—</span>}</td>
              <td className="px-2"><div className="flex items-center gap-2"><div className="flex-1"><Bar pct={c.coverage} color={c.color} /></div><span className="text-[10px] text-slate-500 w-16 text-right">{c.count}/{c.target.toLocaleString()}</span></div></td>
            </tr>))}</tbody>
          </table></div>
        </Card></div>
        <div className="space-y-4">
          <FadeUp><Card title="Coverage Score Distribution"><div className="flex items-center gap-3"><Donut segments={d.distribution.segments} total={d.distribution.total} label="Categories" /><div className="space-y-1 flex-1">{d.distribution.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div></div></Card></FadeUp>
          <FadeUp><Card title="Top Category Opportunities" sub="Biggest gaps to fill">
            {d.opportunities.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">Fully covered. ✓</div> :
              <div className="space-y-2">{d.opportunities.map((o) => (<div key={o.category} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: `${o.color}22`, color: o.color }}><Building2 className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{o.category}</div><div className="text-[10px] text-slate-500">Coverage {o.coverage}% · gap {o.gap.toLocaleString()}</div></div><span className="text-[11px] text-emerald-400 font-semibold whitespace-nowrap">${o.potentialRevenue.toLocaleString()}/mo</span></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Category Performance Details">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[11.5px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-1.5 px-1.5">Category</th><th className="font-medium text-right">Total</th><th className="font-medium text-right">New</th><th className="font-medium text-right">Cov</th><th className="font-medium text-right">Qual</th><th className="font-medium text-right">Claim%</th><th className="font-medium text-right">HV</th><th className="font-medium px-2">Trend</th></tr></thead>
            <tbody>{d.coverageByCategory.map((c) => (<tr key={c.category} className="border-b border-ink-800/60"><td className="py-1.5 px-1.5"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-slate-300 truncate max-w-[100px]">{c.category}</span></span></td><td className="text-right text-white">{c.count}</td><td className="text-right text-slate-400">{c.newThisWeek}</td><td className="text-right text-slate-300">{c.coverage}%</td><td className="text-right text-slate-300">{c.quality}%</td><td className="text-right text-slate-300">{c.claimedPct}%</td><td className="text-right text-slate-300">{c.highValueLeads}</td><td className="px-2 w-[70px]"><Mini series={c.trend} color={c.color} /></td></tr>))}</tbody>
          </table></div>
        </Card></FadeUp>
        <FadeUp><Card title="Category Coverage Heatmap" sub="Coverage % by emirate">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[10.5px]">
            <thead><tr className="text-slate-500 text-left"><th className="font-medium py-1.5 px-1.5">Category</th>{d.locations.map((l) => <th key={l} className="font-medium text-center px-1">{l.split(" ").map((w) => w[0]).join("")}</th>)}<th className="font-medium text-center px-1">Avg</th></tr></thead>
            <tbody>{d.heatmap.map((h) => (<tr key={h.category}><td className="py-1 px-1.5 text-slate-300 truncate max-w-[90px]">{h.category}</td>{h.cells.map((c) => (<td key={c.location} className="px-0.5 py-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-semibold ${heatBg(c.coverage)}`}>{c.count}</span></td>))}<td className="px-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-bold ${heatBg(h.uaeAvg)}`}>{h.uaeAvg}%</span></td></tr>))}</tbody>
          </table></div>
        </Card></FadeUp>
      </div>

      <FadeUp><Card title="Category Growth Trend" sub="Top categories over 8 days"><MultiLine labels={d.growthTrend.labels} series={d.growthTrend.series.map((s) => ({ points: s.points, color: s.color, label: s.label }))} /></Card></FadeUp>
    </div>
  );
}

/* ============================== LOCATION COVERAGE (full Figma) ============================== */
const tierC = (t: string) => (t === "Very High" ? "#34d399" : t === "High" ? "#38bdf8" : t === "Medium" ? "#fbbf24" : "#fb7185");
function LocationCoverageTab() {
  const [d, setD] = useState<LocationCoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let off = false; getLocationCoverage().then((r) => { if (!off) setD(r); }).finally(() => { if (!off) setLoading(false); }); return () => { off = true; }; }, []);
  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Provider inventory and coverage across all 7 emirates vs the marketplace goal. The map and gaps show where to point discovery next.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={MapPin} label="Total Locations" kpi={k.totalLocations} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Building2} label="Total Providers" kpi={k.totalProviders} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Compass} label="Avg Coverage Score" kpi={k.avgCoverage} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={CheckCircle2} label="Fully Covered" kpi={k.fullyCovered} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Zap} label="Needs Improvement" kpi={k.needsImprovement} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Star} label="High Value Opportunities" kpi={k.highValueOpps} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Coverage by Location" sub="Providers vs target">
          <div className="space-y-2.5">{d.coverageByLocation.map((c) => (<div key={c.location}><div className="flex items-center justify-between text-[12px] mb-1"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-white font-medium">{c.location}</span></span><span className="text-slate-500">{c.count.toLocaleString()} · <span className="font-bold" style={{ color: c.coverage >= 60 ? "#34d399" : c.coverage >= 40 ? "#fbbf24" : "#fb7185" }}>{c.coverage}%</span> {c.vs7d > 0 && <span className="text-emerald-400">+{c.vs7d}</span>}</span></div><div className="flex items-center gap-2"><div className="flex-1"><Bar pct={c.coverage} color={c.color} /></div><span className="text-[9px] text-slate-600 w-16 text-right">{c.count}/{c.target.toLocaleString()}</span></div></div>))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="UAE Coverage Map">
          <div className="relative rounded-xl bg-ink-950/60 border border-ink-800 overflow-hidden" style={{ height: 280 }}>
            <div className="absolute inset-0 opacity-[0.07]" style={{ background: "radial-gradient(circle at 40% 55%, #6366f1 0%, transparent 55%)" }} />
            {d.mapPoints.map((p) => (
              <div key={p.location} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <span className="relative flex h-3 w-3 mx-auto"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: tierC(p.tier) }} /><span className="relative inline-flex rounded-full h-3 w-3" style={{ background: tierC(p.tier) }} /></span>
                <div className="text-[9px] text-slate-300 mt-0.5 whitespace-nowrap font-medium">{p.location}</div>
                <div className="text-[9px] font-bold" style={{ color: tierC(p.tier) }}>{p.coverage}%</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[9px]">{[["Very High (80%+)", "#34d399"], ["High (60-79%)", "#38bdf8"], ["Medium (40-59%)", "#fbbf24"], ["Low (<40%)", "#fb7185"]].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
        </Card></FadeUp>

        <div className="space-y-4">
          <FadeUp><Card title="Top Location Opportunities">
            {d.opportunities.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">Fully covered. ✓</div> :
              <div className="space-y-2">{d.opportunities.map((o) => (<div key={o.location} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><MapPin className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{o.location}</div><div className="text-[10px] text-slate-500">Gap {o.gapPct}% · {o.potentialProviders.toLocaleString()} providers</div></div><span className="text-[11px] text-emerald-400 font-semibold whitespace-nowrap">${o.potentialRevenue.toLocaleString()}/mo</span></div>))}</div>}
          </Card></FadeUp>
          <FadeUp><Card title="Location Insights">
            <div className="space-y-2">{d.insights.map((ins, i) => (<div key={i} className="flex items-start gap-2 text-[11.5px]"><span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 mt-0.5 ${ins.icon === "alert" ? "bg-rose-500/15 text-rose-300" : ins.icon === "trend" ? "bg-emerald-500/15 text-emerald-300" : "bg-brand-500/15 text-brand-300"}`}>{ins.icon === "alert" ? <Zap className="w-3 h-3" /> : ins.icon === "trend" ? <TrendingUp className="w-3 h-3" /> : <Info className="w-3 h-3" />}</span><span className="text-slate-300">{ins.text}</span></div>))}</div>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Location Coverage by Category" sub="Providers per category per emirate">
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[10.5px]">
            <thead><tr className="text-slate-500 text-left"><th className="font-medium py-1.5 px-1.5">Location</th>{d.categories.map((c) => <th key={c} className="font-medium text-center px-1">{c.split(" ").map((w) => w[0]).join("")}</th>)}<th className="font-medium text-center px-1">Score</th></tr></thead>
            <tbody>{d.heatmap.map((h) => (<tr key={h.location}><td className="py-1 px-1.5 text-slate-300 truncate max-w-[90px]">{h.location}</td>{h.cells.map((c) => (<td key={c.category} className="px-0.5 py-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-semibold ${heatBg(c.coverage)}`}>{c.count}</span></td>))}<td className="px-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-bold ${heatBg(h.score)}`}>{h.score}%</span></td></tr>))}</tbody>
          </table></div>
        </Card></FadeUp>
        <FadeUp><Card title="Coverage Score Over Time" sub="By location"><MultiLine labels={d.coverageOverTime.labels} series={d.coverageOverTime.series.map((s) => ({ points: s.points, color: s.color, label: s.label }))} /></Card></FadeUp>
      </div>
    </div>
  );
}

/* ── Data Quality ───────────────────────────────────────────────────────── */

// Radar/spider chart for completeness across data fields. 8 axes, 0-100%.
function DqRadar({ data }: { data: { label: string; pct: number }[] }) {
  const cx = 130, cy = 122, R = 84, n = Math.max(data.length, 3);
  const ax = (i: number, mul = 1): [number, number] => { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; return [cx + R * mul * Math.cos(a), cy + R * mul * Math.sin(a)]; };
  const pt = (v: number, i: number): [number, number] => { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; const r = (Math.max(0, Math.min(100, v)) / 100) * R; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = data.map((dd, i) => pt(dd.pct, i).join(",")).join(" ");
  return (
    <svg viewBox="0 0 260 244" className="w-full" style={{ maxHeight: 250 }}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={data.map((_, i) => ax(i, f).join(",")).join(" ")} fill="none" stroke="#1e293b" strokeWidth="1" />)}
      {data.map((dd, i) => {
        const [x, y] = ax(i); const [lx, ly] = ax(i, 1.18);
        return (
          <g key={dd.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={lx} y={ly} fontSize="8" fill="#94a3b8" textAnchor={lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle"} dominantBaseline="middle">{dd.label}</text>
            <text x={lx} y={ly + 9} fontSize="7.5" fill="#64748b" textAnchor={lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle"} dominantBaseline="middle">{dd.pct}%</text>
          </g>
        );
      })}
      <motion.polygon points={poly} fill="rgba(129,140,248,.22)" stroke="#818cf8" strokeWidth="1.6" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
      {data.map((dd, i) => { const [x, y] = pt(dd.pct, i); return <circle key={dd.label} cx={x} cy={y} r="2.4" fill="#a5b4fc" />; })}
    </svg>
  );
}

function DataQualityView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<DataQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getDataQuality()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const act = async (key: string, fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(key);
    try { const r = await fn(); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); }
    catch { flash("Action failed."); }
    finally { setBusy(""); }
  };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No data-quality data.</div>;

  const KPI = [
    { icon: Database, label: "Total Profiles", kpi: d.kpis.totalProfiles, color: "bg-brand-500/15 text-brand-300" },
    { icon: Compass, label: "Avg Quality Score", kpi: d.kpis.avgQuality, color: "bg-sky-500/15 text-sky-300" },
    { icon: CheckCircle2, label: "High Quality (80%+)", kpi: d.kpis.highQuality, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: Eye, label: "Needing Attention", kpi: d.kpis.needingAttention, color: "bg-amber-500/15 text-amber-300" },
    { icon: AlertTriangle, label: "Low Quality (<40%)", kpi: d.kpis.lowQuality, color: "bg-rose-500/15 text-rose-300" },
    { icon: Info, label: "Data Issues Detected", kpi: d.kpis.dataIssues, color: "bg-orange-500/15 text-orange-300" },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI.map((k) => <Item key={k.label}><KpiCard icon={k.icon} label={k.label} kpi={k.kpi} color={k.color} /></Item>)}
      </Stagger>

      {/* Distribution / Trend / Completeness / Top issues */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Quality Score Distribution" sub={`${d.distribution.total} profiles`}>
          <Donut segments={d.distribution.segments} total={d.distribution.total} label="profiles" />
          <div className="mt-3 space-y-1.5">{d.distribution.segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} · {s.pct}%</span></div>
          ))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Quality Score Trend" sub="Avg score, last 8 days">
          <MultiLine labels={d.trend.map((t) => t.label)} series={[{ points: d.trend.map((t) => t.value), color: "#818cf8", label: "Avg Quality" }]} />
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>Latest</span><span className="text-lg font-bold text-white">{d.trend[d.trend.length - 1]?.value ?? 0}%</span></div>
        </Card></FadeUp>
        <FadeUp><Card title="Data Completeness" sub="Field coverage across profiles">
          <DqRadar data={d.completeness} />
        </Card></FadeUp>
        <FadeUp><Card title="Top Data Issues" sub="Most common gaps">
          <div className="space-y-2">{d.topIssues.map((iss, i) => {
            const max = d.topIssues[0]?.count || 1;
            return (
              <div key={iss.label}>
                <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300 flex items-center gap-1.5"><span className="w-4 text-slate-600">{i + 1}.</span>{iss.label}</span><span className="font-bold text-rose-300">{iss.count}</span></div>
                <Bar pct={(iss.count / max) * 100} color={i < 3 ? "#fb7185" : "#fb923c"} />
              </div>
            );
          })}</div>
        </Card></FadeUp>
      </div>

      {/* By category + Improvement/Enrichment/Quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Data Quality by Category" sub="Score & issues per service type">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1.5">Category</th><th className="font-medium text-center px-1">Total</th><th className="font-medium text-center px-1">Avg</th><th className="font-medium text-center px-1">High</th><th className="font-medium text-center px-1">Attn</th><th className="font-medium text-center px-1">Low</th><th className="font-medium px-1.5">Top Issue</th><th className="font-medium text-center px-1">Trend</th></tr></thead>
            <tbody>{d.byCategory.map((c) => (
              <tr key={c.category} className="border-b border-ink-900/60">
                <td className="py-2 px-1.5 text-slate-200 font-medium truncate max-w-[130px]">{c.category}</td>
                <td className="text-center text-slate-300">{c.total}</td>
                <td className="text-center"><span className="font-bold" style={{ color: scoreColor(c.avgScore) }}>{c.avgScore}%</span></td>
                <td className="text-center text-emerald-300">{c.highQuality}</td>
                <td className="text-center text-amber-300">{c.needsAttention}</td>
                <td className="text-center text-rose-300">{c.lowQuality}</td>
                <td className="px-1.5 text-slate-400 truncate max-w-[120px]">{c.topIssue}</td>
                <td className="px-1 w-16"><Mini series={c.trend} color={scoreColor(c.avgScore)} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <div className="space-y-4">
          <FadeUp><Card title="Data Quality Improvement" sub="This week">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0 grid place-items-center w-[92px] h-[92px] rounded-full" style={{ background: "conic-gradient(#34d399 0deg 270deg, #1e293b 270deg 360deg)" }}>
                <div className="absolute inset-[7px] rounded-full bg-ink-950 grid place-items-center">
                  <span className="text-lg font-extrabold text-emerald-300">+{d.improvement.thisWeek}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between"><span className="text-slate-400 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-brand-400" />Auto-Enriched</span><span className="font-bold text-slate-200">{d.improvement.autoEnriched}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 text-sky-400" />Manual Updates</span><span className="font-bold text-slate-200">{d.improvement.manual}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-400 flex items-center gap-1.5"><UserCheck className="w-3 h-3 text-emerald-400" />Claimed Profiles</span><span className="font-bold text-slate-200">{d.improvement.claimed}</span></div>
              </div>
            </div>
          </Card></FadeUp>

          <FadeUp><Card title="AI Data Enrichment" sub="Automated fill rate">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-extrabold text-white"><AnimatedNumber value={d.enrichment.enrichedThisWeek} /></div><div className="text-[11px] text-slate-500">enriched this week</div></div>
              <div className="text-right"><div className="text-xl font-bold text-emerald-300">{d.enrichment.accuracy}%</div><div className="text-[11px] text-slate-500">accuracy</div></div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-ink-800 flex items-center justify-between text-[11px]"><span className="text-slate-400">Total enriched (all time)</span><span className="font-bold text-slate-200">{d.enrichment.totalEnriched}</span></div>
          </Card></FadeUp>

          <FadeUp><Card title="Quick Actions" sub="Automated data ops">
            <div className="space-y-2">
              <button onClick={() => act("enrich", () => mktEnrichBatch(5))} disabled={!!busy} className="w-full flex items-center gap-2.5 rounded-lg bg-brand-500/15 border border-brand-500/30 hover:bg-brand-500/25 px-3 py-2.5 text-left text-xs font-medium text-brand-200 disabled:opacity-50 transition">
                {busy === "enrich" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}<span className="flex-1">Run AI Data Enrichment</span><ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button onClick={() => act("merge", () => mktMergeDuplicates())} disabled={!!busy} className="w-full flex items-center gap-2.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-3 py-2.5 text-left text-xs font-medium text-slate-200 disabled:opacity-50 transition">
                {busy === "merge" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4 text-violet-300" />}<span className="flex-1">Find & Merge Duplicates</span><ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button onClick={() => act("bulk", () => mktEnrichBatch(15))} disabled={!!busy} className="w-full flex items-center gap-2.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-3 py-2.5 text-left text-xs font-medium text-slate-200 disabled:opacity-50 transition">
                {busy === "bulk" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-sky-300" />}<span className="flex-1">Bulk Update Missing Data</span><ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <button onClick={() => flash(`Rules active: flag profiles <40%, require Logo·Phone·Email·Website, auto-enrich on discovery. ${d.kpis.dataIssues.value} issues across ${d.kpis.totalProfiles.value} profiles.`)} disabled={!!busy} className="w-full flex items-center gap-2.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-3 py-2.5 text-left text-xs font-medium text-slate-200 disabled:opacity-50 transition">
                <Settings className="w-4 h-4 text-amber-300" /><span className="flex-1">Data Quality Rules</span><ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Recent improvements + Needing attention */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Recent Data Quality Improvements" sub="Latest AI enrichments">
          {d.recentImprovements.length === 0 ? <div className="text-slate-500 text-xs py-8 text-center">No enrichments logged yet. Run AI Data Enrichment to start.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1.5">Profile</th><th className="font-medium px-1">Category</th><th className="font-medium px-1">Fields</th><th className="font-medium text-center px-1">Score</th><th className="font-medium px-1">Source</th></tr></thead>
              <tbody>{d.recentImprovements.map((r, i) => (
                <tr key={i} className="border-b border-ink-900/60">
                  <td className="py-2 px-1.5 text-slate-200 font-medium truncate max-w-[140px]">{r.profile}</td>
                  <td className="px-1 text-slate-400 truncate max-w-[90px]">{r.category}</td>
                  <td className="px-1 text-slate-400">{r.fields}</td>
                  <td className="text-center"><Score s={r.scoreAfter} /></td>
                  <td className="px-1"><span className="inline-flex items-center gap-1 text-brand-300"><Sparkles className="w-3 h-3" />{r.source}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card></FadeUp>

        <FadeUp><Card title="Profiles Needing Immediate Attention" sub="Lowest quality first">
          {d.needingAttention.length === 0 ? <div className="text-emerald-400/80 text-xs py-8 text-center flex flex-col items-center gap-2"><CheckCircle2 className="w-6 h-6" />All profiles above threshold.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1.5">Profile</th><th className="font-medium px-1">Category</th><th className="font-medium text-center px-1">Issues</th><th className="font-medium px-1">Critical</th><th className="font-medium text-center px-1">Score</th><th className="font-medium text-center px-1">Action</th></tr></thead>
              <tbody>{d.needingAttention.map((r) => (
                <tr key={r.id} className="border-b border-ink-900/60">
                  <td className="py-2 px-1.5 text-slate-200 font-medium truncate max-w-[130px]">{r.profile}</td>
                  <td className="px-1 text-slate-400 truncate max-w-[90px]">{r.category}</td>
                  <td className="text-center"><span className="inline-grid place-items-center w-5 h-5 rounded-full bg-rose-500/15 text-rose-300 font-bold text-[10px]">{r.issueCount}</span></td>
                  <td className="px-1 text-amber-300/90 truncate max-w-[130px]">{r.criticalIssues}</td>
                  <td className="text-center"><Score s={r.score} /></td>
                  <td className="text-center"><button onClick={() => act("fix-" + r.id, () => mktEnrich(r.id))} disabled={!!busy} className="inline-flex items-center gap-1 rounded-md bg-brand-500/15 border border-brand-500/30 hover:bg-brand-500/25 px-2 py-1 text-[11px] font-medium text-brand-200 disabled:opacity-50 transition">{busy === "fix-" + r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Fix</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ── Expansion Opportunities ────────────────────────────────────────────── */

const priC = (p: string) => (p === "High" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : p === "Medium" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-slate-500/15 text-slate-300 border-slate-600/40");

function ExpansionView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ExpansionData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getExpansionOpportunities()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No expansion data.</div>;

  const KPI = [
    { icon: Compass, label: "Total Opportunities", kpi: d.kpis.totalOpportunities, color: "bg-violet-500/15 text-violet-300" },
    { icon: Zap, label: "High Priority", kpi: d.kpis.highPriority, color: "bg-rose-500/15 text-rose-300" },
    { icon: Building2, label: "Potential New Providers", kpi: d.kpis.potentialNewProviders, color: "bg-sky-500/15 text-sky-300" },
    { icon: DollarSign, label: "Est. Monthly Revenue", kpi: d.kpis.estMonthlyRevenue, color: "bg-emerald-500/15 text-emerald-300" },
    { icon: TrendingUp, label: "Est. Annual Revenue", kpi: d.kpis.estAnnualRevenue, color: "bg-brand-500/15 text-brand-300" },
    { icon: Target, label: "Avg Opportunity Score", kpi: d.kpis.avgScore, color: "bg-amber-500/15 text-amber-300" },
  ];
  const pipeMax = Math.max(1, ...d.pipeline.stages.map((s) => s.value));
  const srcMax = Math.max(1, ...d.sources.map((s) => s.count));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[12px] text-slate-400"><Compass className="w-4 h-4 text-brand-400" /><span className="font-semibold text-slate-200">Expansion Opportunities Overview</span> — AI identifies high-potential gaps to grow inventory, traffic, and revenue.</div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI.map((k) => <Item key={k.label}><KpiCard icon={k.icon} label={k.label} kpi={k.kpi} color={k.color} /></Item>)}
      </Stagger>

      {/* Top opportunities + Pipeline + Impact */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Top Expansion Opportunities" sub="Highest-scoring market gaps">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1.5">Opportunity</th><th className="font-medium px-1">Category</th><th className="font-medium px-1">Location</th><th className="font-medium text-center px-1">Providers</th><th className="font-medium text-right px-1">Est. Revenue</th><th className="font-medium text-center px-1">Score</th><th className="font-medium text-center px-1">Priority</th></tr></thead>
            <tbody>{d.topOpportunities.map((o) => (
              <tr key={o.opportunity} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1.5 text-slate-200 font-medium truncate max-w-[130px]">{o.opportunity}</td>
                <td className="px-1 text-slate-400 truncate max-w-[90px]">{o.category}</td>
                <td className="px-1 text-slate-400 truncate max-w-[100px]">{o.location}</td>
                <td className="text-center text-sky-300 font-semibold">{o.potentialProviders.toLocaleString()}</td>
                <td className="text-right text-emerald-300 font-semibold">${o.estMonthlyRevenue.toLocaleString()}<span className="text-slate-600">/mo</span></td>
                <td className="text-center"><span className="inline-grid place-items-center w-7 h-7 rounded-full border text-[11px] font-bold" style={{ borderColor: scoreColor(o.score) + "66", color: scoreColor(o.score) }}>{o.score}</span></td>
                <td className="text-center"><span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priC(o.priority)}`}>{o.priority}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <FadeUp><Card title="Opportunity Pipeline" sub="Discovery → action">
          <div className="space-y-2.5">{d.pipeline.stages.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{s.label}</span><span className="font-bold text-white">{s.value}</span></div>
              <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(s.value / pipeMax) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
            </div>
          ))}</div>
          <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between text-[11px]"><span className="text-slate-400">Conversion Rate <span className="font-bold text-emerald-300">{d.pipeline.conversionRate}%</span></span><span className="text-slate-400">Avg. Time <span className="font-bold text-sky-300">{d.pipeline.avgTimeToAction}d</span></span></div>
        </Card></FadeUp>

        <FadeUp><Card title="Potential Impact" sub="All opportunities">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-ink-800/50 border border-ink-800 p-2.5"><div className="text-[10px] text-slate-500">New Providers</div><div className="text-lg font-extrabold text-sky-300"><AnimatedNumber value={d.impact.potentialNewProviders} /></div></div>
            <div className="rounded-lg bg-ink-800/50 border border-ink-800 p-2.5"><div className="text-[10px] text-slate-500">Monthly Revenue</div><div className="text-lg font-extrabold text-emerald-300"><AnimatedNumber value={d.impact.potentialMonthlyRevenue} prefix="$" /></div></div>
          </div>
          <div className="text-[11px] font-semibold text-slate-300 mb-1.5">Opportunities by Category</div>
          <Donut segments={d.impact.byCategory.segments} total={d.impact.byCategory.total} label="opps" />
          <div className="mt-2 space-y-1">{d.impact.byCategory.segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} ({s.pct}%)</span></div>
          ))}</div>
        </Card></FadeUp>
      </div>

      {/* Matrix + Map */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <FadeUp className="xl:col-span-3"><Card title="Category Opportunity Matrix" sub="Opportunity intensity by category × emirate (higher = bigger gap)">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left"><th className="font-medium py-1.5 px-1.5">Category</th>{d.matrix.categories.map((c) => <th key={c} className="font-medium text-center px-1">{c.split(" ").map((w) => w[0]).join("")}</th>)}<th className="font-medium text-center px-1">UAE Avg</th><th className="font-medium text-right px-1.5">Potential</th></tr></thead>
            <tbody>{d.matrix.rows.map((r) => (
              <tr key={r.category}>
                <td className="py-1 px-1.5 text-slate-300 truncate max-w-[110px]">{r.category}</td>
                {r.cells.map((c) => <td key={c.location} className="px-0.5 py-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-semibold ${heatBg(c.opp)}`}>{c.opp}%</span></td>)}
                <td className="px-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-1 font-bold ${heatBg(r.uaeAvg)}`}>{r.uaeAvg}%</span></td>
                <td className="px-1.5 text-right text-sky-300 font-semibold">{r.potentialProviders.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="flex items-center justify-center gap-3 mt-2 text-[9px]">{[["High (70-100%)", "#34d399"], ["Medium (40-69%)", "#fbbf24"], ["Low (0-39%)", "#fb7185"]].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-sm" style={{ background: c }} />{l}</span>)}</div>
        </Card></FadeUp>

        <FadeUp className="xl:col-span-2"><Card title="Location Opportunity Heatmap" sub="Darker = higher opportunity">
          <div className="relative rounded-xl bg-ink-950/60 border border-ink-800 overflow-hidden" style={{ height: 280 }}>
            <div className="absolute inset-0 opacity-[0.07]" style={{ background: "radial-gradient(circle at 40% 55%, #fb7185 0%, transparent 55%)" }} />
            {d.locationHeatmap.map((p) => (
              <div key={p.location} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <span className="relative flex mx-auto" style={{ height: 12 + p.score / 10, width: 12 + p.score / 10 }}><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: tierC(p.tier) }} /><span className="relative inline-flex rounded-full h-full w-full" style={{ background: tierC(p.tier) }} /></span>
                <div className="text-[9px] text-slate-300 mt-0.5 whitespace-nowrap font-medium">{p.location}</div>
                <div className="text-[9px] font-bold" style={{ color: tierC(p.tier) }}>{p.score}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[9px]">{[["High (65+)", "#38bdf8"], ["Medium (45-64)", "#fbbf24"], ["Low (<45)", "#fb7185"]].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
        </Card></FadeUp>
      </div>

      {/* Recent discoveries + Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Recent Opportunity Discoveries" sub="Emerging niches surfaced by the agent">
          <div className="space-y-2">{d.recentDiscoveries.map((r) => (
            <div key={r.name} className="flex items-center gap-2.5 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
              <span className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{r.name}</div><div className="text-[10px] text-slate-500">{r.location} · {r.providers} providers</div></div>
              <div className="text-right shrink-0"><div className="text-[11px] text-emerald-300 font-semibold">${r.estMonthlyRevenue.toLocaleString()}/mo</div><div className="text-[10px] text-slate-600">{r.when}</div></div>
            </div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Opportunity Sources" sub="How opportunities were detected">
          <div className="space-y-3">{d.sources.map((s) => (
            <div key={s.label}>
              <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="font-bold text-white">{s.count} <span className="text-slate-500 font-normal">({s.pct}%)</span></span></div>
              <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(s.count / srcMax) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}
