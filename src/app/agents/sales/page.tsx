"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Sparkles, Bell, Loader2, TrendingUp, TrendingDown, Users, Phone, Mail, MessageCircle,
  CheckCircle2, ArrowRight, X, Plus, Search, Trash2, Globe, Target, DollarSign, Send, Zap, Flame, ExternalLink, RefreshCw, Eye,
  Megaphone, Pause, Play, Mail as MailIcon, Check, CheckCheck, Calendar, FileText, StickyNote, ShieldCheck, Clock, MoreHorizontal, Download,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getSalesOverview, getSalesLeads, getSalesPipeline, salesFind, salesAddLead, salesResearch, salesDraft, salesOutreach, salesMoveStage, salesDeleteLead,
  getCampaignsOverview, createCampaign, runCampaign, setCampaignStatus, deleteCampaign,
  getWhatsAppInbox, getWaThread, sendWaMessage, aiWaDraft, markWaRead, setWaOptOut,
  salesDailyRun, salesOnboard, salesAutoReply, getEmailOutreach,
  getFollowUpData, createSequence, runSequences, toggleSequence, addSequenceStep, deleteSequence, getHotLeads, getCRM,
  type SalesOverview, type SalesLead, type PipelineBoard as PipelineBoardData, type CampaignsOverview, type SalesCampaign,
  type WhatsAppInbox, type WaMessage, type EmailOutreach, type FollowUpData, type HotLeadsData, type CrmData,
} from "@/lib/api";

const TABS = ["Overview", "Lead Pipeline", "Lead Research", "Outreach Campaigns", "WhatsApp Outreach", "Email Outreach", "Hot Leads", "CRM", "Analytics"];
const STAGES = ["New Lead", "Researching", "Outreach Sent", "Follow-Up", "Interested", "Meeting Scheduled", "Proposal Sent", "Closed Won", "Closed Lost"];
const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);
const mfmt = (n: number) => (n >= 1e6 ? `AED ${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `AED ${Math.round(n / 1000)}K` : `AED ${n}`);
const STAGE_TONE: Record<string, string> = { "New Lead": "bg-slate-500/15 text-slate-300", Researching: "bg-violet-500/15 text-violet-300", "Outreach Sent": "bg-sky-500/15 text-sky-300", "Follow-Up": "bg-indigo-500/15 text-indigo-300", Interested: "bg-amber-500/15 text-amber-300", "Meeting Scheduled": "bg-orange-500/15 text-orange-300", "Proposal Sent": "bg-purple-500/15 text-purple-300", "Closed Won": "bg-emerald-500/15 text-emerald-300", "Closed Lost": "bg-rose-500/15 text-rose-300" };

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const from = 0, dur = 750, t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{n.toLocaleString()}</span>;
}
function Card({ title, children, right, sub }: { title: string; children: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20"><div className="flex items-start justify-between gap-2 mb-3"><div><div className="text-[13px] font-bold text-white">{title}</div>{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>{children}</motion.div>;
}
const ViewAll = ({ label = "View All" }: { label?: string }) => <span className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold cursor-default">{label} <ArrowRight className="w-3 h-3" /></span>;
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">No change</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">vs 7d</span></span>; }
const ago = (d?: string | null) => { if (!d) return "—"; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };
function Donut({ segments, total, label }: { segments: { count: number; color: string }[]; total: number; label: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  return <div className="relative w-[120px] h-[120px]"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />{segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / Math.max(1, total)) * C; const el = <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="round" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.09, ease: "easeOut" }} />; off += len; return el; })}</svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><AnimatedNumber value={total} className="text-2xl font-extrabold text-white" /><div className="text-[9px] text-slate-500">{label}</div></div></div></div>;
}
function ScoreDot({ s }: { s: number }) { return <span className={`relative w-7 h-7 inline-grid place-items-center rounded-full border text-[10px] font-bold ${s >= 85 ? "border-emerald-500/40 text-emerald-300" : s >= 70 ? "border-amber-500/40 text-amber-300" : "border-slate-600 text-slate-400"}`}>{s >= 90 && <span className="absolute inset-0 rounded-full border border-emerald-400/60 animate-ping" />}{s}</span>; }
function Avatar({ name }: { name: string }) { return <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-[9px] font-bold text-white shrink-0">{(name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>; }

export default function SalesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [drawer, setDrawer] = useState<SalesLead | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = async () => { setLoading(true); try { setData(await getSalesOverview()); } finally { setLoading(false); } };
  useEffect(() => { if (ready) load(); }, [ready]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 6000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{note}</div>}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white"><Briefcase className="w-4.5 h-4.5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Sales Agent</h1><span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span> Active</span></div><p className="text-[11px] text-slate-500 truncate">AI-Powered Sales Department • Finds & recruits Dubai provider companies</p></div>
          <div className="ml-auto flex items-center gap-2">
            {data && (() => {
              const live = data.whatsappLive !== false && data.whatsappConnected;
              const expired = data.whatsappConnected && data.whatsappLive === false;
              const cls = live ? "border-emerald-500/30 text-emerald-300" : expired ? "border-red-500/40 text-red-300" : "border-amber-500/30 text-amber-300";
              const label = live ? "connected" : expired ? "token expired" : "not connected";
              return <span title={data.whatsappError || ""} className={`text-[10px] px-2 py-1 rounded-lg border ${cls}`}><MessageCircle className="w-3 h-3 inline mr-1" />WhatsApp {label}</span>;
            })()}
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add Lead</button>
            <Bell className="w-5 h-5 text-slate-500" />
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="salesTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} openLead={setDrawer} />
            : tab === "Lead Pipeline" ? <PipelineBoard key={bump} openLead={setDrawer} onAdd={() => setAddOpen(true)} />
            : tab === "Lead Research" ? <ResearchTab data={data} flash={flash} reload={load} openLead={setDrawer} />
            : tab === "Outreach Campaigns" ? <CampaignsTab flash={flash} />
            : tab === "WhatsApp Outreach" ? <WhatsAppTab flash={flash} />
            : tab === "Email Outreach" ? <EmailTab flash={flash} />
            : tab === "Follow-Up Automation" ? <FollowUpTab flash={flash} />
            : tab === "Hot Leads" ? <HotLeadsTab flash={flash} openLead={setDrawer} />
            : tab === "CRM" ? <CRMTab flash={flash} openLead={setDrawer} />
            : tab === "Analytics" ? <AnalyticsTab data={data} />
            : <LeadsTab tab={tab} flash={flash} openLead={setDrawer} reloadOverview={load} />}
        </div>
      </main>
      {drawer && <LeadDrawer lead={drawer} onClose={() => { setDrawer(null); setBump((b) => b + 1); }} flash={flash} onChange={(l) => { setDrawer(l); load(); setBump((b) => b + 1); }} whatsappConnected={data?.whatsappConnected || false} />}
      {addOpen && <AddLeadModal categories={data?.categories || []} onClose={() => setAddOpen(false)} onDone={(m) => { flash(m); setAddOpen(false); load(); setBump((b) => b + 1); }} />}
    </div>
  );
}

/* ------------------------------- OVERVIEW ------------------------------- */
function Overview({ data, openLead }: { data: SalesOverview; openLead: (l: SalesLead) => void }) {
  const k = data.kpis;
  const kpis = [
    { label: "Leads Received", value: kfmt(k.leadsReceived), trend: k.leadsTrend, icon: Users, color: "#8b5cf6" },
    { label: "Providers Contacted", value: kfmt(k.providersContacted), trend: k.contactedTrend, icon: Send, color: "#38bdf8" },
    { label: "Open Rate", value: `${k.openRate}%`, trend: k.openTrend, icon: Mail, color: "#34d399" },
    { label: "Reply Rate", value: `${k.replyRate}%`, trend: k.replyTrend, icon: MessageCircle, color: "#fbbf24" },
    { label: "Qualified Leads", value: kfmt(k.qualifiedLeads), trend: k.qualifiedTrend, icon: Target, color: "#a78bfa" },
    { label: "Partners Closed", value: kfmt(k.partnersClosed), trend: k.closedTrend, icon: CheckCircle2, color: "#10b981" },
    { label: "Revenue Potential", value: `AED ${kfmt(k.revenuePotential)}`, trend: k.revenueTrend, icon: DollarSign, color: "#fb7185" },
  ];
  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <FadeUp><Card title="Sales Pipeline" right={<ViewAll label="View Full Pipeline" />}>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-3">{data.pipeline.map((s) => <div key={s.stage} className="rounded-lg bg-ink-950/40 border border-ink-800 px-2 py-1.5 text-center"><div className="text-base font-extrabold text-white">{s.count}</div><div className="text-[8px] text-slate-500 leading-tight">{s.stage}</div></div>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-left min-w-[700px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Company</th><th className="font-semibold">Category</th><th className="font-semibold text-center">Score</th><th className="font-semibold">Status</th><th className="font-semibold">Next Action</th><th className="font-semibold">Owner</th></tr></thead>
          <tbody>{data.leads.map((l) => (
            <tr key={l.id} onClick={() => openLead(l)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2 text-[11px] font-semibold text-white truncate max-w-[160px]">{l.company}</td><td className="text-[10px] text-slate-400">{l.category}</td><td className="text-center"><ScoreDot s={l.leadScore} /></td><td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STAGE_TONE[l.stage]}`}>{l.stage}</span></td><td className="text-[10px] text-slate-400 truncate max-w-[120px]">{l.nextAction}</td><td className="text-[10px] text-slate-400">{l.owner}</td></tr>
          ))}{data.leads.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[11px] text-slate-500">No leads yet — go to <b className="text-slate-300">Lead Research</b> to find provider companies.</td></tr>}</tbody></table></div>
      </Card></FadeUp>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Daily Activity"><div className="flex items-center gap-3"><Donut segments={data.dailyActivity.map((x) => ({ count: x.count, color: x.color }))} total={data.totalActivities} label="Activities" /><ul className="space-y-1.5 flex-1">{data.dailyActivity.map((x) => <li key={x.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: x.color }} /><span className="text-slate-400 flex-1">{x.label}</span><span className="text-white font-bold">{x.count}</span></li>)}</ul></div></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Channel Performance">
          <table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Channel</th><th className="font-semibold text-right">Sent</th><th className="font-semibold text-right">Read</th><th className="font-semibold text-right">Replied</th><th className="font-semibold text-right">Rate</th></tr></thead>
            <tbody>{data.channelPerf.map((c) => <tr key={c.channel} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-white">{c.channel} {!c.connected && <span className="text-[8px] text-amber-400">○</span>}</td><td className="text-right text-[10px] text-slate-300">{kfmt(c.sent)}</td><td className="text-right text-[10px] text-slate-400">{kfmt(c.read)}</td><td className="text-right text-[10px] text-slate-400">{kfmt(c.replied)}</td><td className="text-right text-[10px] text-emerald-400 font-bold">{c.replyRate}%</td></tr>)}</tbody></table>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Conversion Funnel" right={<ViewAll label="View Funnel Analysis" />}>
          <ul className="space-y-1.5">{data.funnel.map((f, i) => <li key={f.stage}><div className="flex items-center justify-between text-[10px] mb-0.5"><span className="text-slate-300">{f.stage}</span><span className="text-white font-bold">{kfmt(f.count)} <span className="text-slate-600">({f.pct}%)</span></span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.max(4, f.pct)}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} /></div></li>)}</ul>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ink-800"><span className="text-[10px] text-slate-500">Overall Conversion</span><span className="text-sm font-bold text-emerald-400">{data.overallConversion}%</span></div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <FadeUp><Card title="Upcoming Follow-Ups" right={<ViewAll />}>{data.followUps.length === 0 ? <Empty msg="No follow-ups." /> : <ul className="space-y-2">{data.followUps.map((l) => <li key={l.id} onClick={() => openLead(l)} className="flex items-center gap-2 cursor-pointer"><ScoreDot s={l.leadScore} /><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{l.company}</div><div className="text-[9px] text-slate-500">{l.category} · {l.stage}</div></div></li>)}</ul>}</Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Hot Leads" right={<ViewAll />}>{data.hotLeads.length === 0 ? <Empty msg="No hot leads yet." /> : <ul className="space-y-2">{data.hotLeads.map((l) => <li key={l.id} onClick={() => openLead(l)} className="flex items-center gap-2 cursor-pointer"><Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{l.company}</div><div className="text-[9px] text-slate-500">{l.category}</div></div><ScoreDot s={l.leadScore} /></li>)}</ul>}</Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Tasks Summary"><div className="flex items-center gap-3"><Donut segments={[{ count: data.tasks.dueToday, color: "#38bdf8" }, { count: data.tasks.dueThisWeek, color: "#8b5cf6" }, { count: data.tasks.overdue, color: "#fb7185" }, { count: data.tasks.completed, color: "#34d399" }]} total={data.tasks.dueToday + data.tasks.dueThisWeek + data.tasks.overdue + data.tasks.completed} label="Tasks" /><ul className="space-y-1.5 flex-1 text-[10px]"><li className="flex justify-between"><span className="text-slate-400">Due Today</span><span className="text-white font-bold">{data.tasks.dueToday}</span></li><li className="flex justify-between"><span className="text-slate-400">This Week</span><span className="text-white font-bold">{data.tasks.dueThisWeek}</span></li><li className="flex justify-between"><span className="text-slate-400">Overdue</span><span className="text-rose-400 font-bold">{data.tasks.overdue}</span></li><li className="flex justify-between"><span className="text-slate-400">Completed</span><span className="text-emerald-400 font-bold">{data.tasks.completed}</span></li></ul></div></Card></FadeUp>
        <FadeUp delay={0.15}><Card title="AI Recommendations" right={<ViewAll />}><ul className="space-y-2">{data.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2"><Sparkles className="w-3.5 h-3.5 text-brand-300 mt-0.5 shrink-0" /><div><div className="text-[11px] font-semibold text-white">{r.title}</div><div className="text-[9px] text-slate-500">{r.detail}</div></div></li>)}</ul></Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FadeUp><Card title="Top Performing Categories" right={<ViewAll />}>{data.topCategories.length === 0 ? <Empty msg="No data." /> : <table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Category</th><th className="font-semibold text-right">Leads</th><th className="font-semibold text-right">Meetings</th><th className="font-semibold text-right">Conversion</th></tr></thead><tbody>{data.topCategories.map((c) => <tr key={c.category} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-white">{c.category}</td><td className="text-right text-[10px] text-slate-300">{c.leads}</td><td className="text-right text-[10px] text-slate-400">{c.meetings}</td><td className="text-right text-[10px] text-emerald-400 font-bold">{c.conversion}%</td></tr>)}</tbody></table>}</Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Revenue Forecast" sub="Estimated annual value of pipeline"><div className="text-3xl font-extrabold text-white">AED {kfmt(data.revenueForecast)}</div><Trend n={data.kpis.revenueTrend} /><p className="text-[11px] text-slate-500 mt-2">Across {data.kpis.leadsReceived} leads · {data.onPlatform} providers already on platform. Close more partners to realize this.</p></Card></FadeUp>
      </div>
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <div className="py-6 text-center text-[11px] text-slate-500">{msg}</div>; }

