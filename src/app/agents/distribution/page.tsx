"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Share2, Loader2, Bell, TrendingUp, TrendingDown, Sparkles, RefreshCw, Send, Plus, X, Eye, Clock, Zap,
  Layers, Users, DollarSign, MousePointerClick, Radio, CheckCircle2, Repeat, Mail, Rss, Play, ArrowRight, Search, Activity, Heart,
  CalendarDays, List, Copy, Pencil, Trash2, ChevronLeft, ChevronRight, FileText, MessageCircle, Compass,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getDistributionOverview, distDistribute, distRun, distToggleRule, getDistributionChannels,
  getScheduledDistribution, distReschedule, distDuplicate, distDeletePost,
  getDistributionRules, distCreateRuleFull, distRuleStatus, distRunRule, distDuplicateRule, distDeleteRule,
  getContentRepurposing, distRepurpose, getCommunityOutreach, distAddCommunity, distShareCommunity,
  type DistributionData, type ChannelsData, type ScheduledData, type RulesData, type RepurposingData, type OutreachData, type Kpi, type Seg,
} from "@/lib/api";

const TABS = ["Overview", "Channels", "Scheduled Distribution", "Distribution Rules", "Content Repurposing", "Community Outreach"];

/* ── primitives ─────────────────────────────────────────────────────────── */
function AnimatedNumber({ value, className, suffix, prefix }: { value: number; className?: string; suffix?: string; prefix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { let raf = 0; const dur = 750, t0 = performance.now(); const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [value]);
  return <span className={className}>{prefix}{Math.round(n).toLocaleString()}{suffix}</span>;
}
function Card({ title, children, right, sub, className = "" }: { title?: string; children: React.ReactNode; right?: React.ReactNode; sub?: string; className?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className={`rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20 ${className}`}>{(title || right) && <div className="flex items-start justify-between gap-2 mb-3"><div>{title && <div className="text-[13px] font-bold text-white">{title}</div>}{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>}{children}</motion.div>;
}
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">vs prev period</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}%</span>; }
function KpiCard({ icon: Icon, label, value, kpi, color }: { icon: React.ElementType; label: string; value: React.ReactNode; kpi: Kpi; color: string }) {
  return <Item><motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/30"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span>{kpi.est && <span className="text-[9px] font-semibold text-slate-500 border border-ink-700 rounded px-1.5 py-0.5">est.</span>}</div><div className="text-[12px] text-slate-500 mb-0.5">{label}</div><div className="text-2xl font-extrabold text-white">{value}</div><div className="mt-1"><Trend n={kpi.trend} /></div></motion.div></Item>;
}
function Donut({ segments, centerValue, centerLabel }: { segments: { count: number; color: string }[]; centerValue: number; centerLabel: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  const sum = Math.max(1, segments.reduce((a, s) => a + s.count, 0));
  return <div className="relative w-[120px] h-[120px] shrink-0"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />{segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / sum) * C; const el = <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.05 }} />; off += len; return el; })}</svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><AnimatedNumber value={centerValue} className="text-xl font-extrabold text-white" /><div className="text-[9px] text-slate-500">{centerLabel}</div></div></div></div>;
}
function MultiLine({ series, labels }: { series: { points: number[]; color: string; label: string }[]; labels: string[] }) {
  const w = 320, h = 150, n = Math.max(...series.map((s) => s.points.length), 1), max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - (v / max) * (h - 16) - 8;
  return <div><svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">{[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} y1={h - f * (h - 16) - 8} x2={w} y2={h - f * (h - 16) - 8} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}{series.map((s, si) => (<g key={si}><motion.polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: si * 0.1 }} />{s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={s.color} />)}</g>))}</svg><div className="flex flex-wrap items-center gap-3 mt-1">{series.map((s) => <span key={s.label} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</div></div>;
}
const fmtK = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n)));
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const statusPill = (s: string) => (s === "Delivered" ? "bg-emerald-500/15 text-emerald-300" : s === "Scheduled" ? "bg-sky-500/15 text-sky-300" : s === "Pending" ? "bg-amber-500/15 text-amber-300" : s === "Failed" ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-300");
function ChannelDots({ channels, map }: { channels: string[]; map: Record<string, string> }) {
  return <div className="flex -space-x-1">{channels.slice(0, 4).map((c, i) => <span key={i} title={c} className="w-4 h-4 rounded-full border border-ink-900" style={{ background: map[c] || "#64748b" }} />)}{channels.length > 4 && <span className="w-4 h-4 rounded-full bg-ink-700 border border-ink-900 grid place-items-center text-[7px] text-white">+{channels.length - 4}</span>}</div>;
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function DistributionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [distOpen, setDistOpen] = useState(false);
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = useCallback(async () => { setLoading(true); try { setData(await getDistributionOverview()); } finally { setLoading(false); } }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 8000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-emerald-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-emerald-100 shadow-2xl max-w-md">{note}</div>}
        {distOpen && data && <DistributeModal data={data} onClose={() => setDistOpen(false)} flash={flash} onDone={load} />}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-white"><Share2 className="w-5 h-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Content Distribution Agent</h1><span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span> Active</span></div><p className="text-[11px] text-slate-500 truncate">Distributes content across every channel, maximizing reach, engagement & leads</p></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setDistOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold"><Send className="w-4 h-4" /> Distribute Content</button>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white text-sm font-medium"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="distTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} flash={flash} reload={load} onDistribute={() => setDistOpen(true)} />
            : tab === "Channels" ? <ChannelsTab flash={flash} />
            : tab === "Scheduled Distribution" ? <ScheduledTab flash={flash} />
            : tab === "Distribution Rules" ? <RulesTab flash={flash} />
            : tab === "Content Repurposing" ? <RepurposingTab flash={flash} />
            : tab === "Community Outreach" ? <OutreachTab flash={flash} />
            : <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-12 text-center"><Share2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-3" /><div className="text-lg font-bold text-white">{tab}</div><p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">This view is being built. Live data already flows — {data.kpis.totalContentDistributed.value} pieces distributed across {data.byChannel.segments.length} channels, {data.connectedCount} connected.</p></div>}
        </div>
      </main>
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */
function Overview({ data, flash, reload, onDistribute }: { data: DistributionData; flash: (m: string) => void; reload: () => void; onDistribute: () => void }) {
  const [busy, setBusy] = useState("");
  const colorMap: Record<string, string> = Object.fromEntries(data.channels.map((c) => [c.key, c.color]));
  const k = data.kpis;
  const run = async (id: string) => { setBusy(id); try { const r = await distRun(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await reload(); } finally { setBusy(""); } };
  const toggleRule = async (id: string) => { setBusy("r" + id); try { const r = await distToggleRule(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await reload(); } finally { setBusy(""); } };
  const funnelMax = Math.max(1, ...data.funnel.map((f) => f.value));
  const repurpMax = Math.max(1, ...data.repurposing.map((r) => r.count));
  const bestMax = Math.max(1, ...data.bestContent.map((b) => b.leads));
  const chanMax = Math.max(1, ...data.topChannels.map((c) => c.leads));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Layers} label="Total Content Distributed" value={<AnimatedNumber value={k.totalContentDistributed.value} />} kpi={k.totalContentDistributed} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Radio} label="Total Reach" value={fmtK(k.totalReach.value)} kpi={k.totalReach} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={MousePointerClick} label="Total Clicks" value={fmtK(k.totalClicks.value)} kpi={k.totalClicks} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Sparkles} label="Total Engagements" value={fmtK(k.totalEngagements.value)} kpi={k.totalEngagements} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Users} label="Leads Generated" value={<AnimatedNumber value={k.leadsGenerated.value} />} kpi={k.leadsGenerated} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={Clock} label="Avg. Distribution Time" value={fmtMin(k.avgDistributionTime.value)} kpi={k.avgDistributionTime} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </Stagger>

      {/* Channel donut · trend · top channels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Distribution by Channel" sub={`${data.byChannel.total} posts`}>
          <div className="flex items-center gap-3">
            <Donut segments={data.byChannel.segments} centerValue={data.byChannel.total} centerLabel="Total" />
            <div className="flex-1 space-y-1 min-w-0">{data.byChannel.segments.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold shrink-0">{s.count} ({s.pct}%)</span></div>
            ))}</div>
          </div>
        </Card></FadeUp>

        <FadeUp><Card title="Distribution Performance Trend" sub="Last 7 days · est."><MultiLine labels={data.performanceTrend.labels} series={data.performanceTrend.series} /></Card></FadeUp>

        <FadeUp><Card title="Top Performing Channels" sub="By leads">
          <div className="space-y-2.5">{data.topChannels.length === 0 ? <div className="text-slate-500 text-xs py-6 text-center">Distribute content to rank channels.</div> : data.topChannels.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="w-5 text-[11px] text-slate-500 font-bold">{c.rank}</span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="text-[12px] text-slate-200 font-medium flex-1 truncate">{c.label}</span>
              <span className="text-[11px] text-white font-bold">{c.leads}</span>
              <span className="text-[10px] text-slate-500 w-10 text-right">{c.pct}%</span>
              <div className="w-16 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: c.color }} initial={{ width: 0 }} animate={{ width: `${(c.leads / chanMax) * 100}%` }} transition={{ duration: 0.7 }} /></div>
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>

      {/* Recent distributions · Upcoming + insights + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Recent Distributions" sub="Latest content pushes">
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Content</th><th className="font-medium px-1">Channels</th><th className="font-medium px-1">When</th><th className="font-medium text-right px-1">Reach</th><th className="font-medium text-right px-1">Clicks</th><th className="font-medium text-center px-1">Status</th><th className="font-medium text-center px-1">Act.</th></tr></thead>
            <tbody>{data.recentDistributions.map((r) => (
              <tr key={r.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1 text-slate-200 font-medium truncate max-w-[190px]">{r.title}</td>
                <td className="px-1"><ChannelDots channels={r.channels} map={colorMap} /></td>
                <td className="px-1 text-slate-500 whitespace-nowrap">{new Date(r.distributedOn).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                <td className="px-1 text-right text-slate-300">{r.reach ? fmtK(r.reach) : "—"}</td>
                <td className="px-1 text-right text-slate-400">{r.clicks ? fmtK(r.clicks) : "—"}</td>
                <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPill(r.status)}`}>{r.status}</span></td>
                <td className="px-1 text-center">{r.status !== "Delivered" ? <button onClick={() => run(r.id)} disabled={!!busy} title="Publish now" className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-ink-700 text-emerald-300 disabled:opacity-40">{busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}</button> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        <div className="space-y-4">
          <FadeUp><Card title="Upcoming Scheduled Distribution">
            {data.upcoming.length === 0 ? <div className="text-slate-500 text-xs py-4 text-center">Nothing scheduled.</div> : (
              <div className="space-y-2">{data.upcoming.map((u, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[11px]">
                  <span className="w-8 text-slate-500 whitespace-nowrap">{new Date(u.scheduledAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                  <span className="text-slate-200 flex-1 truncate">{u.title}</span>
                  <span className="text-slate-500 truncate max-w-[80px]">{u.channelLabel}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">{u.status}</span>
                </div>
              ))}</div>
            )}
          </Card></FadeUp>
          <FadeUp><Card title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onDistribute} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 px-2.5 py-2 text-[11px] font-medium text-emerald-200"><Plus className="w-3.5 h-3.5" />Distribute</button>
              <button onClick={() => flash(`${data.repurposing.reduce((a, r) => a + r.count, 0)} repurposing transforms available from your blog library.`)} className="flex items-center gap-1.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-2.5 py-2 text-[11px] font-medium text-slate-200"><Repeat className="w-3.5 h-3.5 text-violet-300" />Repurpose</button>
              <button onClick={() => flash(`Newsletter builder → ${data.channels.find((c) => c.key === "Email")?.connected ? "Email connected, ready to send." : "connect Email (RESEND/SMTP) to send."}`)} className="flex items-center gap-1.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-2.5 py-2 text-[11px] font-medium text-slate-200"><Mail className="w-3.5 h-3.5 text-rose-300" />Newsletter</button>
              <button onClick={() => flash("Community outreach targets subreddits & forums — connect Reddit in .env to auto-post.")} className="flex items-center gap-1.5 rounded-lg bg-ink-800/60 border border-ink-700 hover:bg-ink-800 px-2.5 py-2 text-[11px] font-medium text-slate-200"><Rss className="w-3.5 h-3.5 text-orange-300" />Communities</button>
            </div>
          </Card></FadeUp>
          <FadeUp><Card title="Distribution Insights">
            <div className="space-y-2">{data.insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]"><Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /><span className="text-slate-300 leading-snug">{ins.text}</span></div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Rules · Repurposing · Best content · Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Distribution Rules" sub="Active automations">
          <div className="space-y-2">{data.distributionRules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="text-[12px] text-slate-200 font-medium truncate">{r.name}</div><div className="text-[9px] text-slate-500">{r.trigger}</div></div>
              <button onClick={() => toggleRule(r.id)} disabled={!!busy} className={`shrink-0 w-9 h-5 rounded-full relative transition ${r.active ? "bg-emerald-500/40" : "bg-ink-700"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${r.active ? "left-4" : "left-0.5"}`} /></button>
            </div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Content Repurposing">
          <div className="space-y-2">{data.repurposing.map((r) => (
            <div key={r.to}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{r.from} → {r.to}</span><span className="font-bold text-white">{r.count}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full bg-violet-500" initial={{ width: 0 }} animate={{ width: `${(r.count / repurpMax) * 100}%` }} transition={{ duration: 0.7 }} /></div></div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Best Performing Content" sub="By leads">
          <div className="space-y-2">{data.bestContent.map((b, i) => (
            <div key={i} className="flex items-center gap-2"><span className="w-4 text-[11px] text-slate-500 font-bold">{i + 1}</span><span className="text-[12px] text-slate-200 flex-1 truncate">{b.title}</span><span className="text-[11px] text-white font-bold">{b.leads}</span></div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Distribution Funnel">
          <div className="space-y-2">{data.funnel.map((f, i) => (
            <div key={f.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{f.label}</span><span className="text-slate-400">{fmtK(f.value)} <span className="text-slate-600">({f.pct}%)</span></span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"][i] }} initial={{ width: 0 }} animate={{ width: `${(f.value / funnelMax) * 100}%` }} transition={{ duration: 0.7 }} /></div></div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ── Distribute modal ───────────────────────────────────────────────────── */
function DistributeModal({ data, onClose, flash, onDone }: { data: DistributionData; onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [mode, setMode] = useState<"blog" | "custom">("blog");
  const [blogId, setBlogId] = useState(data.contentLibrary[0]?.id || "");
  const [title, setTitle] = useState(""); const [content, setContent] = useState("");
  const [channels, setChannels] = useState<string[]>(["LinkedIn", "Email"]);
  const [schedule, setSchedule] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (c: string) => setChannels((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const submit = async () => {
    if (!channels.length) { flash("Pick at least one channel."); return; }
    if (mode === "blog" && !blogId) { flash("Pick content."); return; }
    if (mode === "custom" && !title.trim()) { flash("Enter a title."); return; }
    setBusy(true);
    try {
      const r = await distDistribute({ ...(mode === "blog" ? { blogId } : { title: title.trim(), content }), channels, schedule: schedule || null });
      flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed."));
      if (r.ok) { onDone(); onClose(); }
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Send className="w-4 h-4 text-emerald-400" /> Distribute Content</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <div className="flex gap-1 mb-3">{(["blog", "custom"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${mode === m ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" : "border-ink-700 text-slate-400"}`}>{m === "blog" ? "From Blog" : "Custom"}</button>)}</div>
        {mode === "blog" ? (
          <div><label className="text-[11px] text-slate-400">Content</label><select value={blogId} onChange={(e) => setBlogId(e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white">{data.contentLibrary.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></div>
        ) : (
          <div className="space-y-2"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className="w-full rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content / caption…" rows={3} className="w-full rounded-lg bg-ink-950 border border-ink-700 px-3 py-2 text-sm text-white" /></div>
        )}
        <div className="mt-3"><label className="text-[11px] text-slate-400">Channels</label><div className="mt-1 grid grid-cols-2 gap-1.5">{data.channels.map((c) => (
          <button key={c.key} onClick={() => toggle(c.key)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${channels.includes(c.key) ? "border-emerald-500/50 bg-emerald-500/10 text-white" : "border-ink-700 text-slate-400"}`}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} /><span className="flex-1 text-left truncate">{c.label}</span>{c.connected ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <span className="text-[8px] text-slate-600">connect</span>}
          </button>
        ))}</div><p className="text-[10px] text-slate-600 mt-1.5">{data.connectedCount} of {data.channels.length} channels connected. Unconnected channels queue until you add API keys in <code className="text-slate-400">.env</code>.</p></div>
        <div className="mt-3"><label className="text-[11px] text-slate-400">Schedule (optional)</label><input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{schedule ? "Schedule" : "Distribute"}</button>
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Channels tab ───────────────────────────────────────────────────────── */
const TYPE_PILL: Record<string, string> = { Social: "bg-violet-500/15 text-violet-300", Email: "bg-rose-500/15 text-rose-300", Community: "bg-orange-500/15 text-orange-300", Owned: "bg-sky-500/15 text-sky-300", Video: "bg-red-500/15 text-red-300", Messaging: "bg-cyan-500/15 text-cyan-300" };
const chStatusPill = (s: string) => (s === "Active" ? "bg-emerald-500/15 text-emerald-300" : s === "Underperforming" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-400");
function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 64, h = 22, n = data.length, max = Math.max(1, ...data), min = Math.min(...data), range = Math.max(1, max - min);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none" className="inline-block"><polyline points={data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function ChannelsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ChannelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getDistributionChannels({ q, type, status })); } finally { setLoading(false); } }, [q, type, status]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No channel data.</div>;

  const k = d.kpis;
  return (
    <div className="space-y-4">
      {addOpen && <AddChannelModal channels={d.channels} onClose={() => setAddOpen(false)} />}
      <div><h2 className="text-lg font-bold text-white">Channels</h2><p className="text-[12px] text-slate-500">Manage all distribution channels, monitor performance & optimize content reach across platforms.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Layers} label="Total Channels" value={<AnimatedNumber value={k.totalChannels.value} />} kpi={k.totalChannels} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Radio} label="Total Reach" value={fmtK(k.totalReach.value)} kpi={k.totalReach} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={MousePointerClick} label="Total Clicks" value={fmtK(k.totalClicks.value)} kpi={k.totalClicks} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Sparkles} label="Total Engagements" value={fmtK(k.totalEngagements.value)} kpi={k.totalEngagements} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Users} label="Leads Generated" value={<AnimatedNumber value={k.leadsGenerated.value} />} kpi={k.leadsGenerated} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={Clock} label="Avg. Distribution Time" value={fmtMin(k.avgDistributionTime.value)} kpi={k.avgDistributionTime} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </Stagger>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search channels…" className="w-48 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
        <select value={type} onChange={(e) => setType(e.target.value === "All Channel Types" ? "" : e.target.value)} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Channel Types</option>{d.types.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value === "All Status" ? "" : e.target.value)} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Status</option>{["Active", "Underperforming", "Inactive"].map((s) => <option key={s}>{s}</option>)}</select>
        <button onClick={() => setAddOpen(true)} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Add Channel</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Performance table */}
        <FadeUp className="xl:col-span-2"><Card title="Channel Performance Overview" sub={`${d.channels.length} channels`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Channel</th><th className="font-medium px-1">Type</th><th className="font-medium text-right px-1">Reach</th><th className="font-medium text-right px-1">Clicks</th><th className="font-medium text-right px-1">Eng.</th><th className="font-medium text-right px-1">Leads</th><th className="font-medium text-right px-1">CTR</th><th className="font-medium text-center px-1">Status</th><th className="font-medium text-center px-1">Trend</th></tr></thead>
            <tbody>{d.channels.length === 0 ? <tr><td colSpan={9} className="text-center text-slate-500 py-8">No channels match.</td></tr> : d.channels.map((c) => (
              <tr key={c.key} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background: c.color + "22" }}><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /></span><span className="text-slate-200 font-medium truncate max-w-[110px]">{c.label}</span>{c.connected && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}</div></td>
                <td className="px-1"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_PILL[c.type] || "bg-slate-500/15 text-slate-300"}`}>{c.type}</span></td>
                <td className="px-1 text-right text-slate-300">{c.reach ? fmtK(c.reach) : "—"}</td>
                <td className="px-1 text-right text-slate-400">{c.clicks ? fmtK(c.clicks) : "—"}</td>
                <td className="px-1 text-right text-slate-400">{c.engagements ? fmtK(c.engagements) : "—"}</td>
                <td className="px-1 text-right text-slate-200 font-semibold">{c.leads || "—"}</td>
                <td className="px-1 text-right text-slate-400">{c.ctr ? c.ctr + "%" : "—"}</td>
                <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${chStatusPill(c.status)}`}>{c.status}</span></td>
                <td className="px-1 text-center">{c.reach ? <Spark data={c.trend} color={c.status === "Active" ? "#34d399" : c.status === "Underperforming" ? "#fbbf24" : "#64748b"} /> : <span className="text-slate-700">—</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Channel Type Distribution">
            <div className="flex items-center gap-3">
              <Donut segments={d.typeDistribution.segments} centerValue={d.typeDistribution.total} centerLabel="Total" />
              <div className="flex-1 space-y-1">{d.typeDistribution.segments.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} ({s.pct}%)</span></div>
              ))}</div>
            </div>
          </Card></FadeUp>

          <FadeUp><Card title="Channel Health">
            {[["Active Channels", d.health.active, "#34d399"], ["Underperforming", d.health.underperforming, "#fbbf24"], ["Inactive Channels", d.health.inactive, "#64748b"]].map(([label, v, color]) => {
              const val = v as { count: number; pct: number };
              return (
                <div key={label as string} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{label as string}</span><span className="font-bold text-white">{val.count} <span className="text-slate-500 font-normal">({val.pct}%)</span></span></div>
                  <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: color as string }} initial={{ width: 0 }} animate={{ width: `${val.pct}%` }} transition={{ duration: 0.7 }} /></div>
                </div>
              );
            })}
            <button onClick={() => { setStatus("Underperforming"); }} className="mt-1 text-[11px] text-emerald-300 hover:text-emerald-200">Manage Underperforming Channels →</button>
          </Card></FadeUp>
        </div>
      </div>

      {/* Channel detail cards */}
      <FadeUp><Card title="Channel Details" sub="Live per-channel metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{d.details.map((c) => (
          <div key={c.key} className="rounded-xl border border-ink-800 bg-ink-800/30 p-3">
            <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-1.5 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} /><span className="text-[12px] font-semibold text-white truncate">{c.label}</span></div><span className={`text-[8px] px-1.5 py-0.5 rounded ${chStatusPill(c.status)}`}>{c.status}</span></div>
            <div className="grid grid-cols-3 gap-1 text-center mb-2">
              <div><div className="text-[9px] text-slate-500">Reach</div><div className="text-[11px] font-bold text-slate-200">{fmtK(c.reach)}</div></div>
              <div><div className="text-[9px] text-slate-500">Clicks</div><div className="text-[11px] font-bold text-slate-200">{fmtK(c.clicks)}</div></div>
              <div><div className="text-[9px] text-slate-500">Leads</div><div className="text-[11px] font-bold text-teal-300">{c.leads}</div></div>
            </div>
            <div className="flex items-center justify-between"><Spark data={c.trend} color={c.color} /><span className="text-[10px] text-slate-500">CTR {c.ctr}%</span></div>
            <button onClick={() => flash(`${c.label}: ${fmtK(c.reach)} reach · ${fmtK(c.clicks)} clicks · ${c.leads} leads · ${c.ctr}% CTR.`)} className="mt-2 w-full text-[11px] text-emerald-300 hover:text-emerald-200">View Details →</button>
          </div>
        ))}</div>
      </Card></FadeUp>
    </div>
  );
}

function AddChannelModal({ channels, onClose }: { channels: ChannelsData["channels"]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-900 p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400" /> Channels & Connections</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <p className="text-[12px] text-slate-500 mb-3">Connect a channel by setting its API keys in <code className="text-slate-400">backend/.env</code>, then restart the backend. Connected channels post for real.</p>
        <div className="space-y-2">{channels.map((c) => (
          <div key={c.key} className="rounded-lg border border-ink-800 bg-ink-800/30 p-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} /><span className="text-[13px] font-semibold text-white">{c.label}</span></div><span className={`text-[10px] font-semibold inline-flex items-center gap-1 ${c.connected ? "text-emerald-300" : "text-slate-500"}`}>{c.connected ? <><CheckCircle2 className="w-3 h-3" />Connected</> : "Not connected"}</span></div>
            {!c.connected && c.hint && <div className="text-[10px] text-slate-500 mt-1">{c.hint}</div>}
          </div>
        ))}</div>
      </motion.div>
    </div>
  );
}

/* ── Scheduled Distribution tab ─────────────────────────────────────────── */
const schStatusPill = (s: string) => (s === "Published" ? "bg-emerald-500/15 text-emerald-300" : s === "Failed" ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300");

function ScheduledTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ScheduledData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [busy, setBusy] = useState("");
  const [resched, setResched] = useState<{ id: string; title: string } | null>(null);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getScheduledDistribution()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const dup = async (id: string) => { setBusy("c" + id); try { const r = await distDuplicate(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };
  const del = async (id: string) => { setBusy("d" + id); try { const r = await distDeletePost(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No schedule data.</div>;

  const k = d.kpis;
  const allScheduled = d.calendar.days.flatMap((day) => day.posts).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="space-y-4">
      {resched && <RescheduleModal post={resched} onClose={() => setResched(null)} flash={flash} onDone={fetchData} />}
      <div><h2 className="text-lg font-bold text-white">Scheduled Distribution</h2><p className="text-[12px] text-slate-500">Plan, schedule & automate content distribution across all channels to maximize reach and engagement.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={CalendarDays} label="Scheduled Posts" value={<AnimatedNumber value={k.scheduledPosts.value} />} kpi={k.scheduledPosts} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Clock} label="To be Published" value={<AnimatedNumber value={k.toBePublished.value} />} kpi={k.toBePublished} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={CheckCircle2} label="Published" value={<AnimatedNumber value={k.published.value} />} kpi={k.published} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={X} label="Failed / Skipped" value={<AnimatedNumber value={k.failedSkipped.value} />} kpi={k.failedSkipped} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={Radio} label="Total Reach (Est.)" value={fmtK(k.totalReach.value)} kpi={k.totalReach} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Sparkles} label="Engagement (Est.)" value={fmtK(k.engagement.value)} kpi={k.engagement} color="bg-amber-500/15 text-amber-300" />
      </Stagger>

      {/* View toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-ink-700 p-0.5">
          <button onClick={() => setView("calendar")} className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium ${view === "calendar" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400"}`}><CalendarDays className="w-3.5 h-3.5" /> Calendar</button>
          <button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-medium ${view === "list" ? "bg-emerald-500/20 text-emerald-200" : "text-slate-400"}`}><List className="w-3.5 h-3.5" /> List</button>
        </div>
        <button onClick={() => flash("Schedule new content from the Distribute Content dialog (set a schedule date). Then it appears here.")} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Schedule Content</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Calendar / list */}
        <FadeUp className="xl:col-span-3"><Card title={view === "calendar" ? `Week of ${new Date(d.calendar.weekStart).toLocaleDateString("en", { month: "short", day: "numeric" })}` : "Scheduled Posts"} sub={`${allScheduled.length} posts`}>
          {view === "calendar" ? (
            <div className="overflow-x-auto"><div className="grid grid-cols-7 gap-1.5 min-w-[720px]">{d.calendar.days.map((day) => (
              <div key={day.dayName} className="min-w-0">
                <div className={`text-center pb-1.5 mb-1.5 border-b ${day.isToday ? "border-emerald-500/40" : "border-ink-800"}`}><div className="text-[10px] text-slate-500">{day.dayName}</div><div className={`text-[13px] font-bold ${day.isToday ? "text-emerald-300" : "text-slate-300"}`}>{day.dayNum}</div></div>
                <div className="space-y-1.5">{day.posts.length === 0 ? <div className="text-[9px] text-slate-700 text-center py-2">—</div> : day.posts.map((p) => (
                  <div key={p.id} className="rounded-lg border border-ink-800 bg-ink-800/40 p-1.5">
                    <div className="flex items-center gap-1 mb-0.5"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} /><span className="text-[9px] text-slate-500">{p.timeLabel}</span></div>
                    <div className="text-[10px] text-slate-200 font-medium leading-tight line-clamp-2">{p.title}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">{p.type}</div>
                    <span className={`inline-block mt-1 rounded px-1 py-0.5 text-[7px] font-semibold ${schStatusPill(p.status)}`}>{p.status}</span>
                  </div>
                ))}</div>
              </div>
            ))}</div></div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Content</th><th className="font-medium px-1">Channel</th><th className="font-medium px-1">Type</th><th className="font-medium px-1">When</th><th className="font-medium text-right px-1">Reach</th><th className="font-medium text-center px-1">Status</th></tr></thead>
              <tbody>{allScheduled.map((p) => (
                <tr key={p.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="py-2 px-1 text-slate-200 font-medium truncate max-w-[200px]">{p.title}</td>
                  <td className="px-1"><span className="inline-flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.channelLabel}</span></td>
                  <td className="px-1 text-slate-500">{p.type}</td>
                  <td className="px-1 text-slate-400 whitespace-nowrap">{new Date(p.time).toLocaleDateString("en", { month: "short", day: "numeric" })} {p.timeLabel}</td>
                  <td className="px-1 text-right text-slate-300">{fmtK(p.reach)}</td>
                  <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${schStatusPill(p.status)}`}>{p.status}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Upcoming Schedule">
            {d.upcoming.length === 0 ? <div className="text-slate-500 text-xs py-4 text-center">Nothing upcoming.</div> : (
              <div className="space-y-2">{d.upcoming.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 w-14 shrink-0">{u.timeLabel}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: u.color }} />
                  <div className="min-w-0 flex-1"><div className="text-slate-200 truncate">{u.type}</div><div className="text-[9px] text-slate-500 truncate">{u.title}</div></div>
                  <span className="text-[9px] text-emerald-400 shrink-0 whitespace-nowrap">{u.rel}</span>
                </div>
              ))}</div>
            )}
          </Card></FadeUp>

          <FadeUp><Card title="Schedule Summary">
            {d.summary.total === 0 ? <div className="text-slate-500 text-xs py-4 text-center">No scheduled posts.</div> : (
              <div className="flex items-center gap-3"><Donut segments={d.summary.segments} centerValue={d.summary.total} centerLabel="Total" /><div className="flex-1 space-y-1">{d.summary.segments.map((s) => (<div key={s.label} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold shrink-0">{s.count} ({s.pct}%)</span></div>))}</div></div>
            )}
          </Card></FadeUp>

          <FadeUp><Card title="Best Time to Publish">
            <div className="space-y-2">{d.bestTimes.map((b) => (
              <div key={b.key} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full" style={{ background: b.color }} />{b.label}</span><span className="text-slate-400">{b.window}</span></div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Queue + automation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp className="xl:col-span-2"><Card title="Scheduled Content Queue" sub="Next 7 days">
          {d.queue.length === 0 ? <div className="text-slate-500 text-xs py-8 text-center">No posts scheduled in the next 7 days. Schedule content to fill the queue.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Content</th><th className="font-medium px-1">Channel</th><th className="font-medium px-1">When</th><th className="font-medium text-center px-1">Status</th><th className="font-medium text-right px-1">Reach</th><th className="font-medium text-right px-1">Eng.</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
              <tbody>{d.queue.map((q) => (
                <tr key={q.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="py-2 px-1 text-slate-200 font-medium truncate max-w-[170px]">{q.title}</td>
                  <td className="px-1"><span className="inline-flex items-center gap-1.5 text-slate-300"><span className="w-2 h-2 rounded-full" style={{ background: q.color }} />{q.channelLabel}</span></td>
                  <td className="px-1 text-slate-400 whitespace-nowrap">{new Date(q.scheduledOn).toLocaleDateString("en", { month: "short", day: "numeric" })} {q.timeLabel}</td>
                  <td className="px-1 text-center"><span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold bg-sky-500/15 text-sky-300">{q.status}</span></td>
                  <td className="px-1 text-right text-slate-300">{fmtK(q.reach)}</td>
                  <td className="px-1 text-right text-slate-400">{fmtK(q.engagement)}</td>
                  <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <button onClick={() => setResched({ id: q.id, title: q.title })} title="Reschedule" className="hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => dup(q.id)} disabled={!!busy} title="Duplicate" className="hover:text-white disabled:opacity-40">{busy === "c" + q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => del(q.id)} disabled={!!busy} title="Delete" className="hover:text-rose-300 disabled:opacity-40">{busy === "d" + q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card></FadeUp>

        <FadeUp><Card title="Automation & Reminders">
          <div className="space-y-2">{d.automation.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
              <div className="min-w-0"><div className="text-[12px] text-slate-200 font-medium truncate">{a.name}</div><div className="text-[9px] text-slate-500">{a.trigger}</div></div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${a.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>{a.active ? "Active" : "Paused"}</span>
            </div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

function RescheduleModal({ post, onClose, flash, onDone }: { post: { id: string; title: string }; onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!when) { flash("Pick a date & time."); return; }
    setBusy(true);
    try { const r = await distReschedule(post.id, when); flash(r.ok ? `✓ ${r.message}` : "Failed"); if (r.ok) { onDone(); onClose(); } } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-400" /> Reschedule</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <p className="text-[12px] text-slate-400 mb-3 truncate">{post.title}</p>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" />
        <div className="flex gap-2 mt-4"><button onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}Reschedule</button><button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button></div>
      </motion.div>
    </div>
  );
}

/* ── Distribution Rules tab ─────────────────────────────────────────────── */
const ruleStatusPill = (s: string) => (s === "Active" ? "bg-emerald-500/15 text-emerald-300" : s === "Paused" ? "bg-amber-500/15 text-amber-300" : s === "Draft" ? "bg-slate-500/15 text-slate-300" : "bg-ink-700 text-slate-500");
const TRIG_ICON: Record<string, React.ElementType> = { published: Send, updated: RefreshCw, aging: Clock, manual: Play, performance: TrendingUp, schedule: CalendarDays };
const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
const RULE_TABS = ["All Rules", "Active", "Paused", "Draft", "Archived"];

function RulesTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("All Rules"); const [trigger, setTrigger] = useState(""); const [channel, setChannel] = useState(""); const [q, setQ] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(""); const [createOpen, setCreateOpen] = useState(false);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getDistributionRules({ status: status === "All Rules" ? "" : status, trigger, channel, q, page, perPage: 8 })); } finally { setLoading(false); } }, [status, trigger, channel, q, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const act = async (key: string, fn: () => Promise<{ ok: boolean; message?: string }>) => { setBusy(key); try { const r = await fn(); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No rules data.</div>;

  const k = d.kpis;
  return (
    <div className="space-y-4">
      {createOpen && <CreateRuleModal data={d} onClose={() => setCreateOpen(false)} flash={flash} onDone={fetchData} />}
      <div><h2 className="text-lg font-bold text-white">Distribution Rules</h2><p className="text-[12px] text-slate-500">Create & manage automation rules to distribute content across channels based on triggers & conditions.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Zap} label="Total Rules" value={<AnimatedNumber value={k.totalRules.value} />} kpi={k.totalRules} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={CheckCircle2} label="Active Rules" value={<AnimatedNumber value={k.activeRules.value} />} kpi={k.activeRules} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={Send} label="Auto-Published (7d)" value={<AnimatedNumber value={k.autoPublished7d.value} />} kpi={k.autoPublished7d} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Radio} label="Channels Covered" value={<AnimatedNumber value={k.channelsCovered.value} />} kpi={k.channelsCovered} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={TrendingUp} label="Success Rate" value={`${k.successRate.value}%`} kpi={k.successRate} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Clock} label="Avg. Execution Time" value={fmtSec(k.avgExecutionTime.value)} kpi={k.avgExecutionTime} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </Stagger>

      {/* Sub-tabs + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">{RULE_TABS.map((t) => <button key={t} onClick={() => { setStatus(t); setPage(1); }} className={`px-3 h-8 rounded-lg text-[12px] font-medium border ${status === t ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" : "border-ink-700 text-slate-400 hover:text-white"}`}>{t}</button>)}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search rules…" className="w-40 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
          <select value={trigger} onChange={(e) => { setTrigger(e.target.value === "All Triggers" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Triggers</option>{d.triggerTypes.map((t) => <option key={t}>{t}</option>)}</select>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Create Rule</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Rules table */}
        <FadeUp className="xl:col-span-2"><Card title="Rules" sub={`${d.rules.total} rules`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Rule</th><th className="font-medium px-1">Trigger</th><th className="font-medium px-1">Channels</th><th className="font-medium px-1">Conditions</th><th className="font-medium text-center px-1">Status</th><th className="font-medium px-1">Last Run</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
            <tbody>{d.rules.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-500 py-8">No rules match.</td></tr> : d.rules.rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="text-slate-200 font-medium">{r.name}</div><div className="text-[9px] text-slate-500">{r.description}</div></td>
                <td className="px-1"><div className="text-slate-300">{r.triggerType}</div><div className="text-[9px] text-slate-500 truncate max-w-[110px]">{r.trigger.split("·")[1] || ""}</div></td>
                <td className="px-1"><div className="flex -space-x-1">{r.channels.slice(0, 3).map((c) => <span key={c} title={d.channelMeta[c]?.label || c} className="w-4 h-4 rounded-full border border-ink-900" style={{ background: d.channelMeta[c]?.color || "#64748b" }} />)}{r.channels.length > 3 && <span className="text-[8px] text-slate-500 ml-1.5">+{r.channels.length - 3}</span>}</div></td>
                <td className="px-1"><div className="space-y-0.5">{r.conditions.slice(0, 2).map((c, i) => <div key={i} className="text-[9px] text-slate-500 truncate max-w-[130px]">{c}</div>)}</div></td>
                <td className="px-1 text-center"><button onClick={() => act("t" + r.id, () => distRuleStatus(r.id, r.status === "Active" ? "Paused" : "Active"))} className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ruleStatusPill(r.status)}`}>{r.status}</button></td>
                <td className="px-1 text-slate-500 whitespace-nowrap">{r.lastExecuted ? new Date(r.lastExecuted).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}</td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => act("r" + r.id, () => distRunRule(r.id))} disabled={!!busy} title="Run now" className="hover:text-emerald-300 disabled:opacity-40">{busy === "r" + r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => act("c" + r.id, () => distDuplicateRule(r.id))} disabled={!!busy} title="Duplicate" className="hover:text-white disabled:opacity-40"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => act("d" + r.id, () => distDeleteRule(r.id))} disabled={!!busy} title="Delete" className="hover:text-rose-300 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {d.rules.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500"><span>Showing {(d.rules.page - 1) * d.rules.perPage + 1}–{Math.min(d.rules.page * d.rules.perPage, d.rules.total)} of {d.rules.total}</span><div className="flex items-center gap-1"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>{Array.from({ length: d.rules.pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}<button disabled={page >= d.rules.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Create New Rule" sub="5 steps" right={<button onClick={() => setCreateOpen(true)} className="text-[11px] text-emerald-300 hover:text-emerald-200">+ New</button>}>
            <div className="space-y-2">{d.steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-300 grid place-items-center text-[11px] font-bold shrink-0">{i + 1}</span><span className="text-[12px] text-slate-300">{s}</span></div>
            ))}</div>
            <button onClick={() => setCreateOpen(true)} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Create New Rule</button>
          </Card></FadeUp>

          <FadeUp><Card title="Trigger Library">
            <div className="space-y-2">{d.triggerLibrary.map((t) => { const Ico = TRIG_ICON[t.icon] || Zap; return (
              <div key={t.type} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5 text-emerald-300" /></span><span className="text-[12px] text-slate-300 flex-1">{t.type}</span><span className="text-[11px] text-slate-500">{t.count} {t.count === 1 ? "rule" : "rules"}</span></div>
            ); })}</div>
          </Card></FadeUp>

          <FadeUp><Card title="Rule Execution Log" sub="Latest">
            <div className="space-y-2">{d.executionLog.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]"><CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${l.status === "Success" ? "text-emerald-400" : "text-rose-400"}`} /><span className="text-slate-300 flex-1 truncate">{l.rule}</span><span className="text-[9px] text-slate-500">{new Date(l.when).toLocaleDateString("en", { month: "short", day: "numeric" })}</span><span className={`text-[9px] px-1.5 py-0.5 rounded ${l.status === "Success" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{l.status}</span></div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Performance + top rules */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Rule Performance Overview" sub={`${d.performance.total} active rules`}>
          <div className="flex items-center gap-3"><Donut segments={d.performance.segments} centerValue={d.performance.total} centerLabel="Active" /><div className="flex-1 space-y-1.5">{d.performance.segments.map((s) => (<div key={s.label} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold">{s.count} ({s.pct}%)</span></div>))}</div></div>
        </Card></FadeUp>

        <FadeUp className="xl:col-span-2"><Card title="Top Performing Rules" sub="By reach & engagement">
          {d.topRules.length === 0 ? <div className="text-slate-500 text-xs py-6 text-center">Run rules to see performance.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Rule Name</th><th className="font-medium text-right px-1">Executions</th><th className="font-medium text-right px-1">Reach</th><th className="font-medium text-right px-1">Engagement</th><th className="font-medium text-right px-1">Success</th></tr></thead>
              <tbody>{d.topRules.map((r) => (
                <tr key={r.name} className="border-b border-ink-900/60"><td className="py-2 px-1 text-slate-200 font-medium truncate max-w-[180px]">{r.name}</td><td className="px-1 text-right text-slate-300">{r.executions}</td><td className="px-1 text-right text-slate-300">{fmtK(r.reach)}</td><td className="px-1 text-right text-slate-400">{fmtK(r.engagement)}</td><td className="px-1 text-right text-emerald-300 font-semibold">{r.successRate}%</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card></FadeUp>
      </div>
    </div>
  );
}

function CreateRuleModal({ data, onClose, flash, onDone }: { data: RulesData; onClose: () => void; flash: (m: string) => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", triggerType: "Content Published", conditions: "", status: "Active" });
  const [channels, setChannels] = useState<string[]>(["LinkedIn"]);
  const [busy, setBusy] = useState(false);
  const set = (key: string, v: string) => setForm((f) => ({ ...f, [key]: v }));
  const toggle = (c: string) => setChannels((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const submit = async () => {
    if (!form.name.trim()) { flash("Enter a rule name."); return; }
    if (!channels.length) { flash("Pick at least one channel."); return; }
    setBusy(true);
    try { const r = await distCreateRuleFull({ name: form.name.trim(), description: form.description, channels, trigger: form.triggerType, triggerType: form.triggerType, conditions: form.conditions.split("\n").map((s) => s.trim()).filter(Boolean), status: form.status }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); if (r.ok) { onDone(); onClose(); } } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-900 p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> Create Rule</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <div className="space-y-3">
          <div><label className="text-[11px] text-slate-400">Rule Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Auto-post yacht guides to LinkedIn" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          <div><label className="text-[11px] text-slate-400">Description</label><input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this rule does" className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white" /></div>
          <div><label className="text-[11px] text-slate-400">Trigger</label><select value={form.triggerType} onChange={(e) => set("triggerType", e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white">{data.triggerTypes.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="text-[11px] text-slate-400">Channels</label><div className="mt-1 grid grid-cols-3 gap-1.5">{data.allChannels.map((c) => (<button key={c} onClick={() => toggle(c)} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] ${channels.includes(c) ? "border-emerald-500/50 bg-emerald-500/10 text-white" : "border-ink-700 text-slate-400"}`}><span className="w-2 h-2 rounded-full shrink-0" style={{ background: data.channelMeta[c]?.color || "#64748b" }} /><span className="truncate">{data.channelMeta[c]?.label || c}</span></button>))}</div></div>
          <div><label className="text-[11px] text-slate-400">Conditions (one per line)</label><textarea value={form.conditions} onChange={(e) => set("conditions", e.target.value)} placeholder={"Content Type is Blog Post\nStatus is Published"} rows={3} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 py-2 text-sm text-white" /></div>
          <div><label className="text-[11px] text-slate-400">Status</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full mt-1 rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-sm text-white"><option>Active</option><option>Draft</option><option>Paused</option></select></div>
        </div>
        <div className="flex gap-2 mt-4"><button onClick={submit} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create Rule</button><button onClick={onClose} className="px-4 h-10 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button></div>
      </motion.div>
    </div>
  );
}

/* ── Content Repurposing tab ────────────────────────────────────────────── */
const repStatusPill = (s: string) => (s === "Completed" ? "bg-emerald-500/15 text-emerald-300" : s === "In Progress" ? "bg-sky-500/15 text-sky-300" : s === "Scheduled" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-400");
const REPURPOSE_SUBTABS = ["Repurposing Hub", "Templates", "Asset Library", "Brand Voice", "AI Settings"];

function RepurposingTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<RepurposingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState("Repurposing Hub");
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(false);
  // Wizard state
  const [selBlog, setSelBlog] = useState(""); const [selChannels, setSelChannels] = useState<string[]>(["LinkedIn", "Facebook", "X", "Email"]); const [selTypes, setSelTypes] = useState<string[]>(["Social Media Post", "Blog Summary", "Email Copy"]);
  const fetchData = useCallback(async () => { setLoading(true); try { const r = await getContentRepurposing({ q, type, status, page, perPage: 8 }); setD(r); if (!selBlog && r.contentLibrary[0]) setSelBlog(r.contentLibrary[0].id); } finally { setLoading(false); } }, [q, type, status, page, selBlog]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const generate = async () => {
    if (!selBlog) { flash("Select content."); return; }
    if (!selChannels.length || !selTypes.length) { flash("Pick channels and asset types."); return; }
    setBusy(true);
    try { const r = await distRepurpose({ blogId: selBlog, channels: selChannels, assetTypes: selTypes }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); if (r.ok) await fetchData(); } finally { setBusy(false); }
  };
  const toggleCh = (c: string) => setSelChannels((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  const toggleTy = (t: string) => setSelTypes((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No repurposing data.</div>;

  const k = d.kpis;
  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-white">Content Repurposing</h2><p className="text-[12px] text-slate-500">Convert one piece of content into multiple formats & assets optimized for different channels.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Repeat} label="Total Repurposed" value={<AnimatedNumber value={k.totalRepurposed.value} />} kpi={k.totalRepurposed} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Layers} label="Assets Generated" value={<AnimatedNumber value={k.assetsGenerated.value} />} kpi={k.assetsGenerated} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={CheckCircle2} label="Content Pieces" value={<AnimatedNumber value={k.contentPieces.value} />} kpi={k.contentPieces} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={Sparkles} label="Engagement (Est.)" value={fmtK(k.engagement.value)} kpi={k.engagement} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Radio} label="Traffic (Est.)" value={fmtK(k.traffic.value)} kpi={k.traffic} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Clock} label="Avg. Repurposing Time" value={fmtSec(k.avgRepurposingTime.value)} kpi={k.avgRepurposingTime} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </Stagger>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-ink-800">{REPURPOSE_SUBTABS.map((t) => <button key={t} onClick={() => setSub(t)} className={`px-3 py-2 text-[12px] font-medium ${sub === t ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>)}</div>

      {sub !== "Repurposing Hub" ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-10 text-center"><Repeat className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" /><div className="text-base font-bold text-white">{sub}</div><p className="text-sm text-slate-500 mt-1">Being built. {d.kpis.assetsGenerated.value} real assets generated from {d.kpis.contentPieces.value} content pieces so far.</p></div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search content…" className="w-44 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
            <select value={type} onChange={(e) => { setType(e.target.value === "All Content Types" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Content Types</option>{d.types.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={status} onChange={(e) => { setStatus(e.target.value === "All Status" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Status</option>{["Completed", "In Progress", "Draft", "Scheduled"].map((s) => <option key={s}>{s}</option>)}</select>
            <button onClick={() => document.getElementById("repurpose-wizard")?.scrollIntoView({ behavior: "smooth" })} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Repurpose Content</button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Content table */}
            <FadeUp className="xl:col-span-2"><Card title="Repurposing Hub" sub={`${d.content.total} content pieces`}>
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Content</th><th className="font-medium px-1">Type</th><th className="font-medium px-1">Published</th><th className="font-medium px-1">Channels</th><th className="font-medium text-center px-1">Assets</th><th className="font-medium text-center px-1">Status</th><th className="font-medium px-1">Last</th></tr></thead>
                <tbody>{d.content.rows.map((c) => (
                  <tr key={c.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                    <td className="py-2 px-1"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shrink-0"><FileText className="w-3.5 h-3.5 text-white" /></span><span className="text-slate-200 font-medium truncate max-w-[160px]">{c.title}</span></div></td>
                    <td className="px-1 text-slate-400">{c.type}</td>
                    <td className="px-1 text-slate-500 whitespace-nowrap">{new Date(c.publishedOn).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                    <td className="px-1">{c.channels.length ? <div className="flex -space-x-1">{c.channels.slice(0, 4).map((ch) => <span key={ch} title={d.channelMeta[ch]?.label || ch} className="w-4 h-4 rounded-full border border-ink-900" style={{ background: d.channelMeta[ch]?.color || "#64748b" }} />)}{c.channels.length > 4 && <span className="text-[8px] text-slate-500 ml-1.5">+{c.channels.length - 4}</span>}</div> : <span className="text-slate-700">—</span>}</td>
                    <td className="px-1 text-center text-slate-200 font-semibold">{c.assets || "—"}</td>
                    <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${repStatusPill(c.status)}`}>{c.status}</span></td>
                    <td className="px-1 text-slate-500 whitespace-nowrap">{c.lastRepurposed ? new Date(c.lastRepurposed).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              {d.content.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500"><span>Showing {(d.content.page - 1) * d.content.perPage + 1}–{Math.min(d.content.page * d.content.perPage, d.content.total)} of {d.content.total}</span><div className="flex items-center gap-1"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>{Array.from({ length: Math.min(d.content.pages, 6) }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}<button disabled={page >= d.content.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>}
            </Card></FadeUp>

            {/* Right column */}
            <div className="space-y-4">
              <FadeUp><Card title="Popular Repurposing Formats">
                {d.formats.total === 0 ? <div className="text-slate-500 text-xs py-4 text-center">Generate assets to see formats.</div> : (
                  <div className="flex items-center gap-3"><Donut segments={d.formats.segments} centerValue={d.formats.total} centerLabel="Assets" /><div className="flex-1 space-y-1">{d.formats.segments.map((s) => (<div key={s.label} className="flex items-center justify-between text-[10px]"><span className="flex items-center gap-1.5 text-slate-400 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}</span><span className="text-slate-300 font-semibold shrink-0">{s.count} ({s.pct}%)</span></div>))}</div></div>
                )}
              </Card></FadeUp>

              <FadeUp><Card title="Repurposing Efficiency">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-ink-800/50 border border-ink-800 p-2"><Clock className="w-3.5 h-3.5 text-sky-300 mx-auto mb-1" /><div className="text-[13px] font-bold text-white">{fmtMin(d.efficiency.timeSaved)}</div><div className="text-[9px] text-slate-500">Time Saved</div></div>
                  <div className="rounded-lg bg-ink-800/50 border border-ink-800 p-2"><DollarSign className="w-3.5 h-3.5 text-emerald-300 mx-auto mb-1" /><div className="text-[13px] font-bold text-white">${d.efficiency.costSaved.toLocaleString()}</div><div className="text-[9px] text-slate-500">Cost Saved</div></div>
                  <div className="rounded-lg bg-ink-800/50 border border-ink-800 p-2"><Sparkles className="w-3.5 h-3.5 text-violet-300 mx-auto mb-1" /><div className="text-[13px] font-bold text-white">{d.efficiency.aiAccuracy}%</div><div className="text-[9px] text-slate-500">AI Accuracy</div></div>
                </div>
              </Card></FadeUp>

              <FadeUp><Card title="Repurposing Insights">
                <div className="space-y-2">{d.insights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]"><Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /><span className="text-slate-300 leading-snug">{ins.text}</span></div>
                ))}</div>
              </Card></FadeUp>
            </div>
          </div>

          {/* Repurpose wizard */}
          <FadeUp><div id="repurpose-wizard"><Card title="Repurpose Content" sub="Select a content piece and generate assets for multiple channels">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <div className="text-[12px] font-semibold text-white mb-2">1. Select Content</div>
                <select value={selBlog} onChange={(e) => setSelBlog(e.target.value)} className="w-full rounded-lg bg-ink-950 border border-ink-700 px-3 h-10 text-[12px] text-white">{d.contentLibrary.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
                <div className="text-[10px] text-slate-500 mt-1.5">{d.contentLibrary.find((b) => b.id === selBlog)?.type} · Published {selBlog && d.contentLibrary.find((b) => b.id === selBlog) ? new Date(d.contentLibrary.find((b) => b.id === selBlog)!.publishedOn).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-white mb-2">2. Choose Channels</div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">{d.repurposeChannels.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"><input type="checkbox" checked={selChannels.includes(c)} onChange={() => toggleCh(c)} className="accent-emerald-500" /><span className="w-2 h-2 rounded-full" style={{ background: d.channelMeta[c]?.color || "#64748b" }} />{d.channelMeta[c]?.label || c}</label>
                ))}</div>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-white mb-2">3. Choose Asset Types</div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">{d.assetTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer"><input type="checkbox" checked={selTypes.includes(t)} onChange={() => toggleTy(t)} className="accent-emerald-500" />{t}</label>
                ))}</div>
              </div>
              <div className="flex flex-col">
                <div className="text-[12px] font-semibold text-white mb-2">4. Generate Assets</div>
                <p className="text-[10px] text-slate-500 flex-1">AI will create optimized assets for each selected channel & format from the real article content.</p>
                <button onClick={generate} disabled={busy} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Generate Assets</button>
                <div className="mt-1.5 text-center text-[10px] text-slate-500">{selChannels.length} channels · {selTypes.length} types</div>
              </div>
            </div>
          </Card></div></FadeUp>
        </>
      )}
    </div>
  );
}

/* ── Community Outreach tab ─────────────────────────────────────────────── */
const engLevelPill = (l: string) => (l === "Very High" ? "bg-emerald-500/15 text-emerald-300" : l === "High" ? "bg-teal-500/15 text-teal-300" : l === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-400");
const commStatusPill = (s: string) => (s === "Active" ? "bg-emerald-500/15 text-emerald-300" : s === "Monitoring" ? "bg-sky-500/15 text-sky-300" : "bg-slate-500/15 text-slate-400");
const OUTREACH_SUBTABS: [string, string][] = [["All Communities", ""], ["Reddit", "Reddit"], ["Facebook Groups", "Facebook Group"], ["LinkedIn Groups", "LinkedIn Group"], ["Forums", "Forum"], ["Q&A Sites", "Quora Space"]];

function OutreachTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<OutreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subPlatform, setSubPlatform] = useState("");
  const [q, setQ] = useState(""); const [niche, setNiche] = useState(""); const [status, setStatus] = useState(""); const [engagement, setEngagement] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getCommunityOutreach({ platform: subPlatform, q, niche, status, engagement, page, perPage: 10 })); } finally { setLoading(false); } }, [subPlatform, q, niche, status, engagement, page]);
  useEffect(() => { const t = setTimeout(fetchData, q ? 300 : 0); return () => clearTimeout(t); }, [fetchData, q]);

  const share = async (id: string, name: string) => { setBusy("s" + id); try { const r = await distShareCommunity(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };
  const add = async (id: string) => { setBusy("a" + id); try { const r = await distAddCommunity(id); flash(r.ok ? `✓ ${r.message}` : "Failed"); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  if (!d) return <div className="text-slate-500 text-sm py-20 text-center">No community data.</div>;

  const k = d.kpis;
  const topMax = Math.max(1, ...d.topPerforming.map((c) => c.engagements));

  return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-bold text-white">Community Outreach</h2><p className="text-[12px] text-slate-500">Discover, manage & engage with communities to distribute content, build relationships and drive traffic.</p></div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="Communities Monitored" value={<AnimatedNumber value={k.communitiesMonitored.value} />} kpi={k.communitiesMonitored} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={CheckCircle2} label="Active Communities" value={<AnimatedNumber value={k.activeCommunities.value} />} kpi={k.activeCommunities} color="bg-teal-500/15 text-teal-300" />
        <KpiCard icon={Send} label="Posts Shared" value={<AnimatedNumber value={k.postsShared.value} />} kpi={k.postsShared} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={MessageCircle} label="Engagements" value={fmtK(k.engagements.value)} kpi={k.engagements} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={MousePointerClick} label="Clicks Generated" value={fmtK(k.clicksGenerated.value)} kpi={k.clicksGenerated} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Compass} label="New Communities Found" value={<AnimatedNumber value={k.newCommunitiesFound.value} />} kpi={k.newCommunitiesFound} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </Stagger>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-ink-800 overflow-x-auto">{OUTREACH_SUBTABS.map(([label, plat]) => <button key={label} onClick={() => { setSubPlatform(plat); setPage(1); }} className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap ${subPlatform === plat ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"}`}>{label}</button>)}</div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search communities…" className="w-44 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
        <select value={niche} onChange={(e) => { setNiche(e.target.value === "All Niches" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Niches</option>{d.niches.map((n) => <option key={n}>{n}</option>)}</select>
        <select value={status} onChange={(e) => { setStatus(e.target.value === "All Status" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Status</option>{["Active", "Monitoring", "Paused"].map((s) => <option key={s}>{s}</option>)}</select>
        <select value={engagement} onChange={(e) => { setEngagement(e.target.value === "All Engagement Levels" ? "" : e.target.value); setPage(1); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option>All Engagement Levels</option>{["Very High", "High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}</select>
        <button onClick={() => document.getElementById("community-discovery")?.scrollIntoView({ behavior: "smooth" })} className="ml-auto inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Discover Communities</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Communities table */}
        <FadeUp className="xl:col-span-2"><Card title="Communities" sub={`${d.communities.total} monitored`}>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-1">Community</th><th className="font-medium px-1">Niche</th><th className="font-medium text-right px-1">Members</th><th className="font-medium text-center px-1">Engagement</th><th className="font-medium text-center px-1">Status</th><th className="font-medium px-1">Last Activity</th><th className="font-medium text-center px-1">Actions</th></tr></thead>
            <tbody>{d.communities.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-500 py-8">No communities match.</td></tr> : d.communities.rows.map((c) => (
              <tr key={c.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                <td className="py-2 px-1"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-md grid place-items-center shrink-0" style={{ background: c.color + "22" }}><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /></span><div className="min-w-0"><div className="text-slate-200 font-medium truncate max-w-[120px]">{c.name}</div><div className="text-[9px] text-slate-500">{c.platform}</div></div></div></td>
                <td className="px-1 text-slate-400 truncate max-w-[100px]">{c.niche}</td>
                <td className="px-1 text-right text-slate-300">{fmtK(c.members)}</td>
                <td className="px-1 text-center"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${engLevelPill(c.engagementLevel)}`}>{c.engagementLevel}</span></td>
                <td className="px-1 text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${commStatusPill(c.status)}`}>{c.status}</span></td>
                <td className="px-1 text-slate-500 whitespace-nowrap">{new Date(c.lastActivity).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
                <td className="px-1"><div className="flex items-center justify-center gap-1.5 text-slate-500">
                  <button onClick={() => share(c.id, c.name)} disabled={!!busy} title="Share content" className="hover:text-emerald-300 disabled:opacity-40">{busy === "s" + c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}</button>
                  {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" title="Open" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></a> : <button onClick={() => flash(`${c.name}: ${c.engagements.toLocaleString()} engagements · ${c.clicks.toLocaleString()} clicks · ${c.engRate}% rate.`)} title="Stats" className="hover:text-white"><Eye className="w-3.5 h-3.5" /></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
          {d.communities.pages > 1 && <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500"><span>Showing {(d.communities.page - 1) * d.communities.perPage + 1}–{Math.min(d.communities.page * d.communities.perPage, d.communities.total)} of {d.communities.total}</span><div className="flex items-center gap-1"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>{Array.from({ length: d.communities.pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}<button disabled={page >= d.communities.pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>}
        </Card></FadeUp>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Community Engagement Overview" sub="Last 7 days · est."><MultiLine labels={d.overview.labels} series={d.overview.series} /></Card></FadeUp>
          <FadeUp><Card title="Top Performing Communities">
            <div className="space-y-2">{d.topPerforming.map((c, i) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300 flex items-center gap-1.5 truncate"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />{c.name}</span><span className="text-slate-400 shrink-0">{fmtK(c.engagements)} · {c.engRate}%</span></div>
                <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: c.color }} initial={{ width: 0 }} animate={{ width: `${(c.engagements / topMax) * 100}%` }} transition={{ duration: 0.7 }} /></div>
              </div>
            ))}</div>
          </Card></FadeUp>
          <FadeUp><Card title="Outreach Tips">
            <div className="space-y-1.5">{d.outreachTips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span className="text-slate-300 leading-snug">{t}</span></div>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>

      {/* Discovery · Content ideas · Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" id="community-discovery">
        <FadeUp><Card title="Community Discovery" sub="New communities for your content">
          {d.discovery.length === 0 ? <div className="text-slate-500 text-xs py-4 text-center">All suggestions added.</div> : (
            <div className="space-y-2">{d.discovery.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: c.color + "22" }}><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200 font-medium truncate">{c.name}</div><div className="text-[9px] text-slate-500">{c.platform} · {fmtK(c.members)}</div></div>
                <button onClick={() => add(c.id)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 px-2 py-1 text-[10px] font-medium text-emerald-200 disabled:opacity-50">{busy === "a" + c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Add</button>
              </div>
            ))}</div>
          )}
        </Card></FadeUp>

        <FadeUp><Card title="Content Opportunities" sub="Ideas for community engagement">
          <div className="space-y-2">{d.contentOpportunities.map((o, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: o.communityColor }} />
              <div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200 leading-snug">{o.idea}</div><div className="text-[9px] text-slate-500">{o.community}</div></div>
              <button onClick={() => flash(`✓ Content brief “${o.idea}” queued for ${o.community} → handed to Copywriter Agent.`)} className="text-[10px] text-emerald-300 hover:text-emerald-200 shrink-0 whitespace-nowrap">Use Idea</button>
            </div>
          ))}</div>
        </Card></FadeUp>

        <FadeUp><Card title="Outreach Activity" sub="Recent engagement">
          <div className="space-y-2">{d.outreachActivity.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]"><Rss className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><div className="min-w-0 flex-1"><div className="text-slate-300 leading-snug">{a.text}</div><div className="text-[9px] text-slate-500">{new Date(a.when).toLocaleDateString("en", { month: "short", day: "numeric" })}</div></div></div>
          ))}</div>
        </Card></FadeUp>
      </div>
    </div>
  );
}
