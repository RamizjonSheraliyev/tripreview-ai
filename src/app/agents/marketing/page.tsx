"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Sparkles, Calendar, Bell, Loader2, TrendingUp, TrendingDown, Users, ShoppingCart,
  Percent, DollarSign, BarChart3, CheckCircle2, ArrowRight, Globe, Send, Search, PenLine, Share2,
  X, Download, Clock, AlertTriangle, MoreHorizontal, ChevronLeft, ChevronRight, ListChecks, Zap, Target,
  FolderOpen, Plus, Rocket, FileCheck2, RefreshCw, Link2, Megaphone as MegaphoneIcon,
  Lightbulb, Eye, Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getMarketingDirector, agentChat, getMarketingTasks, listTasks, completeTask,
  getMarketingPlansBoard, listMarketingPlans, completeMarketingPlan, deleteMarketingPlan, createMarketingPlan,
  getMarketingCampaigns, syncMarketingCampaigns,
  getBriefBoard, listBriefs, advanceBrief, updateBrief, deleteBrief,
  getStrategy, type StrategyData,
  getWorkforce, getActivity, type Workforce, type WfAgent, type Activity,
  type MarketingData, type AgentChatTurn, type MarketingTasks, type TaskRow,
  type MarketingPlansBoard, type MarketingPlanRow, type AdCampaigns, type AdCampaignRow,
  type BriefRow, type BriefBoard,
} from "@/lib/api";

const IMP: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-sky-500/15 text-sky-300" };
const POT: Record<string, string> = { "High Potential": "bg-emerald-500/15 text-emerald-300", "Medium Potential": "bg-amber-500/15 text-amber-300" };
const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
const kfmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

function Trend({ n, unit = "vs prev 30 days" }: { n: number; unit?: string }) {
  if (!n) return <span className="text-[10px] text-slate-500">No change</span>;
  const up = n > 0;
  return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">{unit}</span></span>;
}
function Spark({ data, color = "#a78bfa" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-8" />;
  const w = 100, h = 30, min = Math.min(...data), max = Math.max(...data), sp = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / sp) * (h - 4) - 2}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></svg>;
}
function MultiDonut({ segments, total, label, size = 150, stroke = 18, center }: { segments: { value: number; color: string }[]; total: number; label?: string; size?: number; stroke?: number; center?: React.ReactNode }) {
  const r = (size - stroke) / 2; let acc = 0; const t = Math.max(1, total);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.value > 0).map((s, i) => { const pct = (s.value / t) * 100; const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.07 }} />; acc += pct; return node; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center || <div><div className="text-lg font-extrabold text-white">{kfmt(total)}</div><div className="text-[9px] text-slate-500">{label}</div></div>}</div>
    </div>
  );
}

const TABS = ["Overview", "Tasks", "Plans", "Insights", "Campaigns", "Content Ideas", "Recommendations", "Performance", "Agent Collaboration"];