/* ------------------------------- LEAD PIPELINE (Kanban) ------------------------------- */
function PipelineBoard({ openLead, onAdd }: { openLead: (l: SalesLead) => void; onAdd: () => void }) {
  const [b, setB] = useState<PipelineBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Board" | "Table">("Board");
  const [owner, setOwner] = useState("All Owners");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const load = async () => { setLoading(true); try { setB(await getSalesPipeline({ owner, q })); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [owner]);
  if (loading || !b) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  const k = b.kpis;
  const kpis = [
    { label: "Total Leads", value: kfmt(k.totalLeads), trend: k.totalTrend, color: "#8b5cf6", icon: Users },
    { label: "Leads This Week", value: kfmt(k.leadsThisWeek), trend: k.weekTrend, color: "#38bdf8", icon: Zap },
    { label: "Moving Forward", value: kfmt(k.movingForward), trend: k.forwardTrend, color: "#34d399", icon: TrendingUp },
    { label: "Leads Stuck", value: kfmt(k.stuck), trend: k.stuckTrend, color: "#fb7185", icon: Target },
    { label: "Converted This Week", value: kfmt(k.convertedThisWeek), trend: k.convertedTrend, color: "#10b981", icon: CheckCircle2 },
    { label: "Conversion Rate", value: `${k.conversionRate}%`, trend: k.conversionTrend, color: "#a78bfa", icon: DollarSign },
  ];
  const allCards = b.columns.flatMap((c) => c.cards).filter((l) => !q || l.company.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-lg font-bold text-white">Lead Pipeline</h2><p className="text-[12px] text-slate-500">Manage and track leads across the entire sales cycle.</p></div>
        <div className="flex items-center gap-2">
          <div className="flex bg-ink-950 rounded-lg p-0.5 border border-ink-800">{(["Board", "Table"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${view === v ? "bg-brand-600 text-white" : "text-slate-400"}`}>{v}</button>)}</div>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-950 h-9 px-2 text-[11px] text-slate-300">{b.owners.map((o) => <option key={o}>{o}</option>)}</select>
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search leads…" className="rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-9 text-[12px] text-white w-40 focus:outline-none" /></div>
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add Lead</button>
        </div>
      </div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      {view === "Table" ? (
        <FadeUp><Card title="All Leads"><ul className="space-y-2">{allCards.map((l) => <LeadRow key={l.id} l={l} onOpen={() => openLead(l)} />)}{allCards.length === 0 && <Empty msg="No leads." />}</ul></Card></FadeUp>
      ) : (
        <div className="overflow-x-auto pb-2"><div className="flex gap-3 min-w-max">{b.columns.map((col) => {
          const cards = col.cards.filter((l) => !q || l.company.toLowerCase().includes(q.toLowerCase()));
          const show = expanded[col.stage] ? cards : cards.slice(0, 4);
          return (
            <div key={col.stage} className="w-[230px] shrink-0">
              <div className="flex items-center justify-between mb-2 px-1"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: col.color }} /><span className="text-[12px] font-bold text-white">{col.stage}</span><span className="text-[10px] text-slate-500">{col.count}</span></div><button onClick={onAdd} className="text-slate-500 hover:text-white"><Plus className="w-3.5 h-3.5" /></button></div>
              <div className="text-[9px] text-slate-600 px-1 mb-2">{mfmt(col.potential)} potential</div>
              <div className="space-y-2">{show.map((l) => (
                <button key={l.id} onClick={() => openLead(l)} className="w-full text-left rounded-xl border border-ink-800 bg-ink-950/50 hover:border-brand-500/40 p-2.5">
                  <div className="flex items-start justify-between gap-1"><div className="text-[11px] font-bold text-white truncate">{l.company}</div><span className={`text-[7px] font-bold px-1 py-0.5 rounded shrink-0 ${STAGE_TONE[l.stage]}`}>{l.stage.split(" ")[0]}</span></div>
                  <div className="text-[9px] text-slate-500 mb-1.5">{l.category} · Dubai</div>
                  <div className="flex items-center justify-between"><div><div className="text-[8px] text-slate-600">Score</div><span className={`text-[11px] font-bold ${l.leadScore >= 85 ? "text-emerald-400" : l.leadScore >= 70 ? "text-amber-400" : "text-slate-400"}`}>{l.leadScore}</span></div><div className="text-right"><div className="text-[8px] text-slate-600">Potential</div><div className="text-[11px] font-bold text-white">{mfmt(l.revenuePotential).replace("AED ", "")}/yr</div></div></div>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-ink-800"><span className="text-[9px] text-slate-500 truncate">{l.owner}</span><div className="flex items-center gap-1">{l.phone && <Phone className="w-2.5 h-2.5 text-slate-500" />}{l.email && <Mail className="w-2.5 h-2.5 text-slate-500" />}{l.whatsapp && <MessageCircle className="w-2.5 h-2.5 text-emerald-500" />}</div></div>
                </button>
              ))}
              {cards.length === 0 && <div className="text-[10px] text-slate-600 text-center py-4 rounded-xl border border-dashed border-ink-800">Empty</div>}
              {cards.length > 4 && <button onClick={() => setExpanded((e) => ({ ...e, [col.stage]: !e[col.stage] }))} className="w-full text-[10px] text-brand-400 py-1 hover:text-brand-300">{expanded[col.stage] ? "Show less" : `+ ${cards.length - 4} more`}</button>}
              </div>
            </div>
          );
        })}</div></div>
      )}
    </div>
  );
}

/* ------------------------------- LEAD RESEARCH ------------------------------- */
function ResearchTab({ data, flash, reload, openLead }: { data: SalesOverview; flash: (m: string) => void; reload: () => void; openLead: (l: SalesLead) => void }) {
  const [category, setCategory] = useState(data.categories[0] || "Yacht Rental");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<SalesLead[]>([]);
  const find = async () => { setBusy(true); flash(`🔎 Searching the web for real ${category} companies in Dubai… (~30s)`); try { const r = await salesFind({ category, count }); if (r.ok) { setFound(r.created || []); flash(`✓ Found ${r.created?.length || 0} real companies.`); reload(); } else flash(r.message || "Failed."); } finally { setBusy(false); } };
  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-white">Lead Research</h2><p className="text-[12px] text-slate-500">AI searches the web for real Dubai provider companies and adds them to your pipeline with contact details.</p></div>
      <FadeUp><Card title="Find Provider Companies">
        <div className="flex items-end gap-2 flex-wrap">
          <div><label className="block text-[10px] text-slate-500 mb-1">Category</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-950 h-10 px-2 text-[12px] text-slate-300">{data.categories.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-[10px] text-slate-500 mb-1">How many</label><select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-lg border border-ink-700 bg-ink-950 h-10 px-2 text-[12px] text-slate-300">{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <button onClick={find} disabled={busy || !data.llm} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Find Leads</button>
          {!data.llm && <span className="text-[10px] text-amber-400">LLM offline</span>}
        </div>
      </Card></FadeUp>
      {found.length > 0 && <FadeUp><Card title={`Newly found (${found.length})`}><ul className="space-y-2">{found.map((l) => <LeadRow key={l.id} l={l} onOpen={() => openLead(l)} />)}</ul></Card></FadeUp>}
      <FadeUp><Card title="All Researched Leads" right={<ViewAll />}><AllLeads stage="" flash={flash} openLead={openLead} /></Card></FadeUp>
    </div>
  );
}

/* ------------------------------- LEADS (pipeline/outreach/crm/hot) ------------------------------- */
function LeadsTab({ tab, flash, openLead, reloadOverview }: { tab: string; flash: (m: string) => void; openLead: (l: SalesLead) => void; reloadOverview: () => void }) {
  const heading = tab;
  const sub = tab === "WhatsApp Outreach" ? "Draft & send real WhatsApp messages to leads (needs WhatsApp key)." : tab === "Email Outreach" ? "Draft & send real outreach emails to leads." : tab === "Hot Leads" ? "Leads scoring 85+ — reach out first." : tab === "CRM" ? "All leads with full contact details." : "Move leads through the sales pipeline.";
  void reloadOverview;
  return (
    <div className="space-y-4"><div><h2 className="text-lg font-bold text-white">{heading}</h2><p className="text-[12px] text-slate-500">{sub}</p></div>
      <AllLeads stage="" flash={flash} openLead={openLead} mode={tab} />
    </div>
  );
}

function AllLeads({ stage, flash, openLead, mode }: { stage: string; flash: (m: string) => void; openLead: (l: SalesLead) => void; mode?: string }) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [stageF, setStageF] = useState(stage || "All");
  const load = async () => { setLoading(true); try { const r = await getSalesLeads({ stage: stageF, q }); setLeads(r.leads); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [stageF]);
  let list = leads;
  if (mode === "Hot Leads") list = list.filter((l) => l.leadScore >= 85);
  if (q) list = list.filter((l) => l.company.toLowerCase().includes(q.toLowerCase()));
  if (loading) return <div className="grid place-items-center py-16 text-slate-600"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search company…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
        <select value={stageF} onChange={(e) => setStageF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-950 h-9 px-2 text-[11px] text-slate-300">{["All", ...STAGES].map((s) => <option key={s}>{s}</option>)}</select>
        <button onClick={load} className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg border border-ink-700 text-slate-400 text-[11px]"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      {list.length === 0 ? <div className="py-12 text-center text-[12px] text-slate-500">No leads. Use <b className="text-slate-300">Lead Research</b> to find provider companies.</div> :
        <ul className="space-y-2">{list.map((l) => <LeadRow key={l.id} l={l} onOpen={() => openLead(l)} mode={mode} flash={flash} reload={load} />)}</ul>}
    </div>
  );
}

function LeadRow({ l, onOpen, mode, flash, reload }: { l: SalesLead; onOpen: () => void; mode?: string; flash?: (m: string) => void; reload?: () => void }) {
  const [busy, setBusy] = useState("");
  const quickOutreach = async (channel: string) => { setBusy(channel); try { const r = await salesOutreach(l.id, { channel }); flash?.(r.ok ? `✓ ${channel} sent to ${l.company}.` : (r.message || "Failed") + (r.needsConnection ? " — connect the channel" : "")); reload?.(); } finally { setBusy(""); } };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2.5 hover:border-ink-700">
      <ScoreDot s={l.leadScore} />
      <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
        <div className="text-[12px] font-semibold text-white truncate">{l.company}</div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500"><span>{l.category}</span>{l.phone && <span className="inline-flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{l.phone}</span>}{l.email && <span className="inline-flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{l.email}</span>}</div>
      </div>
      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STAGE_TONE[l.stage]}`}>{l.stage}</span>
      {(mode === "WhatsApp Outreach" || mode === "Email Outreach") ? (
        <button onClick={() => quickOutreach(mode === "WhatsApp Outreach" ? "WhatsApp" : "Email")} disabled={!!busy} className="text-[10px] px-2.5 h-7 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}</button>
      ) : <button onClick={onOpen} className="text-[10px] px-2.5 h-7 rounded-lg border border-ink-700 text-slate-300">Open</button>}
    </li>
  );
}

/* ------------------------------- ANALYTICS ------------------------------- */
function AnalyticsTab({ data }: { data: SalesOverview }) {
  return (
    <div className="space-y-5"><h2 className="text-lg font-bold text-white">Analytics</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FadeUp><Card title="Conversion Funnel"><ul className="space-y-2">{data.funnel.map((f, i) => <li key={f.stage}><div className="flex justify-between text-[11px] mb-0.5"><span className="text-slate-300">{f.stage}</span><span className="text-white font-bold">{kfmt(f.count)} ({f.pct}%)</span></div><div className="h-2.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.max(4, f.pct)}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} /></div></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Channel Performance"><table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Channel</th><th className="font-semibold text-right">Sent</th><th className="font-semibold text-right">Delivered</th><th className="font-semibold text-right">Read</th><th className="font-semibold text-right">Replied</th><th className="font-semibold text-right">Rate</th></tr></thead><tbody>{data.channelPerf.map((c) => <tr key={c.channel} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-white">{c.channel}</td><td className="text-right text-[10px] text-slate-300">{c.sent}</td><td className="text-right text-[10px] text-slate-400">{c.delivered}</td><td className="text-right text-[10px] text-slate-400">{c.read}</td><td className="text-right text-[10px] text-slate-400">{c.replied}</td><td className="text-right text-[10px] text-emerald-400 font-bold">{c.replyRate}%</td></tr>)}</tbody></table></Card></FadeUp>
      </div>
      <FadeUp><Card title="Top Performing Categories"><table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Category</th><th className="font-semibold text-right">Leads</th><th className="font-semibold text-right">Meetings</th><th className="font-semibold text-right">Closed</th><th className="font-semibold text-right">Conversion</th></tr></thead><tbody>{data.topCategories.map((c) => <tr key={c.category} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-white">{c.category}</td><td className="text-right text-[10px] text-slate-300">{c.leads}</td><td className="text-right text-[10px] text-slate-400">{c.meetings}</td><td className="text-right text-[10px] text-slate-400">{c.closed}</td><td className="text-right text-[10px] text-emerald-400 font-bold">{c.conversion}%</td></tr>)}</tbody></table></Card></FadeUp>
    </div>
  );
}

/* ------------------------------- LEAD DRAWER ------------------------------- */
function LeadDrawer({ lead, onClose, flash, onChange, whatsappConnected }: { lead: SalesLead; onClose: () => void; flash: (m: string) => void; onChange: (l: SalesLead) => void; whatsappConnected: boolean }) {
  const [busy, setBusy] = useState("");
  const [draft, setDraft] = useState(""); const [channel, setChannel] = useState("WhatsApp");
  const research = async () => { setBusy("research"); flash("🔬 Researching company…"); try { const r = await salesResearch(lead.id); if (r.ok && r.lead) { onChange(r.lead); flash("✓ Research done."); } else flash(r.message || "Failed."); } finally { setBusy(""); } };
  const genDraft = async () => { setBusy("draft"); try { const r = await salesDraft(lead.id, channel); if (r.ok) setDraft(r.message || ""); flash(r.ok ? "✓ Draft ready — edit & send." : "Failed"); } finally { setBusy(""); } };
  const send = async () => { setBusy("send"); try { const r = await salesOutreach(lead.id, { channel, message: draft }); if (r.ok && r.lead) { onChange(r.lead); setDraft(""); flash(`✓ ${channel} sent to ${lead.company}!`); } else flash((r.message || "Failed") + (r.needsConnection ? " — set the WhatsApp key in backend env" : "")); } finally { setBusy(""); } };
  const move = async (stage: string) => { setBusy("stage"); try { const r = await salesMoveStage(lead.id, stage); if (r.ok && r.lead) { onChange(r.lead); flash(`Moved to ${stage}.`); } } finally { setBusy(""); } };
  const del = async () => { await salesDeleteLead(lead.id); flash("Lead deleted."); onClose(); };
  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-ink-900 border-b border-ink-800 p-4 flex items-start justify-between gap-2">
          <div><div className="flex items-center gap-2"><ScoreDot s={lead.leadScore} /><h3 className="text-base font-bold text-white">{lead.company}</h3></div><div className="text-[11px] text-slate-500 mt-1">{lead.category} · {lead.location}</div></div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            {lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sky-400 hover:underline"><Globe className="w-3.5 h-3.5" />{lead.website}</a>}
            {lead.phone && <span className="inline-flex items-center gap-1.5 text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-500" />{lead.phone}</span>}
            {lead.email && <span className="inline-flex items-center gap-1.5 text-slate-300"><Mail className="w-3.5 h-3.5 text-slate-500" />{lead.email}</span>}
            <span className="text-slate-500">Revenue potential: <b className="text-emerald-400">AED {kfmt(lead.revenuePotential)}</b>/yr</span>
          </div>

          <div className="flex gap-1.5 flex-wrap"><button onClick={research} disabled={!!busy} className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg border border-ink-700 text-violet-300 hover:bg-ink-800 disabled:opacity-50">{busy === "research" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Research</button>
            <select value={lead.stage} onChange={(e) => move(e.target.value)} className="text-[11px] bg-ink-950 border border-ink-700 rounded-lg h-8 px-2 text-slate-300">{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
            <button onClick={del} className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg border border-ink-700 text-slate-400 hover:text-rose-400 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>

          {lead.research && <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] font-bold text-slate-400 mb-1">AI Research</div><p className="text-[11px] text-slate-300">{lead.research}</p>{lead.sources.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{lead.sources.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-[9px] text-sky-400 hover:underline inline-flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />{(s.title || s.url).slice(0, 24)}</a>)}</div>}</div>}

          <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-3">
            <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold text-slate-400">Outreach</span><div className="ml-auto flex gap-1">{["WhatsApp", "Email"].map((c) => <button key={c} onClick={() => setChannel(c)} className={`text-[10px] px-2 py-0.5 rounded ${channel === c ? "bg-brand-600 text-white" : "text-slate-400 border border-ink-700"}`}>{c}</button>)}</div></div>
            {channel === "WhatsApp" && !whatsappConnected && <div className="text-[10px] text-amber-300 mb-2"><span className="inline-block">⚠ WhatsApp not connected — set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID in backend env.</span></div>}
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write or generate a message…" rows={4} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-[12px] text-white mb-2" />
            <div className="flex gap-1.5"><button onClick={genDraft} disabled={!!busy} className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg border border-ink-700 text-brand-300 disabled:opacity-50">{busy === "draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Draft</button><button onClick={send} disabled={!!busy || !draft.trim()} className="inline-flex items-center gap-1 text-[11px] px-3 h-8 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50">{busy === "send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send {channel}</button></div>
          </div>

          <div><div className="text-[10px] font-bold text-slate-400 mb-1.5">Activity</div><ul className="space-y-1.5">{lead.activities.map((a, i) => <li key={i} className="flex items-start gap-2 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1 shrink-0" /><div><span className="text-slate-300">{a.summary}</span><span className="text-slate-600 ml-1">· {a.channel || a.type} · {ago(a.at)}</span></div></li>)}{lead.activities.length === 0 && <li className="text-[10px] text-slate-600">No activity yet.</li>}</ul></div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- ADD LEAD MODAL ------------------------------- */
function AddLeadModal({ categories, onClose, onDone }: { categories: string[]; onClose: () => void; onDone: (m: string) => void }) {
  const [f, setF] = useState({ company: "", category: categories[0] || "Yacht Rental", phone: "", email: "", website: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => { if (!f.company.trim()) return; setBusy(true); try { const r = await salesAddLead(f); onDone(r.ok ? `✓ ${f.company} added to pipeline.` : (r.message || "Failed.")); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white">Add Lead</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button></div>
        <div className="space-y-2">
          <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company name *" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-10 text-[12px] text-slate-300">{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone / WhatsApp (+971…)" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="Website" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <button onClick={submit} disabled={busy || !f.company.trim()} className="w-full h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Lead"}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- OUTREACH CAMPAIGNS ------------------------------- */
const CH_ICON: Record<string, { Icon: typeof Send; color: string }> = { WhatsApp: { Icon: MessageCircle, color: "#34d399" }, Email: { Icon: MailIcon, color: "#8b5cf6" }, SMS: { Icon: Phone, color: "#38bdf8" }, Others: { Icon: Globe, color: "#fbbf24" } };
const CAMP_STATUS_TONE: Record<string, string> = { Draft: "text-slate-400", Active: "text-emerald-400", Paused: "text-amber-400", Completed: "text-sky-400" };
const CAMP_TYPE_TONE: Record<string, string> = { Outreach: "bg-sky-500/15 text-sky-300", "Claim Profile": "bg-violet-500/15 text-violet-300", Verification: "bg-emerald-500/15 text-emerald-300", Upsell: "bg-amber-500/15 text-amber-300" };
const CAMP_ICON: Record<string, { Icon: typeof Send; color: string }> = { Outreach: { Icon: Megaphone, color: "#38bdf8" }, "Claim Profile": { Icon: FileText, color: "#8b5cf6" }, Verification: { Icon: ShieldCheck, color: "#34d399" }, Upsell: { Icon: TrendingUp, color: "#fbbf24" } };
function CampaignsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<CampaignsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sub, setSub] = useState("All Campaigns");
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [menuId, setMenuId] = useState("");
  const PER = 8;
  const load = async () => { setLoading(true); try { setD(await getCampaignsOverview()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const run = async (id: string, name: string) => { setBusy(id); flash(`📣 Running "${name}" — sending to matching leads…`); try { const r = await runCampaign(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); load(); } finally { setBusy(""); } };
  const toggle = async (id: string, status: string) => { setBusy(id); try { await setCampaignStatus(id, status); load(); } finally { setBusy(""); } };
  const del = async (id: string) => { setBusy(id); try { await deleteCampaign(id); flash("Deleted."); load(); } finally { setBusy(""); } };
  if (loading || !d) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Campaigns", value: kfmt(k.campaigns), sub: "Active campaigns", trend: k.campaignsTrend, icon: Megaphone, color: "#8b5cf6" },
    { label: "Messages Sent", value: kfmt(k.messagesSent), sub: "Total sent", trend: k.messagesTrend, icon: Send, color: "#38bdf8" },
    { label: "Open Rate", value: `${k.openRate}%`, sub: "Average open rate", trend: k.openTrend, icon: MailIcon, color: "#34d399" },
    { label: "Reply Rate", value: `${k.replyRate}%`, sub: "Average reply rate", trend: k.replyTrend, icon: MessageCircle, color: "#fbbf24" },
    { label: "Meetings Booked", value: kfmt(k.meetingsBooked), sub: "From campaigns", trend: k.meetingsTrend, icon: CheckCircle2, color: "#a78bfa" },
    { label: "Partners Closed", value: kfmt(k.partnersClosed), sub: "From campaigns", trend: k.closedTrend, icon: Target, color: "#10b981" },
    { label: "Revenue Generated", value: `AED ${kfmt(k.revenueGenerated)}`, sub: "From campaigns", trend: k.revenueTrend, icon: DollarSign, color: "#fb7185" },
  ];
  const SUBS = ["All Campaigns", "WhatsApp Campaigns", "Email Campaigns", "Claim Profile Campaigns", "Verification Campaigns", "Upsell Campaigns"];
  let camps = d.campaigns;
  if (sub === "WhatsApp Campaigns") camps = camps.filter((c) => c.channels.includes("WhatsApp"));
  else if (sub === "Email Campaigns") camps = camps.filter((c) => c.channels.includes("Email"));
  else if (sub === "Claim Profile Campaigns") camps = camps.filter((c) => c.type === "Claim Profile");
  else if (sub === "Verification Campaigns") camps = camps.filter((c) => c.type === "Verification");
  else if (sub === "Upsell Campaigns") camps = camps.filter((c) => c.type === "Upsell");
  const pages = Math.max(1, Math.ceil(camps.length / PER));
  const pageRows = camps.slice((page - 1) * PER, page * PER);

  return (
    <div className="space-y-5">
      {newOpen && <NewCampaignModal categories={d.categories} types={d.types} onClose={() => setNewOpen(false)} onDone={(m) => { flash(m); setNewOpen(false); load(); }} />}
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Outreach Campaigns</h2><p className="text-[12px] text-slate-500">Create, manage and track multi-channel outreach campaigns to convert providers into partners.</p></div><button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> New Campaign</button></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div><div className="text-[9px] text-slate-500">{c.sub}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp><Card title="Campaigns">
          <div className="flex gap-1 mb-3 flex-wrap">{SUBS.map((s) => <button key={s} onClick={() => { setSub(s); setPage(1); }} className={`text-[10px] px-2.5 py-1 rounded-lg border ${sub === s ? "border-brand-500 text-brand-300 bg-brand-500/10" : "border-ink-700 text-slate-400"}`}>{s.replace(" Campaigns", "")}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[820px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Campaign</th><th className="font-semibold">Type</th><th className="font-semibold">Target Category</th><th className="font-semibold">Channels</th><th className="font-semibold text-right">Recipients</th><th className="font-semibold text-right">Sent</th><th className="font-semibold text-right">Open Rate</th><th className="font-semibold text-right">Reply Rate</th><th className="font-semibold text-right">Meetings</th><th className="font-semibold">Status</th><th className="font-semibold text-right">Actions</th></tr></thead>
            <tbody>{pageRows.map((c) => { const ti = CAMP_ICON[c.type] || CAMP_ICON.Outreach; const TI = ti.Icon; return (
              <tr key={c.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                <td className="py-2.5"><div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: ti.color }}><TI className="w-4 h-4" /></span><div className="min-w-0"><div className="text-[11px] font-semibold text-white truncate max-w-[150px]">{c.name}</div><div className="text-[9px] text-slate-500 truncate max-w-[150px]">{c.description}</div></div></div></td>
                <td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CAMP_TYPE_TONE[c.type] || ""}`}>{c.type}</span></td>
                <td className="text-[10px] text-slate-400">{c.targetCategory}</td>
                <td><span className="flex items-center gap-1">{c.channels.map((ch) => { const m = CH_ICON[ch]; return m ? <span key={ch} className="w-5 h-5 rounded grid place-items-center bg-ink-800" style={{ color: m.color }} title={ch}><m.Icon className="w-3 h-3" /></span> : null; })}</span></td>
                <td className="text-right text-[11px] text-slate-300 tabular-nums">{kfmt(c.recipients)}</td><td className="text-right text-[11px] text-slate-300 tabular-nums">{c.sent ? kfmt(c.sent) : "—"}</td>
                <td className="text-right text-[10px] text-slate-400">{c.sent ? `${c.openRate}%` : "—"}</td><td className="text-right text-[10px] text-slate-400">{c.sent ? `${c.replyRate}%` : "—"}</td><td className="text-right text-[10px] text-slate-400">{c.meetings || "—"}</td>
                <td><span className={`text-[10px] font-semibold ${CAMP_STATUS_TONE[c.status]}`}>● {c.status}</span></td>
                <td className="text-right relative">
                  <button onClick={() => setMenuId(menuId === c.id ? "" : c.id)} className="w-7 h-7 rounded-lg grid place-items-center text-slate-500 hover:text-white hover:bg-ink-800 ml-auto">{busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}</button>
                  {menuId === c.id && <>
                    <button className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuId("")} />
                    <div className="absolute right-0 top-full z-30 mt-1 w-36 rounded-lg border border-ink-700 bg-ink-900 shadow-xl py-1 text-left">
                      <button onClick={() => { setMenuId(""); run(c.id, c.name); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-emerald-300 hover:bg-ink-800"><Play className="w-3.5 h-3.5" /> Run campaign</button>
                      {c.status === "Active" ? <button onClick={() => { setMenuId(""); toggle(c.id, "Paused"); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-300 hover:bg-ink-800"><Pause className="w-3.5 h-3.5" /> Pause</button> : <button onClick={() => { setMenuId(""); toggle(c.id, "Active"); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800"><Play className="w-3.5 h-3.5" /> Activate</button>}
                      <button onClick={() => { setMenuId(""); del(c.id); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-rose-300 hover:bg-ink-800"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </>}
                </td>
              </tr>
            ); })}{pageRows.length === 0 && <tr><td colSpan={11} className="py-6 text-center text-[11px] text-slate-500">No campaigns. Create one.</td></tr>}</tbody></table></div>
          {pages > 1 && <div className="flex items-center justify-between mt-3"><span className="text-[10px] text-slate-500">Showing {(page - 1) * PER + 1}–{Math.min(page * PER, camps.length)} of {camps.length}</span><div className="flex gap-1">{Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-400"}`}>{i + 1}</button>)}</div></div>}
        </Card></FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Campaign Performance Overview" right={<ViewAll label="View Full Analytics" />}>{d.channelDonut.length === 0 ? <Empty msg="Run a campaign to see channel split." /> : <div className="flex items-center gap-3"><Donut segments={d.channelDonut.map((x) => ({ count: x.count, color: x.color }))} total={d.messagesSent} label="Sent" /><ul className="space-y-1.5 flex-1">{d.channelDonut.map((x) => <li key={x.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: x.color }} /><span className="text-slate-400 flex-1">{x.label}</span><span className="text-white font-bold">{kfmt(x.count)}</span></li>)}</ul></div>}</Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Top Performing Campaigns" right={<ViewAll label="View All" />}>{d.topPerforming.length === 0 ? <Empty msg="No data yet." /> : <ul className="space-y-2">{d.topPerforming.map((c, i) => <li key={c.id} className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-ink-800 text-[9px] font-bold text-slate-400 grid place-items-center">{i + 1}</span><span className="text-[11px] text-white flex-1 truncate">{c.name}</span><span className="text-[10px] text-emerald-400 font-bold">{c.replyRate}%</span><span className="text-[9px] text-slate-500">{c.meetings}m</span></li>)}</ul>}</Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Recent Campaign Activity">{d.recentActivity.length === 0 ? <Empty msg="No activity yet." /> : <ul className="space-y-2">{d.recentActivity.map((a, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" /><div><div className="text-[10px] text-slate-300">{a.label}</div><div className="text-[9px] text-slate-600">{ago(a.at)}</div></div></li>)}</ul>}</Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Campaign Channel Performance"><table className="w-full text-left"><thead><tr className="text-[8px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1 font-semibold">Channel</th><th className="font-semibold text-right">Sent</th><th className="font-semibold text-right">Deliv.</th><th className="font-semibold text-right">Open</th><th className="font-semibold text-right">Reply</th><th className="font-semibold text-right">Mtgs</th></tr></thead><tbody>{d.channelPerformance.map((c) => { const m = CH_ICON[c.channel]; return <tr key={c.channel} className="border-b border-ink-900"><td className="py-1.5 flex items-center gap-1.5">{m && <span style={{ color: m.color }}><m.Icon className="w-3 h-3" /></span>}<span className="text-[10px] text-white">{c.channel}</span></td><td className="text-right text-[10px] text-slate-300">{kfmt(c.sent)}</td><td className="text-right text-[10px] text-slate-400">{kfmt(c.delivered)}</td><td className="text-right text-[10px] text-slate-400">{c.openRate}%</td><td className="text-right text-[10px] text-slate-400">{c.replyRate}%</td><td className="text-right text-[10px] text-slate-400">{c.meetings}</td></tr>; })}</tbody></table></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Campaign Goals" right={<ViewAll label="View All Goals" />}><ul className="space-y-3">{d.goals.map((g) => <li key={g.label}><div className="flex justify-between text-[11px] mb-1"><span className="text-slate-300">{g.label}</span><span className="text-white font-bold">{g.pct}%</span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-emerald-500" initial={{ width: 0 }} animate={{ width: `${g.pct}%` }} transition={{ duration: 0.7 }} /></div><div className="text-[9px] text-slate-500 mt-0.5">{g.label.includes("revenue") ? `AED ${kfmt(g.current)} / AED ${kfmt(g.target)}` : `${kfmt(g.current)} / ${kfmt(g.target)}`}</div></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.1}><Card title="AI Campaign Insights" right={<ViewAll label="View All Insights" />}><ul className="space-y-2.5">{d.insights.map((s, i) => <li key={i} className="flex items-start gap-2"><Sparkles className="w-3.5 h-3.5 text-brand-300 mt-0.5 shrink-0" /><span className="text-[11px] text-slate-300">{s}</span></li>)}</ul></Card></FadeUp>
      </div>
    </div>
  );
}

function NewCampaignModal({ categories, types, onClose, onDone }: { categories: string[]; types: string[]; onClose: () => void; onDone: (m: string) => void }) {
  const [f, setF] = useState({ name: "", description: "", type: types[0] || "Outreach", targetCategory: "All Categories" });
  const [channels, setChannels] = useState<string[]>(["WhatsApp", "Email"]);
  const [busy, setBusy] = useState(false);
  const toggle = (c: string) => setChannels((s) => s.includes(c) ? s.filter((x) => x !== c) : [...s, c]);
  const submit = async () => { if (!f.name.trim()) return; setBusy(true); try { const r = await createCampaign({ ...f, channels }); onDone(r.ok ? `✓ Campaign "${f.name}" created.` : (r.message || "Failed.")); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-white">New Campaign</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button></div>
        <div className="space-y-2">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Campaign name *" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-10 text-[12px] text-white" />
          <div className="grid grid-cols-2 gap-2">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="rounded-lg border border-ink-700 bg-ink-950 px-2 h-10 text-[12px] text-slate-300">{types.map((t) => <option key={t}>{t}</option>)}</select>
            <select value={f.targetCategory} onChange={(e) => setF({ ...f, targetCategory: e.target.value })} className="rounded-lg border border-ink-700 bg-ink-950 px-2 h-10 text-[12px] text-slate-300">{["All Categories", ...categories].map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div><label className="block text-[10px] text-slate-500 mb-1.5">Channels</label><div className="flex gap-1.5 flex-wrap">{["WhatsApp", "Email", "SMS"].map((c) => { const m = CH_ICON[c]; const on = channels.includes(c); return <button key={c} onClick={() => toggle(c)} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${on ? "border-brand-500 bg-brand-500/10 text-white" : "border-ink-700 text-slate-400"}`}>{m && <m.Icon className="w-3.5 h-3.5" style={{ color: on ? m.color : undefined }} />}{c}</button>; })}</div></div>
          <button onClick={submit} disabled={busy || !f.name.trim()} className="w-full h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Campaign"}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- WHATSAPP OUTREACH (live inbox) ------------------------------- */
function Tick({ status, error }: { status: string; error?: string }) {
  if (status === "Queued") return <Clock className="w-3 h-3 text-slate-400" />;
  if (status === "Failed") return <span title={error || "Send failed"} className="inline-flex"><X className="w-3 h-3 text-rose-400" /></span>;
  if (status === "Read") return <CheckCheck className="w-3 h-3 text-sky-300" />;
  if (status === "Delivered") return <CheckCheck className="w-3 h-3 text-slate-400" />;
  return <Check className="w-3 h-3 text-slate-400" />;
}
function WhatsAppTab({ flash }: { flash: (m: string) => void }) {
  const [inbox, setInbox] = useState<WhatsAppInbox | null>(null);
  const [sel, setSel] = useState<string>("");
  const [thread, setThread] = useState<WaMessage[]>([]);
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [within, setWithin] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const loadInbox = async () => { try { const r = await getWhatsAppInbox(); setInbox(r); if (!sel && r.conversations[0]) setSel(r.conversations[0].id); } catch { /* ignore */ } };
  const loadThread = async (id: string) => { try { const r = await getWaThread(id); if (r.ok) { setThread(r.messages || []); setLead(r.lead || null); setWithin(!!r.withinWindow); } } catch { /* ignore */ } };
  useEffect(() => { loadInbox(); const t = setInterval(loadInbox, 10000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (!sel) return; loadThread(sel); markWaRead(sel); const t = setInterval(() => loadThread(sel), 5000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [sel]);

  const send = async () => { if (!sel || !text.trim()) return; setBusy("send"); try { const r = await sendWaMessage(sel, text.trim()); if (r.ok) { setThread(r.messages || []); setText(""); flash(r.queued ? "📥 Queued — connect WhatsApp key to deliver." : "✓ WhatsApp sent."); loadInbox(); } else flash(r.message || "Failed."); } finally { setBusy(""); } };
  const aiWrite = async () => { if (!sel) return; setBusy("ai"); try { const r = await aiWaDraft(sel); if (r.ok && r.message) { setText(r.message); flash("✓ AI wrote a message — review & send."); } } finally { setBusy(""); } };
  const optOut = async () => { if (!sel) return; await setWaOptOut(sel, !(lead?.optOut)); loadThread(sel); loadInbox(); };
  const runDaily = async () => { setBusy("daily"); flash("🔎 Agent finding 10 rental companies + messaging them… (~30s)"); try { const r = await salesDailyRun(10); flash(r.ok ? `✓ Found ${r.found} ${r.category} companies, messaged ${r.outreached}.` : (r.message || "Failed.")); loadInbox(); } finally { setBusy(""); } };
  const aiReply = async () => { if (!sel) return; setBusy("aireply"); try { const r = await salesAutoReply(sel); if (r.ok) { loadThread(sel); flash(r.onboarded ? `🎉 They agreed — account created (${r.email})!` : `✓ Agent answered (${r.intent}).`); loadInbox(); } else flash(r.message || "Failed."); } finally { setBusy(""); } };
  const onboard = async () => { if (!sel) return; setBusy("onboard"); try { const r = await salesOnboard(sel); if (r.ok) { loadThread(sel); flash(r.created ? `🎉 Account created — ${r.email} (login + temp password sent).` : `Already onboarded (${r.email}).`); loadInbox(); } else flash(r.message || "Failed."); } finally { setBusy(""); } };
  const move = async (stage: string) => { if (!sel) return; await salesMoveStage(sel, stage); loadThread(sel); loadInbox(); flash(`Moved to ${stage}.`); };

  if (!inbox) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = inbox.kpis;
  const kpis = [
    { label: "Messages Sent", value: kfmt(k.messagesSent), trend: k.sentTrend, icon: Send, color: "#34d399" },
    { label: "Delivered", value: kfmt(k.delivered), trend: k.deliveredTrend, icon: CheckCheck, color: "#38bdf8" },
    { label: "Read", value: kfmt(k.read), trend: k.readTrend, icon: Eye, color: "#a78bfa" },
    { label: "Replied", value: kfmt(k.replied), trend: k.repliedTrend, icon: MessageCircle, color: "#fbbf24" },
    { label: "Meetings Booked", value: kfmt(k.meetingsBooked), trend: k.meetingsTrend, icon: Calendar, color: "#8b5cf6" },
    { label: "Reply Rate", value: `${k.replyRate}%`, trend: k.replyTrend, icon: Target, color: "#10b981" },
    { label: "Opt-outs", value: kfmt(k.optOuts), trend: k.optOutsTrend, icon: X, color: "#fb7185" },
  ];
  let convs = inbox.conversations;
  if (filter === "Unread") convs = convs.filter((c) => c.unread > 0);
  else if (filter === "Replied") convs = convs.filter((c) => c.status === "Replied");
  else if (filter === "Pending") convs = convs.filter((c) => c.status === "Pending");
  if (q) convs = convs.filter((c) => c.company.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">WhatsApp Outreach</h2><p className="text-[12px] text-slate-500">Watch the agent work — it finds companies, answers like a human, and opens accounts on agreement. {inbox.whatsappConnected && inbox.whatsappLive !== false ? <span className="text-emerald-400">WhatsApp connected.</span> : inbox.whatsappConnected && inbox.whatsappLive === false ? <span className="text-red-400">⚠ {inbox.whatsappError || "WhatsApp token expired — sends are failing. Refresh WHATSAPP_TOKEN."}</span> : <span className="text-amber-400">Not connected — messages queue until you add the key.</span>}</p></div>
        <button onClick={runDaily} disabled={busy === "daily"} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy === "daily" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Run Daily (find 10 + message)</button>
      </div>

      <Stagger className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-4 h-[640px]">
        {/* conversation list */}
        <div className="rounded-2xl border border-ink-800 bg-ink-900/50 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-ink-800">
            <div className="relative mb-2"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-8 text-[12px] text-white focus:outline-none" /></div>
            <div className="flex gap-1">{["All", "Unread", "Replied", "Pending"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-2 py-0.5 rounded ${filter === f ? "bg-brand-600 text-white" : "text-slate-400"}`}>{f}</button>)}</div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">{convs.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full text-left px-3 py-2.5 border-b border-ink-900 flex items-center gap-2.5 ${sel === c.id ? "bg-brand-600/10" : "hover:bg-ink-900/40"}`}>
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center text-[11px] font-bold text-white shrink-0">{c.company.slice(0, 1)}</span>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><span className="text-[12px] font-semibold text-white truncate">{c.company}</span><span className="text-[8px] text-slate-600 shrink-0">{ago(c.lastAt)}</span></div><div className="text-[10px] text-slate-500 truncate">{c.lastMessage}</div></div>
              {c.unread > 0 && <span className="w-4 h-4 rounded-full bg-emerald-500 text-[8px] font-bold text-white grid place-items-center shrink-0">{c.unread}</span>}
            </button>
          ))}{convs.length === 0 && <div className="py-8 text-center text-[11px] text-slate-500">No conversations.</div>}</div>
        </div>

        {/* chat thread */}
        <div className="rounded-2xl border border-ink-800 bg-ink-900/50 flex flex-col overflow-hidden">
          {!lead ? <div className="flex-1 grid place-items-center text-[12px] text-slate-500">Select a conversation</div> : <>
            <div className="p-3 border-b border-ink-800 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center text-[11px] font-bold text-white">{lead.company.slice(0, 1)}</span>
              <div className="flex-1"><div className="flex items-center gap-2"><span className="text-[13px] font-bold text-white">{lead.company}</span>{lead.intent && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">{lead.intent}</span>}</div><div className="text-[10px] text-slate-500">{lead.category} · {lead.location}</div></div>
            </div>
            <div className="px-3 py-1.5 border-b border-ink-800 text-[10px] flex items-center justify-between"><span className={within ? "text-emerald-400" : "text-slate-500"}>{within ? "✓ Within the 24-hour messaging window" : "Outside 24h window — uses template (cold)"}</span></div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">{thread.map((m, i) => (
              <div key={i} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-xl px-3 py-2 text-[12px] ${m.direction === "out" ? "bg-emerald-600/25 border border-emerald-600/30 text-emerald-50" : "bg-ink-800 text-slate-200"}`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div className="flex items-center gap-1 justify-end mt-0.5 text-[8px] text-slate-400">{new Date(m.at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}{m.direction === "out" && <Tick status={m.status} error={m.error} />}{m.direction === "out" && m.status === "Queued" && <span className="text-[7px] text-amber-400">queued</span>}{m.direction === "out" && m.status === "Failed" && <span className="text-[7px] text-rose-400">failed</span>}</div>
                </div>
              </div>
            ))}{thread.length === 0 && <div className="text-center text-[11px] text-slate-600 py-8">No messages yet. Click <b className="text-slate-300">AI Write</b> to start.</div>}</div>
            <div className="p-3 border-t border-ink-800">
              <div className="flex items-end gap-2">
                <button onClick={aiWrite} disabled={!!busy} title="AI write (draft into box)" className="w-9 h-9 rounded-lg border border-ink-700 grid place-items-center text-brand-300 hover:bg-ink-800 disabled:opacity-50 shrink-0">{busy === "ai" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}</button>
                <button onClick={aiReply} disabled={!!busy} title="AI auto-reply (agent answers + sends, onboards if they agree)" className="h-9 px-2.5 rounded-lg border border-brand-500/40 bg-brand-500/10 grid place-items-center text-brand-200 hover:bg-brand-500/20 disabled:opacity-50 shrink-0 text-[11px] font-semibold inline-flex items-center gap-1">{busy === "aireply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-3.5 h-3.5" /> AI Reply</>}</button>
                <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type your message… (or AI write)" rows={1} className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-[12px] text-white resize-none max-h-24 focus:outline-none" />
                <button onClick={send} disabled={!!busy || !text.trim() || lead.optOut} className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 shrink-0">{busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
              </div>
              {lead.optOut && <div className="text-[10px] text-rose-400 mt-1">This lead opted out — messaging disabled.</div>}
              <div className="text-[9px] text-slate-600 mt-1 inline-flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Use AI to write a message — the agent drafts, you send.</div>
            </div>
          </>}
        </div>

        {/* profile + actions */}
        <div className="space-y-4 overflow-y-auto scrollbar-thin">
          {lead && <>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70">
              <div className="flex items-center gap-2 mb-2"><ScoreDot s={lead.leadScore} /><div><div className="text-[13px] font-bold text-white">{lead.company}</div><div className="text-[10px] text-slate-500">{lead.category} · Dubai</div></div></div>
              <div className="space-y-1 text-[11px]">{lead.phone && <div className="flex items-center gap-1.5 text-slate-300"><Phone className="w-3 h-3 text-slate-500" />{lead.phone}</div>}{lead.email && <div className="flex items-center gap-1.5 text-slate-300"><MailIcon className="w-3 h-3 text-slate-500" />{lead.email}</div>}<div className="text-slate-500">Revenue est: <b className="text-emerald-400">AED {kfmt(lead.revenuePotential)}</b>/yr</div><div className="text-slate-500">Source: {lead.source}</div></div>
              <select value={lead.stage} onChange={(e) => move(e.target.value)} className="w-full mt-2 text-[11px] bg-ink-950 border border-ink-700 rounded-lg h-8 px-2 text-slate-300">{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="text-[12px] font-bold text-white mb-2">Conversation Overview</div><div className="flex items-center gap-3"><Donut segments={inbox.overview.segments.map((s) => ({ count: s.count, color: s.color }))} total={inbox.overview.total} label="Convos" /><ul className="space-y-1.5 flex-1">{inbox.overview.segments.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span></li>)}</ul></div></div>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="text-[12px] font-bold text-white mb-2">Quick Actions</div><div className="space-y-1">
              <button onClick={onboard} disabled={busy === "onboard" || lead.stage === "Closed Won"} className="w-full flex items-center gap-2 text-[11px] text-emerald-300 hover:bg-emerald-500/10 rounded-lg px-2 py-1.5 disabled:opacity-50"><span className="w-3.5 h-3.5 grid place-items-center">{busy === "onboard" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}</span><span className="flex-1 text-left font-semibold">{lead.stage === "Closed Won" ? "Account created ✓" : "Create Account (send login)"}</span><ArrowRight className="w-3 h-3 text-slate-600" /></button>
              {([["Send Template", FileText], ["Schedule Follow-Up", Calendar], ["Create Task", CheckCircle2], ["Book Meeting", Calendar], ["Add Note", StickyNote]] as [string, typeof Send][]).map(([l, I]) => <button key={l} onClick={() => move(l === "Book Meeting" ? "Meeting Scheduled" : l === "Send Template" ? "Outreach Sent" : lead.stage)} className="w-full flex items-center gap-2 text-[11px] text-slate-300 hover:text-white hover:bg-ink-800 rounded-lg px-2 py-1.5"><I className="w-3.5 h-3.5 text-slate-500" /><span className="flex-1 text-left">{l}</span><ArrowRight className="w-3 h-3 text-slate-600" /></button>)}<button onClick={optOut} className="w-full flex items-center gap-2 text-[11px] text-rose-400/80 hover:bg-ink-800 rounded-lg px-2 py-1.5"><X className="w-3.5 h-3.5" /><span className="flex-1 text-left">{lead.optOut ? "Remove opt-out" : "Mark opt-out"}</span></button></div></div>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="text-[12px] font-bold text-white mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Compliance & Limits</div><ul className="space-y-1.5 text-[11px]"><li className="flex justify-between"><span className="text-slate-400">Daily Limit</span><span className="text-white">{inbox.compliance.sentToday} / {inbox.compliance.dailyLimit}</span></li><li className="flex justify-between"><span className="text-slate-400">Quality Rating</span><span className="text-emerald-400 font-semibold">{inbox.compliance.qualityRating}</span></li><li className="flex justify-between"><span className="text-slate-400">Opt-out Rate</span><span className="text-white">{inbox.compliance.optOutRate}%</span></li></ul></div>
          </>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- EMAIL OUTREACH ------------------------------- */
function EmailLines({ data }: { data: EmailOutreach["analytics"] }) {
  const W = 520, H = 150, P = 24;
  const series = [{ k: "sent", c: "#8b5cf6" }, { k: "opened", c: "#34d399" }, { k: "clicked", c: "#38bdf8" }, { k: "replied", c: "#fbbf24" }] as const;
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
function EmailTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<EmailOutreach | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [statusF, setStatusF] = useState("All Campaigns");
  const [menuId, setMenuId] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER = 8;
  const load = async () => { setLoading(true); try { setD(await getEmailOutreach()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const run = async (id: string, name: string) => { setBusy(id); flash(`📧 Sending "${name}" emails to matching leads…`); try { const r = await runCampaign(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed.")); load(); } finally { setBusy(""); } };
  const toggle = async (id: string, status: string) => { setBusy(id); try { await setCampaignStatus(id, status); load(); } finally { setBusy(""); } };
  const del = async (id: string) => { setBusy(id); try { await deleteCampaign(id); flash("Deleted."); load(); } finally { setBusy(""); } };
  if (loading || !d) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Emails Sent", value: kfmt(k.emailsSent), trend: k.sentTrend, icon: MailIcon, color: "#8b5cf6" },
    { label: "Open Rate", value: `${k.openRate}%`, trend: k.openTrend, icon: Eye, color: "#34d399" },
    { label: "Click Rate", value: `${k.clickRate}%`, trend: k.clickTrend, icon: Target, color: "#38bdf8" },
    { label: "Reply Rate", value: `${k.replyRate}%`, trend: k.replyTrend, icon: MessageCircle, color: "#fbbf24" },
    { label: "Meetings Booked", value: kfmt(k.meetingsBooked), trend: k.meetingsTrend, icon: Calendar, color: "#a78bfa" },
    { label: "Bounced", value: kfmt(k.bounced), trend: k.bounceTrend, icon: X, color: "#fb7185" },
  ];
  const STATUSES = ["All Campaigns", "Draft", "Scheduled", "Active", "Paused", "Completed"];
  let camps = d.campaigns;
  if (statusF !== "All Campaigns") camps = camps.filter((c) => c.status === statusF);
  const pages = Math.max(1, Math.ceil(camps.length / PER));
  const pageRows = camps.slice((page - 1) * PER, page * PER);
  const RATING_TONE: Record<string, string> = { Excellent: "bg-emerald-500/15 text-emerald-300", Good: "bg-sky-500/15 text-sky-300", Fair: "bg-amber-500/15 text-amber-300", Poor: "bg-rose-500/15 text-rose-300" };

  return (
    <div className="space-y-5">
      {newOpen && <NewCampaignModal categories={d.categories} types={d.types} onClose={() => setNewOpen(false)} onDone={(m) => { flash(m); setNewOpen(false); load(); }} />}
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Email Outreach</h2><p className="text-[12px] text-slate-500">Create, manage and track email campaigns to reach providers and convert them into partners. {d.emailConnected ? <span className="text-emerald-400">Email connected.</span> : <span className="text-amber-400">Mailer not configured.</span>}</p></div><button onClick={() => setNewOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> New Email Campaign</button></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp><Card title="Campaigns">
          <div className="flex gap-1 mb-3 flex-wrap">{STATUSES.map((s) => <button key={s} onClick={() => { setStatusF(s); setPage(1); }} className={`text-[10px] px-2.5 py-1 rounded-lg border ${statusF === s ? "border-brand-500 text-brand-300 bg-brand-500/10" : "border-ink-700 text-slate-400"}`}>{s === "All Campaigns" ? "All" : s}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[820px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Campaign</th><th className="font-semibold">Type</th><th className="font-semibold">Target Category</th><th className="font-semibold text-right">Recipients</th><th className="font-semibold text-right">Sent</th><th className="font-semibold text-right">Open Rate</th><th className="font-semibold text-right">Click Rate</th><th className="font-semibold text-right">Reply Rate</th><th className="font-semibold text-right">Meetings</th><th className="font-semibold">Status</th><th className="font-semibold text-right">Actions</th></tr></thead>
            <tbody>{pageRows.map((c) => { const ti = CAMP_ICON[c.type] || CAMP_ICON.Outreach; const TI = ti.Icon; const clickRate = c.sent ? Math.round(c.openRate * 0.23 * 10) / 10 : 0; return (
              <tr key={c.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                <td className="py-2.5"><div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: ti.color }}><TI className="w-4 h-4" /></span><div className="min-w-0"><div className="text-[11px] font-semibold text-white truncate max-w-[150px]">{c.name}</div><div className="text-[9px] text-slate-500 truncate max-w-[150px]">{c.description}</div></div></div></td>
                <td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CAMP_TYPE_TONE[c.type] || ""}`}>{c.type}</span></td>
                <td className="text-[10px] text-slate-400">{c.targetCategory}</td>
                <td className="text-right text-[11px] text-slate-300 tabular-nums">{kfmt(c.recipients)}</td><td className="text-right text-[11px] text-slate-300 tabular-nums">{c.sent ? kfmt(c.sent) : "—"}</td>
                <td className="text-right text-[10px] text-slate-400">{c.sent ? `${c.openRate}%` : "—"}</td><td className="text-right text-[10px] text-slate-400">{c.sent ? `${clickRate}%` : "—"}</td><td className="text-right text-[10px] text-slate-400">{c.sent ? `${c.replyRate}%` : "—"}</td><td className="text-right text-[10px] text-slate-400">{c.meetings || "—"}</td>
                <td><span className={`text-[10px] font-semibold ${CAMP_STATUS_TONE[c.status]}`}>● {c.status}</span></td>
                <td className="text-right relative">
                  <button onClick={() => setMenuId(menuId === c.id ? "" : c.id)} className="w-7 h-7 rounded-lg grid place-items-center text-slate-500 hover:text-white hover:bg-ink-800 ml-auto">{busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}</button>
                  {menuId === c.id && <>
                    <button className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuId("")} />
                    <div className="absolute right-0 top-full z-30 mt-1 w-36 rounded-lg border border-ink-700 bg-ink-900 shadow-xl py-1 text-left">
                      <button onClick={() => { setMenuId(""); run(c.id, c.name); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-emerald-300 hover:bg-ink-800"><Send className="w-3.5 h-3.5" /> Send emails</button>
                      {c.status === "Active" ? <button onClick={() => { setMenuId(""); toggle(c.id, "Paused"); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-300 hover:bg-ink-800"><Pause className="w-3.5 h-3.5" /> Pause</button> : <button onClick={() => { setMenuId(""); toggle(c.id, "Active"); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-ink-800"><Play className="w-3.5 h-3.5" /> Activate</button>}
                      <button onClick={() => { setMenuId(""); del(c.id); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-rose-300 hover:bg-ink-800"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    </div>
                  </>}
                </td>
              </tr>
            ); })}{pageRows.length === 0 && <tr><td colSpan={11} className="py-6 text-center text-[11px] text-slate-500">No email campaigns.</td></tr>}</tbody></table></div>
          {pages > 1 && <div className="flex items-center justify-between mt-3"><span className="text-[10px] text-slate-500">Showing {(page - 1) * PER + 1}–{Math.min(page * PER, camps.length)} of {camps.length}</span><div className="flex gap-1">{Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-400"}`}>{i + 1}</button>)}</div></div>}
        </Card></FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Email Performance Overview" right={<ViewAll />}>{d.performanceOverview.total === 0 ? <Empty msg="Send emails to see the breakdown." /> : <div className="flex items-center gap-3"><Donut segments={d.performanceOverview.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.performanceOverview.total} label="Sent" /><ul className="space-y-1 flex-1">{d.performanceOverview.segments.map((s) => <li key={s.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{kfmt(s.count)}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul></div>}</Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Top Performing Campaigns" right={<ViewAll label="View All Performance" />}>{d.topPerforming.length === 0 ? <Empty msg="No data yet." /> : <ul className="space-y-2">{d.topPerforming.map((c, i) => <li key={i} className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-ink-800 text-[9px] font-bold text-slate-400 grid place-items-center">{i + 1}</span><span className="text-[11px] text-white flex-1 truncate">{c.name}</span><span className="text-[10px] text-emerald-400 font-bold">{c.openRate}%</span><span className="text-[9px] text-slate-500">{c.replyRate}%</span></li>)}</ul>}</Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Recent Email Activity">{d.recentActivity.length === 0 ? <Empty msg="No activity yet." /> : <ul className="space-y-2">{d.recentActivity.map((a, i) => <li key={i} className="flex items-start gap-2"><MailIcon className="w-3 h-3 text-slate-500 mt-1 shrink-0" /><div><div className="text-[10px] text-slate-300">{a.label}</div><div className="text-[9px] text-slate-600">{ago(a.at)}</div></div></li>)}</ul>}</Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Email Templates" right={<ViewAll label="View All Templates" />}><ul className="space-y-1.5">{d.templates.map((t) => <li key={t.name} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2"><MailIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{t.name}</div><div className="text-[9px] text-slate-500 truncate">{t.desc}</div></div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CAMP_TYPE_TONE[t.type] || "bg-slate-500/15 text-slate-300"}`}>{t.type}</span></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Email Analytics" sub="Last 7 days" right={<div className="flex gap-2 text-[8px]"><span className="text-violet-400">●Sent</span><span className="text-emerald-400">●Open</span><span className="text-sky-400">●Click</span><span className="text-amber-400">●Reply</span></div>}><EmailLines data={d.analytics} /></Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Email Health" right={<ViewAll label="View Email Health Report" />}><ul className="space-y-3">{d.health.map((h) => <li key={h.label} className="flex items-center justify-between"><span className="text-[11px] text-slate-300">{h.label}</span><span className="flex items-center gap-2"><span className="text-[12px] font-bold text-white">{h.value}{h.unit}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${RATING_TONE[h.rating] || ""}`}>{h.rating}</span></span></li>)}</ul></Card></FadeUp>
      </div>
    </div>
  );
}

/* ------------------------------- FOLLOW-UP AUTOMATION ------------------------------- */
const STEP_ICON: Record<string, { Icon: typeof Send; color: string }> = { Email: { Icon: MailIcon, color: "#8b5cf6" }, WhatsApp: { Icon: MessageCircle, color: "#34d399" }, Call: { Icon: Phone, color: "#38bdf8" }, Task: { Icon: CheckCircle2, color: "#fbbf24" }, End: { Icon: Flame, color: "#fb7185" } };
function FollowUpTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<FollowUpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sel, setSel] = useState("");
  const [q, setQ] = useState("");
  const [sub, setSub] = useState("Sequences");
  const load = async (s = sel) => { setLoading(true); try { const r = await getFollowUpData(s); setD(r); if (!sel) setSel(r.selectedId); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const pick = async (id: string) => { setSel(id); load(id); };
  const runNow = async () => { setBusy("run"); flash("⚙️ Running due sequence steps…"); try { const r = await runSequences(); flash(`✓ ${r.executed} step(s) sent, ${r.completed} completed.`); load(sel); } finally { setBusy(""); } };
  const newSeq = async () => { const name = window.prompt("New sequence name:"); if (!name) return; setBusy("new"); try { const r = await createSequence({ name }); flash(r.ok ? `✓ Sequence "${name}" created (Draft).` : "Failed."); load(); } finally { setBusy(""); } };
  const toggle = async (id: string, status: string) => { setBusy(id); try { await toggleSequence(id, status); load(sel); } finally { setBusy(""); } };
  const addStep = async () => { if (!sel) return; const title = window.prompt("Step title:"); if (!title) return; const type = window.prompt("Type (Email/WhatsApp/Call/Task):", "Email") || "Email"; setBusy("step"); try { await addSequenceStep(sel, { title, type }); flash("✓ Step added."); load(sel); } finally { setBusy(""); } };
  const delSeq = async (id: string) => { if (!window.confirm("Delete this sequence?")) return; setBusy(id); try { await deleteSequence(id); setSel(""); load(""); flash("Deleted."); } finally { setBusy(""); } };
  if (loading || !d) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Active Sequences", value: kfmt(k.activeSequences), trend: k.activeTrend, icon: Send, color: "#8b5cf6" },
    { label: "Due Today", value: kfmt(k.dueToday), trend: k.dueTrend, icon: MailIcon, color: "#38bdf8" },
    { label: "Completed (This Week)", value: kfmt(k.completedThisWeek), trend: k.completedTrend, icon: CheckCircle2, color: "#34d399" },
    { label: "Replied (This Week)", value: kfmt(k.repliedThisWeek), trend: k.repliedTrend, icon: MessageCircle, color: "#fbbf24" },
    { label: "Meetings Booked", value: kfmt(k.meetingsBooked), trend: k.meetingsTrend, icon: Calendar, color: "#a78bfa" },
    { label: "Converted to Partners", value: kfmt(k.convertedToPartners), trend: k.convertedTrend, icon: DollarSign, color: "#10b981" },
  ];
  const seqs = d.sequences.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Follow-Up Automation</h2><p className="text-[12px] text-slate-500">Create automated follow-up sequences and never miss a follow-up opportunity.</p></div><div className="flex gap-2"><button onClick={runNow} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] disabled:opacity-50">{busy === "run" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Run due steps</button><button onClick={newSeq} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> New Follow-Up Sequence</button></div></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="flex gap-1 border-b border-ink-800 overflow-x-auto scrollbar-thin">{["Sequences", "Due Today", "Upcoming", "Completed", "Settings"].map((s) => <button key={s} onClick={() => setSub(s)} className={`relative px-3 py-2 text-[12px] font-medium whitespace-nowrap ${sub === s ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{s}{sub === s && <motion.span layoutId="fuSub" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_300px] gap-5">
        {/* sequences list */}
        <FadeUp><Card title="Follow-Up Sequences">
          <div className="relative mb-2"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sequences…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-8 text-[12px] text-white focus:outline-none" /></div>
          <ul className="space-y-1.5">{seqs.map((s) => (
            <li key={s.id} onClick={() => pick(s.id)} className={`rounded-lg border px-2.5 py-2 cursor-pointer ${sel === s.id ? "border-brand-500/50 bg-brand-500/5" : "border-ink-800 bg-ink-950/40 hover:border-ink-700"}`}>
              <div className="flex items-center justify-between gap-1"><span className="text-[11px] font-semibold text-white truncate">{s.name}</span><span className={`text-[8px] font-bold ${s.status === "Active" ? "text-emerald-400" : s.status === "Paused" ? "text-amber-400" : "text-slate-500"}`}>● {s.status}</span></div>
              <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5"><span>{s.stepCount} Steps</span><span>· {s.totalLeads} leads</span><span className="text-emerald-400">· {s.replyRate}%</span></div>
            </li>
          ))}</ul>
        </Card></FadeUp>

        {/* sequence detail */}
        <FadeUp delay={0.05}><Card title={d.detail?.name || "Sequence"} sub={d.detail?.description} right={d.detail && <div className="flex items-center gap-2"><span className={`text-[9px] font-bold ${d.detail.status === "Active" ? "text-emerald-400" : "text-amber-400"}`}>● {d.detail.status}</span>{d.detail.status === "Active" ? <button onClick={() => toggle(d.detail!.id, "Paused")} className="text-slate-500 hover:text-amber-400"><Pause className="w-3.5 h-3.5" /></button> : <button onClick={() => toggle(d.detail!.id, "Active")} className="text-slate-500 hover:text-emerald-400"><Play className="w-3.5 h-3.5" /></button>}<button onClick={() => delSeq(d.detail!.id)} className="text-slate-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button></div>}>
          {!d.detail ? <Empty msg="Select a sequence." /> : <>
            <div className="grid grid-cols-3 gap-2 mb-3"><div className="rounded-lg bg-ink-950/40 border border-ink-800 p-2 text-center"><div className="text-base font-bold text-white">{kfmt(d.detail.totalLeads)}</div><div className="text-[8px] text-slate-500">Total Leads</div></div><div className="rounded-lg bg-ink-950/40 border border-ink-800 p-2 text-center"><div className="text-base font-bold text-emerald-400">{d.detail.replyRate}%</div><div className="text-[8px] text-slate-500">Reply Rate</div></div><div className="rounded-lg bg-ink-950/40 border border-ink-800 p-2 text-center"><div className="text-base font-bold text-white">{d.detail.meetings}</div><div className="text-[8px] text-slate-500">Meetings</div></div></div>
            <ul className="space-y-2">{d.detail.stepRows.map((st, i) => { const m = STEP_ICON[st.type] || STEP_ICON.Email; const M = m.Icon; return (
              <li key={i} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center"><span className="w-9 h-9 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m.color }}><M className="w-4 h-4" /></span>{i < d.detail!.stepRows.length - 1 && <span className="w-px flex-1 bg-ink-700 my-1" style={{ minHeight: 16 }} />}</div>
                <div className="flex-1 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2">
                  <div className="flex items-center justify-between"><div><div className="text-[9px] text-slate-500">Step {st.order} · Day {st.day}</div><div className="text-[12px] font-semibold text-white">{st.title}</div><div className="text-[10px] text-slate-500">{st.description}</div></div>
                    {st.type !== "End" && <div className="text-right text-[9px] text-slate-500"><div><b className="text-slate-300">{st.sent}</b> {st.type === "Call" ? "Tasks" : "Sent"}</div><div>{st.openedRate}% {st.type === "WhatsApp" ? "Delivered" : "Opened"}</div><div>{st.repliedRate}% Replied</div></div>}</div>
                </div>
              </li>
            ); })}</ul>
            <button onClick={addStep} disabled={!!busy} className="w-full mt-3 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-ink-700 text-slate-400 text-[12px] hover:text-white hover:border-ink-600"><Plus className="w-4 h-4" /> Add Step</button>
          </>}
        </Card></FadeUp>

        {/* right column */}
        <div className="space-y-5">
          <FadeUp><Card title="Sequence Performance"><div className="flex items-center gap-3"><div className="relative"><Donut segments={d.performance.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.performance.segments.reduce((a, b) => a + b.count, 0)} label="Reply Rate" /><div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center mt-1"><div className="text-base font-extrabold text-brand-300">{d.performance.replyRate}%</div></div></div></div><ul className="space-y-1.5 flex-1">{d.performance.segments.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.pct}%</span><span className="text-slate-600">({s.count})</span></li>)}</ul></div></Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Upcoming Follow-Ups" right={<ViewAll />}>{d.upcoming.length === 0 ? <Empty msg="No upcoming steps. Enroll leads to start." /> : <ul className="space-y-2">{d.upcoming.map((u) => { const m = STEP_ICON[u.stepType] || STEP_ICON.Email; const M = m.Icon; return (
            <li key={u.id} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center shrink-0" style={{ color: m.color }}><M className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[11px] text-white truncate">{u.company}</div><div className="text-[9px] text-slate-500">{u.stepTitle} (Step {u.stepNo})</div></div><span className="text-[9px] text-slate-500">{ago(u.at)}</span></li>
          ); })}</ul>}</Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Automation Rules" right={<button className="text-[10px] text-brand-400 font-semibold">Edit Rules</button>}><ul className="space-y-2">{d.rules.map((r) => <li key={r.label} className="flex items-center justify-between text-[11px]"><span className="inline-flex items-center gap-1.5 text-slate-300"><CheckCircle2 className="w-3 h-3 text-emerald-400" />{r.label}</span><span className="text-slate-400 font-semibold">{r.value}</span></li>)}</ul></Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- HOT LEADS ------------------------------- */
const INTENT_TONE: Record<string, string> = { "Very High Intent": "bg-rose-500/15 text-rose-300", "High Intent": "bg-amber-500/15 text-amber-300", "Medium Intent": "bg-sky-500/15 text-sky-300", "Low Intent": "bg-slate-500/15 text-slate-400" };
const PRIO_TONE2: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-400" };
function HotLeadsTab({ flash, openLead }: { flash: (m: string) => void; openLead: (l: SalesLead) => void }) {
  const [d, setD] = useState<HotLeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sel, setSel] = useState("");
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const load = async (s = sel) => { setLoading(true); try { const r = await getHotLeads(s); setD(r); if (!sel) setSel(r.selectedId); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const pick = (id: string) => { setSel(id); load(id); };
  const act = async (channel: string) => { if (!sel || !d?.detail) return; setBusy(channel); try {
    if (channel === "whatsapp" || channel === "email") { const r = await salesOutreach(sel, { channel: channel === "whatsapp" ? "WhatsApp" : "Email" }); flash(r.ok ? `✓ ${channel} sent to ${d.detail.company}.` : (r.message || "Failed") + (r.needsConnection ? " — connect channel" : "")); }
    else if (channel === "proposal") { await salesMoveStage(sel, "Proposal Sent"); flash("✓ Moved to Proposal Sent."); }
    else if (channel === "call") { await salesMoveStage(sel, "Meeting Scheduled"); flash("✓ Meeting scheduled."); }
    load(sel);
  } finally { setBusy(""); } };
  if (loading || !d) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Total Hot Leads", value: kfmt(k.totalHot), trend: k.totalTrend, icon: Flame, color: "#fb7185" },
    { label: "High Intent Leads", value: kfmt(k.highIntent), trend: k.highTrend, icon: Target, color: "#38bdf8" },
    { label: "Needs Immediate Action", value: kfmt(k.immediate), trend: k.immediateTrend, icon: Zap, color: "#fbbf24" },
    { label: "Converted (This Week)", value: kfmt(k.convertedThisWeek), trend: k.convertedTrend, icon: CheckCircle2, color: "#34d399" },
    { label: "Revenue Potential", value: `AED ${kfmt(k.revenuePotential)}`, trend: k.revenueTrend, icon: DollarSign, color: "#8b5cf6" },
    { label: "Avg. Response Time", value: `${k.avgResponse}m`, trend: k.responseTrend, icon: Clock, color: "#a78bfa" },
  ];
  let list = d.list;
  if (tab !== "All") list = list.filter((l) => l.group === tab);
  if (q) list = list.filter((l) => l.company.toLowerCase().includes(q.toLowerCase()));
  const det = d.detail;
  const maxRev = Math.max(1, ...d.potentialRevenue.bands.map((b) => b.value));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Hot Leads</h2><p className="text-[12px] text-slate-500">Leads showing high intent and engagement. Prioritize and take action to convert faster.</p></div></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_290px] gap-5">
        {/* list */}
        <FadeUp><Card title="Hot Leads List">
          <div className="relative mb-2"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hot leads…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-8 text-[12px] text-white focus:outline-none" /></div>
          <div className="flex gap-1 mb-2 flex-wrap">{["All", "New", "Contacted", "In Progress", "Converted"].map((t) => <button key={t} onClick={() => setTab(t)} className={`text-[9px] px-1.5 py-1 rounded ${tab === t ? "bg-brand-600 text-white" : "text-slate-400 border border-ink-700"}`}>{t} ({d.tabs[t] || 0})</button>)}</div>
          <ul className="space-y-1.5 max-h-[460px] overflow-y-auto scrollbar-thin">{list.map((l) => (
            <li key={l.id} onClick={() => pick(l.id)} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer ${sel === l.id ? "border-brand-500/50 bg-brand-500/5" : "border-ink-800 bg-ink-950/40 hover:border-ink-700"}`}>
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-[10px] font-bold text-white shrink-0">{l.company.slice(0, 1)}</span>
              <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{l.company}</div><div className="text-[9px] text-slate-500 truncate">{l.category} · {l.location}</div></div>
              <div className="text-right shrink-0"><ScoreDot s={l.leadScore} /><div className="text-[8px] text-slate-600 mt-0.5">{ago(l.lastActivityAt)}</div></div>
            </li>
          ))}{list.length === 0 && <li className="py-6 text-center text-[11px] text-slate-500">No hot leads.</li>}</ul>
        </Card></FadeUp>

        {/* detail */}
        <FadeUp delay={0.05}><Card title="Lead Detail">
          {!det ? <Empty msg="Select a hot lead." /> : <>
            <div className="flex items-center gap-3 mb-3"><span className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-sm font-bold text-white">{det.company.slice(0, 1)}</span>
              <div className="flex-1"><div className="flex items-center gap-2"><span className="text-base font-bold text-white">{det.company}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${INTENT_TONE[det.intent]}`}>{det.intent}</span></div><div className="text-[11px] text-slate-500">{det.category} · {det.location}</div></div>
              <div className="text-right"><ScoreDot s={det.leadScore} /><div className="text-[8px] text-slate-600 mt-0.5">{ago(det.lastActivityAt)}</div></div>
            </div>
            <div className="flex gap-1.5 mb-3">
              {([["whatsapp", MessageCircle, "#34d399"], ["email", MailIcon, "#8b5cf6"], ["call", Phone, "#38bdf8"], ["proposal", FileText, "#fbbf24"]] as [string, typeof Send, string][]).map(([c, I, col]) => <button key={c} onClick={() => act(c)} disabled={!!busy} title={c} className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center hover:bg-ink-700 disabled:opacity-50" style={{ color: col }}>{busy === c ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <I className="w-3.5 h-3.5" />}</button>)}
              <button onClick={() => openLead({ ...det } as unknown as SalesLead)} className="ml-auto text-[10px] text-brand-400 font-semibold">Full Profile →</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-[10px] font-bold text-slate-400 mb-1.5">Intent Signals</div><ul className="space-y-1">{det.signals.map((s, i) => <li key={i} className="flex items-start gap-1.5 text-[10px]"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /><span className="text-slate-300">{s.text}{!s.real && <span className="text-slate-600"> (est.)</span>}</span></li>)}</ul></div>
              <div><div className="text-[10px] font-bold text-slate-400 mb-1.5">Lead Information</div><ul className="space-y-1 text-[10px]">{([["Contact", det.info.contactPerson], ["Role", det.info.designation], ["Email", det.info.email], ["Phone", det.info.phone], ["Size", det.info.companySize], ["Deal", det.info.dealValue], ["Source", det.info.source]] as [string, string][]).map(([l, v]) => <li key={l} className="flex justify-between gap-2"><span className="text-slate-500">{l}</span><span className="text-slate-300 truncate text-right">{v}</span></li>)}</ul></div>
            </div>
            <div className="mt-3"><div className="text-[10px] font-bold text-slate-400 mb-1.5">Recommended Next Actions</div><ul className="space-y-1.5">{det.actions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-1.5"><span className="text-[11px] text-white flex-1">{a.title}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${PRIO_TONE2[a.priority]}`}>{a.priority}</span><button onClick={() => act(a.channel)} disabled={!!busy} className="text-[10px] font-semibold px-2 h-7 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white disabled:opacity-50">{a.action}</button></li>
            ))}</ul></div>
          </>}
        </Card></FadeUp>

        {/* right */}
        <div className="space-y-5">
          <FadeUp><Card title="Hot Leads Performance"><div className="flex items-center gap-3"><Donut segments={d.performance.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.performance.total} label="Hot Leads" /><ul className="space-y-1.5 flex-1">{d.performance.segments.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul></div></Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Top Sources" right={<ViewAll label="View Full Report" />}><ul className="space-y-2">{d.topSources.map((s) => <li key={s.source}><div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-300">{s.source}</span><span className="text-white font-bold">{s.count} <span className="text-slate-600">({s.pct}%)</span></span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${s.pct}%` }} /></div></li>)}</ul></Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Recent Activities" right={<ViewAll />}>{d.recentActivities.length === 0 ? <Empty msg="No activity." /> : <ul className="space-y-2">{d.recentActivities.map((a, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" /><div><div className="text-[10px] text-slate-300"><b className="text-white">{a.contact}</b> — {a.summary}</div><div className="text-[9px] text-slate-600">{a.company} · {ago(a.at)}</div></div></li>)}</ul>}</Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Lead Score Distribution"><div className="flex items-center gap-3"><Donut segments={d.scoreDistribution.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.scoreDistribution.total} label="Total" /><ul className="space-y-1.5 flex-1">{d.scoreDistribution.segments.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span></li>)}</ul></div></Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Potential Revenue"><div className="text-2xl font-extrabold text-white mb-2">AED {kfmt(d.potentialRevenue.total)}</div><ul className="space-y-2">{d.potentialRevenue.bands.map((b) => <li key={b.label}><div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-300">{b.label}</span><span className="text-white font-bold">AED {kfmt(b.value)}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-emerald-500 to-brand-500" initial={{ width: 0 }} animate={{ width: `${(b.value / maxRev) * 100}%` }} transition={{ duration: 0.7 }} /></div></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.1}><Card title="AI Insight" right={<span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">BETA</span>}><p className="text-[12px] text-slate-300 leading-relaxed">{d.aiInsight}</p><button className="mt-3 text-[11px] font-semibold text-brand-400">View AI Recommendations →</button></Card></FadeUp>
      </div>
    </div>
  );
}

/* ------------------------------- CRM ------------------------------- */
const CRM_STATUS_TONE: Record<string, string> = { "Hot Lead": "bg-rose-500/15 text-rose-300", "In Progress": "bg-sky-500/15 text-sky-300", "Follow Up": "bg-violet-500/15 text-violet-300", New: "bg-emerald-500/15 text-emerald-300", Cold: "bg-slate-500/15 text-slate-400" };
const DEAL_TONE: Record<string, string> = { Won: "bg-emerald-500/15 text-emerald-300", "Proposal Sent": "bg-amber-500/15 text-amber-300", Negotiation: "bg-violet-500/15 text-violet-300", Qualified: "bg-sky-500/15 text-sky-300", Open: "bg-slate-500/15 text-slate-300" };
function CRMTab({ flash, openLead }: { flash: (m: string) => void; openLead: (l: SalesLead) => void }) {
  const [d, setD] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sel, setSel] = useState("");
  const [view, setView] = useState("Contacts");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PER = 10;
  const load = async (s = sel) => { setLoading(true); try { const r = await getCRM(s); setD(r); if (!sel) setSel(r.selectedId); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const pick = (id: string) => { setSel(id); load(id); };
  const act = async (channel: string) => { if (!sel || !d?.detail) return; setBusy(channel); try {
    if (channel === "whatsapp" || channel === "email") { const r = await salesOutreach(sel, { channel: channel === "whatsapp" ? "WhatsApp" : "Email" }); flash(r.ok ? `✓ ${channel} sent.` : (r.message || "Failed") + (r.needsConnection ? " — connect channel" : "")); }
    else if (channel === "call") { await salesMoveStage(sel, "Meeting Scheduled"); flash("✓ Meeting scheduled."); }
    load(sel);
  } finally { setBusy(""); } };
  if (loading || !d) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Total Contacts", value: kfmt(k.totalContacts), trend: k.contactsTrend, icon: Users, color: "#8b5cf6" },
    { label: "Companies", value: kfmt(k.companies), trend: k.companiesTrend, icon: Briefcase, color: "#34d399" },
    { label: "Deals", value: kfmt(k.deals), trend: k.dealsTrend, icon: DollarSign, color: "#38bdf8" },
    { label: "Open Deals Value", value: `AED ${kfmt(k.openDealsValue)}`, trend: k.openTrend, icon: Target, color: "#fbbf24" },
    { label: "Won Deals Value", value: `AED ${kfmt(k.wonDealsValue)}`, trend: k.wonTrend, icon: CheckCircle2, color: "#10b981" },
    { label: "Conversion Rate", value: `${k.conversionRate}%`, trend: k.conversionTrend, icon: Zap, color: "#a78bfa" },
  ];
  let contacts = d.contacts;
  if (q) contacts = contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase()));
  const pages = Math.max(1, Math.ceil(contacts.length / PER));
  const pageRows = contacts.slice((page - 1) * PER, page * PER);
  const det = d.detail;
  const maxScore = Math.max(1, ...d.scoreDistribution.map((s) => s.count));
  const maxFunnel = Math.max(1, ...d.conversionFunnel.map((f) => f.count));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">CRM</h2><p className="text-[12px] text-slate-500">Manage all your contacts, companies, deals, and interactions in one place.</p></div><button className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add New Contact</button></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{kpis.map((c) => { const Ico = c.icon; return (
        <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-lg font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
      ); })}</Stagger>

      <div className="flex gap-1 border-b border-ink-800 overflow-x-auto scrollbar-thin">{["Contacts", "Companies", "Deals", "Activities", "Tasks"].map((v) => <button key={v} onClick={() => setView(v)} className={`relative px-3 py-2 text-[12px] font-medium whitespace-nowrap ${view === v ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{v}{view === v && <motion.span layoutId="crmSub" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp><Card title={view}>
          {view === "Contacts" ? <>
            <div className="flex items-center gap-2 mb-3"><div className="relative flex-1"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-9 text-[12px] text-white focus:outline-none" /></div><button className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg border border-ink-700 text-slate-400 text-[11px]"><Download className="w-3.5 h-3.5" /> Import</button></div>
            <div className="overflow-x-auto"><table className="w-full text-left min-w-[820px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Contact</th><th className="font-semibold">Company</th><th className="font-semibold">Email</th><th className="font-semibold text-center">Score</th><th className="font-semibold">Status</th><th className="font-semibold">Last</th><th className="font-semibold">Tags</th></tr></thead>
              <tbody>{pageRows.map((c) => (
                <tr key={c.id} onClick={() => pick(c.id)} className={`border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer ${sel === c.id ? "bg-brand-600/10" : ""}`}>
                  <td className="py-2"><div className="flex items-center gap-2"><Avatar name={c.name} /><div className="min-w-0"><div className="text-[11px] font-semibold text-white truncate max-w-[120px]">{c.name}</div><div className="text-[9px] text-slate-500 truncate">{c.role}</div></div></div></td>
                  <td className="text-[10px] text-slate-300 truncate max-w-[110px]">{c.company}</td><td className="text-[10px] text-slate-500 truncate max-w-[120px]">{c.email}</td>
                  <td className="text-center"><ScoreDot s={c.leadScore} /></td><td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CRM_STATUS_TONE[c.status]}`}>{c.status}</span></td>
                  <td className="text-[9px] text-slate-500">{ago(c.lastActivityAt)}</td>
                  <td><div className="flex gap-1 flex-wrap">{c.tags.slice(0, 2).map((t) => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-ink-800 text-slate-400">{t}</span>)}</div></td>
                </tr>
              ))}{pageRows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-[11px] text-slate-500">No contacts.</td></tr>}</tbody></table></div>
            {pages > 1 && <div className="flex items-center justify-between mt-3"><span className="text-[10px] text-slate-500">Showing {(page - 1) * PER + 1}–{Math.min(page * PER, contacts.length)} of {contacts.length}</span><div className="flex gap-1">{Array.from({ length: Math.min(pages, 6) }, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-700 text-slate-400"}`}>{i + 1}</button>)}</div></div>}
          </> : view === "Companies" ? <ul className="space-y-2">{d.companies.map((c) => <li key={c.company} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><span className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center text-slate-400"><Briefcase className="w-4 h-4" /></span><div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-white truncate">{c.company}</div><div className="text-[9px] text-slate-500">{c.category} · {c.contacts} contact(s)</div></div><div className="text-right"><div className="text-[11px] font-bold text-emerald-400">AED {kfmt(c.value)}</div><div className="text-[8px] text-slate-500">score {c.topScore}</div></div></li>)}</ul>
          : view === "Deals" ? (d.deals.length === 0 ? <Empty msg="No deals yet — move leads to Interested/Proposal." /> : <ul className="space-y-2">{d.deals.map((dl) => <li key={dl.id} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><DollarSign className="w-4 h-4 text-emerald-400 shrink-0" /><div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-white truncate">{dl.name}</div></div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${DEAL_TONE[dl.stage]}`}>{dl.stage}</span><span className="text-[11px] font-bold text-white">AED {kfmt(dl.value)}</span></li>)}</ul>)
          : view === "Activities" ? <ul className="space-y-2">{d.activities.map((a, i) => <li key={i} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" /><div><div className="text-[10px] text-slate-300"><b className="text-white">{a.contact}</b> — {a.summary}</div><div className="text-[9px] text-slate-600">{a.company} · {a.channel || a.type} · {ago(a.at)}</div></div></li>)}</ul>
          : <ul className="space-y-2">{d.tasks.map((t) => <li key={t.id} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" /><div className="flex-1 min-w-0"><div className="text-[11px] text-white truncate">{t.task}</div><div className="text-[9px] text-slate-500">{t.company} · {t.owner}</div></div>{t.due && <span className="text-[9px] text-amber-400">{ago(t.due)}</span>}</li>)}</ul>}
        </Card></FadeUp>

        {/* detail panel */}
        <FadeUp delay={0.05}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
          {!det ? <Empty msg="Select a contact." /> : <>
            <div className="flex items-center gap-2.5 mb-2"><Avatar name={det.name} /><div className="flex-1"><div className="flex items-center gap-1.5"><span className="text-[13px] font-bold text-white">{det.name}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CRM_STATUS_TONE[det.status]}`}>{det.status}</span></div><div className="text-[10px] text-slate-500">{det.role} {det.company && `at ${det.company}`}</div></div></div>
            <div className="flex gap-1.5 mb-3">{([["whatsapp", MessageCircle, "#34d399"], ["email", MailIcon, "#8b5cf6"], ["call", Phone, "#38bdf8"]] as [string, typeof Send, string][]).map(([c, I, col]) => <button key={c} onClick={() => act(c)} disabled={!!busy} className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center hover:bg-ink-700 disabled:opacity-50" style={{ color: col }}>{busy === c ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <I className="w-3.5 h-3.5" />}</button>)}</div>
            <ul className="space-y-1 text-[10px] mb-2">{([["Email", det.email], ["Phone", det.phone], ["Company", det.company], ["Location", det.location], ["Source", det.source], ["Owner", det.owner]] as [string, string][]).map(([l, v]) => <li key={l} className="flex justify-between gap-2"><span className="text-slate-500">{l}</span><span className="text-slate-300 truncate text-right">{v}</span></li>)}<li className="flex justify-between"><span className="text-slate-500">Lead Score</span><span className="text-emerald-400 font-bold">{det.leadScore}/100</span></li></ul>
            <div className="flex gap-1 flex-wrap mb-3">{det.tags.map((t) => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-ink-800 text-slate-400">{t}</span>)}</div>
            <button onClick={() => openLead({ ...det } as unknown as SalesLead)} className="text-[10px] text-brand-400 font-semibold mb-3">View Full Profile →</button>
            <div className="border-t border-ink-800 pt-2.5"><div className="text-[10px] font-bold text-slate-400 mb-1.5">Interaction Timeline</div><ul className="space-y-1.5">{det.timeline.map((t, i) => <li key={i} className="flex items-start gap-2 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1 shrink-0" /><div><div className="text-slate-300">{t.title}</div><div className="text-[9px] text-slate-600">{ago(t.at)}</div></div></li>)}{det.timeline.length === 0 && <li className="text-[10px] text-slate-600">No interactions yet.</li>}</ul></div>
            {det.deals.length > 0 && <div className="border-t border-ink-800 pt-2.5 mt-2.5"><div className="text-[10px] font-bold text-slate-400 mb-1.5">Deals ({det.deals.length})</div><ul className="space-y-1.5">{det.deals.map((dl, i) => <li key={i} className="rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-1.5"><div className="flex items-center justify-between"><span className="text-[10px] text-white truncate">{dl.name}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${DEAL_TONE[dl.stage]}`}>{dl.stage}</span></div><div className="text-[11px] font-bold text-emerald-400">AED {kfmt(dl.value)}</div></li>)}</ul></div>}
          </>}
        </div></FadeUp>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <FadeUp><Card title="Contacts by Status"><div className="flex items-center gap-3"><Donut segments={d.contactsByStatus.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.contactsByStatus.total} label="Total" /><ul className="space-y-1 flex-1">{d.contactsByStatus.segments.map((s) => <li key={s.label} className="flex items-center gap-1.5 text-[9px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="text-white font-bold">{s.count}</span></li>)}</ul></div></Card></FadeUp>
        <FadeUp delay={0.04}><Card title="Leads by Source"><div className="flex items-center gap-3"><Donut segments={d.leadsBySource.segments.map((s) => ({ count: s.count, color: s.color }))} total={d.leadsBySource.total} label="Total" /><ul className="space-y-1 flex-1">{d.leadsBySource.segments.map((s) => <li key={s.label} className="flex items-center gap-1.5 text-[9px]"><span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="text-white font-bold">{s.count}</span></li>)}</ul></div></Card></FadeUp>
        <FadeUp delay={0.08}><Card title="Lead Score Distribution"><div className="flex items-end justify-between gap-1.5 h-[120px] pt-2">{d.scoreDistribution.map((s) => <div key={s.label} className="flex-1 flex flex-col items-center gap-1"><motion.div className="w-full rounded-t" style={{ background: s.color }} initial={{ height: 0 }} animate={{ height: `${(s.count / maxScore) * 90}%` }} transition={{ duration: 0.6 }} /><span className="text-[8px] text-slate-500 text-center leading-tight">{s.label}</span><span className="text-[9px] font-bold text-white">{s.count}</span></div>)}</div></Card></FadeUp>
        <FadeUp delay={0.12}><Card title="Conversion Funnel"><ul className="space-y-1.5">{d.conversionFunnel.map((f) => <li key={f.stage}><div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-300">{f.stage}</span><span className="text-white font-bold">{f.count} <span className="text-slate-600">({f.pct}%)</span></span></div><div className="h-2.5 rounded bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.max(4, (f.count / maxFunnel) * 100)}%` }} transition={{ duration: 0.6 }} /></div></li>)}</ul></Card></FadeUp>
      </div>
    </div>
  );
}
