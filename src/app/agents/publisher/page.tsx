"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send, Sparkles, Bell, Loader2, TrendingUp, TrendingDown, Eye, Heart, MousePointerClick, BarChart3,
  ArrowRight, Globe, X, Plus, Calendar as CalIcon, Linkedin, Twitter, Facebook,
  Instagram, Mail, Webhook as WebhookIcon, Clock, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Search,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getPublisherOverview, getPublisherQueue, getPublisherQueueBoard, getPublisherPublished, getPublisherChannels,
  setPublisherChannel, publisherGenerate, publisherCustom, publisherPublish, publisherSetStatus, publisherSchedule, publisherDelete,
  type PublisherOverview, type SocialPost, type PublisherChannel, type QueueBoard,
} from "@/lib/api";

const TABS = ["Overview", "Content Queue", "Published Content", "Distribution Channels", "Approval Workflow", "Performance", "Calendar", "Settings"];
const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);
const PLATFORM_ICON: Record<string, { Icon: typeof Send; color: string }> = {
  WordPress: { Icon: Globe, color: "#64748b" }, LinkedIn: { Icon: Linkedin, color: "#0a66c2" }, Instagram: { Icon: Instagram, color: "#e1306c" },
  Facebook: { Icon: Facebook, color: "#1877f2" }, X: { Icon: Twitter, color: "#e2e8f0" }, Email: { Icon: Mail, color: "#fbbf24" },
  Telegram: { Icon: Send, color: "#229ed9" }, Webhook: { Icon: WebhookIcon, color: "#a78bfa" },
};
const STATUS_TONE: Record<string, string> = { Draft: "bg-slate-500/15 text-slate-300", "In Review": "bg-sky-500/15 text-sky-300", Approved: "bg-violet-500/15 text-violet-300", Scheduled: "bg-amber-500/15 text-amber-300", Published: "bg-emerald-500/15 text-emerald-300", Failed: "bg-rose-500/15 text-rose-300" };