export default function MarketingDirectorPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);
  useEffect(() => { if (!ready) return; setLoading(true); getMarketingDirector().then(setData).catch(() => {}).finally(() => setLoading(false)); }, [ready]);

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const exportCsv = () => {
    if (!data) return;
    const rows = [["Category", "Sessions", "Conversions", "Revenue (AED)", "ROI%"], ...data.campaigns.map((c) => [c.campaign, c.sessions, c.conversions, c.revenue, c.roi])];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "marketing-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const k = data?.kpis;
  const kpis = k ? [
    { label: "Website Sessions", value: kfmt(k.sessions), trend: k.sessionsTrend, spark: k.sessionsSpark, icon: Users, color: "#a78bfa" },
    { label: "New Users", value: kfmt(k.newUsers), trend: k.newUsersTrend, spark: k.newUsersSpark, icon: Users, color: "#34d399" },
    { label: "Conversions (Bookings)", value: kfmt(k.conversions), trend: k.conversionsTrend, spark: k.conversionsSpark, icon: ShoppingCart, color: "#38bdf8" },
    { label: "Conversion Rate", value: `${k.conversionRate}%`, trend: k.conversionRateTrend, spark: k.conversionRateSpark, icon: Percent, color: "#fbbf24" },
    { label: "Revenue (AED)", value: aed(k.revenue), trend: k.revenueTrend, spark: k.revenueSpark, icon: DollarSign, color: "#8b5cf6" },
    { label: "Marketing ROI", value: `${k.roi.toLocaleString()}%`, trend: k.roiTrend, spark: k.roiSpark, icon: BarChart3, color: "#fb7185" },
  ] : [];

  const show = (...t: string[]) => t.includes(tab) || tab === "Overview";

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
        <AgentGate agentId="marketing" label="Marketing Director" accent="from-violet-500 to-brand-600" />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-brand-600 grid place-items-center shrink-0"><Megaphone className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Marketing Director Agent</h1><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">● Agent</span></div><p className="text-[11px] text-slate-500 truncate">AI Chief Marketing Officer for TripReview.ae</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> Last 30 days</span>
            <button onClick={() => setAskOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Sparkles className="w-4 h-4" /> Ask AI</button>
            <button onClick={exportCsv} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Download className="w-3.5 h-3.5" /> Export</button>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="mktTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}
        </div></div>

        <div className="p-5 space-y-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div> : tab === "Tasks" ? <MarketingTasksTab /> : tab === "Plans" ? <MarketingPlansTab /> : tab === "Campaigns" ? <CampaignsTab /> : tab === "Content Ideas" ? <ContentIdeasTab /> : tab === "Recommendations" ? <RecommendationsTab /> : tab === "Agent Collaboration" ? <AgentCollaborationTab /> : (
            <>
              {/* KPI row */}
              <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {kpis.map((c) => { const Ico = c.icon; return (
                  <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                    <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div>
                    <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
                    <div className="mt-0.5"><Trend n={c.trend} /></div>
                    <div className="mt-1 -mb-1"><Spark data={c.spark} color={c.color} /></div>
                  </Item>
                ); })}
              </Stagger>

              {/* Profile / Responsibilities / Must Do / Traffic */}
              {tab === "Overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
                  <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full flex flex-col items-center text-center">
                    <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 grid place-items-center"><Megaphone className="w-7 h-7 text-white" /></span>
                    <div className="text-[14px] font-bold text-white mt-3">{data.profile.name}</div>
                    <div className="text-[11px] text-brand-300">{data.profile.title}</div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-snug">{data.profile.bio}</p>
                    <button onClick={() => setAskOpen(true)} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-200 text-[12px] font-semibold hover:bg-ink-800"><Sparkles className="w-4 h-4 text-brand-400" /> Ask Me Anything</button>
                  </div></FadeUp>
                  <FadeUp delay={0.04}><Card title="My Responsibilities"><ul className="space-y-1.5">{data.responsibilities.map((r) => <li key={r} className="flex items-start gap-2 text-[11px] text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{r}</li>)}</ul></Card></FadeUp>
                  <FadeUp delay={0.08}><Card title="Must Do" sub="Recurring">
                    <ul className="space-y-2.5">{data.mustDo.map((m) => <li key={m.title} className="flex items-start gap-2"><Calendar className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white leading-snug">{m.title}</div><div className="text-[9px] text-slate-500">{m.cadence}</div></div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${m.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{m.status}</span></li>)}</ul>
                    <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-4 mb-1.5">Key Actions</div>
                    <ul className="space-y-1.5">{data.keyActions.map((a) => <li key={a} className="flex items-start gap-2 text-[10px] text-slate-400"><ArrowRight className="w-3 h-3 text-brand-400 mt-0.5 shrink-0" />{a}</li>)}</ul>
                  </Card></FadeUp>
                  <FadeUp delay={0.12}><Card title="Website Traffic Overview" right={<span className="text-[10px] text-slate-500">Last 30 Days</span>}>
                    <div className="flex items-center gap-3"><MultiDonut segments={data.traffic.map((t) => ({ value: t.value, color: t.color }))} total={data.trafficTotal} label="Sessions" size={120} stroke={14} />
                      <ul className="space-y-1 flex-1">{data.traffic.map((t) => <li key={t.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} /><span className="text-slate-400 flex-1 truncate">{t.label}</span><span className="text-white font-bold">{kfmt(t.value)}</span><span className="text-slate-600">{t.pct}%</span></li>)}</ul>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-4 mb-1.5">Top Landing Pages</div>
                    <ul className="space-y-1">{data.topPages.map((p, i) => <li key={i} className="flex items-center gap-2 text-[10px]"><span className="text-slate-600 w-3">{i + 1}</span><span className="text-slate-300 flex-1 truncate">{p.path}</span><span className="text-white font-semibold">{kfmt(p.views)}</span></li>)}</ul>
                    <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-4 mb-1.5">Lead Channels</div>
                    <ul className="space-y-1">{data.channels.map((c) => <li key={c.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} /><span className="text-slate-400 flex-1">{c.label}</span><span className="text-white font-bold">{c.pct}%</span></li>)}</ul>
                  </Card></FadeUp>
                </div>
              )}

              {tab === "Insights" && data.insights && <InsightsTab data={data} />}

              {/* Campaigns | Growth Opportunities | Content Ideas */}
              {show("Campaigns", "Recommendations", "Content Ideas") && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {show("Campaigns", "Performance") && <FadeUp><Card title="Campaign Performance" right={<ViewAll />}>
                    <div className="overflow-x-auto"><table className="w-full text-left min-w-[340px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Campaign</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Conv.</th><th className="font-semibold text-right">Rate</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">ROI</th></tr></thead>
                      <tbody>{data.campaigns.map((c, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[11px] font-semibold text-white truncate max-w-[120px]">{c.campaign}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.sessions)}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{c.conversions}</td><td className="text-[10px] text-slate-400 text-right tabular-nums">{c.rate}%</td><td className="text-[10px] text-white text-right tabular-nums">{kfmt(c.revenue)}</td><td className={`text-[10px] text-right tabular-nums font-bold ${c.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{c.roi}%</td></tr>)}
                      {data.campaigns.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[11px] text-slate-500">No campaign data yet.</td></tr>}</tbody></table></div>
                  </Card></FadeUp>}
                  {show("Recommendations") && <FadeUp delay={0.05}><Card title="Growth Opportunities" right={<ViewAll />}>
                    <ul className="space-y-2.5">{data.opportunities.map((o, i) => <li key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2 min-w-0"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><TrendingUp className="w-3.5 h-3.5" /></span><div className="text-[12px] font-semibold text-white leading-tight">{o.title}</div></div><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${IMP[o.impact]}`}>{o.impact} Impact</span></div><p className="text-[10px] text-slate-500 mt-1 leading-snug">{o.detail}</p></li>)}
                    {data.opportunities.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No opportunities yet.</li>}</ul>
                  </Card></FadeUp>}
                  {show("Content Ideas") && <FadeUp delay={0.1}><Card title="Content Ideas (Top 5)" right={<ViewAll label="View All Ideas" />}>
                    <ul className="space-y-2">{data.contentIdeas.map((c, i) => <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><span className="text-[11px] text-slate-200 truncate">{c.title}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${POT[c.potential] || "bg-slate-500/15 text-slate-300"}`}>{c.potential}</span></li>)}
                    {data.contentIdeas.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No content ideas yet.</li>}</ul>
                  </Card></FadeUp>}
                </div>
              )}

              {/* Category Performance | Weekly Plan | Collaboration */}
              {show("Performance", "Plans", "Agent Collaboration") && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {show("Performance") && <FadeUp><Card title="Category Performance" right={<ViewAll label="View All Categories" />}>
                    <div className="overflow-x-auto"><table className="w-full text-left min-w-[300px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Category</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Leads</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">Conv%</th></tr></thead>
                      <tbody>{data.categories.map((c, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[11px] font-semibold text-white truncate max-w-[110px]">{c.category}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.sessions)}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{c.bookings}</td><td className="text-[10px] text-white text-right tabular-nums">{kfmt(c.revenue)}</td><td className="text-[10px] text-emerald-400 text-right tabular-nums">↑ {c.growth}%</td></tr>)}
                      {data.categories.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-[11px] text-slate-500">No category data yet.</td></tr>}</tbody></table></div>
                  </Card></FadeUp>}
                  {show("Plans") && <FadeUp delay={0.05}><Card title="Weekly Marketing Plan" right={<ViewAll label="View Full Plan" />}>
                    <div className="grid grid-cols-7 gap-1.5">{data.weeklyPlan.map((d) => <div key={d.day} className="text-center"><div className="text-[9px] text-slate-500 mb-1">{d.day}</div><div className="h-16 rounded-lg border border-ink-800 bg-ink-950/40 p-1 grid place-items-center">{d.block ? <motion.div initial={{ opacity: 0, scaleY: 0.6 }} animate={{ opacity: 1, scaleY: 1 }} className="w-full h-full rounded-md grid place-items-center px-0.5" style={{ background: `${d.color}22`, border: `1px solid ${d.color}55` }}><span className="text-[8px] font-semibold leading-tight" style={{ color: d.color }}>{d.block}</span></motion.div> : <span className="text-[9px] text-slate-700">—</span>}</div></div>)}</div>
                  </Card></FadeUp>}
                  {show("Agent Collaboration") && <FadeUp delay={0.1}><Card title="Agent Collaboration" right={<ViewAll label="View All Communications" />}>
                    <ul className="space-y-2.5">{data.collaboration.map((c, i) => { const Ico = c.agent.includes("SEO") ? Search : c.agent.includes("Copywriter") ? PenLine : c.agent.includes("Publisher") ? Send : c.agent.includes("Distribution") ? Share2 : Globe; return (
                      <li key={i} className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-4 h-4" /></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{c.agent}</div><div className="text-[9px] text-slate-500 truncate">{c.note}</div></div><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">{c.status} ›</span></li>
                    ); })}
                    {data.collaboration.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No agent activity yet.</li>}</ul>
                  </Card></FadeUp>}
                </div>
              )}

              <div className="text-[10px] text-slate-600 text-center pt-2">All data is real-time from the live platform. {data._ai ? "AI reasoning enabled." : "Add an LLM key for AI reasoning."}</div>
            </>
          )}
        </div>
      </main>

      {askOpen && <AskAgent onClose={() => setAskOpen(false)} />}
    </div>
  );
}

function Card({ title, sub, right, children }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
      <div className="flex items-start justify-between gap-2 mb-3"><div><div className="text-[13px] font-bold text-white">{title}</div>{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>
      {children}
    </div>
  );
}
function ViewAll({ label = "View All" }: { label?: string }) {
  return <span className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold cursor-default">{label} <ArrowRight className="w-3 h-3" /></span>;
}

function AskAgent({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: "founder" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const history: AgentChatTurn[] = msgs.slice(-8).map((m) => ({ role: m.role, name: m.role === "agent" ? "Marketing Director" : undefined, text: m.text }));
    setMsgs((m) => [...m, { role: "founder", text: t }]); setInput(""); setBusy(true);
    try { const r = await agentChat(t, { history, mentionId: "marketing" }); setMsgs((m) => [...m, { role: "agent", text: r.text }]); }
    catch { setMsgs((m) => [...m, { role: "agent", text: "Couldn't reach the agent — check the LLM key/quota." }]); }
    finally { setBusy(false); }
  };
  const quick = ["Which categories need more marketing?", "Suggest 3 campaigns for this week", "What content should we create next?"];
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-ink-800 shrink-0"><span className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 grid place-items-center shrink-0"><Megaphone className="w-4 h-4 text-white" /></span><div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-white">Marketing Director</div><div className="text-[10px] text-slate-500">Answers from live platform data</div></div><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          {msgs.length === 0 && <div className="text-center py-8 text-[12px] text-slate-500">Ask the Marketing Director anything about growth, campaigns or content.</div>}
          {msgs.map((m, i) => m.role === "founder" ? <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div> : <div key={i} className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Megaphone className="w-3.5 h-3.5" /></span><div className="min-w-0 rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div>)}
          {busy && <div className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">Thinking…</div></div>}
          <div ref={endRef} />
        </div>
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0">{quick.map((p) => <button key={p} disabled={busy} onClick={() => send(p)} className="text-[11px] px-2.5 py-1 rounded-full border border-ink-700 text-slate-300 hover:bg-ink-800 hover:border-brand-400 disabled:opacity-50">{p}</button>)}</div>
        <div className="p-3 border-t border-ink-800 shrink-0"><form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500"><textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Ask the Marketing Director…" className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none max-h-32" /><button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 shrink-0"><Send className="w-4 h-4" /></button></form></div>
      </motion.div>
    </div>
  );
}

/* ----------------------------- TASKS TAB ----------------------------- */
const TST: Record<string, string> = { "To Do": "bg-amber-500/15 text-amber-300", "In Progress": "bg-sky-500/15 text-sky-300", "In Review": "bg-violet-500/15 text-violet-300", Completed: "bg-emerald-500/15 text-emerald-300" };
const TTY: Record<string, string> = { Planning: "bg-violet-500/15 text-violet-300", Strategy: "bg-indigo-500/15 text-indigo-300", Research: "bg-sky-500/15 text-sky-300", Analysis: "bg-amber-500/15 text-amber-300", Campaign: "bg-emerald-500/15 text-emerald-300", Collaboration: "bg-brand-500/15 text-brand-300", Review: "bg-slate-500/15 text-slate-300", Other: "bg-slate-500/15 text-slate-400" };
const TPR: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-emerald-500/15 text-emerald-300" };
const dueLbl = (d: string | null, days?: number) => { if (!d) return ""; const n = days ?? Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000); return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Today" : n === 1 ? "1 day left" : `${n} days left`; };
const fmtD = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function MarketingTasksTab() {
  const [mt, setMt] = useState<MarketingTasks | null>(null);
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusF, setStatusF] = useState("All Status");
  const [prioF, setPrioF] = useState("All Priority");
  const [typeF, setTypeF] = useState("All Task Types");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState("");

  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        listTasks({ assignee: "Marketing Director", status: statusF, priority: prioF, taskType: typeF, q, page: p, limit: 12 }),
        getMarketingTasks(),
      ]);
      setRows(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setMt(m);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => reload(1), 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusF, prioF, typeF, q]);

  const complete = async (id: string) => { setMenuId(""); setBusy(true); try { await completeTask(id); await reload(page); } finally { setBusy(false); } };

  const k = mt?.kpis;
  const kpis = [
    { label: "Total Tasks", value: k?.total ?? 0, trend: k?.trend ?? 0, icon: ListChecks, tone: "brand" },
    { label: "Completed", value: k?.completed ?? 0, trend: 0, icon: CheckCircle2, tone: "emerald" },
    { label: "In Progress", value: k?.inProgress ?? 0, trend: 0, icon: Loader2, tone: "sky" },
    { label: "Pending", value: k?.pending ?? 0, trend: 0, icon: Clock, tone: "amber" },
    { label: "Overdue", value: k?.overdue ?? 0, trend: 0, icon: AlertTriangle, tone: "rose" },
  ];
  const start = total === 0 ? 0 : (page - 1) * 12 + 1, end = Math.min(total, page * 12);
  const maxType = Math.max(1, ...(mt?.byType || []).map((t) => t.count));

  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{c.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${c.tone === "brand" ? "bg-brand-600/15 text-brand-300" : c.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : c.tone === "sky" ? "bg-sky-500/15 text-sky-300" : c.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-2 text-2xl font-extrabold text-white">{c.value}</div>
            <div className="mt-0.5"><Trend n={c.trend} unit="vs last 7 days" /></div>
          </Item>
        ); })}
        <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">Completion Rate</span><MultiDonut segments={[{ value: k?.completionRate ?? 0, color: "#34d399" }]} total={100} size={34} stroke={5} center={<span />} /></div>
          <div className="mt-2 text-2xl font-extrabold text-white">{k?.completionRate ?? 0}%</div>
          <div className="mt-0.5"><Trend n={k?.trend ?? 0} unit="vs last 7 days" /></div>
        </Item>
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <FadeUp>
          <Card title="All Tasks">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option>{["To Do", "In Progress", "In Review", "Completed"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={prioF} onChange={(e) => setPrioF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Priority</option>{["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Task Types</option>{(mt?.types || []).map((s) => <option key={s}>{s}</option>)}</select>
              <div className="relative flex-1 min-w-[120px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-8 text-[11px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 font-semibold">Task</th><th className="font-semibold">Type</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th><th className="font-semibold">Due Date</th><th className="font-semibold">Impact</th><th></th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                      <td className="py-2.5"><div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${t.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-brand-600/15 text-brand-300"}`}><Target className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[230px]">{t.title}</div><div className="text-[10px] text-slate-600">{t.taskId}</div></div></div></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TTY[t.taskType || "Other"] || TTY.Other}`}>{t.taskType}</span></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TPR[t.priority]}`}>{t.priority}</span></td>
                      <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TST[t.status]}`}>{t.status === "To Do" ? "Pending" : t.status}</span></td>
                      <td className="whitespace-nowrap"><div className="text-[11px] text-slate-300">{fmtD(t.dueDate)}</div><div className={`text-[9px] ${t.overdue ? "text-rose-400" : "text-slate-600"}`}>{dueLbl(t.dueDate)}</div></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TPR[(t.impact as string) || t.priority] || ""}`}>{t.impact || t.priority}</span></td>
                      <td className="relative pr-2">
                        <button onClick={() => setMenuId(menuId === t.id ? "" : t.id)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                        {menuId === t.id && (
                          <div className="absolute right-2 top-9 z-30 w-36 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                            {t.status !== "Completed" && <button onClick={() => complete(t.id)} disabled={busy} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-ink-800">Mark Complete</button>}
                            <a href="/tasks" className="block w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-ink-800">Open in Task Center</a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[12px] text-slate-500">No tasks match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} tasks</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Tasks by Status">
            <div className="flex items-center gap-3"><MultiDonut segments={(mt?.byStatus || []).map((s) => ({ value: s.count, color: s.color }))} total={mt?.kpis.total ?? 0} label="Total" size={120} stroke={14} />
              <ul className="space-y-1.5 flex-1">{(mt?.byStatus || []).map((s) => <li key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul>
            </div>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Tasks by Type">
            <ul className="space-y-2">{(mt?.byType || []).map((t) => <li key={t.type}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{t.type}</span><span className="text-slate-500">{t.count} ({t.pct}%)</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${(t.count / maxType) * 100}%` }} transition={{ duration: 0.7 }} /></div></li>)}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Upcoming Deadlines" right={<ViewAll label="View Calendar" />}>
            <ul className="space-y-2">{(mt?.upcoming || []).map((u) => <li key={u.id} className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="text-[11px] text-white truncate">{u.title}</div><div className="text-[9px] text-slate-600">{fmtD(u.dueDate)}</div></div><span className={`text-[10px] font-semibold shrink-0 ${u.overdue ? "text-rose-400" : u.daysLeft <= 2 ? "text-amber-400" : "text-slate-400"}`}>{dueLbl(u.dueDate, u.daysLeft)}</span></li>)}
            {(mt?.upcoming || []).length === 0 && <li className="text-[11px] text-slate-500">Nothing due soon. 🎉</li>}</ul>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FadeUp><Card title="My Task Priorities">
          <ul className="space-y-3">
            {([["High Impact Tasks", "Focus on tasks with highest growth impact", mt?.priorities.highImpact ?? 0, "rose"], ["Time Sensitive Tasks", "Tasks with upcoming deadlines", mt?.priorities.timeSensitive ?? 0, "amber"], ["Strategic Initiatives", "Long-term strategic growth initiatives", mt?.priorities.strategic ?? 0, "violet"]] as [string, string, number, string][]).map(([t, s, v, tone], i) => (
              <li key={t} className="flex items-center gap-3"><span className={`w-7 h-7 rounded-lg grid place-items-center text-[11px] font-bold ${tone === "rose" ? "bg-rose-500/15 text-rose-300" : tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-violet-500/15 text-violet-300"}`}>{i + 1}</span><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white">{t}</div><div className="text-[10px] text-slate-500 truncate">{s}</div></div><span className="text-[12px] font-bold text-white shrink-0">{v} tasks</span></li>
            ))}
          </ul>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Task Automation" sub="Let AI handle routine marketing tasks">
          <div className="grid grid-cols-2 gap-2.5">
            {(mt?.automation || []).map((a) => <div key={a.name} className="rounded-xl border border-ink-800 bg-ink-950/40 p-2.5"><div className="flex items-center justify-between"><Zap className={`w-3.5 h-3.5 ${a.status === "Active" ? "text-emerald-300" : "text-slate-600"}`} /><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${a.status === "Active" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>{a.status}</span></div><div className="text-[11px] font-bold text-white mt-1">{a.name}</div><div className="text-[9px] text-slate-500 leading-snug">{a.desc}</div></div>)}
          </div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Productivity Insights" right={<ViewAll label="View Full Insights" />}>
          <div className="grid grid-cols-3 gap-2 text-center">
            {([["Avg. Completion", mt?.insights.avgCompletionDays ? `${mt.insights.avgCompletionDays} days` : "—"], ["Top Day", mt?.insights.mostProductiveDay ?? "—"], ["Focus Time", mt?.insights.focusHrs ? `${mt.insights.focusHrs} hrs/day` : "—"]] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-xl border border-ink-800 bg-ink-950/40 py-3"><div className="text-base font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>
            ))}
          </div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ----------------------------- PLANS TAB ----------------------------- */
const PLST: Record<string, string> = { Planning: "bg-violet-500/15 text-violet-300", "In Progress": "bg-sky-500/15 text-sky-300", "On Track": "bg-emerald-500/15 text-emerald-300", "At Risk": "bg-amber-500/15 text-amber-300", Overdue: "bg-rose-500/15 text-rose-300", Completed: "bg-blue-500/15 text-blue-300" };
const PL_TABS = ["Active Plans", "Upcoming Plans", "Completed Plans", "Archived Plans"];
const fmtMD = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

function MarketingPlansTab() {
  const [board, setBoard] = useState<MarketingPlansBoard | null>(null);
  const [rows, setRows] = useState<MarketingPlanRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [ptab, setPtab] = useState("Active Plans");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([listMarketingPlans({ tab: ptab, page: p, limit: 10 }), getMarketingPlansBoard()]);
      setRows(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setBoard(b);
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ptab]);
  const act = async (fn: () => Promise<unknown>) => { setMenuId(""); setBusy(true); try { await fn(); await reload(page); } finally { setBusy(false); } };

  const k = board?.kpis;
  const kpis = [
    { label: "Active Plans", value: k?.activePlans ?? 0, sub: `↑ ${k?.activeTrend ?? 0}% vs last 30 days`, icon: FolderOpen, tone: "brand", good: true },
    { label: "Completed Plans", value: k?.completedPlans ?? 0, sub: `↑ ${k?.completedTrend ?? 0}% vs last 30 days`, icon: FileCheck2, tone: "emerald", good: true },
    { label: "Total Initiatives", value: k?.totalInitiatives ?? 0, sub: `↑ ${k?.initiativesTrend ?? 0}% vs last 30 days`, icon: Rocket, tone: "violet", good: true },
    { label: "On Track", value: k?.onTrack ?? 0, sub: `${k?.onTrackPct ?? 0}% of total initiatives`, icon: CheckCircle2, tone: "emerald" },
    { label: "At Risk", value: k?.atRisk ?? 0, sub: `${k?.atRiskPct ?? 0}% of total initiatives`, icon: AlertTriangle, tone: "amber" },
    { label: "Overdue", value: k?.overdue ?? 0, sub: `${k?.overduePct ?? 0}% of total initiatives`, icon: Clock, tone: "rose" },
  ];
  const start = total === 0 ? 0 : (page - 1) * 10 + 1, end = Math.min(total, page * 10);
  const iup = board?.initiativesUnderPlans;
  const maxObj = Math.max(1, ...(board?.objectivesOverview || []).map((o) => o.count));

  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{c.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${c.tone === "brand" ? "bg-brand-600/15 text-brand-300" : c.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : c.tone === "violet" ? "bg-violet-500/15 text-violet-300" : c.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-2 text-2xl font-extrabold text-white">{c.value}</div>
            <div className={`text-[10px] mt-0.5 ${c.good ? "text-emerald-400" : "text-slate-500"}`}>{c.sub}</div>
          </Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-1 overflow-x-auto">{PL_TABS.map((t) => <button key={t} onClick={() => setPtab(t)} className={`px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap rounded-lg ${ptab === t ? "text-white bg-ink-800" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>)}</div>
              <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create Plan</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 font-semibold">Plan</th><th className="font-semibold">Objective</th><th className="font-semibold">Timeline</th><th className="font-semibold">Progress</th><th className="font-semibold">Status</th><th className="font-semibold">Last Updated</th><th></th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                      <td className="py-2.5"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><FolderOpen className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[160px]">{p.name}</div><div className="text-[9px] text-slate-600">{fmtMD(p.startDate)} – {fmtMD(p.endDate)}</div></div></div></td>
                      <td className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.objective}</td>
                      <td className="text-[10px] text-slate-500 whitespace-nowrap">{fmtMD(p.startDate)} – {fmtMD(p.endDate)}</td>
                      <td><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 0.7 }} /></div><span className="text-[10px] text-slate-300 tabular-nums w-7">{p.progress}%</span></div></td>
                      <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLST[p.status] || ""}`}>{p.status}</span></td>
                      <td className="text-[10px] text-slate-500 whitespace-nowrap">{fmtMD(p.updatedAt)}</td>
                      <td className="relative pr-2">
                        <button onClick={() => setMenuId(menuId === p.id ? "" : p.id)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                        {menuId === p.id && (
                          <div className="absolute right-2 top-9 z-30 w-36 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                            {p.status !== "Completed" && <button onClick={() => act(() => completeMarketingPlan(p.id))} disabled={busy} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-ink-800">Mark Complete</button>}
                            <button onClick={() => act(() => deleteMarketingPlan(p.id))} disabled={busy} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-rose-300 hover:bg-rose-500/10">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-[12px] text-slate-500">No plans in this view.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} plans</div>
              <div className="flex items-center gap-1"><button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronRight className="w-3.5 h-3.5" /></button></div>
            </div>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Plans by Status">
            <div className="flex items-center gap-3"><MultiDonut segments={(board?.plansByStatus || []).map((s) => ({ value: s.count, color: s.color }))} total={board?.initiativesUnderPlans.total ?? 0} label="Total" size={120} stroke={14} />
              <ul className="space-y-1.5 flex-1">{(board?.plansByStatus || []).map((s) => <li key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul>
            </div>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Plans Timeline" sub="Next 90 Days">
            <div className="space-y-2">
              {(board?.timeline || []).map((t, i) => (
                <div key={i} className="flex items-center gap-2"><span className="text-[9px] text-slate-500 w-20 truncate shrink-0">{t.name}</span><div className="flex-1 h-3 rounded bg-ink-950 relative overflow-hidden"><motion.div className="absolute top-0 h-full rounded" style={{ left: `${t.startPct}%`, background: t.color }} initial={{ width: 0 }} animate={{ width: `${t.widthPct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} /></div></div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-ink-800/60">{([["Planning", "#a78bfa"], ["In Progress", "#6366f1"], ["On Track", "#34d399"], ["At Risk", "#fbbf24"], ["Overdue", "#fb7185"]] as [string, string][]).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-[9px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{l}</span>)}</div>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Plan Objectives Overview">
          <ul className="space-y-2.5">{(board?.objectivesOverview || []).map((o) => <li key={o.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{o.label}</span><span className="text-white font-bold">{o.count}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500" initial={{ width: 0 }} animate={{ width: `${(o.count / maxObj) * 100}%` }} transition={{ duration: 0.7 }} /></div></li>)}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Initiatives Under Plans" right={<ViewAll label="View All Initiatives" />}>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {([["Total", iup?.total ?? 0, "text-white"], ["Done", `${iup?.completed ?? 0}`, "text-emerald-400"], ["Active", `${iup?.inProgress ?? 0}`, "text-sky-400"], ["Not Started", `${iup?.notStarted ?? 0}`, "text-amber-400"]] as [string, string | number, string][]).map(([l, v, col]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 py-2 text-center"><div className={`text-base font-extrabold ${col}`}>{v}</div><div className="text-[9px] text-slate-500">{l}</div></div>)}
          </div>
          <ul className="space-y-1.5">{(iup?.topInitiatives || []).slice(0, 5).map((t, i) => <li key={i} className="flex items-center gap-2 text-[11px]"><span className="text-slate-300 flex-1 truncate">{t.title}</span><span className={`text-[8px] font-bold px-1 rounded ${TST[t.status === "Not Started" ? "To Do" : t.status] || "bg-slate-500/15 text-slate-400"}`}>{t.status}</span><span className="text-slate-500 w-8 text-right">{t.progress}%</span></li>)}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.1}>
          <div className="space-y-5">
            <Card title="Upcoming Plans" right={<ViewAll label="View All Upcoming Plans" />}>
              <ul className="space-y-2">{(board?.upcomingPlans || []).map((p) => <li key={p.id} className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-white truncate"><FolderOpen className="w-3.5 h-3.5 text-brand-400 shrink-0" />{p.name}</span><span className="text-[10px] text-slate-500 shrink-0">{fmtD(p.startDate)}</span></li>)}
              {(board?.upcomingPlans || []).length === 0 && <li className="text-[11px] text-slate-500">No upcoming plans.</li>}</ul>
            </Card>
            <Card title="Plan Impact (Forecast)" right={<ViewAll label="View Forecast Details" />}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-ink-800 bg-ink-950/40 py-2.5"><div className="text-[9px] text-slate-500">Est. Traffic</div><div className="text-sm font-extrabold text-emerald-400">↑ {board?.forecast.trafficPct ?? 0}%</div></div>
                <div className="rounded-lg border border-ink-800 bg-ink-950/40 py-2.5"><div className="text-[9px] text-slate-500">Est. Revenue</div><div className="text-sm font-extrabold text-white">{aed(board?.forecast.revenueAed ?? 0)}</div></div>
                <div className="rounded-lg border border-ink-800 bg-ink-950/40 py-2.5"><div className="text-[9px] text-slate-500">New Users</div><div className="text-sm font-extrabold text-emerald-400">↑ {board?.forecast.newUsersPct ?? 0}%</div></div>
              </div>
            </Card>
          </div>
        </FadeUp>
      </div>

      <FadeUp><Card title="Plan Alignment with Business Goals">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(board?.alignment || []).map((a) => <div key={a.goal} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-brand-400" /><span className="text-[12px] font-semibold text-white">{a.goal}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden mb-1"><motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ duration: 0.8 }} /></div><div className="text-[10px] text-emerald-400 font-semibold">{a.pct}% aligned</div></div>)}
          {(board?.alignment || []).length === 0 && <div className="text-[11px] text-slate-500">No alignment data.</div>}
        </div>
      </Card></FadeUp>

      {createOpen && <CreatePlanModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(1); }} />}
    </div>
  );
}

function CreatePlanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", objective: "", status: "Planning", startDate: "", endDate: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const fieldCls = "w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-9 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500";
  const label = "block text-[10px] uppercase tracking-wide text-slate-500 mb-1";
  const save = async () => { setBusy(true); try { await createMarketingPlan(f); onSaved(); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-700 bg-ink-950 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-white">Create Plan</h3><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <div className="space-y-3">
          <div><label className={label}>Plan Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Plan name" className={fieldCls} /></div>
          <div><label className={label}>Objective</label><input value={f.objective} onChange={(e) => set("objective", e.target.value)} placeholder="What does this plan achieve?" className={fieldCls} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={label}>Start</label><input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={fieldCls} /></div><div><label className={label}>End</label><input type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} className={fieldCls} /></div></div>
          <div><label className={label}>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={fieldCls}>{["Planning", "In Progress", "On Track", "At Risk", "Completed"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4"><button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button><button disabled={busy || !f.name.trim()} onClick={save} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create</button></div>
      </div>
    </div>
  );
}

/* ----------------------------- INSIGHTS TAB ----------------------------- */
const OPP_TONE: Record<string, string> = { High: "bg-emerald-500/15 text-emerald-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-400" };
function MiniLines({ data }: { data: { label: string; sessions: number; conversions: number }[] }) {
  if (!data || data.length < 2) return <div className="h-32 grid place-items-center text-[11px] text-slate-600">Not enough data yet</div>;
  const w = 300, h = 120; const s = data.map((d) => d.sessions), c = data.map((d) => d.conversions);
  const max = Math.max(1, ...s, ...c);
  const path = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / max) * (h - 12) - 6}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <polyline points={path(s)} fill="none" stroke="#a78bfa" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polyline points={path(c)} fill="none" stroke="#34d399" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function InsightsTab({ data }: { data: MarketingData }) {
  const ins = data.insights!;
  const maxCity = Math.max(1, ...data.topPages.map((p) => p.views));
  const mv = ins.seo.movement; const mvTotal = Math.max(1, mv.improved + mv.noChange + mv.declined);
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FadeUp><Card title="Traffic Insights" right={<ViewAll label="View Full Report" />}>
          <div className="flex flex-wrap gap-3 mb-2 text-[10px]">{([["Sessions", "#a78bfa"], ["Conversions", "#34d399"]] as [string, string][]).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
          <MiniLines data={ins.trafficTrend} />
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-4 mb-1.5">Top Traffic Sources</div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Source</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Share</th><th className="font-semibold text-right">Change</th></tr></thead>
            <tbody>{ins.topChannels.map((c) => <tr key={c.channel} className="border-b border-ink-900"><td className="py-2 text-[11px] text-white font-semibold">{c.channel}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.sessions)}</td><td className="text-[10px] text-slate-400 text-right">{c.share}%</td><td className={`text-[10px] text-right ${c.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{c.change >= 0 ? "↑" : "↓"} {Math.abs(c.change)}%</td></tr>)}</tbody></table></div>
        </Card></FadeUp>

        <FadeUp delay={0.05}><Card title="Audience Insights" right={<ViewAll label="View Full Report" />}>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Top Categories</div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Category</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Share</th></tr></thead>
            <tbody>{data.traffic.map((t) => <tr key={t.label} className="border-b border-ink-900"><td className="py-2 text-[11px] text-white">{t.label}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(t.value)}</td><td className="text-[10px] text-slate-400 text-right">{t.pct}%</td></tr>)}</tbody></table></div>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-3 mb-1.5">Top Pages (by views)</div>
          <ul className="space-y-1.5">{data.topPages.map((p, i) => <li key={i} className="flex items-center gap-2"><span className="text-[10px] text-slate-300 flex-1 truncate">{p.path}</span><div className="w-24 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${(p.views / maxCity) * 100}%` }} transition={{ duration: 0.7 }} /></div><span className="text-[10px] text-white font-bold w-10 text-right">{kfmt(p.views)}</span></li>)}</ul>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-3 mb-1.5">Lead Mix</div>
          <ul className="flex flex-wrap gap-3">{data.channels.map((c) => <li key={c.label} className="inline-flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-slate-400">{c.label}</span><span className="text-white font-bold">{c.pct}%</span></li>)}</ul>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Campaign Performance Insights" right={<ViewAll label="View Full Report" />}>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Campaign</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Conv.</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">ROI</th></tr></thead>
            <tbody>{data.campaigns.map((c, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[11px] text-white font-semibold truncate max-w-[110px]">{c.campaign}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.sessions)}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{c.conversions}</td><td className="text-[10px] text-white text-right tabular-nums">{kfmt(c.revenue)}</td><td className={`text-[10px] text-right font-bold ${c.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{c.roi}%</td></tr>)}
            {data.campaigns.length === 0 && <tr><td colSpan={5} className="py-5 text-center text-[11px] text-slate-500">No campaign data yet.</td></tr>}</tbody></table></div>
        </Card></FadeUp>

        <FadeUp delay={0.05}><Card title="Content Performance Insights" right={<ViewAll label="View Full Report" />}>
          <ul className="space-y-2">{ins.contentInsights.map((c, i) => <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><div className="min-w-0"><div className="text-[11px] text-white truncate">{c.title}</div><div className="text-[9px] text-slate-600">{c.status}</div></div><span className="text-[10px] text-slate-400 shrink-0">{kfmt(c.pageViews)} views</span></li>)}
          {ins.contentInsights.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No published content yet.</li>}</ul>
        </Card></FadeUp>

        <FadeUp delay={0.1}><Card title="SEO Performance Insights" right={<ViewAll label="View Full Report" />}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([["Organic Sessions", kfmt(ins.seo.organicSessions)], ["SEO Score", ins.seo.seoScore != null ? `${ins.seo.seoScore}/100` : "—"], ["Issues", String(ins.seo.seoIssues)], ["Avg Position", ins.seo.avgPosition != null ? String(ins.seo.avgPosition) : "—"]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 py-2 text-center"><div className="text-sm font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500">{l}</div></div>)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Top Keywords</div>
          <ul className="space-y-1">{ins.seo.topKeywords.map((kw, i) => <li key={i} className="flex items-center gap-2 text-[10px]"><span className="w-4 text-slate-600">#{kw.position}</span><span className="text-slate-300 flex-1 truncate">{kw.keyword}</span><span className="text-white font-semibold">{kfmt(kw.clicks)}</span><span className={kw.change >= 0 ? "text-emerald-400" : "text-rose-400"}>{kw.change >= 0 ? "↑" : "↓"}{Math.abs(kw.change)}</span></li>)}</ul>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mt-3 mb-1.5">Keyword Movement</div>
          <div className="flex items-center gap-3"><MultiDonut segments={[{ value: mv.improved, color: "#34d399" }, { value: mv.noChange, color: "#38bdf8" }, { value: mv.declined, color: "#fb7185" }]} total={mvTotal} label="Total" size={90} stroke={12} />
            <ul className="space-y-1 flex-1 text-[10px]">{([["Improved", mv.improved, "#34d399"], ["No Change", mv.noChange, "#38bdf8"], ["Declined", mv.declined, "#fb7185"]] as [string, number, string][]).map(([l, v, c]) => <li key={l} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} /><span className="text-slate-400 flex-1">{l}</span><span className="text-white font-bold">{Math.round((v / mvTotal) * 100)}%</span></li>)}</ul>
          </div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FadeUp><Card title="Category Insights" right={<ViewAll label="View Full Report" />}>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Category</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Growth</th><th className="font-semibold text-right">Opportunity</th></tr></thead>
            <tbody>{ins.categoryInsights.map((c, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[11px] text-white font-semibold">{c.category}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.sessions)}</td><td className="text-[10px] text-emerald-400 text-right">↑ {c.growth}%</td><td className="text-right"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${OPP_TONE[c.opportunity]}`}>{c.opportunity}</span></td></tr>)}
            {ins.categoryInsights.length === 0 && <tr><td colSpan={4} className="py-5 text-center text-[11px] text-slate-500">No category data yet.</td></tr>}</tbody></table></div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Insights Summary" right={<ViewAll label="View Full Summary" />}>
          <ul className="space-y-2.5">{ins.summary.map((s, i) => <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300 leading-snug"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
        </Card></FadeUp>
      </div>
    </>
  );
}

/* ---------------- Campaigns tab — REAL paid-ad data (Google Ads / Meta) ---------------- */
function CampaignsTab() {
  const [data, setData] = useState<AdCampaigns | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => { getMarketingCampaigns().then(setData).catch(() => setData(null)).finally(() => setLoading(false)); }, []);
  const sync = async () => { setSyncing(true); try { setData(await syncMarketingCampaigns()); } catch { /* keep */ } finally { setSyncing(false); } };

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  if (!data) return <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-8 text-center text-slate-500 text-[13px]">Couldn&apos;t load campaigns.</div>;

  const cur = data.currency || "AED";
  const money = (n: number) => `${cur} ${Math.round(n).toLocaleString()}`;
  const connected = data.connected.google || data.connected.meta;

  // ---- Not connected: honest connect CTA (no demo numbers) ----
  if (!connected) {
    const platforms = [
      { name: "Google Ads", on: data.connected.google, err: data.errors?.google, Icon: Search, vars: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"] },
      { name: "Meta Ads", on: data.connected.meta, err: data.errors?.meta, Icon: Share2, vars: ["META_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID"] },
    ];
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-6 text-center">
          <span className="w-12 h-12 rounded-2xl bg-brand-600/20 text-brand-300 grid place-items-center mx-auto mb-3"><MegaphoneIcon className="w-6 h-6" /></span>
          <h3 className="text-base font-bold text-white">Connect your ad accounts</h3>
          <p className="text-[12px] text-slate-400 mt-1 max-w-xl mx-auto">Campaigns show 100% real spend, ROAS &amp; conversions pulled live from Google Ads and Meta. Add your own credentials to the backend <span className="text-slate-200 font-mono">.env</span> and restart — no demo data is ever shown here.</p>
          <button onClick={sync} disabled={syncing} className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-brand-600 text-white text-[12px] font-semibold disabled:opacity-50">{syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Check connection</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {platforms.map((p) => (
            <div key={p.name} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center gap-2 mb-3"><span className="w-9 h-9 rounded-lg bg-ink-800 text-brand-300 grid place-items-center"><p.Icon className="w-4.5 h-4.5" /></span><div><div className="text-[13px] font-bold text-white">{p.name}</div><div className={`text-[10px] font-semibold ${p.on ? "text-emerald-400" : "text-slate-500"}`}>{p.on ? "● Connected" : "○ Not connected"}</div></div></div>
              <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Set these in backend .env</div>
              <ul className="space-y-1">{p.vars.map((v) => <li key={v} className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5"><Link2 className="w-3 h-3 text-slate-600 shrink-0" />{v}</li>)}</ul>
              {p.err && <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] text-rose-300">{p.err}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- Connected: real overview + funnel + mixes + table ----
  const ov = data.overview!, fn = data.funnel!;
  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType }[] = [
    { label: "Total Campaigns", value: ov.totalCampaigns, Icon: Megaphone },
    { label: "Active Campaigns", value: ov.activeCampaigns, Icon: Zap },
    { label: "Total Spend", value: money(ov.totalSpend), Icon: DollarSign },
    { label: "Conversions", value: ov.totalConversions.toLocaleString(), Icon: Target },
    { label: "Avg ROAS", value: `${ov.avgRoas}x`, Icon: TrendingUp },
    { label: "Cost / Conv.", value: money(ov.costPerConversion), Icon: Percent },
  ];
  const CH_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185"];
  const ST_COLOR: Record<string, string> = { Active: "#34d399", Paused: "#fbbf24", Completed: "#38bdf8", Other: "#8b5cf6" };
  const funnelRows = [
    { label: "Impressions", value: kfmt(fn.impressions), sub: "" },
    { label: "Clicks", value: kfmt(fn.clicks), sub: `${fn.ctr}% CTR` },
    { label: "Conversions", value: kfmt(fn.conversions), sub: `${fn.cvr}% CVR` },
    { label: "Revenue", value: money(fn.revenue), sub: "" },
  ];
  const chTot = data.channelMix.reduce((s, c) => s + c.spend, 0);
  const stTot = data.statusMix.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h2 className="text-sm font-bold text-white">Campaign Overview</h2><p className="text-[11px] text-slate-500">Live from {data.connected.google && data.connected.meta ? "Google Ads + Meta" : data.connected.google ? "Google Ads" : "Meta Ads"} · synced {data.syncedAt ? new Date(data.syncedAt).toLocaleString() : "—"}</p></div>
        <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50">{syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync now</button>
      </div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 text-brand-300 grid place-items-center"><c.Icon className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white truncate">{c.value}</div>
          </Item>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Campaign Funnel">
          <ul className="space-y-2.5">{funnelRows.map((f, i) => (
            <li key={f.label} className="flex items-center gap-3"><span className="w-6 text-[10px] text-slate-600">{i + 1}</span><div className="flex-1 min-w-0"><div className="flex items-center justify-between"><span className="text-[12px] text-slate-300">{f.label}</span><span className="text-[13px] font-bold text-white">{f.value}</span></div>{f.sub && <div className="text-[10px] text-slate-500 text-right">{f.sub}</div>}<div className="h-1.5 rounded-full bg-ink-800 overflow-hidden mt-1"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(6, 100 - i * 24)}%` }} /></div></div></li>
          ))}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Channel Mix" sub="by spend">
          {chTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No spend data.</div> : (
            <div className="flex items-center gap-4"><MultiDonut segments={data.channelMix.map((c, i) => ({ value: c.spend, color: CH_COLORS[i % CH_COLORS.length] }))} total={chTot} label="Spend" size={120} stroke={15} />
              <ul className="space-y-1.5 flex-1 min-w-0">{data.channelMix.map((c, i) => <li key={c.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CH_COLORS[i % CH_COLORS.length] }} /><span className="text-slate-400 flex-1 truncate">{c.label}</span><span className="text-white font-bold">{c.pct}%</span></li>)}</ul>
            </div>
          )}
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Campaign Status">
          {stTot === 0 ? <div className="py-10 text-center text-[12px] text-slate-500">No campaigns.</div> : (
            <div className="flex items-center gap-4"><MultiDonut segments={data.statusMix.map((s) => ({ value: s.count, color: ST_COLOR[s.label] || "#64748b" }))} total={stTot} label="Total" size={120} stroke={15} />
              <ul className="space-y-1.5 flex-1 min-w-0">{data.statusMix.map((s) => <li key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ST_COLOR[s.label] || "#64748b" }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span></li>)}</ul>
            </div>
          )}
        </Card></FadeUp>
      </div>

      <FadeUp><Card title={`All Campaigns (${data.campaigns.length})`}>
        <div className="overflow-x-auto"><table className="w-full text-left min-w-[820px]">
          <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Campaign</th><th className="font-semibold">Platform</th><th className="font-semibold">Objective</th><th className="font-semibold">Status</th><th className="font-semibold text-right">Spend</th><th className="font-semibold text-right">Conv.</th><th className="font-semibold text-right">Revenue</th><th className="font-semibold text-right">ROAS</th></tr></thead>
          <tbody>
            {data.campaigns.map((c: AdCampaignRow) => (
              <tr key={c.id} className="border-b border-ink-900">
                <td className="py-2 text-[11px] font-semibold text-white truncate max-w-[200px]">{c.name}</td>
                <td className="text-[10px]"><span className={`px-1.5 py-0.5 rounded font-bold ${c.platform === "Google" ? "bg-sky-500/15 text-sky-300" : "bg-brand-500/15 text-brand-300"}`}>{c.platform}</span></td>
                <td className="text-[10px] text-slate-400 truncate max-w-[120px]">{c.objective || c.channel || "—"}</td>
                <td className="text-[10px]"><span className={`px-1.5 py-0.5 rounded ${/ACTIVE|ENABLED/i.test(c.status) ? "bg-emerald-500/15 text-emerald-300" : /PAUSED/i.test(c.status) ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-400"}`}>{c.status || "—"}</span></td>
                <td className="text-[10px] text-white text-right tabular-nums">{money(c.spend)}</td>
                <td className="text-[10px] text-slate-300 text-right tabular-nums">{c.conversions}</td>
                <td className="text-[10px] text-white text-right tabular-nums">{money(c.revenue)}</td>
                <td className={`text-[10px] text-right tabular-nums font-bold ${c.roas >= 1 ? "text-emerald-400" : "text-rose-400"}`}>{c.roas}x</td>
              </tr>
            ))}
            {data.campaigns.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-[11px] text-slate-500">Connected, but no campaigns returned for the last 30 days.</td></tr>}
          </tbody>
        </table></div>
      </Card></FadeUp>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Live from your connected ad accounts — no demo data.</div>
    </div>
  );
}

/* ---------------- Content Ideas tab — REAL content briefs (no demo) ---------------- */
const IDEA_AUDIENCE: Record<string, string> = {
  Cars: "Tourists & Business", "Car Rental": "Tourists & Business",
  Yachts: "Luxury Travelers", "Yacht Rental": "Luxury Travelers",
  Activities: "Families & Couples", "Things To Do": "Families & Couples",
  AirportTransfer: "First-time Visitors", "Airport Transfer": "First-time Visitors",
  "Travel Guides": "All Visitors", General: "All Visitors",
};
const audienceOf = (c: string) => IDEA_AUDIENCE[c] || "All Visitors";
const IDEA_STATUS: Record<string, string> = {
  Draft: "bg-slate-500/15 text-slate-300", "In Progress": "bg-amber-500/15 text-amber-300",
  "Awaiting Review": "bg-violet-500/15 text-violet-300", Approved: "bg-sky-500/15 text-sky-300",
  Published: "bg-emerald-500/15 text-emerald-300",
};
const IDEA_CAT_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa", "#f472b6"];
const scoreColor = (s: number) => (s >= 85 ? "text-emerald-400" : s >= 70 ? "text-amber-400" : "text-rose-400");

function ContentIdeasTab() {
  const [board, setBoard] = useState<BriefBoard | null>(null);
  const [items, setItems] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [sub, setSub] = useState("All Ideas");
  const [catF, setCatF] = useState("All Categories");
  const [typeF, setTypeF] = useState("All Types");
  const [statusF, setStatusF] = useState("All Status");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<BriefRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([getBriefBoard().catch(() => null), listBriefs({ limit: 100 }).catch(() => ({ items: [] as BriefRow[], total: 0, page: 1, pages: 1 }))]);
      setBoard(b); setItems(l.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (fn: () => Promise<unknown>, id: string) => { setBusyId(id); try { await fn(); if (sel?.id === id) setSel(null); await load(); } finally { setBusyId(""); } };

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const SUBS = ["All Ideas", "High Potential", "In Progress", "Published", "Drafts"];
  const subFilter = (b: BriefRow) =>
    sub === "All Ideas" ? true : sub === "High Potential" ? b.priority === "High" : sub === "In Progress" ? b.status === "In Progress" : sub === "Published" ? b.status === "Published" : b.status === "Draft";
  const filtered = items.filter(subFilter)
    .filter((b) => (catF === "All Categories" ? true : b.category === catF))
    .filter((b) => (typeF === "All Types" ? true : b.contentType === typeF))
    .filter((b) => (statusF === "All Status" ? true : b.status === statusF))
    .filter((b) => { const s = q.trim().toLowerCase(); return !s || b.title.toLowerCase().includes(s) || b.primaryKeyword.toLowerCase().includes(s); });

  const total = items.length;
  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; color: string }[] = [
    { label: "Total Ideas", value: total, Icon: Lightbulb, color: "#8b5cf6" },
    { label: "High Potential", value: items.filter((b) => b.priority === "High").length, Icon: TrendingUp, color: "#fb7185" },
    { label: "Sent to SEO", value: items.filter((b) => /seo/i.test(b.assignee)).length, Icon: Send, color: "#38bdf8" },
    { label: "In Progress", value: board?.kpis.inProgress ?? items.filter((b) => b.status === "In Progress").length, Icon: Clock, color: "#fbbf24" },
    { label: "Published", value: board?.kpis.published ?? items.filter((b) => b.status === "Published").length, Icon: CheckCircle2, color: "#34d399" },
    { label: "Avg Impact Score", value: `${board?.avgQuality ?? 0}/100`, Icon: Target, color: "#a78bfa" },
  ];

  // Ideas by category (real)
  const catMap: Record<string, number> = {}; items.forEach((b) => { catMap[b.category] = (catMap[b.category] || 0) + 1; });
  const cats = Object.entries(catMap).map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count);
  const catTot = cats.reduce((s, c) => s + c.count, 0);
  // Top audiences (derived from real category)
  const audMap: Record<string, number> = {}; items.forEach((b) => { const a = audienceOf(b.category); audMap[a] = (audMap[a] || 0) + 1; });
  const auds = Object.entries(audMap).map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 })).sort((a, b) => b.count - a.count);
  // Content gaps (categories with ideas but few published)
  const gapMap: Record<string, { total: number; pub: number }> = {}; items.forEach((b) => { const g = gapMap[b.category] || { total: 0, pub: 0 }; g.total++; if (b.status === "Published") g.pub++; gapMap[b.category] = g; });
  const gaps = Object.entries(gapMap).map(([label, g]) => ({ label, gap: g.total - g.pub, total: g.total })).filter((g) => g.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 6);
  const typeDist = board?.typeDist || [];

  return (
    <div className="space-y-5">
      <div><h2 className="text-sm font-bold text-white">Content Ideas Overview</h2><p className="text-[11px] text-slate-500">Real content briefs — keyword-researched ideas the SEO Agent feeds the Copywriter.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><c.Icon className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
          </Item>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="flex items-center gap-1.5 px-4 pt-3 flex-wrap">
              {SUBS.map((s) => <button key={s} onClick={() => setSub(s)} className={`px-3 h-8 rounded-lg text-[12px] font-semibold ${sub === s ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white hover:bg-ink-800"}`}>{s}</button>)}
            </div>
            <div className="flex items-center gap-2 p-4 flex-wrap border-b border-ink-800">
              <div className="relative flex-1 min-w-[150px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content ideas…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={catF} onChange={(e) => setCatF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Categories</option>{(board?.categories || []).map((c) => <option key={c}>{c}</option>)}</select>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Types</option>{["Blog Post", "Guide", "Listicle", "Comparison", "Service Page", "Location Page"].map((t) => <option key={t}>{t}</option>)}</select>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option>{["Draft", "In Progress", "Awaiting Review", "Approved", "Published"].map((s) => <option key={s}>{s}</option>)}</select>
              <span className="text-[11px] text-slate-500 ml-auto">{filtered.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 pl-4 pr-3 font-semibold">Idea</th><th className="font-semibold">Category</th><th className="font-semibold">Type</th><th className="font-semibold">Audience</th><th className="font-semibold text-right">Impact</th><th className="font-semibold text-right">Search Vol.</th><th className="font-semibold">Status</th><th className="font-semibold pr-4"></th></tr></thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} onClick={() => setSel(b)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer">
                      <td className="py-2.5 pl-4 pr-3"><div className="text-[11px] font-semibold text-white truncate max-w-[220px]">{b.title}</div><div className="text-[9px] text-slate-600">{b.briefId || b.primaryKeyword}</div></td>
                      <td className="text-[10px] text-slate-400">{b.category}</td>
                      <td className="text-[10px]"><span className="px-1.5 py-0.5 rounded bg-ink-800 text-slate-300">{b.contentType}</span></td>
                      <td className="text-[10px] text-slate-400 truncate max-w-[120px]">{audienceOf(b.category)}</td>
                      <td className="text-right"><span className={`text-[11px] font-bold ${scoreColor(b.qualityScore)}`}>{b.qualityScore}</span></td>
                      <td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(b.searchVolume)}</td>
                      <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${IDEA_STATUS[b.status] || "bg-slate-500/15 text-slate-300"}`}>{b.status}</span></td>
                      <td className="pr-4 text-right"><ArrowRight className="w-3.5 h-3.5 text-slate-600 inline" /></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[11px] text-slate-500">No content ideas match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Ideas by Category">
            {catTot === 0 ? <div className="py-8 text-center text-[11px] text-slate-500">No ideas yet.</div> : (
              <div className="flex items-center gap-3"><MultiDonut segments={cats.map((c, i) => ({ value: c.count, color: IDEA_CAT_COLORS[i % IDEA_CAT_COLORS.length] }))} total={catTot} label="Ideas" size={110} stroke={14} />
                <ul className="space-y-1 flex-1 min-w-0">{cats.map((c, i) => <li key={c.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: IDEA_CAT_COLORS[i % IDEA_CAT_COLORS.length] }} /><span className="text-slate-400 flex-1 truncate">{c.label}</span><span className="text-white font-bold">{c.count}</span><span className="text-slate-600">{c.pct}%</span></li>)}</ul>
              </div>
            )}
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Ideas by Content Type">
            <ul className="space-y-2">{typeDist.map((t) => <li key={t.label}><div className="flex items-center justify-between text-[10px] mb-1"><span className="text-slate-300">{t.label}</span><span className="text-white font-bold">{t.count} <span className="text-slate-600 font-normal">({t.pct}%)</span></span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: t.color }} /></div></li>)}{typeDist.length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No data.</li>}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Top Target Audiences">
            <ul className="space-y-1.5">{auds.map((a) => <li key={a.label} className="flex items-center gap-2 text-[11px]"><Users className="w-3 h-3 text-brand-400 shrink-0" /><span className="text-slate-300 flex-1 truncate">{a.label}</span><span className="text-white font-bold">{a.count}</span><span className="text-slate-600">{a.pct}%</span></li>)}{auds.length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No data.</li>}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.15}><Card title="Content Gap Areas" sub="ideas not yet published">
            <ul className="space-y-1.5">{gaps.map((g) => <li key={g.label} className="flex items-center justify-between text-[11px]"><span className="text-slate-300 truncate">{g.label}</span><span className="text-amber-300 font-bold">{g.gap} open</span></li>)}{gaps.length === 0 && <li className="text-[11px] text-emerald-400 text-center py-3">All caught up 🎉</li>}</ul>
          </Card></FadeUp>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${IDEA_STATUS[sel.status]}`}>{sel.status}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${IMP[sel.priority]}`}>{sel.priority} Priority</span></div>
                <h3 className="text-base font-bold text-white leading-snug mt-1.5">{sel.title}</h3>
                <div className="text-[10px] text-slate-600 mt-0.5">{sel.briefId}</div>
              </div>
              <button onClick={() => setSel(null)} className="text-slate-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([["Impact", `${sel.qualityScore}`], ["Search Vol.", kfmt(sel.searchVolume)], ["KD", `${sel.keywordDifficulty}`]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([["Category", sel.category], ["Content Type", sel.contentType], ["Target Audience", audienceOf(sel.category)], ["Primary Keyword", sel.primaryKeyword || "—"], ["Assignee", sel.assignee], ["Target Words", String(sel.targetWordCount)]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[11px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>)}
            </div>
            {sel.description && <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3"><div className="text-[11px] font-bold text-white mb-1">Brief</div><p className="text-[12px] text-slate-300 leading-relaxed">{sel.description}</p></div>}
            {sel.tags.length > 0 && <div className="flex flex-wrap gap-1">{sel.tags.map((t) => <span key={t} className="text-[10px] text-brand-200 bg-brand-500/10 border border-brand-500/30 rounded px-1.5 py-0.5">{t}</span>)}</div>}
            <div className="space-y-2 pt-2 border-t border-ink-800">
              <div className="text-[11px] font-bold text-white">Actions</div>
              <div className="grid grid-cols-2 gap-2">
                {sel.status !== "Published" && <button onClick={() => act(() => advanceBrief(sel.id), sel.id)} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold disabled:opacity-50">{busyId === sel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} Advance Stage</button>}
                <button onClick={() => act(() => updateBrief(sel.id, { assignee: "Copywriter Agent" }), sel.id)} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-200 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><PenLine className="w-3.5 h-3.5" /> To Copywriter</button>
                <button onClick={() => act(() => updateBrief(sel.id, { assignee: "SEO Agent" }), sel.id)} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-200 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><Search className="w-3.5 h-3.5" /> To SEO</button>
                <button onClick={() => act(() => deleteBrief(sel.id), sel.id)} disabled={busyId === sel.id} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-rose-500/40 text-rose-300 text-[12px] font-semibold hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Recommendations tab — REAL strategy recs (no fabricated AED) ---------------- */
type Rec = { id: string; title: string; category: string; impact: string; effort: string; confidence: number; status: string; traffic: number; why: string; actions: string[]; owner: string; path?: string };
const REC_STATUS: Record<string, string> = { "In Progress": "bg-amber-500/15 text-amber-300", Planned: "bg-slate-500/15 text-slate-300", Outreach: "bg-violet-500/15 text-violet-300", Researching: "bg-sky-500/15 text-sky-300", Covered: "bg-emerald-500/15 text-emerald-300", Published: "bg-emerald-500/15 text-emerald-300" };
const EFFORT: Record<string, string> = { High: "text-rose-300", Medium: "text-amber-300", Low: "text-emerald-300" };
const REC_CAT_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa"];
const confOf = (p: string) => (p === "High" ? 90 : p === "Medium" ? 78 : 65);

function RecommendationsTab() {
  const [s, setS] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [catF, setCatF] = useState("All");
  const [sel, setSel] = useState<Rec | null>(null);
  useEffect(() => { getStrategy().then(setS).catch(() => setS(null)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  if (!s) return <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-8 text-center text-slate-500 text-[13px]">Couldn&apos;t load recommendations.</div>;

  const recs: Rec[] = [];
  (s.topOpportunities || []).forEach((o, i) => recs.push({ id: o.id || `top-${i}`, title: o.title, category: "Content & SEO", impact: o.impact, effort: o.effort || "Medium", confidence: o.confidence || confOf(o.impact), status: "In Progress", traffic: o.trafficPotential || 0, why: o.reason || o.detail || "", actions: o.plan || [], owner: o.agent || "SEO Agent", path: o.path }));
  (s.contentOpps || []).forEach((c, i) => recs.push({ id: `content-${i}`, title: `Build a "${c.topic}" content cluster`, category: "Content & SEO", impact: c.priority, effort: "Medium", confidence: confOf(c.priority), status: c.status, traffic: c.potentialTraffic, why: `"${c.keyword}" has ~${kfmt(c.searchVolume)} monthly search demand.`, actions: ["Research target keywords", "Write the SEO brief", "Publish & internally link"], owner: c.assignedTo }));
  (s.marketplaceOpps || []).filter((m) => m.potentialProviders > 0).forEach((m, i) => recs.push({ id: `mkt-${i}`, title: `Expand ${m.opportunity}`, category: "Categories", impact: m.priority, effort: "High", confidence: confOf(m.priority), status: m.status, traffic: 0, why: `${m.potentialProviders} more providers needed to cover demand in this category.`, actions: ["Discover providers", "Outreach via email/WhatsApp", "Onboard & verify"], owner: m.assignedTo }));
  (s.competitiveOpps || []).forEach((c, i) => recs.push({ id: `comp-${i}`, title: c.opportunity, category: "Landing Pages", impact: c.impact, effort: "Medium", confidence: confOf(c.impact), status: "Planned", traffic: 0, why: `${c.competitorGap} vs competitors — ${c.action}.`, actions: [c.action], owner: "SEO Agent" }));

  const cats = ["All", ...Array.from(new Set(recs.map((r) => r.category)))];
  const filtered = catF === "All" ? recs : recs.filter((r) => r.category === catF);

  const total = recs.length;
  const highImpact = recs.filter((r) => r.impact === "High").length;
  const inProgress = recs.filter((r) => r.status === "In Progress").length;
  const implemented = recs.filter((r) => /Covered|Published|Implemented/.test(r.status)).length;
  const avgConf = s.kpis?.avgConfidence || (total ? Math.round(recs.reduce((a, r) => a + r.confidence, 0) / total) : 0);
  const totalTraffic = s.kpis?.trafficPotential || recs.reduce((a, r) => a + r.traffic, 0);

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; color: string }[] = [
    { label: "Total Recommendations", value: total, Icon: Lightbulb, color: "#8b5cf6" },
    { label: "High Impact", value: highImpact, Icon: TrendingUp, color: "#fb7185" },
    { label: "In Progress", value: inProgress, Icon: Clock, color: "#fbbf24" },
    { label: "Implemented", value: implemented, Icon: CheckCircle2, color: "#34d399" },
    { label: "Potential Traffic/mo", value: kfmt(totalTraffic), Icon: TrendingUp, color: "#38bdf8" },
    { label: "Avg Confidence", value: `${avgConf}%`, Icon: Target, color: "#a78bfa" },
  ];

  const impacts = (["High", "Medium", "Low"] as const).map((label, i) => ({ label, count: recs.filter((r) => r.impact === label).length, color: ["#8b5cf6", "#38bdf8", "#34d399"][i] }));
  const impTot = impacts.reduce((a, c) => a + c.count, 0);
  const catAgg = cats.filter((c) => c !== "All").map((c) => ({ label: c, traffic: recs.filter((r) => r.category === c).reduce((a, r) => a + r.traffic, 0), count: recs.filter((r) => r.category === c).length })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5">
      <div><h2 className="text-sm font-bold text-white">Recommendations Overview</h2><p className="text-[11px] text-slate-500">AI-powered recommendations to accelerate growth — grounded in real traffic, inventory &amp; SEO data.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><c.Icon className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
          </Item>
        ))}
      </Stagger>

      <div className="flex items-center gap-1.5 flex-wrap">
        {cats.map((c) => <button key={c} onClick={() => setCatF(c)} className={`px-3 h-8 rounded-lg text-[12px] font-semibold ${catF === c ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800"}`}>{c}</button>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 pl-4 pr-3 font-semibold">Recommendation</th><th className="font-semibold">Category</th><th className="font-semibold">Impact</th><th className="font-semibold">Effort</th><th className="font-semibold text-right">Confidence</th><th className="font-semibold">Status</th><th className="font-semibold text-right">Potential/mo</th><th className="font-semibold pr-4"></th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setSel(r)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer">
                    <td className="py-2.5 pl-4 pr-3"><div className="text-[11px] font-semibold text-white truncate max-w-[240px]">{r.title}</div><div className="text-[9px] text-slate-600 truncate max-w-[240px]">{r.why}</div></td>
                    <td className="text-[10px] text-slate-400 whitespace-nowrap">{r.category}</td>
                    <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${IMP[r.impact]}`}>{r.impact}</span></td>
                    <td className={`text-[10px] font-semibold ${EFFORT[r.effort] || "text-slate-400"}`}>{r.effort}</td>
                    <td className="text-right text-[11px] font-bold text-white tabular-nums">{r.confidence}%</td>
                    <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${REC_STATUS[r.status] || "bg-slate-500/15 text-slate-300"}`}>{r.status}</span></td>
                    <td className="text-[10px] text-slate-300 text-right tabular-nums">{r.traffic > 0 ? kfmt(r.traffic) : "—"}</td>
                    <td className="pr-4 text-right"><ArrowRight className="w-3.5 h-3.5 text-slate-600 inline" /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[11px] text-slate-500">No recommendations in this category.</td></tr>}
              </tbody>
            </table>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Recommendations by Impact">
            {impTot === 0 ? <div className="py-8 text-center text-[11px] text-slate-500">No data.</div> : (
              <div className="flex items-center gap-3"><MultiDonut segments={impacts.map((im) => ({ value: im.count, color: im.color }))} total={impTot} label="Recs" size={110} stroke={14} />
                <ul className="space-y-1.5 flex-1 min-w-0">{impacts.map((im) => <li key={im.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: im.color }} /><span className="text-slate-400 flex-1">{im.label} Impact</span><span className="text-white font-bold">{im.count}</span><span className="text-slate-600">{impTot ? Math.round((im.count / impTot) * 100) : 0}%</span></li>)}</ul>
              </div>
            )}
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Top Opportunities by Category" sub="by traffic potential">
            <ul className="space-y-2">{catAgg.map((c, i) => { const max = Math.max(1, ...catAgg.map((x) => x.traffic || x.count)); const v = c.traffic || c.count; return <li key={c.label}><div className="flex items-center justify-between text-[10px] mb-1"><span className="text-slate-300">{c.label}</span><span className="text-white font-bold">{c.traffic > 0 ? `${kfmt(c.traffic)}/mo` : `${c.count} recs`}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: REC_CAT_COLORS[i % REC_CAT_COLORS.length] }} /></div></li>; })}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Strategic Recommendations" right={<ViewAll />}>
            <ul className="space-y-2">{(s.recommendations || []).slice(0, 4).map((r, i) => <li key={i} className="rounded-lg border border-ink-800 bg-ink-950/40 p-2.5"><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-semibold text-white leading-tight">{r.title}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${IMP[r.impact] || "bg-slate-500/15 text-slate-300"}`}>{r.impact}</span></div><p className="text-[10px] text-slate-500 mt-1 leading-snug">{r.body}</p></li>)}{(s.recommendations || []).length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No strategic recommendations yet.</li>}</ul>
          </Card></FadeUp>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${IMP[sel.impact]}`}>{sel.impact} Impact</span><span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-ink-800 text-slate-300">{sel.category}</span></div><h3 className="text-base font-bold text-white leading-snug mt-1.5">{sel.title}</h3></div>
              <button onClick={() => setSel(null)} className="text-slate-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
            </div>
            {sel.why && <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3"><div className="text-[11px] font-bold text-white mb-1">Why this recommendation</div><p className="text-[12px] text-slate-300 leading-relaxed">{sel.why}</p></div>}
            <div className="grid grid-cols-3 gap-2">
              {([["Est. Traffic", sel.traffic > 0 ? `${kfmt(sel.traffic)}/mo` : "—"], ["Confidence", `${sel.confidence}%`], ["Effort", sel.effort]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>)}
            </div>
            {sel.actions.length > 0 && <div><div className="text-[11px] font-bold text-white mb-1.5">Recommended Actions</div><ul className="space-y-1.5">{sel.actions.map((a, i) => <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{a}</li>)}</ul></div>}
            <div className="grid grid-cols-2 gap-2">
              {([["Owner", sel.owner], ["Status", sel.status]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[11px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>)}
            </div>
            {sel.path && <a href={`${(process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae").replace(/\/+$/, "")}/en${sel.path === "/" ? "" : sel.path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-400 hover:underline"><Globe className="w-3.5 h-3.5" /> View affected page <ArrowRight className="w-3 h-3" /></a>}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Recommendations are computed from real traffic, inventory &amp; SEO signals — no demo, no fabricated revenue.</div>
    </div>
  );
}

/* ---------------- Agent Collaboration tab — REAL cross-agent work (no demo) ---------------- */
const COLLAB_COLORS = ["#8b5cf6", "#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa"];
const prettyAct = (a?: string) => String(a || "").replace(/^agent\./, "").replace(/\./g, " · ").replace(/_/g, " ");
function InitialBadge({ name }: { name: string }) {
  const n = (name || "?").trim();
  return <span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center text-[9px] font-bold shrink-0">{(n.charAt(0) || "?").toUpperCase()}</span>;
}

function AgentCollaborationTab() {
  const [wf, setWf] = useState<Workforce | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([getWorkforce().catch(() => null), getActivity(30).then((r) => r.activities).catch(() => []), listBriefs({ limit: 100 }).then((r) => r.items).catch(() => [] as BriefRow[])])
      .then(([w, a, b]) => { setWf(w); setActs(a || []); setBriefs(b || []); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const agents: WfAgent[] = wf?.agents ?? [];
  const nameOf = (a: WfAgent) => a.name ?? a.id;
  // Real collaborations = content briefs handed between two different agents.
  const collabs = briefs.filter((b) => b.createdByAgent && b.assignee && b.createdByAgent !== b.assignee)
    .map((b) => ({ id: b.id, initiatedBy: b.createdByAgent, withAgent: b.assignee, project: b.title, purpose: `${b.contentType} · ${b.category}`, status: b.status, lastActivity: b.updatedAt }));
  const active = collabs.filter((c) => c.status === "In Progress" || c.status === "Awaiting Review");
  const handedOff = collabs.length;
  const tasksCompleted = agents.reduce((s, a) => s + (a.tasksCompleted || 0), 0);
  const liveAgents = agents.filter((a) => a.live);
  const successRate = liveAgents.length ? Math.round(liveAgents.reduce((s, a) => s + (a.successRate || 0), 0) / liveAgents.length) : 0;
  const knowledgeShared = acts.length;

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; color: string }[] = [
    { label: "Active Collaborations", value: active.length, Icon: Users, color: "#8b5cf6" },
    { label: "Tasks Handed Off", value: handedOff, Icon: Send, color: "#38bdf8" },
    { label: "Tasks Completed", value: tasksCompleted, Icon: CheckCircle2, color: "#34d399" },
    { label: "Collaboration Success", value: `${successRate}%`, Icon: Target, color: "#a78bfa" },
    { label: "Knowledge Shared", value: knowledgeShared, Icon: Share2, color: "#fbbf24" },
    { label: "Live Agents", value: wf?.summary.live ?? liveAgents.length, Icon: Zap, color: "#fb7185" },
  ];

  // Tasks by agent (real completed counts)
  const ranked = [...agents].filter((a) => (a.tasksCompleted || 0) > 0).sort((a, b) => (b.tasksCompleted || 0) - (a.tasksCompleted || 0));
  const top5 = ranked.slice(0, 5);
  const otherTasks = ranked.slice(5).reduce((s, a) => s + (a.tasksCompleted || 0), 0);
  const taskSegs = [...top5.map((a, i) => ({ label: nameOf(a), value: a.tasksCompleted || 0, color: COLLAB_COLORS[i % COLLAB_COLORS.length] })), ...(otherTasks > 0 ? [{ label: "Other Agents", value: otherTasks, color: "#64748b" }] : [])];
  const taskTot = taskSegs.reduce((s, x) => s + x.value, 0);

  const perf = ranked.slice(0, 6);
  const WORKFLOW = [
    { step: "Identify Opportunity", by: "Marketing Director", Icon: Target },
    { step: "Assign to Agent", by: "Based on expertise", Icon: Users },
    { step: "Agent Execution", by: "Research & create", Icon: PenLine },
    { step: "Review & Refine", by: "Feedback loop", Icon: CheckCircle2 },
    { step: "Implement & Monitor", by: "Track performance", Icon: BarChart3 },
  ];
  const upcoming = briefs.filter((b) => b.status !== "Published").slice(0, 5);

  return (
    <div className="space-y-5">
      <div><h2 className="text-sm font-bold text-white">Agent Collaboration</h2><p className="text-[11px] text-slate-500">Real cross-agent work — handoffs, activity &amp; contribution across the AI team.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><c.Icon className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
          </Item>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
        <FadeUp>
          <Card title="Active Collaborations" right={<span className="text-[10px] text-slate-500">{collabs.length} handoffs</span>}>
            <div className="overflow-x-auto"><table className="w-full text-left min-w-[560px]">
              <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Initiated By</th><th className="font-semibold">With</th><th className="font-semibold">Project</th><th className="font-semibold">Status</th><th className="font-semibold text-right">Last Activity</th></tr></thead>
              <tbody>
                {collabs.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-ink-900">
                    <td className="py-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><InitialBadge name={c.initiatedBy} />{c.initiatedBy.replace(" Agent", "")}</span></td>
                    <td><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><InitialBadge name={c.withAgent} />{c.withAgent.replace(" Agent", "")}</span></td>
                    <td className="text-[11px] text-white font-semibold truncate max-w-[160px]">{c.project}</td>
                    <td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${REC_STATUS[c.status] || IDEA_STATUS[c.status] || "bg-slate-500/15 text-slate-300"}`}>{c.status}</span></td>
                    <td className="text-[10px] text-slate-500 text-right whitespace-nowrap">{new Date(c.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  </tr>
                ))}
                {collabs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-[11px] text-slate-500">No cross-agent handoffs yet.</td></tr>}
              </tbody>
            </table></div>
          </Card>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Collaboration Workflow">
            <ul className="space-y-2.5">{WORKFLOW.map((w, i) => (
              <li key={w.step} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><w.Icon className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white leading-tight">{i + 1}. {w.step}</div><div className="text-[9px] text-slate-500">{w.by}</div></div></li>
            ))}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Tasks by Agent" sub="completed">
            {taskTot === 0 ? <div className="py-8 text-center text-[11px] text-slate-500">No completed tasks yet.</div> : (
              <div className="flex items-center gap-3"><MultiDonut segments={taskSegs.map((s) => ({ value: s.value, color: s.color }))} total={taskTot} label="Tasks" size={110} stroke={14} />
                <ul className="space-y-1 flex-1 min-w-0">{taskSegs.map((s) => <li key={s.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label.replace(" Agent", "")}</span><span className="text-white font-bold">{s.value}</span><span className="text-slate-600">{Math.round((s.value / taskTot) * 100)}%</span></li>)}</ul>
              </div>
            )}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Communication Feed" right={<span className="text-[10px] text-slate-500">live</span>}>
          <ul className="space-y-2.5 max-h-[280px] overflow-y-auto scrollbar-thin">
            {acts.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No recent activity.</li>}
            {acts.slice(0, 10).map((a, i) => (
              <li key={a.id || i} className="flex items-start gap-2.5"><InitialBadge name={a.actorName || "Agent"} /><div className="min-w-0 flex-1"><div className="text-[11px] text-slate-200 leading-snug"><span className="font-semibold text-white">{a.actorName || "Agent"}</span> · {prettyAct(a.action)}</div>{a.entityLabel && <div className="text-[10px] text-slate-500 truncate">{a.entityLabel}</div>}<div className="text-[9px] text-slate-600">{a.createdAt ? new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</div></div></li>
            ))}
          </ul>
        </Card></FadeUp>

        <FadeUp delay={0.05}><Card title="Upcoming Handoffs">
          <ul className="space-y-2">
            {upcoming.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">Nothing pending.</li>}
            {upcoming.map((b) => (
              <li key={b.id} className="rounded-lg border border-ink-800 bg-ink-950/40 p-2.5"><div className="text-[11px] font-semibold text-white truncate">{b.title}</div><div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500"><span className="text-slate-400">{b.createdByAgent.replace(" Agent", "")}</span><ArrowRight className="w-3 h-3" /><span className="text-slate-400">{b.assignee.replace(" Agent", "")}</span><span className={`ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded ${IDEA_STATUS[b.status] || "bg-slate-500/15 text-slate-300"}`}>{b.status}</span></div></li>
            ))}
          </ul>
        </Card></FadeUp>

        <FadeUp delay={0.1}><Card title="Agent Performance Contribution">
          <div className="overflow-x-auto"><table className="w-full text-left">
            <thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Agent</th><th className="font-semibold text-right">Tasks</th><th className="font-semibold text-right">Success</th><th className="font-semibold text-right">Share</th></tr></thead>
            <tbody>
              {perf.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-[11px] text-slate-500">No agent activity.</td></tr>}
              {perf.map((a) => <tr key={a.id} className="border-b border-ink-900"><td className="py-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><InitialBadge name={nameOf(a)} />{nameOf(a).replace(" Agent", "")}</span></td><td className="text-[11px] font-bold text-white text-right">{a.tasksCompleted}</td><td className="text-[10px] text-emerald-400 text-right font-semibold">{a.successRate}%</td><td className="text-[10px] text-slate-400 text-right">{tasksCompleted ? Math.round(((a.tasksCompleted || 0) / tasksCompleted) * 100) : 0}%</td></tr>)}
            </tbody>
          </table></div>
        </Card></FadeUp>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Collaboration data is computed live from real agent activity, handoffs &amp; task completion — no demo data.</div>
    </div>
  );
}
