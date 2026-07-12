"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2, Loader2, Sparkles, RefreshCw, CheckCircle2, ExternalLink, Trash2, Mail, Send, ShieldCheck,
  TrendingUp, Globe, X, Radar, Star, FileText, Download, Calendar, Search, AlertTriangle, Bookmark,
  PenLine, Lightbulb, Eye, Clock, ChevronLeft, ChevronRight, Copy,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getBacklinkOverview, getBacklinks, backlinkDiscover, backlinkVerify,
  backlinkVerifyAll, backlinkOutreach, backlinkUpdate, blGuestDiscover, blArticleIdeas, blGuestDraft,
  blGuestPublished, blListOutreach, blSendOutreach, blScheduleFollowUp, blSetOutreachStatus,
  blRunFollowUps, blCompetitorFinds, blScanCompetitor, blListMonitored, blGenerateReport,
  type BlOverview, type BlRow, type BlList,
} from "@/lib/api";

const TABS = ["Overview", "Opportunities", "Guest Posting", "Outreach", "Competitors", "Monitoring", "Reports"];
const CATS = ["General", "Car Rental", "Yacht Rental", "Activities", "Airport Transfer"];

/* ── Helpers ────────────────────────────────────────────────────────────── */
const kfmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0));
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—");
const drColor = (n: number) => (n >= 50 ? "text-emerald-300" : n >= 30 ? "text-amber-300" : "text-slate-400");
const spamColor = (n: number) => (n <= 15 ? "text-emerald-300" : n <= 30 ? "text-amber-300" : "text-rose-300");
const statusPill = (s: string) => (s === "Live" ? "bg-emerald-500/15 text-emerald-300" : s === "Submitted" ? "bg-sky-500/15 text-sky-300" : s === "Opportunity" ? "bg-violet-500/15 text-violet-300" : s === "Lost" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300");
const typePill = (t: string) => (t === "dofollow" ? "bg-emerald-500/15 text-emerald-300" : t === "nofollow" ? "bg-slate-500/15 text-slate-300" : "bg-ink-800 text-slate-500");
const methodPill = (m: string) => (m === "Guest Post" ? "bg-violet-500/15 text-violet-300" : m === "Directory" ? "bg-sky-500/15 text-sky-300" : m === "Resource Page" ? "bg-emerald-500/15 text-emerald-300" : m === "Broken Link" ? "bg-amber-500/15 text-amber-300" : m === "Partnership" ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-ink-800 text-slate-300");
const outreachPill = (s: string) => (s === "Sent" ? "bg-sky-500/15 text-sky-300" : s === "Opened" ? "bg-violet-500/15 text-violet-300" : s === "Replied" ? "bg-amber-500/15 text-amber-300" : s === "Successful" ? "bg-emerald-500/15 text-emerald-300" : s === "Failed" ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-300");
const livePill = (s: string) => (s === "Live" ? "bg-emerald-500/15 text-emerald-300" : s === "Lost" || s === "Removed" ? "bg-rose-500/15 text-rose-300" : s === "Redirected" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-400");

function Card({ title, children, right, sub, className = "" }: { title?: string; children: React.ReactNode; right?: React.ReactNode; sub?: string; className?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className={`rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20 ${className}`}>{(title || right) && <div className="flex items-start justify-between gap-2 mb-3"><div>{title && <div className="text-[13px] font-bold text-white">{title}</div>}{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>}{children}</motion.div>;
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-1 mt-3 text-[11px] text-slate-500">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => onPage(n)} className={`w-7 h-7 grid place-items-center rounded-md text-[11px] ${n === page ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-200" : "border border-ink-700 text-slate-400 hover:text-white"}`}>{n}</button>)}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-ink-700 disabled:opacity-40 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function DomainCell({ b }: { b: BlRow }) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div className="min-w-0">
        <a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" className="text-slate-100 font-semibold hover:text-cyan-300 truncate max-w-[190px] inline-block">{b.sourceDomain}</a>
        {b.competitorSource && <div className="text-[10px] text-slate-500 truncate max-w-[190px]">links to {b.competitorSource}</div>}
      </div>
    </div>
  );
}

/* ── Outreach draft modal (editable + copy + optional send) ─────────────── */
function DraftModal({ domain, draft, onClose, flash, onSend, sending }: { domain: string; draft: string; onClose: () => void; flash: (m: string) => void; onSend?: () => void; sending?: boolean }) {
  const [text, setText] = useState(draft);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-ink-800 bg-ink-950 p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-violet-400" /> Outreach draft — {domain}</h3><button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full h-64 rounded-lg bg-ink-900 border border-ink-700 p-3 text-[12px] text-slate-200 leading-relaxed resize-none" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(text); flash("Copied to clipboard."); }} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-200 text-[12px] font-semibold hover:bg-ink-800"><Copy className="w-4 h-4" /> Copy</button>
          {onSend && <button onClick={onSend} disabled={sending} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Now</button>}
        </div>
      </div>
    </div>
  );
}

/* ── Page shell ─────────────────────────────────────────────────────────── */
export default function AuthorityGrowthPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [flash, setFlash] = useState("");
  const user = getStoredUser();

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 6000); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
        <AgentGate agentId="authority" label="Authority Growth" accent="from-violet-500 to-indigo-600" />
      <main className="flex-1 min-w-0">
        {flash && <div className="fixed top-4 right-4 z-[95] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{flash}</div>}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center shrink-0"><Link2 className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Authority Growth</h1><p className="text-[11px] text-slate-500 truncate">Acquires high-quality backlinks that grow TripReview.ae&apos;s Domain Rating, rankings and organic traffic.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="agTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-cyan-500" />}</button>)}</div></div>

        <div className="p-5">
          {tab === "Overview" ? <OverviewTab />
            : tab === "Opportunities" ? <OpportunitiesTab flash={note} />
            : tab === "Guest Posting" ? <GuestTab flash={note} />
            : tab === "Outreach" ? <OutreachTab flash={note} />
            : tab === "Competitors" ? <CompetitorsTab flash={note} />
            : tab === "Monitoring" ? <MonitoringTab flash={note} />
            : <ReportsTab flash={note} />}
        </div>
      </main>
    </div>
  );
}

/* ── Tab 1 · Overview ───────────────────────────────────────────────────── */
function CountBars({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <div className="text-[11px] text-slate-600 py-3 text-center">No data yet.</div>;
  return (
    <div className="space-y-2">{items.map((i) => (
      <div key={i.label}>
        <div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{i.label}</span><span className="font-bold text-white">{i.count}</span></div>
        <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" initial={{ width: 0 }} animate={{ width: `${(i.count / max) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>
      </div>
    ))}</div>
  );
}

function OverviewTab() {
  const [ov, setOv] = useState<BlOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setOv(await getBacklinkOverview()); } catch { setOv(null); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;
  if (!ov) return <div className="text-slate-500 text-sm py-20 text-center">Overview unavailable — check the backend connection.</div>;
  const k = ov.kpis;
  const kpis: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }[] = [
    { label: "Domain Rating (est.)", value: `${k.drEstimate}`, sub: "/100", icon: TrendingUp, color: "bg-cyan-500/15 text-cyan-300" },
    { label: "Referring Domains", value: `${k.referringDomains}`, icon: Globe, color: "bg-blue-500/15 text-blue-300" },
    { label: "Qualified Backlinks", value: `${k.qualified}`, sub: `DR ${k.minDr}+`, icon: ShieldCheck, color: "bg-teal-500/15 text-teal-300" },
    { label: "New Backlinks (30d)", value: `${k.new30d}`, icon: Sparkles, color: "bg-violet-500/15 text-violet-300" },
    { label: "Live Links", value: `${k.live}`, icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-300" },
    { label: "Outreach Success Rate", value: `${k.outreachSuccessRate}%`, icon: Mail, color: "bg-amber-500/15 text-amber-300" },
    { label: "Guest Posts Published", value: `${k.guestPostsPublished}`, icon: PenLine, color: "bg-fuchsia-500/15 text-fuchsia-300" },
    { label: "Opportunities", value: `${k.opportunities}`, icon: Radar, color: "bg-sky-500/15 text-sky-300" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((x) => (
          <FadeUp key={x.label}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
            <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${x.color}`}><x.icon className="w-4.5 h-4.5" /></span>
            <div className="text-2xl font-extrabold text-white leading-tight">{x.value}{x.sub && <span className="text-[11px] font-semibold text-slate-500 ml-1">{x.sub}</span>}</div>
            <div className="text-[12px] text-slate-500">{x.label}</div>
          </div></FadeUp>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Link Profile Breakdown" sub="Every count from live agent data">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><div className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">By Status</div><CountBars items={ov.byStatus} /></div>
            <div><div className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">By Method</div><CountBars items={ov.byMethod} /></div>
          </div>
        </Card></FadeUp>

        <div className="space-y-4">
          <FadeUp><Card title="Recent Activity" sub="Latest backlink events">
            {ov.recent.length === 0 ? <div className="text-slate-500 text-xs py-6 text-center">No activity yet — discover opportunities to get started.</div> : (
              <div className="space-y-2">{ov.recent.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg bg-ink-800/40 border border-ink-800 px-3 py-2">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center shrink-0"><Link2 className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{r.sourceDomain}</div><div className="text-[10px] text-slate-500 truncate">{r.method} · DA {r.da} · → {r.targetPath}</div></div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusPill(r.status)}`}>{r.status}</span>
                  <span className="text-[10px] text-slate-600 shrink-0 whitespace-nowrap">{fmtDate(r.at)}</span>
                </div>
              ))}</div>
            )}
          </Card></FadeUp>

          <FadeUp><Card title="Connected Channels" sub="Integrations powering this agent">
            <div className="flex flex-wrap gap-2">{ov.channels.map((c) => (
              <span key={c.key} title={c.hint} className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 h-8 rounded-lg border ${c.connected ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-ink-700 text-slate-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${c.connected ? "bg-emerald-400" : "bg-slate-600"}`} />{c.label}</span>
            ))}</div>
          </Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 2 · Opportunities ──────────────────────────────────────────────── */
function OpportunitiesTab({ flash }: { flash: (m: string) => void }) {
  const [list, setList] = useState<BlList | null>(null);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("General");
  const [minDr, setMinDr] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [busyId, setBusyId] = useState("");
  const [modal, setModal] = useState<{ domain: string; draft: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: string; country?: string; minDr?: number; q?: string; saved?: string; page?: number } = { page };
      if (status) params.status = status;
      if (country) params.country = country;
      if (q) params.q = q;
      if (minDr) params.minDr = Number(minDr);
      if (savedOnly) params.saved = "1";
      setList(await getBacklinks(params));
    } catch { setList(null); } finally { setLoading(false); }
  }, [status, country, q, minDr, savedOnly, page]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const discover = async () => {
    setBusy("discover"); flash("Searching the web for real backlink opportunities…");
    try { const r = await backlinkDiscover({ category: cat, count: 8 }); flash(r.ok ? `✓ ${r.message}${r.rejected ? ` · ${r.rejected} rejected below quality bar` : ""}` : (r.message || "Discovery failed.")); await load(); }
    finally { setBusy(""); }
  };
  const toggleSave = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkUpdate(b.id, { saved: !b.saved }); if (r.ok) setList((l) => (l ? { ...l, rows: l.rows.map((x) => (x.id === b.id ? { ...x, saved: !b.saved } : x)) } : l)); else flash(r.message || "Failed."); }
    finally { setBusyId(""); }
  };
  const ignore = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkUpdate(b.id, { ignored: true }); if (r.ok) { setList((l) => (l ? { ...l, rows: l.rows.filter((x) => x.id !== b.id), total: Math.max(0, l.total - 1) } : l)); flash(`Ignored ${b.sourceDomain} — it won't be suggested again.`); } else flash(r.message || "Failed."); }
    finally { setBusyId(""); }
  };
  const startOutreach = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkOutreach(b.id); if (r.ok && r.draft) { setModal({ domain: b.sourceDomain, draft: r.draft }); flash(`✓ Outreach draft ready for ${b.sourceDomain}.`); } else flash(r.message || "Draft failed."); }
    finally { setBusyId(""); }
  };

  return (
    <div className="space-y-4">
      {modal && <DraftModal domain={modal.domain} draft={modal.draft} onClose={() => setModal(null)} flash={flash} />}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <button onClick={discover} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "discover" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Discover Opportunities</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input value={minDr} onChange={(e) => { setPage(1); setMinDr(e.target.value.replace(/\D/g, "")); }} placeholder="Min DR" inputMode="numeric" className="w-20 h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white placeholder-slate-600" />
          <select value={country} onChange={(e) => { setPage(1); setCountry(e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option value="">All Countries</option>{(list?.countries || []).map((c) => <option key={c}>{c}</option>)}</select>
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option value="">All Statuses</option>{(list?.statuses || []).map((s) => <option key={s}>{s}</option>)}</select>
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search domain…" className="w-44 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
          <button onClick={() => { setPage(1); setSavedOnly((v) => !v); }} className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border text-[12px] font-medium ${savedOnly ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-ink-700 text-slate-400 hover:text-white"}`}><Bookmark className="w-3.5 h-3.5" /> Saved only</button>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Website</th><th className="font-medium px-2">Type</th><th className="font-medium px-2 text-center">DR</th><th className="font-medium px-2 text-right">Traffic</th><th className="font-medium px-2">Country</th><th className="font-medium px-2 text-center">Relevance</th><th className="font-medium px-2 text-center">Spam</th><th className="font-medium px-2 text-center">Priority</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>
              ) : !list || list.rows.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-slate-500">No opportunities yet — run <span className="text-cyan-300 font-semibold">Discover Opportunities</span> to find real sites.</td></tr>
              ) : list.rows.map((b) => (
                <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><DomainCell b={b} /><a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white shrink-0"><ExternalLink className="w-3 h-3" /></a></div></td>
                  <td className="px-2"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${methodPill(b.method)}`}>{b.method}</span></td>
                  <td className="px-2 text-center"><span className={`font-bold ${drColor(b.da)}`}>{b.da || "—"}</span></td>
                  <td className="px-2 text-right text-slate-300">{b.organicTraffic ? kfmt(b.organicTraffic) : "—"}</td>
                  <td className="px-2 text-slate-400 whitespace-nowrap">{b.country || "—"}</td>
                  <td className="px-2 text-center text-slate-400">{b.relevance || "—"}</td>
                  <td className="px-2 text-center"><span className={`font-semibold ${spamColor(b.spamScore)}`}>{b.spamScore}</span></td>
                  <td className="px-2 text-center font-bold text-white">{b.priorityScore}</td>
                  <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                    <button onClick={() => toggleSave(b)} disabled={!!busyId} title={b.saved ? "Unsave" : "Save"} className={`p-1 disabled:opacity-40 ${b.saved ? "text-amber-300" : "hover:text-amber-300"}`}>{busyId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" fill={b.saved ? "currentColor" : "none"} />}</button>
                    <button onClick={() => startOutreach(b)} disabled={!!busyId} title="Start outreach (draft email)" className="hover:text-violet-300 disabled:opacity-40 p-1"><Mail className="w-3.5 h-3.5" /></button>
                    <button onClick={() => ignore(b)} disabled={!!busyId} title="Ignore this site" className="hover:text-rose-300 disabled:opacity-40 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list && <div className="px-3 pb-3"><Pager page={page} pages={list.pages} onPage={setPage} /></div>}
      </div>
    </div>
  );
}

/* ── Tab 3 · Guest Posting ──────────────────────────────────────────────── */
function GuestTab({ flash }: { flash: (m: string) => void }) {
  const [list, setList] = useState<BlList | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [busyId, setBusyId] = useState("");
  const [writing, setWriting] = useState("");
  const [drawer, setDrawer] = useState<{ row: BlRow; view: "ideas" | "draft"; ideas: string[] } | null>(null);

  const load = useCallback(async () => { setLoading(true); try { setList(await getBacklinks({ method: "Guest Post", page })); } catch { setList(null); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);

  const discover = async () => {
    setBusy("discover"); flash("Searching the web for real guest-post sites…");
    try { const r = await blGuestDiscover({ count: 6 }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Discovery failed.")); await load(); }
    finally { setBusy(""); }
  };
  const openIdeas = async (b: BlRow) => {
    setBusyId(b.id + ":ideas");
    try { const r = await blArticleIdeas(b.id); if (r.ok) setDrawer({ row: r.backlink || b, view: "ideas", ideas: r.ideas || r.backlink?.articleIdeas || [] }); else flash(r.message || "Could not generate ideas."); }
    finally { setBusyId(""); }
  };
  const writeDraft = async (b: BlRow, idea?: string) => {
    setWriting(b.id);
    try { const r = await blGuestDraft(b.id, idea); if (r.ok && r.backlink) { setDrawer({ row: r.backlink, view: "draft", ideas: r.backlink.articleIdeas || [] }); flash(`✓ Guest post draft written for ${b.sourceDomain}.`); await load(); } else flash(r.message || "Draft failed."); }
    finally { setWriting(""); }
  };
  const startWrite = (b: BlRow) => { if (b.articleIdeas?.length) setDrawer({ row: b, view: "ideas", ideas: b.articleIdeas }); else writeDraft(b); };
  const publish = async (b: BlRow) => {
    setBusyId(b.id + ":pub");
    try { const r = await blGuestPublished(b.id); flash(r.ok ? `✓ Marked as published — ${b.sourceDomain}.` : (r.message || "Failed.")); await load(); }
    finally { setBusyId(""); }
  };

  const rows = (list?.rows || []).filter((b) => b.method === "Guest Post");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <button onClick={discover} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "discover" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Discover Guest-Post Sites</button>
        <span className="text-[11px] text-slate-500">Finds real sites that accept guest contributions, then writes and tracks the posts.</span>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Website</th><th className="font-medium px-2 text-center">DR</th><th className="font-medium px-2 text-right">Traffic</th><th className="font-medium px-2">Free/Paid</th><th className="font-medium px-2">Guidelines</th><th className="font-medium px-2">Contact</th><th className="font-medium px-2">Status</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-500">No guest-post sites yet — run <span className="text-cyan-300 font-semibold">Discover Guest-Post Sites</span>.</td></tr>
              ) : rows.map((b) => (
                <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="px-3 py-2.5"><DomainCell b={b} /></td>
                  <td className="px-2 text-center"><span className={`font-bold ${drColor(b.da)}`}>{b.da || "—"}</span></td>
                  <td className="px-2 text-right text-slate-300">{b.organicTraffic ? kfmt(b.organicTraffic) : "—"}</td>
                  <td className="px-2"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${b.guestFreePaid === "Free" ? "bg-emerald-500/15 text-emerald-300" : b.guestFreePaid === "Paid" ? "bg-amber-500/15 text-amber-300" : "bg-ink-800 text-slate-500"}`}>{b.guestFreePaid || "—"}</span></td>
                  <td className="px-2">{b.guestGuidelines ? (b.guestGuidelines.startsWith("http") ? <a href={b.guestGuidelines} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1">Guidelines <ExternalLink className="w-3 h-3" /></a> : <span title={b.guestGuidelines} className="text-slate-400 truncate max-w-[160px] inline-block align-middle">{b.guestGuidelines}</span>) : <span className="text-slate-600">—</span>}</td>
                  <td className="px-2"><div className="text-slate-300 truncate max-w-[140px]">{b.contactPerson || b.contactEmail || "—"}</div>{b.contactPerson && b.contactEmail && <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{b.contactEmail}</div>}</td>
                  <td className="px-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.guestPublishedAt ? "bg-emerald-500/15 text-emerald-300" : statusPill(b.status)}`}>{b.guestPublishedAt ? "Published" : b.status}</span></td>
                  <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                    <button onClick={() => openIdeas(b)} disabled={!!busyId || !!writing} title="Generate article ideas" className="hover:text-amber-300 disabled:opacity-40 p-1">{busyId === b.id + ":ideas" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => startWrite(b)} disabled={!!busyId || !!writing} title="Write guest post draft" className="hover:text-violet-300 disabled:opacity-40 p-1">{writing === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}</button>
                    {b.guestDraft && <button onClick={() => setDrawer({ row: b, view: "draft", ideas: b.articleIdeas || [] })} title="View draft" className="hover:text-sky-300 p-1"><Eye className="w-3.5 h-3.5" /></button>}
                    {!b.guestPublishedAt && <button onClick={() => publish(b)} disabled={!!busyId || !!writing} title="Mark published" className="hover:text-emerald-300 disabled:opacity-40 p-1">{busyId === b.id + ":pub" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list && <div className="px-3 pb-3"><Pager page={page} pages={list.pages} onPage={setPage} /></div>}
      </div>

      {/* Ideas / draft drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(null)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-ink-950 border-l border-ink-800 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">{drawer.view === "ideas" ? <Lightbulb className="w-4 h-4 text-amber-400" /> : <FileText className="w-4 h-4 text-sky-400" />} {drawer.view === "ideas" ? "Article ideas" : "Guest post draft"} — {drawer.row.sourceDomain}</h3>
              <button onClick={() => setDrawer(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
            </div>
            {drawer.view === "ideas" ? (
              <div className="space-y-2">
                {drawer.ideas.length === 0 ? <div className="text-slate-500 text-xs py-6 text-center">No ideas yet — click the lightbulb on the row to generate some.</div> : drawer.ideas.map((idea, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-ink-900/60 border border-ink-800 px-3 py-2.5">
                    <span className="text-[12px] text-slate-200 leading-snug">{idea}</span>
                    <button onClick={() => writeDraft(drawer.row, idea)} disabled={!!writing} className="shrink-0 inline-flex items-center gap-1 rounded-md bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 px-2 py-1 text-[10px] font-medium text-violet-200 disabled:opacity-50">{writing === drawer.row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />} Write Draft</button>
                  </div>
                ))}
                <button onClick={() => writeDraft(drawer.row)} disabled={!!writing} className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{writing === drawer.row.id ? <><Loader2 className="w-4 h-4 animate-spin" /> writing…</> : <><PenLine className="w-4 h-4" /> Write Draft — agent picks the angle</>}</button>
              </div>
            ) : drawer.row.guestDraft ? (
              <>
                <div className="rounded-lg bg-white text-slate-900 p-5 text-sm leading-relaxed max-h-[70vh] overflow-y-auto [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_p]:my-2 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: drawer.row.guestDraft }} />
                {!drawer.row.guestPublishedAt && <button onClick={() => { publish(drawer.row); setDrawer(null); }} className="mt-4 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-semibold"><CheckCircle2 className="w-4 h-4" /> Mark Published</button>}
              </>
            ) : (
              <div className="text-slate-500 text-xs py-6 text-center">No draft yet — write one from the ideas list.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab 4 · Outreach ───────────────────────────────────────────────────── */
function OutreachTab({ flash }: { flash: (m: string) => void }) {
  const [rows, setRows] = useState<BlRow[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [busyId, setBusyId] = useState("");
  const [modal, setModal] = useState<{ id: string; domain: string; draft: string } | null>(null);
  const [sending, setSending] = useState(false);
  const now = Date.now();

  const load = useCallback(async () => { setLoading(true); try { const r = await blListOutreach({ page }); setRows(r.rows); setPages(r.pages); } catch { setRows([]); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);

  const runFollowUps = async () => {
    setBusy("fu");
    try { const r = await blRunFollowUps(); flash(r.ok ? `✓ ${r.sent} follow-up${r.sent === 1 ? "" : "s"} sent of ${r.due} due.` : "Follow-up run failed."); await load(); }
    finally { setBusy(""); }
  };
  const draftEmail = async (b: BlRow) => {
    setBusyId(b.id + ":draft");
    try { const r = await backlinkOutreach(b.id); if (r.ok && r.draft) setModal({ id: b.id, domain: b.sourceDomain, draft: r.draft }); else flash(r.message || "Draft failed."); }
    finally { setBusyId(""); }
  };
  const send = async (id: string, domain: string) => {
    setBusyId(id + ":send"); setSending(true);
    try { const r = await blSendOutreach(id); flash(r.ok ? `✓ Outreach email sent to ${domain}.` : (r.message || "Send failed.")); setModal(null); await load(); }
    finally { setBusyId(""); setSending(false); }
  };
  const followUp = async (b: BlRow) => {
    setBusyId(b.id + ":fu");
    try { const r = await blScheduleFollowUp(b.id, 4); flash(r.ok ? `✓ Follow-up scheduled in 4 days for ${b.sourceDomain}.` : (r.message || "Failed.")); await load(); }
    finally { setBusyId(""); }
  };
  const setStatus = async (b: BlRow, status: string) => {
    if (!status) return;
    setBusyId(b.id + ":st");
    try { const r = await blSetOutreachStatus(b.id, status); flash(r.ok ? `✓ ${b.sourceDomain} marked ${status}.` : (r.message || "Failed.")); await load(); }
    finally { setBusyId(""); }
  };

  return (
    <div className="space-y-4">
      {modal && <DraftModal domain={modal.domain} draft={modal.draft} onClose={() => setModal(null)} flash={flash} sending={sending} onSend={() => send(modal.id, modal.domain)} />}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <button onClick={runFollowUps} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "fu" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Run Due Follow-ups</button>
        <span className="text-[11px] text-slate-500">Sends every follow-up whose scheduled date has passed.</span>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Website</th><th className="font-medium px-2">Contact</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Last Contact</th><th className="font-medium px-2">Follow-up</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-500">No outreach in progress yet — start one from the <span className="text-cyan-300 font-semibold">Opportunities</span> tab.</td></tr>
              ) : rows.map((b) => {
                const overdue = !!b.followUpAt && new Date(b.followUpAt).getTime() < now;
                return (
                  <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                    <td className="px-3 py-2.5"><DomainCell b={b} /></td>
                    <td className="px-2"><div className="text-slate-300 truncate max-w-[150px]">{b.contactPerson || "—"}</div>{b.contactEmail && <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{b.contactEmail}</div>}</td>
                    <td className="px-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${outreachPill(b.outreachStatus)}`}>{b.outreachStatus || "Draft"}</span></td>
                    <td className="px-2 text-slate-400 whitespace-nowrap">{fmtDate(b.lastContactAt)}</td>
                    <td className="px-2 whitespace-nowrap"><span className={overdue ? "text-rose-300 font-semibold" : "text-slate-400"}>{fmtDate(b.followUpAt)}{overdue && " · due"}</span></td>
                    <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                      <button onClick={() => draftEmail(b)} disabled={!!busyId} title="Draft email" className="hover:text-violet-300 disabled:opacity-40 p-1">{busyId === b.id + ":draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => send(b.id, b.sourceDomain)} disabled={!!busyId} title="Send now" className="hover:text-sky-300 disabled:opacity-40 p-1">{busyId === b.id + ":send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => followUp(b)} disabled={!!busyId} title="Schedule follow-up in 4 days" className="hover:text-amber-300 disabled:opacity-40 p-1">{busyId === b.id + ":fu" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}</button>
                      <select value="" onChange={(e) => setStatus(b, e.target.value)} disabled={!!busyId} title="Mark outcome" className="h-6 rounded-md bg-ink-950 border border-ink-700 px-1 text-[10px] text-slate-300 disabled:opacity-40">
                        <option value="">Mark…</option><option value="Replied">Replied</option><option value="Successful">Successful</option><option value="Failed">Failed</option>
                      </select>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 pb-3"><Pager page={page} pages={pages} onPage={setPage} /></div>
      </div>
    </div>
  );
}

/* ── Tab 5 · Competitors ────────────────────────────────────────────────── */
function CompetitorsTab({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<{ rows: BlRow[]; competitors: { name: string; website: string; dr: number; total: number; new7d: number; lost7d: number; topSource: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState("");
  const [busyId, setBusyId] = useState("");
  const [modal, setModal] = useState<{ domain: string; draft: string } | null>(null);

  const load = useCallback(async () => { setLoading(true); try { setD(await blCompetitorFinds()); } catch { setD(null); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const scan = async (name: string) => {
    setScanning(name); flash(`Scanning ${name}'s backlink profile for acquirable sources…`);
    try { const r = await blScanCompetitor(name); flash(r.ok ? `✓ ${r.message}` : (r.message || "Scan failed.")); await load(); }
    finally { setScanning(""); }
  };
  const acquire = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkOutreach(b.id); if (r.ok && r.draft) { setModal({ domain: b.sourceDomain, draft: r.draft }); flash(`✓ Outreach draft ready for ${b.sourceDomain} — acquire the same link.`); } else flash(r.message || "Draft failed."); }
    finally { setBusyId(""); }
  };
  const toggleSave = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkUpdate(b.id, { saved: !b.saved }); if (r.ok) setD((prev) => (prev ? { ...prev, rows: prev.rows.map((x) => (x.id === b.id ? { ...x, saved: !b.saved } : x)) } : prev)); else flash(r.message || "Failed."); }
    finally { setBusyId(""); }
  };

  if (loading) return <div className="grid place-items-center py-32"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-4">
      {modal && <DraftModal domain={modal.domain} draft={modal.draft} onClose={() => setModal(null)} flash={flash} />}

      {!d || d.competitors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-12 text-center"><Radar className="w-10 h-10 text-cyan-400/60 mx-auto mb-3" /><div className="text-lg font-bold text-white">No competitor data yet</div><p className="text-sm text-slate-500 mt-1">Competitor backlink profiles appear here once tracked by the Competitive Intelligence agent.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {d.competitors.map((c) => (
            <FadeUp key={c.name}><Card>
              <div className="flex items-center justify-between mb-2"><div className="min-w-0"><div className="text-[13px] font-bold text-white truncate">{c.name}</div><div className="text-[10px] text-slate-500 truncate">{c.website}</div></div><span className="shrink-0 inline-grid place-items-center min-w-[34px] rounded-md px-1.5 py-1 text-[12px] font-bold bg-sky-500/15 text-sky-300">{c.dr}</span></div>
              <div className="flex items-center gap-3 text-[11px] mb-2">
                <span className="text-slate-300 font-semibold">{kfmt(c.total)} <span className="text-slate-500 font-normal">links</span></span>
                <span className="text-emerald-300 font-semibold">+{c.new7d} <span className="text-slate-500 font-normal">7d</span></span>
                <span className="text-rose-300 font-semibold">-{c.lost7d} <span className="text-slate-500 font-normal">7d</span></span>
              </div>
              {c.topSource && <div className="text-[10px] text-slate-500 truncate mb-2.5">Top source: <span className="text-slate-300">{c.topSource}</span></div>}
              <button onClick={() => scan(c.name)} disabled={!!scanning} className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-semibold disabled:opacity-50">{scanning === c.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radar className="w-3.5 h-3.5" />} Scan Backlinks</button>
            </Card></FadeUp>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
        <div className="px-3 pt-3 text-[13px] font-bold text-white">Competitor-Sourced Opportunities</div>
        <div className="px-3 text-[10px] text-slate-500 mb-1">Sites that already link to a competitor — the easiest links to replicate.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Website</th><th className="font-medium px-2">Links to</th><th className="font-medium px-2 text-center">DR</th><th className="font-medium px-2 text-center">Priority</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {!d || d.rows.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-500">No competitor-sourced opportunities yet — run <span className="text-cyan-300 font-semibold">Scan Backlinks</span> on a competitor above.</td></tr>
              ) : d.rows.map((b) => (
                <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="px-3 py-2.5"><DomainCell b={b} /></td>
                  <td className="px-2 text-slate-300 whitespace-nowrap">{b.competitorSource || "—"}</td>
                  <td className="px-2 text-center"><span className={`font-bold ${drColor(b.da)}`}>{b.da || "—"}</span></td>
                  <td className="px-2 text-center font-bold text-white">{b.priorityScore}</td>
                  <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                    <button onClick={() => acquire(b)} disabled={!!busyId} title="Acquire similar link (draft outreach)" className="hover:text-violet-300 disabled:opacity-40 p-1">{busyId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => toggleSave(b)} disabled={!!busyId} title={b.saved ? "Unsave" : "Save"} className={`p-1 disabled:opacity-40 ${b.saved ? "text-amber-300" : "hover:text-amber-300"}`}><Star className="w-3.5 h-3.5" fill={b.saved ? "currentColor" : "none"} /></button>
                    <a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" title="Open source" className="hover:text-white p-1"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 6 · Monitoring ─────────────────────────────────────────────────── */
function MonitoringTab({ flash }: { flash: (m: string) => void }) {
  const [rows, setRows] = useState<BlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => { setLoading(true); try { const r = await blListMonitored(); setRows(r.rows); } catch { setRows([]); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);

  const verifyAll = async () => {
    setBusy("verify"); flash("Crawling every source page to confirm links are still live…");
    try { const r = await backlinkVerifyAll(); flash(r.ok ? `✓ ${r.message}` : "Verify failed."); await load(); }
    finally { setBusy(""); }
  };
  const verify = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkVerify(b.id); flash(r.ok ? (r.message || `✓ Checked ${b.sourceDomain}.`) : (r.message || "Check failed.")); await load(); }
    finally { setBusyId(""); }
  };

  const lost = rows.filter((b) => b.liveStatus === "Lost");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <button onClick={verifyAll} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Verify All Live Links</button>
        <span className="text-[11px] text-slate-500">Re-crawls each source page and updates live status, anchor and follow type.</span>
      </div>

      {lost.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
          <div className="min-w-0"><div className="text-[12px] font-semibold text-rose-200">{lost.length} lost backlink{lost.length === 1 ? "" : "s"} need attention</div><div className="text-[11px] text-rose-300/80 truncate">{lost.map((l) => l.sourceDomain).join(", ")}</div></div>
        </div>
      )}

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Website</th><th className="font-medium px-2">Anchor</th><th className="font-medium px-2">Follow</th><th className="font-medium px-2">First Indexed</th><th className="font-medium px-2">Last Checked</th><th className="font-medium px-2">Live Status</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-500">No live links to monitor yet — links appear here once they go live.</td></tr>
              ) : rows.map((b) => (
                <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                  <td className="px-3 py-2.5"><DomainCell b={b} /></td>
                  <td className="px-2"><span className="italic text-slate-400 truncate max-w-[170px] inline-block">{b.anchorFound || b.anchor || "—"}</span></td>
                  <td className="px-2"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${typePill(b.type)}`}>{b.type}</span></td>
                  <td className="px-2 text-slate-400 whitespace-nowrap">{fmtDate(b.firstIndexedAt)}</td>
                  <td className="px-2 text-slate-400 whitespace-nowrap">{fmtDate(b.lastCheckedAt)}</td>
                  <td className="px-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${livePill(b.liveStatus)}`}>{b.liveStatus || "—"}</span></td>
                  <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                    <button onClick={() => verify(b)} disabled={!!busyId} title="Verify (crawl source for our link)" className="hover:text-emerald-300 disabled:opacity-40 p-1">{busyId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}</button>
                    <a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" title="Open source" className="hover:text-white p-1"><ExternalLink className="w-3.5 h-3.5" /></a>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 7 · Reports ────────────────────────────────────────────────────── */
function ReportsTab({ flash }: { flash: (m: string) => void }) {
  const [busy, setBusy] = useState("");
  const [rep, setRep] = useState<{ period: string; content: string; filename: string; stats: { newLive: number; lost: number; newOpps: number; outreachSent: number; guest: number } } | null>(null);

  const generate = async (period: "weekly" | "monthly") => {
    setBusy(period);
    try { const r = await blGenerateReport(period); if (r.ok) { setRep({ period, content: r.content, filename: r.filename, stats: r.stats }); flash(`✓ ${period === "weekly" ? "Weekly" : "Monthly"} authority report generated.`); } else flash("Report generation failed."); }
    catch { flash("Report generation failed."); }
    finally { setBusy(""); }
  };
  const download = () => {
    if (!rep) return;
    const blob = new Blob([rep.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = rep.filename || "authority-report.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const chips = rep ? [
    { label: "New Live", value: rep.stats.newLive, cls: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" },
    { label: "Lost", value: rep.stats.lost, cls: "border-rose-500/30 text-rose-300 bg-rose-500/10" },
    { label: "New Opportunities", value: rep.stats.newOpps, cls: "border-violet-500/30 text-violet-300 bg-violet-500/10" },
    { label: "Outreach Sent", value: rep.stats.outreachSent, cls: "border-sky-500/30 text-sky-300 bg-sky-500/10" },
    { label: "Guest Posts", value: rep.stats.guest, cls: "border-amber-500/30 text-amber-300 bg-amber-500/10" },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <button onClick={() => generate("weekly")} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "weekly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generate Weekly Report</button>
        <button onClick={() => generate("monthly")} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-ink-800 text-slate-200 text-[12px] font-semibold hover:bg-ink-700 disabled:opacity-50">{busy === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Generate Monthly Report</button>
        <span className="text-[11px] text-slate-500">Compiled from real backlink, outreach and guest-post data.</span>
      </div>

      {!rep ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-12 text-center"><FileText className="w-10 h-10 text-cyan-400/60 mx-auto mb-3" /><div className="text-lg font-bold text-white">No report generated yet</div><p className="text-sm text-slate-500 mt-1">Choose Weekly or Monthly above — the agent compiles link wins, losses, outreach and guest-post progress.</p></div>
      ) : (
        <FadeUp><Card title={`${rep.period === "weekly" ? "Weekly" : "Monthly"} Authority Report`} sub={rep.filename} right={<button onClick={download} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-ink-700 text-slate-200 text-[11px] font-semibold hover:bg-ink-800"><Download className="w-3.5 h-3.5" /> Download .txt</button>}>
          <div className="flex flex-wrap gap-2 mb-4">{chips.map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 h-8 text-[11px] font-semibold ${c.cls}`}>{c.value} <span className="font-normal opacity-80">{c.label}</span></span>
          ))}</div>
          <div className="rounded-lg bg-ink-950 border border-ink-800 p-4 text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">{rep.content}</div>
        </Card></FadeUp>
      )}
    </div>
  );
}