function Card({ title, children, right, sub }: { title: string; children: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full"><div className="flex items-start justify-between gap-2 mb-3"><div><div className="text-[13px] font-bold text-white">{title}</div>{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>{children}</div>;
}
// A "View All" that goes nowhere is a lie — it renders nothing without a target.
const ViewAll = ({ label = "View All", onClick }: { label?: string; onClick?: () => void }) =>
  onClick ? <button onClick={onClick} className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold hover:text-brand-300 transition-colors">{label} <ArrowRight className="w-3 h-3" /></button> : null;

// Details drawer — every row on this page opens its real record.
type PDetail = { title: string; subtitle?: string; badge?: { label: string; cls: string }; rows: [string, string][]; why?: string; note?: string; cta?: { label: string; go: () => void } };
function PublisherDetails({ d, onClose }: { d: PDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 460 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2 border-b border-ink-800 shrink-0">
          {d.badge && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.badge.cls}`}>{d.badge.label}</span>}
          <span className="text-sm font-bold text-white">Details</span>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{d.title}</h3>
            {d.subtitle && <p className="text-[12px] text-slate-400 mt-1 leading-relaxed whitespace-pre-line">{d.subtitle}</p>}
          </div>
          {d.rows.length > 0 && (
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 divide-y divide-ink-800">
              {d.rows.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="text-[11px] text-slate-500 shrink-0">{k}</span>
                  <span className="text-[11px] font-semibold text-slate-200 text-right break-all">{v}</span>
                </div>
              ))}
            </div>
          )}
          {d.why && <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Why it matters</div><p className="text-[12px] text-slate-300 leading-relaxed">{d.why}</p></div>}
          {d.note && <p className="text-[10px] text-slate-500 leading-relaxed">{d.note}</p>}
          {d.cta && <button onClick={d.cta.go} className="w-full rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 inline-flex items-center justify-center gap-1.5">{d.cta.label} <ArrowRight className="w-3.5 h-3.5" /></button>}
        </div>
      </motion.div>
    </div>
  );
}
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">No change</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">vs last period</span></span>; }
const ago = (d?: string | null) => { if (!d) return "—"; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 0) { const f = -s; return f < 3600 ? `in ${Math.max(1, Math.floor(f / 60))}m` : f < 86400 ? `in ${Math.floor(f / 3600)}h` : `in ${Math.floor(f / 86400)}d`; } if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };

function MultiLine({ data }: { data: PublisherOverview["perf"] }) {
  const W = 520, H = 150, P = 24;
  const series = [{ k: "impressions", c: "#8b5cf6" }, { k: "engagements", c: "#34d399" }, { k: "clicks", c: "#38bdf8" }] as const;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.k])));
  const x = (i: number) => P + (i / Math.max(1, data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 170 }}>
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={P} x2={W - P} y1={H - P - g * (H - 2 * P)} y2={H - P - g * (H - 2 * P)} stroke="#1e293b" strokeWidth="1" />)}
      {series.map((s) => <motion.polyline key={s.k} points={data.map((d, i) => `${x(i)},${y(d[s.k])}`).join(" ")} fill="none" stroke={s.c} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />)}
      {series.map((s) => data.map((d, i) => <circle key={s.k + i} cx={x(i)} cy={y(d[s.k])} r="2.5" fill={s.c} />))}
      {data.map((d, i) => <text key={i} x={x(i)} y={H - 6} fontSize="8" fill="#64748b" textAnchor="middle">{d.label}</text>)}
    </svg>
  );
}

export default function PublisherPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<PublisherOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = async () => { setLoading(true); try { setData(await getPublisherOverview()); } finally { setLoading(false); } };
  useEffect(() => { if (ready) load(); }, [ready]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 5000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
        <AgentGate agentId="publisher" label="Publisher Agent" accent="from-sky-500 to-indigo-600" />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-sm">{note}</div>}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white"><Send className="w-4.5 h-4.5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Publisher Agent</h1><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">● Active</span></div><p className="text-[11px] text-slate-500 truncate">AI Head of Publishing • Automates content distribution, scheduling & multi-channel publishing</p></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create New Post</button>
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="pubTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} onCreate={() => setCreateOpen(true)} flash={flash} reload={load} goTab={setTab} />
            : tab === "Content Queue" ? <QueueBoardTab flash={flash} onAdd={() => setCreateOpen(true)} />
            : tab === "Published Content" ? <PublishedTab />
            : tab === "Distribution Channels" || tab === "Settings" ? <ChannelsTab flash={flash} settings={tab === "Settings"} />
            : tab === "Approval Workflow" ? <ApprovalTab flash={flash} />
            : tab === "Performance" ? <PerformanceTab data={data} />
            : tab === "Calendar" ? <CalendarTab data={data} flash={flash} />
            : null}
        </div>
      </main>
      {createOpen && <CreateModal blogs={data?.blogs || []} platforms={data?.platforms || []} onClose={() => setCreateOpen(false)} onDone={(m) => { flash(m); setCreateOpen(false); load(); setTab("Content Queue"); }} />}
    </div>
  );
}

/* ------------------------------- OVERVIEW ------------------------------- */
function Overview({ data, flash, reload, goTab }: { data: PublisherOverview; onCreate: () => void; flash: (m: string) => void; reload: () => void; goTab: (t: string) => void }) {
  const [sel, setSel] = useState<PDetail | null>(null);
  // Any post row opens its real record: the copy that went out, where, when,
  // and whether anything about it can actually be measured.
  const openPost = (p: SocialPost) => setSel({
    title: p.title || p.content.slice(0, 60),
    subtitle: p.content,
    badge: { label: p.status, cls: STATUS_TONE[p.status] || "bg-slate-500/15 text-slate-300" },
    rows: [
      ["Channel", p.platform],
      ["Status", p.status],
      ...(p.publishedAt ? [["Published", new Date(p.publishedAt).toLocaleString()] as [string, string]] : []),
      ...(p.scheduledAt ? [["Scheduled for", new Date(p.scheduledAt).toLocaleString()] as [string, string]] : []),
      ...(p.link ? [["Links to", p.link] as [string, string]] : []),
      ...(p.externalUrl ? [["Live at", p.externalUrl] as [string, string]] : []),
      ...(p.error ? [["Error", p.error] as [string, string]] : []),
    ],
    why: p.status === "Published"
      ? "This went out to a real channel. Its performance is unknown: no analytics API is connected, so impressions and engagement are not measured — they are not zero, they are unmeasured."
      : p.status === "Failed"
        ? "This never reached the channel. The error above is what the platform returned."
        : "Not published yet.",
    note: "Performance numbers on this page were previously synthesised from a hash of the platform name. They have been removed — connect a channel's analytics to see real ones.",
    ...(p.externalUrl ? { cta: { label: "Open the live post", go: () => window.open(p.externalUrl, "_blank") } } : {}),
  });
  const k = data.kpis;
  const kpis = [
    { label: "Published This Period", value: kfmt(k.publishedThisPeriod), trend: k.publishedTrend, icon: Send, color: "#8b5cf6" },
    { label: "Scheduled", value: kfmt(k.scheduled), trend: k.scheduledTrend, icon: CalIcon, color: "#fbbf24" },
    { label: "Total Impressions", value: kfmt(k.totalImpressions), trend: k.impressionsTrend, icon: Eye, color: "#38bdf8" },
    { label: "Total Engagements", value: kfmt(k.totalEngagements), trend: k.engagementsTrend, icon: Heart, color: "#fb7185" },
    { label: "Clicks Generated", value: kfmt(k.clicksGenerated), trend: k.clicksTrend, icon: MousePointerClick, color: "#34d399" },
    { label: "Engagement Rate", value: `${k.engagementRate}%`, trend: k.rateTrend, icon: BarChart3, color: "#a78bfa" },
  ];
  const maxFunnel = Math.max(1, ...data.funnel.stages.map((s) => s.count));
  void flash; void reload;
  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp className="xl:col-span-1"><Card title="Publishing Performance" sub="Last 7 days" right={<div className="flex gap-2 text-[9px]"><span className="text-violet-400">● Impr</span><span className="text-emerald-400">● Eng</span><span className="text-sky-400">● Clicks</span></div>}><MultiLine data={data.perf} /></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Content Publishing Funnel">
          <ul className="space-y-1.5">{data.funnel.stages.map((s) => (
            <li key={s.stage}><div className="flex items-center justify-between text-[11px] mb-0.5"><span className="text-slate-300">{s.stage}</span><span className="text-white font-bold">{s.count}</span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: s.color }} initial={{ width: 0 }} animate={{ width: `${(s.count / maxFunnel) * 100}%` }} transition={{ duration: 0.7 }} /></div></li>
          ))}</ul>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-ink-800 text-center">
            <div><div className="text-[9px] text-slate-500">Conversion</div><div className="text-sm font-bold text-emerald-400">{data.funnel.conversionRate}%</div></div>
            <div><div className="text-[9px] text-slate-500">Avg Publish</div><div className="text-sm font-bold text-white">{data.funnel.avgTimeToPublish}d</div></div>
            <div><div className="text-[9px] text-slate-500">Approval</div><div className="text-sm font-bold text-sky-400">{data.funnel.approvalRate}%</div></div>
          </div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Top Channels Performance" right={<ViewAll label="View All Channels" />}>
          {data.topChannels.length === 0 ? <div className="py-8 text-center text-[11px] text-slate-500">No published posts yet — publish from the queue.</div> :
            <ul className="space-y-2">{data.topChannels.map((ch) => { const m = PLATFORM_ICON[ch.platform]; const M = m?.Icon || Globe; return (
              <li key={ch.platform} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m?.color }}><M className="w-3.5 h-3.5" /></span><span className="text-[11px] text-white flex-1">{ch.platform}</span><span className="text-[10px] text-slate-400">{ch.published}</span><span className="text-[10px] text-slate-400 w-12 text-right">{kfmt(ch.impressions)}</span><span className="text-[10px] text-emerald-400 w-10 text-right">{ch.engagementRate}%</span></li>
            ); })}</ul>}
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Recent Published Content" right={<ViewAll label="View All Published" onClick={() => goTab("Published Content")} />}>
          {data.recent.length === 0 ? <Empty msg="Nothing published yet." /> : <ul className="space-y-2">{data.recent.map((p) => <PostRow key={p.id} p={p} compact onOpen={openPost} />)}</ul>}
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Scheduled Content" right={<ViewAll label="View Calendar" onClick={() => goTab("Calendar")} />}>
          {data.scheduled.length === 0 ? <Empty msg="Nothing scheduled." /> : <ul className="space-y-2">{data.scheduled.map((p) => { const m = PLATFORM_ICON[p.platform]; const M = m?.Icon || Globe; return (
            <li key={p.id} onClick={() => openPost(p)} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2 cursor-pointer hover:bg-ink-900/60 transition-colors"><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m?.color }}><M className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{p.title || p.content.slice(0, 40)}</div><div className="text-[9px] text-amber-400">{ago(p.scheduledAt)} · {p.platform}</div></div></li>
          ); })}</ul>}
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Top Performing Content" right={<ViewAll label="View Report" onClick={() => goTab("Performance")} />}>
          {data.topPerforming.length === 0 ? <Empty msg="No performance data yet." /> : <ul className="space-y-2">{data.topPerforming.map((p) => <PostRow key={p.id} p={p} compact onOpen={openPost} />)}</ul>}
        </Card></FadeUp>
      </div>

      <FadeUp><Card title="Publisher Agent Recommendations" right={null}>
        {data.recommendations.length === 0 && <div className="py-6 text-center text-[11px] text-slate-500">Nothing to flag — the queue is clear and every channel is connected.</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">{data.recommendations.map((r) => (
          <Item key={r.key}><button
            onClick={() => goTab(r.go === "channels" ? "Distribution Channels" : "Content Queue")}
            className="w-full h-full text-left rounded-xl border border-ink-800 bg-ink-950/40 p-3 hover:bg-ink-900/60 transition-colors group"
          ><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center"><Sparkles className="w-3.5 h-3.5" /></span><div className="text-[12px] font-bold text-white mt-1.5 group-hover:text-brand-200 transition-colors">{r.title}</div><p className="text-[10px] text-slate-500 mt-0.5">{r.detail}</p><div className="text-[10px] font-semibold text-brand-400 mt-1.5">{r.cta} →</div></button></Item>
        ))}</div>
      </Card></FadeUp>

      {data.recent.length === 0 && data.scheduled.length === 0 &&
        <div className="text-center text-[12px] text-slate-500 py-2">Tip: hit <b className="text-slate-300">Create New Post</b> to generate channel-ready posts from your blogs, then Publish.</div>}
      {sel && <PublisherDetails d={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <div className="py-8 text-center text-[11px] text-slate-500">{msg}</div>; }

function PostRow({ p, compact, actions, onOpen }: { p: SocialPost; compact?: boolean; actions?: React.ReactNode; onOpen?: (p: SocialPost) => void }) {
  const m = PLATFORM_ICON[p.platform]; const M = m?.Icon || Globe;
  return (
    <li
      onClick={(e) => { if (onOpen && !(e.target as HTMLElement).closest("button, a")) onOpen(p); }}
      className={`flex items-start gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2 ${onOpen ? "cursor-pointer hover:bg-ink-900/60 transition-colors" : ""}`}
    >
      <span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m?.color }}><M className="w-3.5 h-3.5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-white truncate">{p.title || p.content.slice(0, 48)}</div>
        {!compact && <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{p.content}</div>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_TONE[p.status]}`}>{p.status}</span>
          {/* Only show performance when something real measured it. Every post
              used to print "N impr · N eng · N clk (est.)" off a platform-name
              hash; a zeroed row now says plainly that nothing is measured. */}
          {p.status === "Published" && (p.impressions > 0 || p.engagements > 0 || p.clicks > 0
            ? <span className="text-[9px] text-slate-500">{kfmt(p.impressions)} impr · {kfmt(p.engagements)} eng · {kfmt(p.clicks)} clk</span>
            : <span className="text-[9px] text-slate-600">no analytics connected</span>)}
          {p.externalUrl && <a href={p.externalUrl} target="_blank" rel="noreferrer" className="text-[9px] text-sky-400 inline-flex items-center gap-0.5 hover:underline"><ExternalLink className="w-2.5 h-2.5" /> live</a>}
          {p.status === "Failed" && p.error && <span className="text-[9px] text-rose-400 truncate max-w-[200px]" title={p.error}>{p.error}</span>}
        </div>
      </div>
      {actions}
    </li>
  );
}

