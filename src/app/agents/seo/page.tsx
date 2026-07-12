"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, RefreshCw, Calendar, Globe, ArrowRight, X, CheckCircle2,
  AlertTriangle, FileText, Wrench, Sparkles, ChevronRight, Check, Gauge,
  Send, Target, Link2, BarChart3, Layers, TrendingUp, Bot,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getCeoSeo, runCeoSeo, approveCeoProposal, rejectCeoProposal,
  getContentGaps, listBriefs, getStrategy, agentChat,
  type SeoAuditSnapshot, type SeoPageAudit, type CeoProposalItem, type CompletedFix,
  type ContentGaps, type BriefRow, type StrategyData, type AgentChatTurn,
} from "@/lib/api";

/* ---------------- helpers ---------------- */
const kfmt = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n ?? 0));
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const sevPill = (s: string) => (s === "high" ? "bg-rose-500/15 text-rose-300" : s === "warn" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");
const scoreColor = (n: number) => (n >= 85 ? "#34d399" : n >= 70 ? "#fbbf24" : "#fb7185");
const scoreText = (n: number) => (n >= 85 ? "text-emerald-400" : n >= 70 ? "text-amber-400" : "text-rose-400");
const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae").replace(/\/+$/, "");

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

type KwItem = { keyword: string; volume: number; kd: number; intent: string; category: string; opportunity: number };
type Sel =
  | { t: "route"; d: SeoPageAudit }
  | { t: "rec"; d: CeoProposalItem }
  | { t: "brief"; d: BriefRow }
  | { t: "gap"; d: ContentGaps["topGaps"][number] }
  | { t: "fix"; d: CompletedFix }
  | { t: "kw"; d: KwItem };

const TABS = ["Overview", "Keyword Intelligence", "Route Audit", "Recommendations", "SEO Briefs", "Content Gaps", "Fixed"] as const;
type Tab = (typeof TABS)[number];

export default function SeoAgentPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [audit, setAudit] = useState<SeoAuditSnapshot | null>(null);
  const [proposals, setProposals] = useState<CeoProposalItem[]>([]);
  const [fixed, setFixed] = useState<CompletedFix[]>([]);
  const [gaps, setGaps] = useState<ContentGaps | null>(null);
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [strat, setStrat] = useState<StrategyData | null>(null);
  const [chat, setChat] = useState<AgentChatTurn[]>([]);
  const [chatIn, setChatIn] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [base, setBase] = useState(PUBLIC_SITE);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [sel, setSel] = useState<Sel | null>(null);
  const [busyId, setBusyId] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useCallback(async () => {
    const [seo, g, b, st] = await Promise.all([
      getCeoSeo().catch(() => null),
      getContentGaps().catch(() => null),
      listBriefs({ limit: 50 }).then((r) => r.items).catch(() => [] as BriefRow[]),
      getStrategy().catch(() => null),
    ]);
    if (seo) { setAudit(seo.audit); setProposals(seo.proposals || []); setFixed(seo.fixed || []); setBase(seo.base || PUBLIC_SITE); }
    setGaps(g); setBriefs(b || []); setStrat(st); setLoading(false);
  }, []);

  const askSeo = async () => {
    const q = chatIn.trim(); if (!q || chatBusy) return;
    setChat((c) => [...c, { role: "founder", text: q }]); setChatIn(""); setChatBusy(true);
    try { const r = await agentChat(q, { mentionId: "seo", history: chat.slice(-8) }); setChat((c) => [...c, { role: "agent", name: r.agentName, text: r.text }]); }
    catch { setChat((c) => [...c, { role: "agent", text: "Couldn't reach the SEO agent — check the LLM key." }]); }
    finally { setChatBusy(false); }
  };
  useEffect(() => { if (ready) load(); }, [ready, load]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 3500); };
  const runAudit = async () => { setRunning(true); try { const r = await runCeoSeo(); setAudit(r.audit); setProposals(r.proposals || []); setFixed(r.fixed || []); note("SEO audit re-run complete."); } catch (e) { note(e instanceof Error ? e.message : "Audit failed."); } finally { setRunning(false); } };
  const decide = async (id: string, d: "approve" | "reject") => {
    setBusyId(id);
    try { if (d === "approve") await approveCeoProposal(id); else await rejectCeoProposal(id); note(d === "approve" ? "Approved & applied." : "Rejected."); setSel(null); await load(); }
    catch (e) { note(e instanceof Error ? e.message : "Action failed."); } finally { setBusyId(""); }
  };
  const pageUrl = (path: string) => `${base}/en${path === "/" ? "" : path}`;

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const proposed = proposals.filter((p) => p.status === "proposed");
  const pages = [...(audit?.pages || [])].sort((a, b) => a.score - b.score);
  const sevCount = { high: proposed.filter((p) => p.severity === "high").length, warn: proposed.filter((p) => p.severity === "warn").length, info: proposed.filter((p) => p.severity === "info").length };

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; color: string }[] = [
    { label: "SEO Health", value: `${audit?.overallScore ?? "—"}/100`, Icon: Gauge, color: "#34d399" },
    { label: "Routes Crawled", value: audit?.crawled ?? 0, Icon: Globe, color: "#38bdf8" },
    { label: "Issues Found", value: audit?.issueCount ?? 0, Icon: AlertTriangle, color: "#fb7185" },
    { label: "Recommendations", value: proposed.length, Icon: Sparkles, color: "#8b5cf6" },
    { label: "Fixes Applied", value: fixed.length, Icon: Wrench, color: "#a78bfa" },
    { label: "Content Briefs", value: briefs.length, Icon: FileText, color: "#fbbf24" },
  ];
  const healthColor = scoreColor(audit?.overallScore ?? 0);

  // ---- derived (all real) ----
  const allIssues = (audit?.pages || []).flatMap((p) => p.issues);
  const dimOf = (kind: string) => { const k = (kind || "").toLowerCase(); if (/reachable|canonical|robot|sitemap|redirect/.test(k)) return "Technical"; if (/title|h1|meta|desc/.test(k)) return "On-Page"; if (/og|twitter|social|image/.test(k)) return "Social"; return "Content"; };
  const DIM_COLOR: Record<string, string> = { Technical: "#38bdf8", "On-Page": "#8b5cf6", Content: "#34d399", Social: "#fbbf24" };
  const dimScores = ["Technical", "On-Page", "Content", "Social"].map((d) => { const iss = allIssues.filter((i) => dimOf(i.kind) === d); const penalty = iss.reduce((s, i) => s + (i.severity === "high" ? 30 : i.severity === "warn" ? 15 : 5), 0); return { label: d, score: Math.max(40, 100 - penalty), color: DIM_COLOR[d] }; });
  const clusterMap: Record<string, { count: number; vol: number; q: number }> = {};
  briefs.forEach((b) => { const c = clusterMap[b.category] || { count: 0, vol: 0, q: 0 }; c.count++; c.vol += b.searchVolume || 0; c.q += b.qualityScore || 0; clusterMap[b.category] = c; });
  const clusters = Object.entries(clusterMap).map(([name, c]) => ({ name, count: c.count, vol: c.vol, avgQ: Math.round(c.q / c.count) })).sort((a, b) => b.count - a.count);
  const landingOpps = (strat?.contentOpps || []).slice(0, 6);
  const topGaps = gaps?.topGaps || [];
  const ROLE = ["Keyword research", "Topic clustering", "SEO audits", "Internal linking", "Meta title & description", "Schema & FAQ suggestions", "Content gap analysis", "Landing page recommendations"];
  const MUST_DO = ["Find new keyword opportunities", "Create SEO briefs for Copywriter", "Suggest new pages by keyword demand", "Optimize existing pages", "Detect missing metadata", "Recommend internal links", "Recommend FAQ schema", "Track ranking changes"];

  // ---- unified real keyword universe (from gaps + briefs + strategy) ----
  const kwMap = new Map<string, KwItem>();
  const addKw = (keyword: string, volume: number, kd: number, intent: string, category: string) => {
    const k = (keyword || "").toLowerCase().trim(); if (!k || kwMap.has(k)) return;
    const opp = Math.max(40, Math.min(99, Math.round((Math.log10(Math.max(10, volume)) / 5) * 55 + (100 - (kd || 30)) / 2.2)));
    kwMap.set(k, { keyword, volume: volume || 0, kd: kd || 30, intent: intent || "Commercial", category: category || "General", opportunity: opp });
  };
  topGaps.forEach((g) => addKw(g.keyword, g.volume, g.kd, g.intent, ""));
  briefs.forEach((b) => addKw(b.primaryKeyword || b.title, b.searchVolume, b.keywordDifficulty, "Commercial", b.category));
  (strat?.contentOpps || []).forEach((o) => addKw(o.keyword, o.searchVolume, 30, "Commercial", ""));
  const keywords = Array.from(kwMap.values()).sort((a, b) => b.opportunity - a.opportunity);
  const kwHighOpp = keywords.filter((k) => k.opportunity >= 85).length;
  const kwAvgKd = keywords.length ? Math.round(keywords.reduce((s, k) => s + k.kd, 0) / keywords.length) : 0;
  const kwVol = keywords.reduce((s, k) => s + k.volume, 0);
  const intentDist = gaps?.gapByIntent && gaps.gapByIntent.length ? gaps.gapByIntent : (() => { const m: Record<string, number> = {}; keywords.forEach((k) => { m[k.intent] = (m[k.intent] || 0) + 1; }); const IC: Record<string, string> = { Commercial: "#8b5cf6", Informational: "#38bdf8", Transactional: "#34d399", Navigational: "#fbbf24" }; const tot = keywords.length || 1; return Object.entries(m).map(([label, count]) => ({ label, count, pct: Math.round((count / tot) * 100), color: IC[label] || "#64748b" })); })();
  const KD_BUCKETS = [[0, 10, "Easy"], [11, 30, "Easy"], [31, 50, "Medium"], [51, 70, "Medium"], [71, 100, "Hard"]] as [number, number, string][];
  const kdHist = [["0-10", 0, 10], ["11-30", 11, 30], ["31-50", 31, 50], ["51-70", 51, 70], ["71-100", 71, 100]].map(([label, lo, hi]) => ({ label: label as string, count: keywords.filter((k) => k.kd >= (lo as number) && k.kd <= (hi as number)).length }));
  const kwByCat: Record<string, { top: KwItem | null; vol: number }> = {};
  keywords.forEach((k) => { const c = kwByCat[k.category] || { top: null, vol: 0 }; c.vol += k.volume; if (!c.top || k.volume > c.top.volume) c.top = k; kwByCat[k.category] = c; });
  const catOpps = Object.entries(kwByCat).map(([name, v]) => ({ name, top: v.top, vol: v.vol })).sort((a, b) => b.vol - a.vol).slice(0, 6);
  void KD_BUCKETS;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
        <AgentGate agentId="seo" label="SEO Agent" accent="from-emerald-500 to-teal-600" />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shrink-0"><Search className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">SEO Agent</h1><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">● Active</span></div><p className="text-[11px] text-slate-500 truncate">AI Head of SEO · organic search growth from real crawl &amp; content data.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <button onClick={runAudit} disabled={running} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Run Audit</button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="seoTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-emerald-500" />}</button>)}
        </div></div>

        <div className="p-5 space-y-5">
          {flash && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">{flash}</div>}
          {loading ? <div className="grid place-items-center py-28"><Loader2 className="w-7 h-7 animate-spin text-emerald-400" /></div> : (
            <>
              {tab !== "Keyword Intelligence" && (
              <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {kpis.map((c) => (
                  <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                    <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><c.Icon className="w-3.5 h-3.5" /></span></div>
                    <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
                  </Item>
                ))}
              </Stagger>
              )}

              {tab === "Keyword Intelligence" && (
                <KeywordIntelligence keywords={keywords} highOpp={kwHighOpp} avgKd={kwAvgKd} vol={kwVol} gapsCount={topGaps.length} intentDist={intentDist} kdHist={kdHist} catOpps={catOpps} topGaps={topGaps} onKw={(d) => setSel({ t: "kw", d })} onGap={(d) => setSel({ t: "gap", d })} onCreateBrief={() => setTab("SEO Briefs")} />
              )}

              {tab === "Overview" && (
                <div className="space-y-5">
                  {/* Row 1: Role · Must Do · AI Assistant · Health */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
                    <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                      <h3 className="text-sm font-bold text-white mb-2">Main Role</h3>
                      <p className="text-[11px] text-slate-400 leading-snug mb-3">Drives organic search growth — visibility, traffic &amp; conversions through data-driven SEO.</p>
                      <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Responsibilities</div>
                      <ul className="space-y-1">{ROLE.map((r) => <li key={r} className="flex items-start gap-1.5 text-[11px] text-slate-300"><CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />{r}</li>)}</ul>
                    </div></FadeUp>
                    <FadeUp delay={0.03}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                      <h3 className="text-sm font-bold text-white mb-2">Must Do</h3>
                      <ul className="space-y-1.5">{MUST_DO.map((m) => <li key={m} className="flex items-start gap-1.5 text-[11px] text-slate-300"><Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />{m}</li>)}</ul>
                    </div></FadeUp>
                    <FadeUp delay={0.06}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full flex flex-col">
                      <div className="flex items-center gap-1.5 mb-2"><Bot className="w-4 h-4 text-brand-400" /><h3 className="text-sm font-bold text-white">AI SEO Assistant</h3></div>
                      <div className="flex-1 min-h-[120px] max-h-[180px] overflow-y-auto space-y-2 mb-2 scrollbar-thin">
                        {chat.length === 0 && <div className="space-y-1.5">{["Find high-opportunity keywords for yacht rental", "Show content gaps for airport transfer", "Suggest internal links for this page"].map((s) => <button key={s} onClick={() => { setChatIn(s); }} className="w-full text-left text-[11px] text-slate-400 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-1.5 hover:text-white hover:border-ink-700 flex items-center justify-between gap-2">{s}<ArrowRight className="w-3 h-3 shrink-0" /></button>)}</div>}
                        {chat.map((m, i) => <div key={i} className={`text-[11px] leading-snug rounded-lg px-2.5 py-1.5 ${m.role === "founder" ? "bg-brand-600/20 text-brand-100 ml-6" : "bg-ink-800 text-slate-200 mr-2"}`}>{m.text}</div>)}
                        {chatBusy && <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> thinking…</div>}
                      </div>
                      <div className="flex items-center gap-1.5"><input value={chatIn} onChange={(e) => setChatIn(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askSeo()} placeholder="Ask anything…" className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-8 text-[11px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /><button onClick={askSeo} disabled={chatBusy || !chatIn.trim()} className="w-8 h-8 grid place-items-center rounded-lg bg-brand-600 text-white disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button></div>
                    </div></FadeUp>
                    <FadeUp delay={0.09}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                      <h3 className="text-sm font-bold text-white mb-3">SEO Health Overview</h3>
                      <div className="flex items-center gap-3 mb-3"><Donut pct={audit?.overallScore ?? 0} size={84} stroke={9} color={healthColor}><div><div className="text-lg font-extrabold text-white leading-none">{audit?.overallScore ?? "—"}</div><div className="text-[9px] text-slate-500">/100</div></div></Donut><div className="text-[10px] text-slate-500">{audit?.crawled ?? 0} crawled<br />{audit?.unreachable ?? 0} unreachable</div></div>
                      <ul className="space-y-1.5">{dimScores.map((d) => <li key={d.label} className="flex items-center gap-2 text-[11px]"><span className="text-slate-400 flex-1">{d.label}</span><div className="h-1.5 w-16 rounded-full bg-ink-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.score}%`, background: d.color }} /></div><span className="text-white font-bold w-6 text-right">{d.score}</span></li>)}</ul>
                    </div></FadeUp>
                  </div>

                  {/* Row 2: Keyword Intelligence · Content Clusters · SEO Briefs */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-800"><Target className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-bold text-white">Keyword Intelligence</h3><button onClick={() => setTab("Content Gaps")} className="ml-auto text-[11px] text-emerald-400 font-semibold hover:underline">View All</button></div>
                      <div className="divide-y divide-ink-900">{topGaps.slice(0, 6).map((g, i) => <button key={i} onClick={() => setSel({ t: "gap", d: g })} className="w-full text-left px-4 py-2 hover:bg-ink-900/40 flex items-center gap-2 group"><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-emerald-300">{g.keyword}</div><div className="text-[9px] text-slate-500">{g.intent} · KD {g.kd}</div></div><span className="text-[11px] text-slate-300 tabular-nums">{kfmt(g.volume)}</span></button>)}{topGaps.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-500">No keyword data.</div>}</div>
                    </div></FadeUp>
                    <FadeUp delay={0.05}><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-800"><Layers className="w-4 h-4 text-brand-400" /><h3 className="text-sm font-bold text-white">Content Cluster Engine</h3></div>
                      <div className="divide-y divide-ink-900">{clusters.slice(0, 6).map((c) => <div key={c.name} className="px-4 py-2 flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{c.name}</div><div className="text-[9px] text-slate-500">{c.count} briefs · avg Q {c.avgQ}</div></div><span className="text-[11px] text-slate-300 tabular-nums">{kfmt(c.vol)}</span></div>)}{clusters.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-500">No clusters yet.</div>}</div>
                    </div></FadeUp>
                    <FadeUp delay={0.1}><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-800"><FileText className="w-4 h-4 text-amber-400" /><h3 className="text-sm font-bold text-white">SEO Briefs</h3><button onClick={() => setTab("SEO Briefs")} className="ml-auto text-[11px] text-emerald-400 font-semibold hover:underline">View All</button></div>
                      <div className="divide-y divide-ink-900">{briefs.slice(0, 6).map((b) => <button key={b.id} onClick={() => setSel({ t: "brief", d: b })} className="w-full text-left px-4 py-2 hover:bg-ink-900/40 flex items-center gap-2 group"><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-emerald-300">{b.title}</div><div className="text-[9px] text-slate-500">{b.status} · {b.assignee.replace(" Agent", "")}</div></div><ChevronRight className="w-4 h-4 text-slate-600 shrink-0" /></button>)}{briefs.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-500">No briefs.</div>}</div>
                    </div></FadeUp>
                  </div>

                  {/* Row 3: Content Gap · Landing Page Opportunities · Ranking Tracker (connect) */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full">
                      <h3 className="text-sm font-bold text-white mb-3">Content Gap Analysis</h3>
                      <div className="grid grid-cols-2 gap-2 mb-3">{([["Total Gaps", gaps?.kpis.totalGaps ?? 0], ["High Impact", gaps?.kpis.highImpact ?? 0], ["Est. Traffic", kfmt(gaps?.kpis.estMonthlyTraffic ?? 0)], ["Avg KD", gaps?.kpis.avgKd ?? 0]] as [string, React.ReactNode][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 p-2"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500">{l}</div></div>)}</div>
                      <ul className="space-y-1">{topGaps.slice(0, 3).map((g, i) => <li key={i} className="flex items-center justify-between text-[11px]"><span className="text-slate-300 truncate">{g.keyword}</span><span className="text-emerald-400 font-semibold">{kfmt(g.estTraffic)}</span></li>)}</ul>
                    </div></FadeUp>
                    <FadeUp delay={0.05}><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-800"><TrendingUp className="w-4 h-4 text-sky-400" /><h3 className="text-sm font-bold text-white">Landing Page Opportunities</h3></div>
                      <div className="divide-y divide-ink-900">{landingOpps.map((o, i) => <a key={i} href={`${base}/en/${(o.keyword || o.topic).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} target="_blank" rel="noreferrer" className="px-4 py-2 hover:bg-ink-900/40 flex items-center gap-2 group"><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-emerald-300">{o.topic}</div><div className="text-[9px] text-slate-500">demand {kfmt(o.searchVolume)} · {o.priority}</div></div><span className="text-[11px] text-emerald-400 tabular-nums">{kfmt(o.potentialTraffic)}</span></a>)}{landingOpps.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-500">No opportunities.</div>}</div>
                    </div></FadeUp>
                    <FadeUp delay={0.1}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1.5 self-start mb-3"><BarChart3 className="w-4 h-4 text-violet-400" /><h3 className="text-sm font-bold text-white">Ranking Tracker</h3></div>
                      <Link2 className="w-8 h-8 text-slate-600 mb-2" />
                      <div className="text-[12px] font-semibold text-white">Connect Google Search Console</div>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">Live keyword positions, gainers &amp; losers come from Search Console. Add credentials to <span className="font-mono text-slate-300">.env</span> — no demo rankings are shown.</p>
                    </div></FadeUp>
                  </div>

                  {/* Row 4: Recommendations · Route-by-Route · Schema & FAQ */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800"><h3 className="text-sm font-bold text-white">AI SEO Recommendations</h3><button onClick={() => setTab("Recommendations")} className="text-[11px] text-emerald-400 font-semibold hover:underline">View All</button></div>
                      <div className="divide-y divide-ink-900">{proposed.slice(0, 5).map((p) => <button key={p._id} onClick={() => setSel({ t: "rec", d: p })} className="w-full text-left px-4 py-2 hover:bg-ink-900/40 flex items-center gap-2 group"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${sevPill(p.severity)}`}>{p.severity}</span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-emerald-300">{p.title}</div></div><ChevronRight className="w-4 h-4 text-slate-600 shrink-0" /></button>)}{proposed.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-emerald-400">SEO is clean. 🎉</div>}</div>
                    </div></FadeUp>
                    <FadeUp delay={0.05}><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-800"><h3 className="text-sm font-bold text-white">Route-by-Route SEO</h3><button onClick={() => setTab("Route Audit")} className="text-[11px] text-emerald-400 font-semibold hover:underline">View All</button></div>
                      <div className="divide-y divide-ink-900">{pages.slice(0, 5).map((p) => <button key={p.path} onClick={() => setSel({ t: "route", d: p })} className="w-full text-left px-4 py-2 hover:bg-ink-900/40 flex items-center gap-2 group"><Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-emerald-300">{p.title}</div><div className="text-[9px] text-slate-500">{p.path}</div></div><span className={`text-[11px] font-bold ${scoreText(p.score)}`}>{p.score}</span></button>)}{pages.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-500">Run an audit.</div>}</div>
                    </div></FadeUp>
                    <FadeUp delay={0.1}><div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-ink-800"><FileText className="w-4 h-4 text-fuchsia-400" /><h3 className="text-sm font-bold text-white">Schema &amp; FAQ Center</h3></div>
                      <div className="p-4"><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">FAQ Opportunities (by content cluster)</div><ul className="space-y-1.5">{clusters.slice(0, 5).map((c) => <li key={c.name} className="flex items-center justify-between text-[11px]"><span className="text-slate-300">{c.name}</span><span className="text-fuchsia-300 font-semibold">{c.count} page{c.count === 1 ? "" : "s"}</span></li>)}{clusters.length === 0 && <li className="text-[11px] text-slate-500 text-center py-2">No content clusters.</li>}</ul></div>
                    </div></FadeUp>
                  </div>
                </div>
              )}

              {tab === "Route Audit" && (
                <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-x-auto">
                  <table className="w-full text-left min-w-[560px]"><thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2.5 pl-4 pr-3 font-semibold">Route</th><th className="font-semibold">Title</th><th className="font-semibold text-right">Issues</th><th className="font-semibold text-right">Score</th><th className="pr-4"></th></tr></thead>
                    <tbody>{pages.map((p) => <tr key={p.path} onClick={() => setSel({ t: "route", d: p })} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2.5 pl-4 pr-3 text-[11px] text-slate-300 whitespace-nowrap">{p.path}</td><td className="text-[11px] text-white font-semibold truncate max-w-[280px]">{p.title || "—"}</td><td className="text-[11px] text-slate-400 text-right">{p.issues.length}</td><td className={`text-[12px] font-bold text-right ${scoreText(p.score)}`}>{p.score}</td><td className="pr-4 text-right"><ChevronRight className="w-4 h-4 text-slate-600 inline" /></td></tr>)}
                    {pages.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[12px] text-slate-500">No routes crawled. Click <span className="text-emerald-300 font-semibold">Run Audit</span>.</td></tr>}</tbody></table>
                </div></FadeUp>
              )}

              {tab === "Recommendations" && (
                <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 divide-y divide-ink-900">
                  {proposed.map((p) => (
                    <div key={p._id} onClick={() => setSel({ t: "rec", d: p })} className="px-4 py-3 hover:bg-ink-900/40 cursor-pointer flex items-start gap-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${sevPill(p.severity)}`}>{p.severity}</span>
                      <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white">{p.title}</div><div className="text-[10px] text-slate-500">{p.page || p.path} · {fmtDate(p.createdAt)}</div><p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.detail}</p></div>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {p.fixType && <button onClick={() => decide(p._id, "approve")} disabled={!!busyId} title="Approve & auto-fix" className="w-8 h-8 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busyId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}</button>}
                        <button onClick={() => decide(p._id, "reject")} disabled={!!busyId} title="Reject" className="w-8 h-8 grid place-items-center rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {proposed.length === 0 && <div className="px-4 py-12 text-center text-[13px] text-slate-500"><CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />No open recommendations.</div>}
                </div></FadeUp>
              )}

              {tab === "SEO Briefs" && (
                <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-x-auto">
                  <table className="w-full text-left min-w-[640px]"><thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2.5 pl-4 pr-3 font-semibold">Brief</th><th className="font-semibold">Keyword</th><th className="font-semibold text-right">Volume</th><th className="font-semibold text-right">KD</th><th className="font-semibold">Status</th><th className="pr-4"></th></tr></thead>
                    <tbody>{briefs.map((b) => <tr key={b.id} onClick={() => setSel({ t: "brief", d: b })} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2.5 pl-4 pr-3 text-[11px] text-white font-semibold truncate max-w-[240px]">{b.title}</td><td className="text-[11px] text-slate-400 truncate max-w-[160px]">{b.primaryKeyword || "—"}</td><td className="text-[11px] text-slate-300 text-right">{kfmt(b.searchVolume)}</td><td className="text-[11px] text-slate-400 text-right">{b.keywordDifficulty}</td><td className="text-[10px] text-slate-300">{b.status}</td><td className="pr-4 text-right"><ChevronRight className="w-4 h-4 text-slate-600 inline" /></td></tr>)}
                    {briefs.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-[12px] text-slate-500">No SEO briefs yet.</td></tr>}</tbody></table>
                </div></FadeUp>
              )}

              {tab === "Content Gaps" && (
                <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-x-auto">
                  <table className="w-full text-left min-w-[680px]"><thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2.5 pl-4 pr-3 font-semibold">Keyword</th><th className="font-semibold">Intent</th><th className="font-semibold text-right">Volume</th><th className="font-semibold text-right">KD</th><th className="font-semibold text-right">Est. Traffic</th><th className="font-semibold">Priority</th><th className="pr-4"></th></tr></thead>
                    <tbody>{(gaps?.topGaps || []).map((g, i) => <tr key={i} onClick={() => setSel({ t: "gap", d: g })} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2.5 pl-4 pr-3 text-[11px] text-white font-semibold truncate max-w-[220px]">{g.keyword}</td><td className="text-[10px] text-slate-400">{g.intent}</td><td className="text-[11px] text-slate-300 text-right">{kfmt(g.volume)}</td><td className="text-[11px] text-slate-400 text-right">{g.kd}</td><td className="text-[11px] text-slate-300 text-right">{kfmt(g.estTraffic)}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${g.priority === "High" ? "bg-rose-500/15 text-rose-300" : g.priority === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>{g.priority}</span></td><td className="pr-4 text-right"><ChevronRight className="w-4 h-4 text-slate-600 inline" /></td></tr>)}
                    {(gaps?.topGaps || []).length === 0 && <tr><td colSpan={7} className="py-10 text-center text-[12px] text-slate-500">No content gaps found.</td></tr>}</tbody></table>
                </div></FadeUp>
              )}

              {tab === "Fixed" && (
                <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 divide-y divide-ink-900">
                  {fixed.map((f) => (
                    <div key={f.id} onClick={() => setSel({ t: "fix", d: f })} className="px-4 py-3 hover:bg-ink-900/40 cursor-pointer flex items-start gap-3">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${f.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{f.status}</span>
                      <div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white">{f.task}</div><div className="text-[10px] text-slate-500">{f.page || f.path} · {fmtDate(f.appliedAt)}</div></div>
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    </div>
                  ))}
                  {fixed.length === 0 && <div className="px-4 py-12 text-center text-[13px] text-slate-500">No fixes applied yet.</div>}
                </div></FadeUp>
              )}
            </>
          )}
        </div>

        {sel && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
            <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
              <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wide text-emerald-300 font-bold">{sel.t === "route" ? "Route Audit" : sel.t === "rec" ? "Recommendation" : sel.t === "brief" ? "SEO Brief" : sel.t === "gap" ? "Content Gap" : "Applied Fix"}</span><button onClick={() => setSel(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button></div>

              {sel.t === "route" && (() => { const p = sel.d; return (<div className="space-y-4">
                <div><h3 className="text-base font-bold text-white">{p.title || p.path}</h3><div className="flex items-center gap-2 mt-1"><span className="text-[11px] text-slate-500">{p.path}</span><span className={`text-[13px] font-extrabold ${scoreText(p.score)}`}>{p.score}/100</span></div></div>
                <a href={pageUrl(p.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:underline"><Globe className="w-3.5 h-3.5" /> View live page <ArrowRight className="w-3 h-3" /></a>
                <div><div className="text-[11px] font-bold text-white mb-1.5">Issues ({p.issues.length})</div><ul className="space-y-2">{p.issues.map((i, k) => <li key={k} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5"><div className="flex items-center gap-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sevPill(i.severity)}`}>{i.severity}</span><span className="text-[12px] font-semibold text-white">{i.title}</span></div><p className="text-[11px] text-slate-400 mt-1 leading-snug">{i.detail}</p>{i.recommend && <p className="text-[11px] text-emerald-300 mt-1">→ {i.recommend}</p>}</li>)}{p.issues.length === 0 && <li className="text-[12px] text-emerald-400">No issues — this route is clean. 🎉</li>}</ul></div>
              </div>); })()}

              {sel.t === "rec" && (() => { const p = sel.d; return (<div className="space-y-4">
                <div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sevPill(p.severity)}`}>{p.severity}</span>{p.fixType && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">Auto-fixable</span>}</div>
                <h3 className="text-base font-bold text-white leading-snug">{p.title}</h3>
                <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3"><div className="text-[11px] font-bold text-white mb-1">Why this matters</div><p className="text-[12px] text-slate-300 leading-relaxed">{p.detail}</p></div>
                {p.page && <div className="text-[11px] text-slate-500">Page: <span className="text-slate-300">{p.page}</span></div>}
                {p.path && <a href={pageUrl(p.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:underline"><Globe className="w-3.5 h-3.5" /> View affected page <ArrowRight className="w-3 h-3" /></a>}
                <div className="flex items-center gap-2 pt-2 border-t border-ink-800">
                  {p.fixType && <button onClick={() => decide(p._id, "approve")} disabled={!!busyId} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busyId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve &amp; Auto-fix</button>}
                  <button onClick={() => decide(p._id, "reject")} disabled={!!busyId} className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /> Reject</button>
                </div>
              </div>); })()}

              {sel.t === "brief" && (() => { const b = sel.d; return (<div className="space-y-4">
                <h3 className="text-base font-bold text-white leading-snug">{b.title}</h3>
                <div className="grid grid-cols-3 gap-2">{([["Volume", kfmt(b.searchVolume)], ["KD", `${b.keywordDifficulty}`], ["Quality", `${b.qualityScore}`]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>)}</div>
                <div className="grid grid-cols-2 gap-2">{([["Keyword", b.primaryKeyword || "—"], ["Type", b.contentType], ["Category", b.category], ["Status", b.status], ["Assignee", b.assignee], ["Priority", b.priority]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[11px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>)}</div>
                {b.description && <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3"><div className="text-[11px] font-bold text-white mb-1">Brief</div><p className="text-[12px] text-slate-300 leading-relaxed">{b.description}</p></div>}
              </div>); })()}

              {sel.t === "gap" && (() => { const g = sel.d; return (<div className="space-y-4">
                <h3 className="text-base font-bold text-white leading-snug">{g.keyword}</h3>
                <div className="grid grid-cols-3 gap-2">{([["Volume", kfmt(g.volume)], ["KD", `${g.kd}`], ["Est. Traffic", kfmt(g.estTraffic)]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>)}</div>
                <div className="grid grid-cols-2 gap-2">{([["Intent", g.intent], ["Priority", g.priority], ["Your Rank", g.yourRank], ["Top Competitor", g.competitor]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[11px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>)}</div>
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-[12px] text-slate-300">Create content targeting <span className="text-white font-semibold">&quot;{g.keyword}&quot;</span> to capture ~{kfmt(g.estTraffic)} monthly visits this competitor ranks for and you don&apos;t.</div>
              </div>); })()}

              {sel.t === "kw" && (() => { const k = sel.d; return (<div className="space-y-4">
                <h3 className="text-base font-bold text-white leading-snug">{k.keyword}</h3>
                <div className="grid grid-cols-3 gap-2">{([["Volume", kfmt(k.volume)], ["KD", `${k.kd}`], ["Opportunity", `${k.opportunity}`]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5 text-center"><div className="text-[13px] font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div>)}</div>
                <div className="grid grid-cols-2 gap-2">{([["Intent", k.intent], ["Category", k.category]] as [string, string][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[11px] text-slate-200 font-semibold truncate mt-0.5">{v}</div></div>)}</div>
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-[12px] text-slate-300">Opportunity score <span className="text-white font-semibold">{k.opportunity}/100</span> — {k.kd <= 30 ? "low difficulty, " : k.kd <= 60 ? "medium difficulty, " : "high difficulty, "}~{kfmt(k.volume)} monthly searches. Create an SEO brief to target it.</div>
              </div>); })()}

              {sel.t === "fix" && (() => { const f = sel.d; return (<div className="space-y-4">
                <div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${f.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{f.status}</span><span className="text-[10px] text-slate-500">{fmtDate(f.appliedAt)}</span></div>
                <h3 className="text-base font-bold text-white leading-snug">{f.task}</h3>
                {f.detail && <p className="text-[12px] text-slate-400 leading-relaxed">{f.detail}</p>}
                {f.changes?.length > 0 && <div><div className="text-[11px] font-bold text-white mb-1.5">Changes</div><ul className="space-y-2">{f.changes.map((c, i) => <li key={i} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2.5"><div className="text-[10px] text-slate-500 mb-1">{c.field}</div><div className="text-[11px] text-rose-300/80 line-through break-words">{c.before || "—"}</div><div className="text-[11px] text-emerald-300 break-words mt-0.5">{c.after || "—"}</div></li>)}</ul></div>}
                {f.path && <a href={pageUrl(f.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:underline"><Globe className="w-3.5 h-3.5" /> View live page <ArrowRight className="w-3 h-3" /></a>}
              </div>); })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------- Keyword Intelligence tab (real keyword universe) ---------------- */
function MultiDonut({ segments, total, size = 120, stroke = 15 }: { segments: { count: number; color: string }[]; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.count > 0).map((s, i) => { const p = total ? (s.count / total) * 100 : 0; const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${p} ${100 - p}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />; acc += p; return node; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-lg font-extrabold text-white">{total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total}</div><div className="text-[9px] text-slate-500">Total</div></div></div>
    </div>
  );
}

function KeywordIntelligence({ keywords, highOpp, avgKd, vol, gapsCount, intentDist, kdHist, catOpps, topGaps, onKw, onGap, onCreateBrief }: {
  keywords: KwItem[]; highOpp: number; avgKd: number; vol: number; gapsCount: number;
  intentDist: { label: string; count: number; pct: number; color: string }[];
  kdHist: { label: string; count: number }[];
  catOpps: { name: string; top: KwItem | null; vol: number }[];
  topGaps: ContentGaps["topGaps"];
  onKw: (d: KwItem) => void; onGap: (d: ContentGaps["topGaps"][number]) => void; onCreateBrief: () => void;
}) {
  const [sub, setSub] = useState("All Keywords");
  const [q, setQ] = useState("");
  const [intentF, setIntentF] = useState("All Intent");
  const [kdF, setKdF] = useState("All KD");
  const SUBS = ["All Keywords", "High Opportunity", "Keyword Gaps", "By Intent"];
  const intents = ["All Intent", ...Array.from(new Set(keywords.map((k) => k.intent)))];
  const inKd = (kd: number) => kdF === "All KD" ? true : kdF === "Easy" ? kd <= 30 : kdF === "Medium" ? kd > 30 && kd <= 60 : kd > 60;
  const filtered = keywords
    .filter((k) => sub === "High Opportunity" ? k.opportunity >= 85 : true)
    .filter((k) => { const s = q.trim().toLowerCase(); return !s || k.keyword.toLowerCase().includes(s); })
    .filter((k) => intentF === "All Intent" ? true : k.intent === intentF)
    .filter((k) => inKd(k.kd));
  const rows = filtered.slice(0, 14);
  const avgOpp = keywords.length ? Math.round(keywords.reduce((s, k) => s + k.opportunity, 0) / keywords.length) : 0;
  const intentTot = intentDist.reduce((s, d) => s + d.count, 0);
  const maxHist = Math.max(1, ...kdHist.map((h) => h.count));
  const oppColor = (o: number) => (o >= 85 ? "#34d399" : o >= 70 ? "#fbbf24" : "#fb7185");

  const kpis: { label: string; value: React.ReactNode; Icon: React.ElementType; color: string }[] = [
    { label: "Total Keywords", value: keywords.length.toLocaleString(), Icon: Target, color: "#8b5cf6" },
    { label: "High Opportunity", value: highOpp, Icon: Sparkles, color: "#34d399" },
    { label: "Keyword Gaps", value: gapsCount, Icon: TrendingUp, color: "#fb7185" },
    { label: "Avg KD", value: avgKd, Icon: BarChart3, color: "#fbbf24" },
    { label: "Total Volume", value: vol >= 1000 ? `${(vol / 1000).toFixed(1)}K` : vol, Icon: Search, color: "#38bdf8" },
    { label: "Avg Opportunity", value: avgOpp, Icon: Gauge, color: "#a78bfa" },
  ];

  const NEXT = [
    { title: "Create SEO Briefs", detail: `Turn the top ${Math.min(10, highOpp)} high-opportunity keywords into briefs.`, Icon: FileText, action: onCreateBrief },
    { title: "Target Keyword Gaps", detail: `Fill ${gapsCount} gaps competitors rank for and you don't.`, Icon: Target, action: () => setSub("Keyword Gaps") },
    { title: "Focus Low-KD Wins", detail: `${keywords.filter((k) => k.kd <= 30).length} easy keywords to rank fast.`, Icon: TrendingUp, action: () => setKdF("Easy") },
  ];

  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><c.Icon className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
          </Item>
        ))}
      </Stagger>

      <div><h2 className="text-sm font-bold text-white">Keyword Intelligence</h2><p className="text-[11px] text-slate-500">Discover, analyze &amp; prioritize the best keyword opportunities — from real search demand, difficulty &amp; competitor gaps.</p></div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="flex items-center gap-1.5 px-4 pt-3 flex-wrap">{SUBS.map((s) => <button key={s} onClick={() => setSub(s)} className={`px-3 h-8 rounded-lg text-[12px] font-semibold ${sub === s ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-ink-800"}`}>{s}</button>)}</div>
            <div className="flex items-center gap-2 p-4 flex-wrap border-b border-ink-800">
              <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" /></div>
              <select value={intentF} onChange={(e) => setIntentF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none">{intents.map((i) => <option key={i}>{i}</option>)}</select>
              <select value={kdF} onChange={(e) => setKdF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none">{["All KD", "Easy", "Medium", "Hard"].map((k) => <option key={k}>{k}</option>)}</select>
              <span className="text-[11px] text-slate-500 ml-auto">{filtered.length}</span>
            </div>
            {sub === "Keyword Gaps" ? (
              <div className="overflow-x-auto"><table className="w-full text-left min-w-[560px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 pl-4 pr-3 font-semibold">Keyword</th><th className="font-semibold text-right">Volume</th><th className="font-semibold text-right">KD</th><th className="font-semibold">You Rank</th><th className="font-semibold">Top Competitor</th><th className="pr-4"></th></tr></thead>
                <tbody>{topGaps.map((g, i) => <tr key={i} onClick={() => onGap(g)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2.5 pl-4 pr-3 text-[11px] font-semibold text-white truncate max-w-[200px]">{g.keyword}</td><td className="text-[11px] text-slate-300 text-right">{g.volume >= 1000 ? `${(g.volume / 1000).toFixed(1)}K` : g.volume}</td><td className="text-[11px] text-slate-400 text-right">{g.kd}</td><td className="text-[10px] text-slate-500">{g.yourRank}</td><td className="text-[10px] text-slate-400 truncate max-w-[120px]">{g.competitor}</td><td className="pr-4 text-right"><ChevronRight className="w-4 h-4 text-slate-600 inline" /></td></tr>)}{topGaps.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[11px] text-slate-500">No gaps.</td></tr>}</tbody></table></div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-left min-w-[560px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 pl-4 pr-3 font-semibold">Keyword</th><th className="font-semibold text-right">Volume</th><th className="font-semibold text-right">KD</th><th className="font-semibold">Intent</th><th className="font-semibold text-right">Opportunity</th><th className="pr-4"></th></tr></thead>
                <tbody>{rows.map((k, i) => <tr key={i} onClick={() => onKw(k)} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer"><td className="py-2.5 pl-4 pr-3 text-[11px] font-semibold text-white truncate max-w-[220px]">{k.keyword}</td><td className="text-[11px] text-slate-300 text-right">{k.volume >= 1000 ? `${(k.volume / 1000).toFixed(1)}K` : k.volume}</td><td className="text-[11px] text-slate-400 text-right">{k.kd}</td><td className="text-[10px]"><span className="px-1.5 py-0.5 rounded bg-ink-800 text-slate-300">{k.intent}</span></td><td className="text-right"><span className="inline-flex items-center gap-1 justify-end"><span className="w-1.5 h-1.5 rounded-full" style={{ background: oppColor(k.opportunity) }} /><span className="text-[11px] font-bold text-white">{k.opportunity}</span></span></td><td className="pr-4 text-right"><ChevronRight className="w-4 h-4 text-slate-600 inline" /></td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[11px] text-slate-500">No keywords match.</td></tr>}</tbody></table></div>
            )}
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <h3 className="text-sm font-bold text-white mb-3">Distribution by Intent</h3>
            {intentTot === 0 ? <div className="py-6 text-center text-[11px] text-slate-500">No data.</div> : (
              <div className="flex items-center gap-3"><MultiDonut segments={intentDist.map((d) => ({ count: d.count, color: d.color }))} total={intentTot} size={104} stroke={13} />
                <ul className="space-y-1 flex-1 min-w-0">{intentDist.map((d) => <li key={d.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} /><span className="text-slate-400 flex-1 truncate">{d.label}</span><span className="text-white font-bold">{d.count}</span><span className="text-slate-600">{d.pct}%</span></li>)}</ul>
              </div>
            )}
          </div></FadeUp>
          <FadeUp delay={0.05}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <h3 className="text-sm font-bold text-white mb-3">Keyword Difficulty Distribution</h3>
            <div className="flex items-end gap-2 h-28">{kdHist.map((h) => { const col = h.label === "0-10" || h.label === "11-30" ? "#34d399" : h.label === "31-50" || h.label === "51-70" ? "#fbbf24" : "#fb7185"; return <div key={h.label} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t bg-ink-800 relative flex items-end" style={{ height: "100%" }}><motion.div className="w-full rounded-t" style={{ background: col }} initial={{ height: 0 }} animate={{ height: `${(h.count / maxHist) * 100}%` }} transition={{ duration: 0.6 }} /></div><span className="text-[9px] text-slate-500">{h.label}</span><span className="text-[10px] font-bold text-white">{h.count}</span></div>; })}</div>
          </div></FadeUp>
          <FadeUp delay={0.1}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <h3 className="text-sm font-bold text-white mb-3">Top Opportunities by Category</h3>
            <ul className="space-y-2">{catOpps.map((c) => <li key={c.name} className="flex items-center gap-2 text-[11px]"><div className="min-w-0 flex-1"><div className="text-slate-200 font-semibold truncate">{c.name}</div><div className="text-[9px] text-slate-500 truncate">{c.top?.keyword || "—"}</div></div><span className="text-slate-300 tabular-nums">{c.vol >= 1000 ? `${(c.vol / 1000).toFixed(1)}K` : c.vol}</span></li>)}{catOpps.length === 0 && <li className="text-[11px] text-slate-500 text-center py-2">No data.</li>}</ul>
          </div></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {NEXT.map((n) => (
          <button key={n.title} onClick={n.action} className="text-left rounded-2xl border border-ink-800 bg-ink-900/50 p-4 hover:border-emerald-500/40 group">
            <div className="flex items-center gap-2 mb-1.5"><span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 grid place-items-center"><n.Icon className="w-4 h-4" /></span><span className="text-[12px] font-bold text-white group-hover:text-emerald-300">{n.title}</span></div>
            <p className="text-[11px] text-slate-500 leading-snug">{n.detail}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-600"><Sparkles className="w-3 h-3" /> Keywords, volume, difficulty &amp; opportunity are from real briefs, content gaps &amp; demand — no demo. Live SERP positions require Search Console.</div>
    </div>
  );
}
