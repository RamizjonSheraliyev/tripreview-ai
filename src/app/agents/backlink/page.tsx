"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2, Loader2, Bell, Calendar, Search, RefreshCw, CheckCircle2, ExternalLink,
  Trash2, Mail, Send, ShieldCheck, TrendingUp, Globe, X, Sparkles, Radar, Plus,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp } from "@/components/motion";
import {
  fetchMe, getStoredUser, getBacklinkOverview, getBacklinks, backlinkDiscover, backlinkVerify,
  backlinkVerifyAll, backlinkOutreach, backlinkSubmit, backlinkDelete,
  type BlOverview, type BlRow,
} from "@/lib/api";

const CATS = ["General", "Car Rental", "Yacht Rental", "Activities", "Airport Transfer"];
const statusPill = (s: string) => (s === "Live" ? "bg-emerald-500/15 text-emerald-300" : s === "Submitted" ? "bg-sky-500/15 text-sky-300" : s === "Opportunity" ? "bg-violet-500/15 text-violet-300" : s === "Lost" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300");
const typePill = (t: string) => (t === "dofollow" ? "bg-emerald-500/15 text-emerald-300" : t === "nofollow" ? "bg-slate-500/15 text-slate-300" : "bg-ink-800 text-slate-500");

export default function BacklinkPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [ov, setOv] = useState<BlOverview | null>(null);
  const [rows, setRows] = useState<BlRow[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [busyId, setBusyId] = useState("");
  const [flash, setFlash] = useState("");
  const [cat, setCat] = useState("General");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [outreach, setOutreach] = useState<{ domain: string; draft: string } | null>(null);

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 5000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, l] = await Promise.all([
        getBacklinkOverview().catch(() => null),
        getBacklinks({ status, q, page: 1 }).catch(() => null),
      ]);
      setOv(o);
      if (l) { setRows(l.rows); setStatuses(l.statuses); setMethods(l.methods); }
    } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const discover = async () => { setBusy("discover"); note("Searching the web for real backlink opportunities…"); try { const r = await backlinkDiscover({ category: cat, count: 8 }); note(r.ok ? `✓ ${r.message}` : (r.message || "Discovery failed.")); await load(); } finally { setBusy(""); } };
  const verifyAll = async () => { setBusy("verify"); note("Crawling source pages to confirm live links…"); try { const r = await backlinkVerifyAll(); note(r.ok ? `✓ ${r.message}` : "Verify failed."); await load(); } finally { setBusy(""); } };

  const rowAct = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, ok: string) => {
    setBusyId(id);
    try { const r = await fn(); note(r.ok ? (r.message || ok) : (r.message || "Failed.")); await load(); }
    finally { setBusyId(""); }
  };
  const doOutreach = async (b: BlRow) => {
    setBusyId(b.id);
    try { const r = await backlinkOutreach(b.id); if (r.ok && r.draft) setOutreach({ domain: b.sourceDomain, draft: r.draft }); else note(r.message || "Draft failed."); }
    finally { setBusyId(""); }
  };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  const k = ov?.kpis;
  const kpis = [
    { label: "Total Backlinks", value: k?.total ?? 0, icon: Link2, color: "bg-violet-500/15 text-violet-300" },
    { label: "Live", value: k?.live ?? 0, icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-300" },
    { label: "Dofollow", value: k?.dofollow ?? 0, icon: ShieldCheck, color: "bg-teal-500/15 text-teal-300" },
    { label: "Pending", value: k?.pending ?? 0, icon: Send, color: "bg-sky-500/15 text-sky-300" },
    { label: "Opportunities", value: k?.opportunities ?? 0, icon: Radar, color: "bg-fuchsia-500/15 text-fuchsia-300" },
    { label: "Avg. Domain Authority", value: k?.avgDomainAuthority ?? 0, icon: TrendingUp, color: "bg-amber-500/15 text-amber-300" },
  ];

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center shrink-0"><Link2 className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Backlink Builder</h1><p className="text-[11px] text-slate-500 truncate">Discover, place, verify and track real backlinks that grow TripReview.ae&apos;s off-page SEO.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {flash && <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-[12px] text-brand-200">{flash}</div>}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((x) => (
              <div key={x.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${x.color}`}><x.icon className="w-4.5 h-4.5" /></span>
                <div className="text-2xl font-extrabold text-white leading-tight">{x.value}</div>
                <div className="text-[12px] text-slate-500">{x.label}</div>
              </div>
            ))}
          </div>

          {/* Discover + verify + channels */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <button onClick={discover} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy === "discover" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Discover Opportunities</button>
            <button onClick={verifyAll} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-ink-800 text-slate-200 text-[12px] font-semibold hover:bg-ink-700 disabled:opacity-50">{busy === "verify" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Verify All Live Links</button>
            <div className="ml-auto flex items-center gap-2">
              {(ov?.channels || []).map((c) => (
                <span key={c.key} title={c.hint} className={`inline-flex items-center gap-1 text-[10px] px-2 h-7 rounded-lg border ${c.connected ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-ink-700 text-slate-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${c.connected ? "bg-emerald-400" : "bg-slate-600"}`} />{c.label}</span>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg bg-ink-950 border border-ink-700 px-3 text-[12px] text-white"><option value="">All Statuses</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
            <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search domain…" className="w-56 h-9 rounded-lg bg-ink-950 border border-ink-700 pl-8 pr-3 text-[12px] text-white placeholder-slate-600" /></div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium px-3 py-2.5">Source Domain</th><th className="font-medium px-2">Method</th><th className="font-medium px-2 text-center">DA</th><th className="font-medium px-2 text-center">Rel.</th><th className="font-medium px-2">Type</th><th className="font-medium px-2">Status</th><th className="font-medium px-2 text-right">Actions</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-500">No backlinks yet. Click <span className="text-cyan-300 font-semibold">Discover Opportunities</span> to find real sites.</td></tr>
                  ) : rows.map((b) => (
                    <tr key={b.id} className="border-b border-ink-900/60 hover:bg-ink-800/30">
                      <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" /><div className="min-w-0"><a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" className="text-slate-100 font-semibold hover:text-cyan-300 truncate max-w-[190px] inline-block">{b.sourceDomain}</a><div className="text-[10px] text-slate-500 truncate max-w-[190px]">→ {b.targetPath}{b.contactEmail ? ` · ${b.contactEmail}` : ""}</div></div></div></td>
                      <td className="px-2 text-slate-300 whitespace-nowrap">{b.method}</td>
                      <td className="px-2 text-center"><span className={`font-bold ${b.da >= 50 ? "text-emerald-300" : b.da >= 30 ? "text-amber-300" : "text-slate-400"}`}>{b.da || "—"}</span></td>
                      <td className="px-2 text-center text-slate-400">{b.relevance || "—"}</td>
                      <td className="px-2"><span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${typePill(b.type)}`}>{b.type}</span></td>
                      <td className="px-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPill(b.status)}`}>{b.status}</span></td>
                      <td className="px-2"><div className="flex items-center justify-end gap-1 text-slate-500">
                        <button onClick={() => rowAct(b.id, () => backlinkVerify(b.id), "Checked")} disabled={!!busyId} title="Verify (crawl source for our link)" className="hover:text-emerald-300 disabled:opacity-40 p-1">{busyId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}</button>
                        <button onClick={() => doOutreach(b)} disabled={!!busyId} title="Draft outreach email" className="hover:text-violet-300 disabled:opacity-40 p-1"><Mail className="w-3.5 h-3.5" /></button>
                        <button onClick={() => rowAct(b.id, () => backlinkSubmit(b.id), "Submitted")} disabled={!!busyId} title="Submit / place" className="hover:text-sky-300 disabled:opacity-40 p-1"><Send className="w-3.5 h-3.5" /></button>
                        <a href={b.sourceUrl || `https://${b.sourceDomain}`} target="_blank" rel="noreferrer" title="Open source" className="hover:text-white p-1"><ExternalLink className="w-3.5 h-3.5" /></a>
                        <button onClick={() => rowAct(b.id, () => backlinkDelete(b.id), "Deleted")} disabled={!!busyId} title="Delete" className="hover:text-rose-300 disabled:opacity-40 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Outreach draft modal */}
        {outreach && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOutreach(null)} />
            <div className="relative w-full max-w-lg rounded-2xl border border-ink-800 bg-ink-950 p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-violet-400" /> Outreach draft — {outreach.domain}</h3><button onClick={() => setOutreach(null)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button></div>
              <textarea readOnly value={outreach.draft} className="w-full h-64 rounded-lg bg-ink-900 border border-ink-700 p-3 text-[12px] text-slate-200 leading-relaxed resize-none" />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(outreach.draft); note("Copied to clipboard."); }} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold"><Plus className="w-4 h-4" /> Copy</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