/* ------------------------------- CONTENT QUEUE (board) ------------------------------- */
const PRIO_TONE: Record<string, string> = { High: "text-rose-400", Medium: "text-amber-400", Low: "text-sky-400" };
function Donut({ segments, total, label }: { segments: { count: number; color: string }[]; total: number; label: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  return (
    <div className="relative w-[120px] h-[120px]"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />
      {segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / Math.max(1, total)) * C; const el = <circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el; })}
    </svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="text-2xl font-extrabold text-white">{total}</div><div className="text-[9px] text-slate-500">{label}</div></div></div></div>
  );
}
function Avatar({ name }: { name: string }) { return <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-[9px] font-bold text-white shrink-0">{name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>; }

function QueueBoardTab({ flash, onAdd }: { flash: (m: string) => void; onAdd: () => void }) {
  const [b, setB] = useState<QueueBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [q, setQ] = useState(""); const [typeF, setTypeF] = useState("All"); const [ownerF, setOwnerF] = useState("All");
  const [page, setPage] = useState(1); const PER = 10;
  const load = async () => { setLoading(true); try { setB(await getPublisherQueueBoard()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string; needsConnection?: boolean }>, okMsg: string) => { setBusy(id); try { const r = await fn(); flash(r.ok ? okMsg : (r.message || "Failed.") + (r.needsConnection ? " (connect in Distribution Channels)" : "")); load(); } finally { setBusy(""); } };
  if (loading || !b) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  const k = b.kpis;
  const kpis = [
    { label: "Total In Queue", value: k.totalInQueue, sub: <Trend n={k.totalTrend} />, color: "#8b5cf6", icon: Send },
    { label: "Draft", value: k.draft, sub: <span className="text-[10px] text-slate-500">{k.draftPct}% of queue</span>, color: "#8b5cf6", icon: Clock },
    { label: "In Review", value: k.inReview, sub: <span className="text-[10px] text-slate-500">{k.inReviewPct}% of queue</span>, color: "#38bdf8", icon: Eye },
    { label: "Approved", value: k.approved, sub: <span className="text-[10px] text-slate-500">{k.approvedPct}% of queue</span>, color: "#34d399", icon: CheckCircle2 },
    { label: "Scheduled", value: k.scheduled, sub: <span className="text-[10px] text-slate-500">{k.scheduledPct}% of queue</span>, color: "#fbbf24", icon: CalIcon },
    { label: "Avg. Time in Queue", value: `${k.avgTimeInQueue}d`, sub: <Trend n={k.avgTrend} />, color: "#a78bfa", icon: Clock },
  ];
  const types = ["All", ...Array.from(new Set(b.rows.map((r) => r.contentType)))];
  const owners = ["All", ...Array.from(new Set(b.rows.map((r) => r.owner)))];
  let rows = b.rows;
  if (statusF !== "All") rows = rows.filter((r) => r.status === statusF);
  if (typeF !== "All") rows = rows.filter((r) => r.contentType === typeF);
  if (ownerF !== "All") rows = rows.filter((r) => r.owner === ownerF);
  if (q) rows = rows.filter((r) => (r.title || r.content).toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const pageRows = rows.slice((page - 1) * PER, page * PER);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Content Queue</h2><p className="text-[12px] text-slate-500">Manage, prioritize, and schedule content across all publishing channels.</p></div><button onClick={onAdd} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add Content</button></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5">{c.sub}</div></Item>
      ); })}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <FadeUp><Card title="Content Queue">
          <div className="flex gap-1 mb-3 flex-wrap">{["All", "Draft", "In Review", "Approved", "Scheduled"].map((f) => { const n = f === "All" ? b.rows.length : b.rows.filter((r) => r.status === f).length; return <button key={f} onClick={() => { setStatusF(f); setPage(1); }} className={`text-[11px] px-2.5 py-1 rounded-lg border ${statusF === f ? "border-brand-500 text-brand-300 bg-brand-500/10" : "border-ink-700 text-slate-400"}`}>{f} ({n})</button>; })}</div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search content…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-8 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
            <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }} className="rounded-lg border border-ink-700 bg-ink-950 h-8 px-2 text-[11px] text-slate-300">{types.map((t) => <option key={t}>{t === "All" ? "All Content Types" : t}</option>)}</select>
            <select value={ownerF} onChange={(e) => { setOwnerF(e.target.value); setPage(1); }} className="rounded-lg border border-ink-700 bg-ink-950 h-8 px-2 text-[11px] text-slate-300 max-w-[130px]">{owners.map((o) => <option key={o}>{o === "All" ? "All Owners" : o}</option>)}</select>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[720px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Title</th><th className="font-semibold">Type</th><th className="font-semibold">Channel</th><th className="font-semibold">Status</th><th className="font-semibold">Priority</th><th className="font-semibold">Owner</th><th className="font-semibold">Added</th><th className="font-semibold">ETA</th><th></th></tr></thead>
            <tbody>{pageRows.map((p) => { const m = PLATFORM_ICON[p.platform]; const M = m?.Icon || Globe; return (
              <tr key={p.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                <td className="py-2 pr-2"><div className="text-[11px] font-semibold text-white truncate max-w-[180px]">{p.title || p.content.slice(0, 40)}</div></td>
                <td className="text-[10px] text-slate-400 whitespace-nowrap">{p.contentType}</td>
                <td><span style={{ color: m?.color }} title={p.platform}><M className="w-3.5 h-3.5" /></span></td>
                <td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_TONE[p.status]}`}>{p.status}</span></td>
                <td><span className={`text-[10px] font-bold ${PRIO_TONE[p.priority]}`}>● {p.priority}</span></td>
                <td><span className="inline-flex items-center gap-1.5"><Avatar name={p.owner} /><span className="text-[10px] text-slate-300 truncate max-w-[70px]">{p.owner}</span></span></td>
                <td className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(p.addedOn).toLocaleDateString()}</td>
                <td className="text-[10px] text-slate-500 whitespace-nowrap">{p.eta ? new Date(p.eta).toLocaleDateString() : "—"}</td>
                <td><div className="flex items-center gap-1 justify-end">
                  {(p.status === "Draft" || p.status === "In Review") && <button onClick={() => act(p.id, () => publisherSetStatus(p.id, "Approved"), "✓ Approved")} disabled={!!busy} className="text-[9px] px-1.5 h-6 rounded border border-ink-700 text-violet-300 disabled:opacity-50">Approve</button>}
                  <button onClick={() => act(p.id, () => publisherPublish(p.id), "🚀 Published live!")} disabled={!!busy} className="text-[9px] px-1.5 h-6 rounded bg-emerald-600/90 text-white disabled:opacity-50">{busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Publish"}</button>
                  <ScheduleBtn id={p.id} onDone={(msg) => { flash(msg); load(); }} />
                  <button onClick={() => act(p.id, () => publisherDelete(p.id), "Deleted.")} disabled={!!busy} className="text-slate-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ); })}{pageRows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[11px] text-slate-500">No content. Hit <b className="text-slate-300">Add Content</b>.</td></tr>}</tbody></table></div>
          {pages > 1 && <div className="flex items-center justify-between mt-3"><span className="text-[10px] text-slate-500">Showing {(page - 1) * PER + 1}–{Math.min(page * PER, rows.length)} of {rows.length}</span><div className="flex gap-1">{Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-400"}`}>{i + 1}</button>)}</div></div>}
        </Card></FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Queue by Status"><div className="flex items-center gap-3"><Donut segments={b.byStatus.map((s) => ({ count: s.count, color: s.color }))} total={k.totalInQueue} label="Total" /><ul className="space-y-1.5 flex-1">{b.byStatus.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul></div></Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Upcoming Publish Schedule" right={<ViewAll label="View Calendar" />}>
            {b.upcoming.length === 0 ? <Empty msg="Nothing scheduled yet." /> : <ul className="space-y-2">{b.upcoming.map((p) => { const m = PLATFORM_ICON[p.platform]; const M = m?.Icon || Globe; const dt = p.scheduledAt ? new Date(p.scheduledAt) : null; return (
              <li key={p.id} className="flex items-center gap-2.5"><div className="text-center w-9 shrink-0"><div className="text-[8px] text-amber-400 uppercase">{dt?.toLocaleDateString("en", { month: "short" })}</div><div className="text-base font-extrabold text-white leading-none">{dt?.getDate()}</div></div><span className="w-6 h-6 rounded bg-ink-800 grid place-items-center shrink-0" style={{ color: m?.color }}><M className="w-3 h-3" /></span><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{p.title || p.content.slice(0, 32)}</div><div className="text-[8px] text-slate-500">{dt?.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} · {p.platform}</div></div><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">Scheduled</span></li>
            ); })}</ul>}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <FadeUp><Card title="Content by Channel" right={<ViewAll label="View Report" />}>
          <table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Channel</th><th className="font-semibold text-right">Queue</th><th className="font-semibold text-right">Sched</th><th className="font-semibold text-right">Avg</th></tr></thead>
            <tbody>{b.byChannel.map((c) => { const m = PLATFORM_ICON[c.platform]; const M = m?.Icon || Globe; return (
              <tr key={c.platform} className="border-b border-ink-900"><td className="py-1.5 flex items-center gap-1.5"><span style={{ color: m?.color }}><M className="w-3 h-3" /></span><span className="text-[10px] text-white">{c.platform}</span></td><td className="text-right text-[10px] text-slate-300">{c.inQueue}</td><td className="text-right text-[10px] text-slate-400">{c.scheduled}</td><td className="text-right text-[10px] text-slate-400">{c.avgTime}d</td></tr>
            ); })}</tbody></table>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Priority Breakdown"><div className="flex items-center gap-3"><Donut segments={b.priorityBreakdown.map((s) => ({ count: s.count, color: s.color }))} total={k.totalInQueue} label="Total" /><ul className="space-y-1.5 flex-1">{b.priorityBreakdown.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul></div></Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Top Content Owners" right={<ViewAll />}>
          <ul className="space-y-2">{b.topOwners.map((o) => <li key={o.owner} className="flex items-center gap-2"><Avatar name={o.owner} /><span className="text-[11px] text-white flex-1 truncate">{o.owner}</span><span className="text-[10px] text-slate-400">{o.items} items</span></li>)}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.15}><Card title="Queue Insights" sub="Last 7 days">
          <div className="grid grid-cols-2 gap-2 mb-2">{([["Added", b.insights.addedToQueue], ["Review", b.insights.movedToReview], ["Approved", b.insights.approved], ["Published", b.insights.published]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-lg bg-ink-950/40 border border-ink-800 px-2 py-1.5"><div className="text-[8px] text-slate-500">{l}</div><div className="text-sm font-bold text-white">{v}</div></div>)}</div>
          <MultiLine data={b.insights.series.map((s) => ({ label: s.label, published: s.published, impressions: s.added, engagements: s.approved, clicks: s.published }))} />
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ------------------------------- APPROVAL ------------------------------- */
function ApprovalTab({ flash }: { flash: (m: string) => void }) {
  const [posts, setPosts] = useState<SocialPost[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState("");
  const load = async () => { setLoading(true); try { const r = await getPublisherQueue(); setPosts(r.posts.filter((p) => ["Draft", "In Review", "Approved"].includes(p.status))); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => { setBusy(id); try { const r = await fn(); flash(r.ok ? okMsg : r.message || "Failed."); load(); } finally { setBusy(""); } };
  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  return (
    <div className="space-y-3"><h2 className="text-lg font-bold text-white">Approval Workflow</h2><p className="text-[12px] text-slate-500">Review drafts, approve, then publish or schedule.</p>
      {posts.length === 0 ? <div className="py-16 text-center text-[12px] text-slate-500">Nothing awaiting approval.</div> :
        <ul className="space-y-2">{posts.map((p) => <PostRow key={p.id} p={p} actions={
          <div className="flex items-center gap-1 shrink-0">
            {p.status !== "Approved" && <button onClick={() => act(p.id, () => publisherSetStatus(p.id, "Approved"), "✓ Approved")} disabled={!!busy} className="text-[10px] px-2 h-7 rounded-lg border border-ink-700 text-violet-300 disabled:opacity-50">Approve</button>}
            <button onClick={() => act(p.id, () => publisherPublish(p.id), "🚀 Published!")} disabled={!!busy} className="text-[10px] px-2.5 h-7 rounded-lg bg-emerald-600/90 text-white disabled:opacity-50">{busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Publish"}</button>
            <button onClick={() => act(p.id, () => publisherDelete(p.id), "Rejected.")} disabled={!!busy} className="text-slate-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        } />)}</ul>}
    </div>
  );
}
function ScheduleBtn({ id, onDone }: { id: string; onDone: (m: string) => void }) {
  const [open, setOpen] = useState(false); const [when, setWhen] = useState("");
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="text-[10px] px-2 h-7 rounded-lg border border-ink-700 text-amber-300 hover:bg-ink-800 inline-flex items-center gap-1"><Clock className="w-3 h-3" /></button>
      {open && <div className="absolute right-0 top-full mt-1 z-30 rounded-lg border border-ink-700 bg-ink-900 p-2 shadow-xl"><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="text-[11px] bg-ink-950 text-white rounded px-2 h-8 border border-ink-700" /><button onClick={async () => { if (!when) return; const r = await publisherSchedule(id, new Date(when).toISOString()); onDone(r.ok ? "📅 Scheduled" : "Failed"); setOpen(false); }} className="ml-1 text-[10px] px-2 h-8 rounded-lg bg-amber-600 text-white">Set</button></div>}
    </div>
  );
}

/* ------------------------------- PUBLISHED ------------------------------- */
function PublishedTab() {
  const [posts, setPosts] = useState<SocialPost[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { getPublisherPublished().then((r) => { setPosts(r.posts); setLoading(false); }); }, []);
  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  return (
    <div className="space-y-3"><h2 className="text-lg font-bold text-white">Published Content</h2>
      {posts.length === 0 ? <div className="py-16 text-center text-[12px] text-slate-500">Nothing published yet.</div> :
        <ul className="space-y-2">{posts.map((p) => <PostRow key={p.id} p={p} actions={<span className="text-[9px] text-slate-500 shrink-0">{ago(p.publishedAt)}</span>} />)}</ul>}
    </div>
  );
}

/* ------------------------------- CHANNELS / SETTINGS ------------------------------- */
function ChannelsTab({ flash, settings }: { flash: (m: string) => void; settings?: boolean }) {
  const [channels, setChannels] = useState<PublisherChannel[]>([]); const [loading, setLoading] = useState(true);
  const load = async () => { const r = await getPublisherChannels(); setChannels(r.channels); setLoading(false); };
  useEffect(() => { load(); }, []);
  const toggle = async (platform: string, body: { enabled?: boolean; autoPublish?: boolean }) => { await setPublisherChannel(platform, body); flash("✓ Channel updated."); load(); };
  if (loading) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  return (
    <div className="space-y-3"><h2 className="text-lg font-bold text-white">{settings ? "Channel Settings" : "Distribution Channels"}</h2>
      <p className="text-[12px] text-slate-500">A channel is <b className="text-emerald-400">Connected</b> when its credentials are in the backend env. Connect more to let the agent publish there.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{channels.map((ch) => { const m = PLATFORM_ICON[ch.platform]; const M = m?.Icon || Globe; return (
        <div key={ch.platform} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
          <div className="flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl bg-ink-800 grid place-items-center" style={{ color: m?.color }}><M className="w-4.5 h-4.5" /></span>
            <div className="flex-1"><div className="text-[13px] font-bold text-white">{ch.platform}</div><div className="text-[10px]">{ch.connected ? <span className="text-emerald-400">● Connected</span> : <span className="text-slate-500">○ Not connected</span>}</div></div>
            <label className="inline-flex items-center cursor-pointer"><input type="checkbox" checked={ch.enabled} onChange={(e) => toggle(ch.platform, { enabled: e.target.checked })} className="sr-only peer" /><span className="w-9 h-5 rounded-full bg-ink-700 peer-checked:bg-emerald-600 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" /></label>
          </div>
          {ch.connected ? <div className="grid grid-cols-3 gap-2 mt-3 text-center"><div><div className="text-[9px] text-slate-500">Published</div><div className="text-sm font-bold text-white">{ch.published}</div></div><div><div className="text-[9px] text-slate-500">Impressions</div><div className="text-sm font-bold text-white">{kfmt(ch.impressions)}</div></div><div><div className="text-[9px] text-slate-500">Eng. Rate</div><div className="text-sm font-bold text-emerald-400">{ch.engagementRate}%</div></div></div>
            : <div className="mt-2.5 rounded-lg bg-ink-950/60 border border-ink-800 px-2.5 py-2 text-[10px] text-amber-300/90"><AlertTriangle className="w-3 h-3 inline mr-1" />{ch.hint}</div>}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ink-800"><span className="text-[10px] text-slate-400">Auto-publish new drafts</span><label className="inline-flex items-center cursor-pointer"><input type="checkbox" checked={ch.autoPublish} disabled={!ch.connected} onChange={(e) => toggle(ch.platform, { autoPublish: e.target.checked })} className="sr-only peer" /><span className="w-9 h-5 rounded-full bg-ink-700 peer-checked:bg-brand-600 peer-disabled:opacity-40 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" /></label></div>
        </div>
      ); })}</div>
    </div>
  );
}

/* ------------------------------- PERFORMANCE ------------------------------- */
function PerformanceTab({ data }: { data: PublisherOverview }) {
  return (
    <div className="space-y-5">
      <FadeUp><Card title="Publishing Performance" sub="Last 7 days" right={<div className="flex gap-2 text-[9px]"><span className="text-violet-400">● Impr</span><span className="text-emerald-400">● Eng</span><span className="text-sky-400">● Clicks</span></div>}><MultiLine data={data.perf} /></Card></FadeUp>
      <FadeUp delay={0.05}><Card title="Channel Performance">
        {data.topChannels.length === 0 ? <Empty msg="No published posts yet." /> :
          <table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Channel</th><th className="font-semibold text-right">Published</th><th className="font-semibold text-right">Impressions</th><th className="font-semibold text-right">Engagements</th><th className="font-semibold text-right">Clicks</th><th className="font-semibold text-right">Eng. Rate</th></tr></thead>
            <tbody>{data.topChannels.map((ch) => { const m = PLATFORM_ICON[ch.platform]; const M = m?.Icon || Globe; return (
              <tr key={ch.platform} className="border-b border-ink-900"><td className="py-2 flex items-center gap-2"><span style={{ color: m?.color }}><M className="w-3.5 h-3.5" /></span><span className="text-[11px] text-white">{ch.platform}</span></td><td className="text-right text-[11px] text-slate-300">{ch.published}</td><td className="text-right text-[11px] text-slate-300">{kfmt(ch.impressions)}</td><td className="text-right text-[11px] text-slate-300">{kfmt(ch.engagements)}</td><td className="text-right text-[11px] text-slate-300">{kfmt(ch.clicks)}</td><td className="text-right text-[11px] text-emerald-400 font-bold">{ch.engagementRate}%</td></tr>
            ); })}</tbody></table>}
      </Card></FadeUp>
    </div>
  );
}

/* ------------------------------- CALENDAR ------------------------------- */
function CalendarTab({ data, flash }: { data: PublisherOverview; flash: (m: string) => void }) {
  void flash;
  return (
    <div className="space-y-3"><h2 className="text-lg font-bold text-white">Content Calendar</h2>
      {data.scheduled.length === 0 ? <div className="py-16 text-center text-[12px] text-slate-500">No scheduled posts. Schedule from the Content Queue.</div> :
        <ul className="space-y-2">{data.scheduled.map((p) => { const m = PLATFORM_ICON[p.platform]; const M = m?.Icon || Globe; const dt = p.scheduledAt ? new Date(p.scheduledAt) : null; return (
          <li key={p.id} className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2.5"><div className="text-center shrink-0 w-12"><div className="text-[9px] text-amber-400 uppercase">{dt?.toLocaleDateString("en", { month: "short" })}</div><div className="text-lg font-extrabold text-white leading-none">{dt?.getDate()}</div><div className="text-[9px] text-slate-500">{dt?.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</div></div><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m?.color }}><M className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[12px] text-white truncate">{p.title || p.content.slice(0, 50)}</div><div className="text-[9px] text-slate-500">{p.platform} · {ago(p.scheduledAt)}</div></div></li>
        ); })}</ul>}
    </div>
  );
}

/* ------------------------------- CREATE MODAL ------------------------------- */
function CreateModal({ blogs, platforms, onClose, onDone }: { blogs: PublisherOverview["blogs"]; platforms: string[]; onClose: () => void; onDone: (m: string) => void }) {
  const [mode, setMode] = useState<"blog" | "custom">("blog");
  const [blogId, setBlogId] = useState(blogs[0]?.id || "");
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [link, setLink] = useState("");
  const [sel, setSel] = useState<string[]>(["LinkedIn", "X", "Facebook"]);
  const [schedule, setSchedule] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (p: string) => setSel((s) => s.includes(p) ? s.filter((x) => x !== p) : [...s, p]);
  const submit = async () => {
    if (!sel.length) return; setBusy(true);
    try {
      const when = schedule ? new Date(schedule).toISOString() : null;
      if (mode === "blog") { if (!blogId) { setBusy(false); return; } const r = await publisherGenerate({ blogId, platforms: sel, schedule: when }); onDone(r.ok ? `✓ ${r.created?.length || 0} post(s) generated with Claude.` : (r.message || "Failed.")); }
      else { if (!content.trim()) { setBusy(false); return; } const r = await publisherCustom({ title, content, platforms: sel, link, schedule: when }); onDone(r.ok ? `✓ ${r.created?.length || 0} post(s) queued.` : "Failed."); }
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-800 bg-ink-900 p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white">Create New Post</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button></div>
        <div className="flex gap-1 mb-4 bg-ink-950 rounded-lg p-1">{(["blog", "custom"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`flex-1 text-[12px] py-1.5 rounded-md font-semibold ${mode === m ? "bg-brand-600 text-white" : "text-slate-400"}`}>{m === "blog" ? "From Blog (AI)" : "Custom"}</button>)}</div>
        {mode === "blog" ? <>
          <label className="block text-[10px] text-slate-500 mb-1">Source blog post</label>
          <select value={blogId} onChange={(e) => setBlogId(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-10 text-[12px] text-white mb-1">{blogs.length === 0 ? <option value="">No published blogs</option> : blogs.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
          <p className="text-[10px] text-slate-600 mb-3">Claude writes a tailored caption per selected channel.</p>
        </> : <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white mb-2" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Post content…" rows={4} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-[12px] text-white mb-2" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional)" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white mb-3" />
        </>}
        <label className="block text-[10px] text-slate-500 mb-1.5">Channels</label>
        <div className="flex flex-wrap gap-1.5 mb-3">{platforms.map((p) => { const m = PLATFORM_ICON[p]; const M = m?.Icon || Globe; const on = sel.includes(p); return (
          <button key={p} onClick={() => toggle(p)} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${on ? "border-brand-500 bg-brand-500/10 text-white" : "border-ink-700 text-slate-400"}`}><M className="w-3.5 h-3.5" style={{ color: on ? m?.color : undefined }} />{p}</button>
        ); })}</div>
        <label className="block text-[10px] text-slate-500 mb-1">Schedule (optional — leave empty for draft)</label>
        <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white mb-4" />
        <button onClick={submit} disabled={busy || !sel.length} className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {schedule ? "Generate & Schedule" : "Generate Drafts"}</button>
      </div>
    </div>
  );
}
