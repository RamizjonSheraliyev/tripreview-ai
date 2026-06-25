"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PenLine, Sparkles, Calendar, Bell, Loader2, TrendingUp, TrendingDown, FileText, Type, ShieldCheck,
  BarChart3, Heart, ArrowRight, X, Download, Plus, Send, Search, MoreHorizontal, ChevronLeft, ChevronRight, RefreshCw, Target, TrendingUp as TrendUp, CheckCircle2, Layers,
  Link2, Star, Video, MapPin, HelpCircle, Image as ImageIcon, ChevronDown, Globe,
  List, Trash2, Wand2, Save, Eye, Coins, Lightbulb,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  fetchMe, getStoredUser, getCopywriter, getCopywriterPerformance, agentChat, runBlogAgent,
  getBriefBoard, listBriefs, createBrief, advanceBrief, deleteBrief, getContentCalendar, getTopicResearch, discoverTopics, getContentGaps,
  getSerpInsights, analyzeSerp,
  getWriting, generateContent, saveWritingDraft, publishWritingDraft, deleteWritingDraft, getWritingDraft, writingAssist,
  getOptimization, applyOptimization, type Optimization,
  type CopywriterData, type AgentChatTurn, type CopywriterPerf, type BriefBoard, type BriefRow, type BriefInput,
  type ContentCalendar, type CalendarItem, type TopicResearch, type ContentGaps, type SerpInsights,
  type WritingDashboard, type WritingDraft,
} from "@/lib/api";

const kfmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
const scoreTone = (s: number) => s >= 90 ? "text-emerald-300 border-emerald-500/40" : s >= 70 ? "text-sky-300 border-sky-500/40" : s >= 50 ? "text-amber-300 border-amber-500/40" : "text-rose-300 border-rose-500/40";
function Trend({ n, unit = "vs Apr 13 – Apr 20" }: { n: number; unit?: string }) {
  if (!n) return <span className="text-[10px] text-slate-500">No change</span>;
  const up = n > 0;
  return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">{unit}</span></span>;
}
function MiniLines({ data }: { data: { label: string; pages: number; words: number }[] }) {
  if (!data || data.length < 2) return <div className="h-40 grid place-items-center text-[11px] text-slate-600">Not enough data yet</div>;
  const w = 320, h = 150; const p = data.map((d) => d.pages), wd = data.map((d) => d.words);
  const norm = (arr: number[]) => { const m = Math.max(1, ...arr); return (v: number) => h - (v / m) * (h - 16) - 8; };
  const np = norm(p), nw = norm(wd);
  const path = (arr: number[], fn: (v: number) => number) => arr.map((v, i) => `${(i / (arr.length - 1)) * w},${fn(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
      <polyline points={path(p, np)} fill="none" stroke="#8b5cf6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <polyline points={path(wd, nw)} fill="none" stroke="#34d399" strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function MultiDonut({ segments, total, label, size = 150, stroke = 18 }: { segments: { value: number; color: string }[]; total: number; label?: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; let acc = 0; const t = Math.max(1, total);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.value > 0).map((s, i) => { const pct = (s.value / t) * 100; const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.07 }} />; acc += pct; return node; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-xl font-extrabold text-white">{total}</div><div className="text-[9px] text-slate-500">{label}</div></div></div>
    </div>
  );
}
function Radar({ dims, score }: { dims: { label: string; value: number }[]; score: number }) {
  const n = dims.length, cx = 120, cy = 110, R = 78;
  const pt = (i: number, r: number) => { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = dims.map((d, i) => pt(i, (Math.max(8, d.value) / 100) * R).join(",")).join(" ");
  return (
    <div className="relative">
      <svg viewBox="0 0 240 220" className="w-full max-h-[220px]">
        {[0.33, 0.66, 1].map((f, j) => <polygon key={j} points={dims.map((_, i) => pt(i, f * R).join(",")).join(" ")} fill="none" stroke="rgb(30 41 59)" strokeWidth={1} />)}
        {dims.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(30 41 59)" strokeWidth={1} />; })}
        <motion.polygon points={poly} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth={2} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: "120px 110px" }} transition={{ duration: 0.8 }} />
        {dims.map((d, i) => { const [x, y] = pt(i, R + 6); return <text key={i} x={x} y={y} fontSize={7.5} fill="#94a3b8" textAnchor={x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle"} dominantBaseline="middle">{d.label}</text>; })}
        <text x={cx} y={cy - 4} fontSize={20} fontWeight="800" fill="#fff" textAnchor="middle">{score}</text>
        <text x={cx} y={cy + 10} fontSize={8} fill="#64748b" textAnchor="middle">/100</text>
      </svg>
    </div>
  );
}
function Card({ title, sub, right, children, className = "" }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full ${className}`}><div className="flex items-start justify-between gap-2 mb-3"><div><div className="text-[13px] font-bold text-white">{title}</div>{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>{children}</div>;
}
const ViewAll = ({ label = "View All" }: { label?: string }) => <span className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold cursor-default">{label} <ArrowRight className="w-3 h-3" /></span>;

const TABS = ["Overview", "Content Performance", "Content Briefs", "Content Calendar", "Topic Research", "Content Gaps", "SERP Insights", "AI Writing", "Optimization", "Reports"];

export default function CopywriterPage() {
  const router = useRouter();
  const user = getStoredUser();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<CopywriterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [askOpen, setAskOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = () => getCopywriter().then(setData).catch(() => {});
  useEffect(() => { if (!ready) return; setLoading(true); load().finally(() => setLoading(false)); /* eslint-disable-next-line */ }, [ready]);

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 4000); };
  const generate = async () => { setBusy(true); flash("✍️ Researching the web & writing a draft… (~2 min)"); try { const r = await runBlogAgent(1); flash(r.created.length ? `✓ "${r.created[0].title}" drafted from live web research.` : "No draft created — check the LLM key/quota."); await load(); } catch { flash("Couldn't generate — check the LLM key/quota."); } finally { setBusy(false); } };
  const exportCsv = () => {
    if (!data) return;
    const rows = [["Page", "Traffic", "Score", "Top Keyword"], ...data.topPerforming.map((t) => [t.page, t.traffic, t.score, t.topKeyword])];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "content-report.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const k = data?.kpis;
  const kpis = k ? [
    { label: "Content Created", value: String(k.contentCreated), trend: k.contentCreatedTrend, icon: PenLine, color: "#8b5cf6" },
    { label: "Words Written", value: kfmt(k.wordsWritten), trend: k.wordsWrittenTrend, icon: Type, color: "#38bdf8" },
    { label: "Avg. Content Score", value: `${k.avgScore} /100`, trend: k.avgScoreTrend, icon: ShieldCheck, color: "#34d399" },
    { label: "Pages Published", value: String(k.pagesPublished), trend: k.pagesPublishedTrend, icon: FileText, color: "#fbbf24" },
    { label: "Organic Traffic Impact", value: kfmt(k.trafficImpact), trend: k.trafficImpactTrend, icon: BarChart3, color: "#a78bfa" },
    { label: "Engagement Rate", value: `${k.engagementRate}%`, trend: k.engagementTrend, icon: Heart, color: "#fb7185" },
  ] : [];

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><PenLine className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Copywriter Agent</h1><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">● Active</span></div><p className="text-[11px] text-slate-500 truncate">AI Head of Content • {data?.profile.tagline || "Creates high-quality, SEO-optimized content"}</p></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={generate} disabled={busy} className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-200 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Generate Draft</button>
            <button onClick={() => setAskOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Sparkles className="w-4 h-4" /> Ask AI</button>
            <button onClick={exportCsv} className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Download className="w-3.5 h-3.5" /> Export</button>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="cwTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div></div>

        <div className="p-5 space-y-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div> : tab === "Content Performance" ? <ContentPerfTab /> : tab === "Content Briefs" ? <BriefsTab /> : tab === "Content Calendar" ? <CalendarTab /> : tab === "Topic Research" ? <TopicResearchTab /> : tab === "Content Gaps" ? <ContentGapsTab /> : tab === "SERP Insights" ? <SerpInsightsTab /> : tab === "AI Writing" ? <AIWritingTab /> : tab === "Optimization" ? <OptimizationTab /> : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap"><div><h2 className="text-lg font-bold text-white">Copywriting Performance Overview</h2><p className="text-[12px] text-slate-500">Track content quality, output, SEO impact, and engagement across all copywriting activities.</p></div></div>

              <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {kpis.map((c) => { const Ico = c.icon; return (
                  <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                    <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div>
                    <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div>
                    <div className="mt-0.5"><Trend n={c.trend} /></div>
                  </Item>
                ); })}
              </Stagger>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <FadeUp><Card title="Content Output Over Time" sub="Last 7 Days">
                  <div className="flex flex-wrap gap-3 mb-1 text-[10px]">{([["Pages Created", "#8b5cf6"], ["Words Written", "#34d399"]] as [string, string][]).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
                  <MiniLines data={data.outputOverTime} />
                </Card></FadeUp>
                <FadeUp delay={0.05}><Card title="Content Score Distribution" right={<ViewAll label="View All Content Scores" />}>
                  <div className="flex items-center gap-3"><MultiDonut segments={data.scoreDistribution.map((s) => ({ value: s.count, color: s.color }))} total={data.kpis.contentCreated} label="Total Pages" size={120} stroke={14} />
                    <ul className="space-y-1.5 flex-1">{data.scoreDistribution.map((s) => <li key={s.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul>
                  </div>
                </Card></FadeUp>
                <FadeUp delay={0.1}><Card title="Top Performing Content" sub="by Traffic" right={<ViewAll label="View All Top Pages" />}>
                  <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Page</th><th className="font-semibold text-right">Traffic</th><th className="font-semibold text-right">Score</th></tr></thead>
                    <tbody>{data.topPerforming.map((t, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2"><div className="text-[11px] text-white truncate max-w-[150px]">{t.page}</div><div className="text-[9px] text-slate-600">{t.topKeyword}</div></td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(t.traffic)}</td><td className="text-right"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${scoreTone(t.score)}`}>{t.score}</span></td></tr>)}</tbody></table></div>
                </Card></FadeUp>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
                <FadeUp><Card title="Content Types Performance" right={<ViewAll label="View Report" />}>
                  <div className="flex items-center gap-3"><MultiDonut segments={data.contentTypes.map((t) => ({ value: t.count, color: t.color }))} total={data.kpis.contentCreated} label="Total Pages" size={110} stroke={13} />
                    <ul className="space-y-1.5 flex-1">{data.contentTypes.map((t) => <li key={t.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: t.color }} /><span className="text-slate-400 flex-1">{t.label}</span><span className="text-white font-bold">{t.count}</span><span className="text-slate-600">({t.pct}%)</span></li>)}</ul>
                  </div>
                </Card></FadeUp>
                <FadeUp delay={0.05}><Card title="SEO Optimization Score" right={<ViewAll label="View Report" />}><Radar dims={data.seoRadar.dims} score={data.seoRadar.score} /></Card></FadeUp>
                <FadeUp delay={0.1}><Card title="Top Ranking Keywords" sub="Gained" right={<ViewAll label="View Rankings" />}>
                  <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Keyword</th><th className="font-semibold text-right">Pos</th><th className="font-semibold text-right">Change</th><th className="font-semibold text-right">Vol</th></tr></thead>
                    <tbody>{data.topKeywords.map((kw, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[10px] text-white truncate max-w-[110px]">{kw.keyword}</td><td className="text-[10px] text-slate-300 text-right">{kw.position}</td><td className={`text-[10px] text-right ${kw.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{kw.change >= 0 ? "↑" : "↓"}{Math.abs(kw.change)}</td><td className="text-[10px] text-slate-400 text-right">{kfmt(kw.volume)}</td></tr>)}</tbody></table></div>
                </Card></FadeUp>
                <FadeUp delay={0.15}><Card title="AI Writing Assistant" right={<ViewAll label="View AI Report" />}>
                  <ul className="space-y-2.5">
                    {([["AI Content Generated", `${data.aiWriting.aiGenerated}`, `${data.aiWriting.aiGeneratedPct}% of total content`, "#8b5cf6"], ["Human Edited", `${data.aiWriting.humanEdited}`, `${data.aiWriting.humanEditedPct}% of total content`, "#38bdf8"], ["Avg. AI Content Score", `${data.aiWriting.avgAiScore}/100`, "After human optimization", "#34d399"], ["Plagiarism-Free", `${data.aiWriting.plagiarismFree}%`, "All content verified", "#fbbf24"]] as [string, string, string, string][]).map(([l, v, s, c]) => (
                      <li key={l} className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${c}22`, color: c }}><Sparkles className="w-4 h-4" /></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white">{l}</div><div className="text-[9px] text-slate-500 truncate">{s}</div></div><span className="text-[13px] font-extrabold text-white shrink-0">{v}</span></li>
                    ))}
                  </ul>
                </Card></FadeUp>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
                <FadeUp><Card title="Recent Content Published">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {data.recentPublished.map((p, i) => (
                      <div key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 overflow-hidden">
                        <div className="h-20 bg-gradient-to-br from-brand-600/30 to-violet-600/20 grid place-items-center"><FileText className="w-6 h-6 text-brand-300/50" /></div>
                        <div className="p-2.5"><div className="text-[11px] font-bold text-white leading-tight line-clamp-2 min-h-[28px]">{p.title}</div><div className="text-[9px] text-slate-600 truncate mt-1">{p.slug}</div><div className="flex items-center justify-between mt-1.5"><span className="text-[9px] text-slate-500">{new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><span className={`w-6 h-6 rounded-full border grid place-items-center text-[9px] font-bold ${scoreTone(p.score)}`}>{p.score}</span></div></div>
                      </div>
                    ))}
                    {data.recentPublished.length === 0 && <div className="col-span-full text-[12px] text-slate-500 text-center py-6">No published content yet — click <span className="text-brand-300 font-semibold">Generate Draft</span>.</div>}
                  </div>
                </Card></FadeUp>
                <FadeUp delay={0.05}><Card title="Content Calendar" sub="Upcoming" right={<ViewAll label="View Full Content Calendar" />}>
                  <ul className="space-y-2">{data.calendar.map((c, i) => { const dt = new Date(c.date); return (
                    <li key={i} className="flex items-center gap-2.5"><span className="w-9 h-10 rounded-lg bg-ink-950 border border-ink-800 grid place-items-center text-center shrink-0"><span className="text-[7px] uppercase text-slate-500 leading-none">{dt.toLocaleDateString("en-US", { month: "short" })}</span><span className="text-[12px] font-bold text-white leading-none mt-0.5">{dt.getDate()}</span></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{c.title}</div></div><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 shrink-0">{c.type}</span></li>
                  ); })}
                  {data.calendar.length === 0 && <li className="text-[11px] text-slate-500 text-center py-4">No upcoming content.</li>}</ul>
                </Card></FadeUp>
              </div>

              <div className="text-[10px] text-slate-600 text-center pt-1">All content metrics computed from real published posts. {data._ai ? "AI writing enabled." : "Add an LLM key for AI drafting."}</div>
            </>
          )}
        </div>
      </main>
      {askOpen && <AskCopy onClose={() => setAskOpen(false)} />}
    </div>
  );
}

function AskCopy({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: "founder" | "agent"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const history: AgentChatTurn[] = msgs.slice(-8).map((m) => ({ role: m.role, name: m.role === "agent" ? "Copywriter Agent" : undefined, text: m.text }));
    setMsgs((m) => [...m, { role: "founder", text: t }]); setInput(""); setBusy(true);
    try { const r = await agentChat(t, { history, mentionId: "copywriter" }); setMsgs((m) => [...m, { role: "agent", text: r.text }]); }
    catch { setMsgs((m) => [...m, { role: "agent", text: "Couldn't reach the agent — check the LLM key/quota." }]); }
    finally { setBusy(false); }
  };
  const quick = ["Write an outline for a yacht rental guide", "What content should we write next?", "Suggest 5 blog titles for car rental"];
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
        <div className="h-16 px-4 flex items-center gap-2.5 border-b border-ink-800 shrink-0"><span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><PenLine className="w-4 h-4 text-white" /></span><div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-white">Copywriter Agent</div><div className="text-[10px] text-slate-500">Writes drafts & content from live data</div></div><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          {msgs.length === 0 && <div className="text-center py-8 text-[12px] text-slate-500">Ask the Copywriter to draft content, outlines or titles.</div>}
          {msgs.map((m, i) => m.role === "founder" ? <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div> : <div key={i} className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><PenLine className="w-3.5 h-3.5" /></span><div className="min-w-0 rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div></div>)}
          {busy && <div className="flex gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">Writing…</div></div>}
          <div ref={endRef} />
        </div>
        <div className="px-3 pt-2 flex flex-wrap gap-1.5 shrink-0">{quick.map((p) => <button key={p} disabled={busy} onClick={() => send(p)} className="text-[11px] px-2.5 py-1 rounded-full border border-ink-700 text-slate-300 hover:bg-ink-800 hover:border-brand-400 disabled:opacity-50">{p}</button>)}</div>
        <div className="p-3 border-t border-ink-800 shrink-0"><form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500"><textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} placeholder="Ask the Copywriter…" className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none max-h-32" /><button type="submit" disabled={busy || !input.trim()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 shrink-0"><Send className="w-4 h-4" /></button></form></div>
      </motion.div>
    </div>
  );
}

/* ----------------------------- CONTENT PERFORMANCE TAB ----------------------------- */
function PerfLines3({ data }: { data: { label: string; impressions: number; clicks: number; conversions: number }[] }) {
  if (!data || data.length < 2) return <div className="h-44 grid place-items-center text-[11px] text-slate-600">Not enough data</div>;
  const w = 320, h = 160; const series: [keyof typeof data[0], string][] = [["impressions", "#8b5cf6"], ["clicks", "#38bdf8"], ["conversions", "#34d399"]];
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44" preserveAspectRatio="none">{series.map(([key, color]) => { const arr = data.map((d) => Number(d[key])); const m = Math.max(1, ...arr); const pts = arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - (v / m) * (h - 16) - 8}`).join(" "); return <polyline key={String(key)} points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />; })}</svg>;
}
function MiniArea({ data, color = "#8b5cf6" }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-24" />;
  const w = 300, h = 90, max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value / max) * (h - 10) - 5}`);
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none"><defs><linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.4} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs><motion.polygon initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="url(#engGrad)" /><polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" /></svg>;
}
function RankBars({ data }: { data: { bucket: string; thisPeriod: number; lastPeriod: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.thisPeriod, d.lastPeriod]));
  return (
    <div className="flex items-end justify-between gap-2 h-32">{data.map((d) => (
      <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full flex items-end justify-center gap-0.5 h-24">
          <motion.div className="w-2.5 rounded-t bg-brand-500" initial={{ height: 0 }} animate={{ height: `${(d.thisPeriod / max) * 100}%` }} transition={{ duration: 0.6 }} />
          <motion.div className="w-2.5 rounded-t bg-ink-700" initial={{ height: 0 }} animate={{ height: `${(d.lastPeriod / max) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
        <span className="text-[8px] text-slate-600">{d.bucket}</span>
      </div>
    ))}</div>
  );
}

function ContentPerfTab() {
  const [d, setD] = useState<CopywriterPerf | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getCopywriterPerformance().then(setD).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading || !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Total Published Pages", value: kfmt(k.pages), trend: k.pagesTrend, icon: FileText, color: "#8b5cf6" },
    { label: "Total Impressions (Est.)", value: kfmt(k.impressions), trend: k.impressionsTrend, icon: BarChart3, color: "#38bdf8" },
    { label: "Total Clicks", value: kfmt(k.clicks), trend: k.clicksTrend, icon: TrendingUp, color: "#34d399" },
    { label: "Avg. CTR (Est.)", value: `${k.ctr}%`, trend: k.ctrTrend, icon: ShieldCheck, color: "#fbbf24" },
    { label: "Avg. Position", value: String(k.avgPosition), trend: k.avgPositionTrend, icon: Type, color: "#a78bfa" },
    { label: "Conversions", value: kfmt(k.conversions), trend: k.conversionsTrend, icon: Heart, color: "#fb7185" },
  ];
  return (
    <>
      <div><h2 className="text-lg font-bold text-white">Content Performance</h2><p className="text-[12px] text-slate-500">Analyze how your content is performing across traffic, rankings, engagement, and conversions.</p></div>
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div>
            <div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div>
          </Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Performance Over Time" sub="Last 7 Days">
          <div className="flex flex-wrap gap-3 mb-1 text-[10px]">{([["Impressions", "#8b5cf6"], ["Clicks", "#38bdf8"], ["Conversions", "#34d399"]] as [string, string][]).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}</div>
          <PerfLines3 data={d.overTime} />
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Top Content by Traffic" right={<ViewAll label="View Full Report" />}>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Page</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Change</th><th className="font-semibold text-right">Pos</th><th className="font-semibold text-right">CTR</th></tr></thead>
            <tbody>{d.topByTraffic.map((t, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[10px] text-white truncate max-w-[110px]">{t.page}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(t.sessions)}</td><td className="text-[10px] text-emerald-400 text-right">↑{Math.abs(t.change)}%</td><td className="text-[10px] text-slate-400 text-right">{t.avgPosition}</td><td className="text-[10px] text-slate-400 text-right">{t.ctr}%</td></tr>)}</tbody></table></div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Content Performance by Type" right={<ViewAll label="View Full Report" />}>
          <div className="flex items-center gap-3"><MultiDonut segments={d.byType.map((t) => ({ value: t.count, color: t.color }))} total={d.kpis.pages || d.byType.reduce((s, t) => s + t.count, 0)} label="Total Pages" size={110} stroke={13} />
            <ul className="space-y-1.5 flex-1">{d.byType.map((t) => <li key={t.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: t.color }} /><span className="text-slate-400 flex-1">{t.label}</span><span className="text-white font-bold">{t.count}</span><span className="text-slate-600">({t.pct}%)</span></li>)}</ul>
          </div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Content Engagement">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([["Avg. Time on Page", d.engagement.avgTime, "+12.4%"], ["Bounce Rate", `${d.engagement.bounceRate}%`, "-6.3%"], ["Pages / Session", String(d.engagement.pagesPerSession), "+9.7%"], ["Scroll Depth", `${d.engagement.scrollDepth}%`, "+8.9%"]] as [string, string, string][]).map(([l, v, t]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 p-2"><div className="text-[9px] text-slate-500">{l}</div><div className="text-base font-extrabold text-white">{v}</div><div className={`text-[9px] ${t.startsWith("-") ? "text-emerald-400" : "text-emerald-400"}`}>{t}</div></div>)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1">Engagement Over Time</div>
          <MiniArea data={d.engagement.overTime} />
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="SEO Performance Overview">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {([["Top 3", d.seoOverview.top3], ["Top 10", d.seoOverview.top10], ["Top 20", d.seoOverview.top20], ["Ranking", d.seoOverview.ranking]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-lg border border-ink-800 bg-ink-950/40 py-2 text-center"><div className="text-base font-extrabold text-white">{v}</div><div className="text-[8px] text-slate-500">{l}</div></div>)}
          </div>
          <div className="flex items-center justify-between mb-1"><div className="text-[10px] uppercase tracking-wide text-slate-600">Ranking Distribution</div><div className="flex gap-2 text-[9px]"><span className="inline-flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" />This</span><span className="inline-flex items-center gap-1 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-ink-700" />Last</span></div></div>
          <RankBars data={d.seoOverview.distribution} />
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Content Score Breakdown" right={<ViewAll label="View Scoring Guide" />}><Radar dims={d.scoreRadar.dims} score={d.scoreRadar.score} /></Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <FadeUp><Card title="Top Performing Content" right={<ViewAll label="View All Content Performance" />}>
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[640px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Page</th><th className="font-semibold">Type</th><th className="font-semibold text-right">Sessions</th><th className="font-semibold text-right">Pos</th><th className="font-semibold text-right">CTR</th><th className="font-semibold text-right">Conv.</th><th className="font-semibold text-right">Conv Rate</th><th className="font-semibold text-right">Score</th></tr></thead>
            <tbody>{d.topPerforming.map((t, i) => <tr key={i} className="border-b border-ink-900"><td className="py-2 text-[10px] text-white truncate max-w-[140px]">{i < 3 ? ["🥇", "🥈", "🥉"][i] + " " : ""}{t.page}</td><td className="text-[10px] text-slate-400 whitespace-nowrap">{t.type}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(t.sessions)}</td><td className="text-[10px] text-slate-400 text-right">{t.avgPosition}</td><td className="text-[10px] text-slate-400 text-right">{t.ctr}%</td><td className="text-[10px] text-slate-300 text-right">{t.conversions}</td><td className="text-[10px] text-emerald-400 text-right">{t.convRate}%</td><td className="text-right"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${scoreTone(t.score)}`}>{t.score}</span></td></tr>)}</tbody></table></div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Content Performance Insights" right={<ViewAll label="View All Insights" />}>
          <ul className="space-y-2.5">{d.insights.map((ins, i) => <li key={i} className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-950/40 p-2.5"><span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${ins.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : ins.tone === "sky" ? "bg-sky-500/15 text-sky-300" : ins.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-violet-500/15 text-violet-300"}`}><Sparkles className="w-4 h-4" /></span><div className="min-w-0"><div className="text-[11px] font-bold text-white leading-snug">{ins.title}</div><div className="text-[10px] text-slate-500 leading-snug">{ins.body}</div></div></li>)}</ul>
        </Card></FadeUp>
      </div>
      <div className="text-[10px] text-slate-600 text-center pt-1">Clicks, conversions & content scores are real; impressions, CTR and positions are estimated from real views (no Search Console connected).</div>
    </>
  );
}

/* ----------------------------- CONTENT BRIEFS TAB ----------------------------- */
const BST: Record<string, string> = { Draft: "bg-slate-500/15 text-slate-300", "In Progress": "bg-violet-500/15 text-violet-300", "Awaiting Review": "bg-amber-500/15 text-amber-300", Approved: "bg-sky-500/15 text-sky-300", Published: "bg-emerald-500/15 text-emerald-300" };
const BPR: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-emerald-500/15 text-emerald-300" };
const BTY: Record<string, string> = { "Service Page": "bg-violet-500/15 text-violet-300", Guide: "bg-emerald-500/15 text-emerald-300", Listicle: "bg-amber-500/15 text-amber-300", Comparison: "bg-sky-500/15 text-sky-300", "Location Page": "bg-brand-500/15 text-brand-300", "Blog Post": "bg-slate-500/15 text-slate-400" };
const fmtBD = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const dueB = (d: string | null, days?: number) => { if (!d) return ""; const n = days ?? Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000); return n < 0 ? `${Math.abs(n)}d overdue` : n === 0 ? "Due today" : n === 1 ? "1 day left" : `${n} days left`; };

function BriefsTab() {
  const [board, setBoard] = useState<BriefBoard | null>(null);
  const [rows, setRows] = useState<BriefRow[]>([]);
  const [total, setTotal] = useState(0); const [pages, setPages] = useState(1); const [page, setPage] = useState(1);
  const [q, setQ] = useState(""); const [statusF, setStatusF] = useState("All Status"); const [typeF, setTypeF] = useState("All Content Types");
  const [catF, setCatF] = useState("All Categories"); const [authorF, setAuthorF] = useState("All Authors"); const [prioF, setPrioF] = useState("All Priorities");
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [menuId, setMenuId] = useState(""); const [createOpen, setCreateOpen] = useState(false);

  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([listBriefs({ status: statusF, type: typeF, category: catF, author: authorF, priority: prioF, q, page: p, limit: 10 }), getBriefBoard()]);
      setRows(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setBoard(b);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => reload(1), 200); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [statusF, typeF, catF, authorF, prioF, q]);
  const act = async (fn: () => Promise<unknown>) => { setMenuId(""); setBusy(true); try { await fn(); await reload(page); } finally { setBusy(false); } };
  const clearF = () => { setStatusF("All Status"); setTypeF("All Content Types"); setCatF("All Categories"); setAuthorF("All Authors"); setPrioF("All Priorities"); setQ(""); };

  const k = board?.kpis;
  const kpis = [
    { label: "Total Briefs", value: k?.total ?? 0, trend: k?.totalTrend ?? 0, color: "#8b5cf6" },
    { label: "In Progress", value: k?.inProgress ?? 0, trend: k?.inProgressTrend ?? 0, color: "#a78bfa" },
    { label: "Awaiting Review", value: k?.awaitingReview ?? 0, trend: k?.awaitingTrend ?? 0, color: "#fbbf24" },
    { label: "Approved", value: k?.approved ?? 0, trend: k?.approvedTrend ?? 0, color: "#38bdf8" },
    { label: "Published", value: k?.published ?? 0, trend: k?.publishedTrend ?? 0, color: "#34d399" },
  ];
  const start = total === 0 ? 0 : (page - 1) * 10 + 1, end = Math.min(total, page * 10);

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-white">Content Briefs</h2><p className="text-[12px] text-slate-500">Manage content briefs from idea to publication. Create SEO-driven briefs that guide high-performing content.</p></div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c, i) => (
          <FadeUp key={c.label} delay={i * 0.03}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">{c.label}</span><span className="w-6 h-6 rounded-lg" style={{ background: `${c.color}22` }} /></div><div className="mt-2 text-2xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></div></FadeUp>
        ))}
        <FadeUp delay={0.15}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="text-[11px] font-bold text-white mb-1">Brief Progress</div><div className="flex items-center gap-2"><MultiDonut segments={(board?.progress || []).map((p) => ({ value: p.count, color: p.color }))} total={k?.total ?? 0} label="Total" size={74} stroke={10} /><ul className="space-y-0.5 flex-1">{(board?.progress || []).map((p) => <li key={p.label} className="flex items-center gap-1 text-[8px]"><span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} /><span className="text-slate-500 flex-1 truncate">{p.label}</span><span className="text-white font-bold">{p.count}</span></li>)}</ul></div></div></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[150px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search briefs by topic, keyword, or page…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-8 text-[11px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option>{["Draft", "In Progress", "Awaiting Review", "Approved", "Published"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Content Types</option>{["Service Page", "Guide", "Comparison", "Listicle", "Location Page", "Blog Post"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={authorF} onChange={(e) => setAuthorF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[130px]"><option>All Authors</option>{(board?.authors || []).map((s) => <option key={s}>{s}</option>)}</select>
              <select value={prioF} onChange={(e) => setPrioF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Priorities</option>{["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}</select>
              <button onClick={clearF} className="text-[11px] text-slate-400 hover:text-white px-2">Clear</button>
              <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-semibold"><Plus className="w-3.5 h-3.5" /> New Brief</button>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 font-semibold">Brief / Topic</th><th className="font-semibold">Primary Keyword</th><th className="font-semibold">Type</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th><th className="font-semibold">Assignee</th><th className="font-semibold text-right">Words</th><th className="font-semibold">Due Date</th><th></th></tr></thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                      <td className="py-2.5"><div className="text-[12px] font-bold text-white truncate max-w-[180px]">{b.title}</div><div className="text-[9px] text-slate-600 truncate max-w-[180px]">{b.description}</div><div className="flex gap-1 mt-0.5">{b.tags.slice(0, 2).map((t) => <span key={t} className="text-[8px] px-1 rounded bg-ink-800 text-slate-500">{t}</span>)}</div></td>
                      <td className="whitespace-nowrap"><div className="text-[11px] text-slate-200">{b.primaryKeyword}</div><div className="flex gap-1 mt-0.5"><span className="text-[8px] px-1 rounded bg-ink-800 text-amber-300">KD {b.keywordDifficulty}</span><span className="text-[8px] px-1 rounded bg-ink-800 text-sky-300">Vol {kfmt(b.searchVolume)}</span></div></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BTY[b.contentType] || ""}`}>{b.contentType}</span></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BPR[b.priority]}`}>{b.priority}</span></td>
                      <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BST[b.status]}`}>{b.status}</span></td>
                      <td className="text-[11px] text-slate-300 whitespace-nowrap">{b.assignee}</td>
                      <td className="text-[11px] text-slate-300 text-right tabular-nums">{kfmt(b.targetWordCount)}</td>
                      <td className="whitespace-nowrap"><div className="text-[10px] text-slate-300">{fmtBD(b.dueDate)}</div><div className={`text-[9px] ${b.overdue ? "text-rose-400" : "text-slate-600"}`}>{dueB(b.dueDate)}</div></td>
                      <td className="relative pr-2">
                        <button onClick={() => setMenuId(menuId === b.id ? "" : b.id)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                        {menuId === b.id && (
                          <div className="absolute right-2 top-9 z-30 w-36 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                            {b.status !== "Published" && <button onClick={() => act(() => advanceBrief(b.id))} disabled={busy} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-300 hover:bg-ink-800">Advance Status →</button>}
                            <button onClick={() => act(() => deleteBrief(b.id))} disabled={busy} className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-rose-300 hover:bg-rose-500/10">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-[12px] text-slate-500">No briefs match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3"><div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} briefs</div><div className="flex items-center gap-1"><button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronLeft className="w-3.5 h-3.5" /></button><span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span><button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Top Performing Briefs" sub="Based on published content" right={<ViewAll label="View All Top Performing" />}>
            <ul className="space-y-2">{(board?.topPerforming || []).map((t, i) => <li key={i} className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center text-[10px] font-bold shrink-0">{i + 1}</span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{t.title}</div><div className="text-[9px] text-slate-600">{t.status}</div></div><span className={`w-7 h-7 rounded-full border grid place-items-center text-[9px] font-bold ${scoreTone(t.score)}`}>{t.score}</span></li>)}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Content Brief Quality Score" right={<ViewAll label="View Quality Insights" />}>
            <div className="flex flex-col items-center"><MultiDonut segments={[{ value: board?.avgQuality ?? 0, color: "#34d399" }, { value: Math.max(0, 100 - (board?.avgQuality ?? 0)), color: "#1e293b" }]} total={board?.avgQuality ?? 0} label="/100" size={120} stroke={13} /><div className="text-[11px] text-slate-400 mt-2 text-center">Average quality score of all briefs</div></div>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <FadeUp><Card title="Brief Status Distribution" sub="By current status">
          <div className="flex items-center gap-3"><MultiDonut segments={(board?.progress || []).map((p) => ({ value: p.count, color: p.color }))} total={k?.total ?? 0} label="Total" size={110} stroke={13} /><ul className="space-y-1 flex-1">{(board?.progress || []).map((p) => <li key={p.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: p.color }} /><span className="text-slate-400 flex-1">{p.label}</span><span className="text-white font-bold">{p.count}</span></li>)}</ul></div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Content Type Distribution" sub="By brief type">
          <div className="flex items-center gap-3"><MultiDonut segments={(board?.typeDist || []).map((t) => ({ value: t.count, color: t.color }))} total={k?.total ?? 0} label="Total" size={110} stroke={13} /><ul className="space-y-1 flex-1">{(board?.typeDist || []).map((t) => <li key={t.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: t.color }} /><span className="text-slate-400 flex-1 truncate">{t.label}</span><span className="text-white font-bold">{t.count}</span></li>)}</ul></div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Upcoming Deadlines" sub="Next 7 days">
          <ul className="space-y-2">{(board?.upcoming || []).map((u) => { const dt = new Date(u.dueDate); return (
            <li key={u.id} className="flex items-center gap-2.5"><span className="w-9 h-10 rounded-lg bg-ink-950 border border-ink-800 grid place-items-center text-center shrink-0"><span className="text-[7px] uppercase text-slate-500 leading-none">{dt.toLocaleDateString("en-US", { month: "short" })}</span><span className="text-[12px] font-bold text-white leading-none mt-0.5">{dt.getDate()}</span></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{u.title}</div><div className="text-[9px] text-slate-500">{u.priority} · {u.assignee}</div></div><span className={`text-[9px] font-semibold shrink-0 ${u.overdue ? "text-rose-400" : u.daysLeft <= 1 ? "text-amber-400" : "text-slate-500"}`}>{dueB(u.dueDate, u.daysLeft)}</span></li>
          ); })}{(board?.upcoming || []).length === 0 && <li className="text-[11px] text-slate-500">Nothing due soon.</li>}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.15}><Card title="AI Suggestions" sub="Improve your upcoming briefs" right={<ViewAll label="View All Suggestions" />}>
          <ul className="space-y-2">{(board?.suggestions || []).map((s, i) => <li key={i} className="flex items-start gap-2 rounded-lg border border-ink-800 bg-ink-950/40 p-2"><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[11px] font-semibold text-white leading-snug">{s.title}</div><div className="text-[9px] text-slate-500">{s.body}</div></div></li>)}</ul>
        </Card></FadeUp>
      </div>

      {createOpen && <BriefModal authors={board?.authors || []} categories={board?.categories || []} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(1); }} />}
    </div>
  );
}

function BriefModal({ authors, categories, onClose, onSaved }: { authors: string[]; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<BriefInput>({ title: "", description: "", primaryKeyword: "", contentType: "Blog Post", priority: "Medium", status: "Draft", assignee: authors[0] || "Copywriter Agent", targetWordCount: 1800, category: categories[0] || "General" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof BriefInput, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const fieldCls = "w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-9 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500";
  const label = "block text-[10px] uppercase tracking-wide text-slate-500 mb-1";
  const save = async () => { setBusy(true); try { await createBrief(f); onSaved(); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-950 max-h-[88vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-ink-800 flex items-center justify-between sticky top-0 bg-ink-950 z-10"><h3 className="text-sm font-bold text-white">Create New Brief</h3><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-3">
          <div><label className={label}>Title / Topic</label><input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Best Yacht Rental in Dubai" className={fieldCls} /></div>
          <div><label className={label}>Description</label><input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Short brief summary" className={fieldCls} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={label}>Primary Keyword</label><input value={f.primaryKeyword} onChange={(e) => set("primaryKeyword", e.target.value)} placeholder="target keyword" className={fieldCls} /></div><div><label className={label}>Target Words</label><input type="number" value={f.targetWordCount} onChange={(e) => set("targetWordCount", Number(e.target.value))} className={fieldCls} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={label}>Content Type</label><select value={f.contentType} onChange={(e) => set("contentType", e.target.value)} className={fieldCls}>{["Service Page", "Guide", "Comparison", "Listicle", "Location Page", "Blog Post"].map((s) => <option key={s}>{s}</option>)}</select></div><div><label className={label}>Priority</label><select value={f.priority} onChange={(e) => set("priority", e.target.value)} className={fieldCls}><option>High</option><option>Medium</option><option>Low</option></select></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={label}>Assignee</label><input value={f.assignee} onChange={(e) => set("assignee", e.target.value)} className={fieldCls} /></div><div><label className={label}>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={fieldCls}>{["Draft", "In Progress", "Awaiting Review", "Approved", "Published"].map((s) => <option key={s}>{s}</option>)}</select></div></div>
        </div>
        <div className="p-4 border-t border-ink-800 flex items-center justify-end gap-2 sticky bottom-0 bg-ink-950"><button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button><button disabled={busy || !(f.title || "").trim()} onClick={save} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Brief</button></div>
      </div>
    </div>
  );
}

/* ----------------------------- CONTENT CALENDAR TAB ----------------------------- */
const CAL_TYPE_TONE: Record<string, string> = { "Service Page": "bg-violet-500/15 text-violet-300", "Blog Post": "bg-emerald-500/15 text-emerald-300", "Landing Page": "bg-amber-500/15 text-amber-300", "Guide Page": "bg-sky-500/15 text-sky-300", Guide: "bg-sky-500/15 text-sky-300", "Comparison Page": "bg-brand-500/15 text-brand-300", Comparison: "bg-brand-500/15 text-brand-300", Listicle: "bg-rose-500/15 text-rose-300", "Location Page": "bg-brand-500/15 text-brand-300" };
const pad2 = (n: number) => String(n).padStart(2, "0");
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [cal, setCal] = useState<ContentCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Month" | "List">("Month");
  const [typeF, setTypeF] = useState("All Content Types");
  const [statusF, setStatusF] = useState("All Status");
  const [assigneeF, setAssigneeF] = useState("All Assignees");
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<CalendarItem | null>(null);

  const reload = async () => { setLoading(true); try { setCal(await getContentCalendar(year, month)); } finally { setLoading(false); } };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [year, month]);

  const prev = () => { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); };

  const items = (cal?.items || []).filter((it) => (typeF === "All Content Types" || it.type === typeF) && (statusF === "All Status" || it.status === statusF) && (assigneeF === "All Assignees" || it.assignee === assigneeF));
  const byDay: Record<string, CalendarItem[]> = {};
  for (const it of items) { const key = new Date(it.date).toISOString().slice(0, 10); (byDay[key] = byDay[key] || []).push(it); }
  const assignees = Array.from(new Set((cal?.items || []).map((i) => i.assignee)));
  const types = Array.from(new Set((cal?.items || []).map((i) => i.type)));

  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { day: number; cur: boolean; key?: string }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: 0, cur: false });
  for (let dd = 1; dd <= daysInMonth; dd++) cells.push({ day: dd, cur: true, key: `${year}-${pad2(month)}-${pad2(dd)}` });
  while (cells.length % 7 !== 0) cells.push({ day: 0, cur: false });
  const todayKey = today.toISOString().slice(0, 10);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const sb = cal?.statusBar;

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-white">Content Calendar</h2><p className="text-[12px] text-slate-500">Plan, schedule and manage your content across all channels. Stay consistent and never miss an opportunity to publish.</p></div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={prev} className="w-8 h-8 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:bg-ink-800"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={next} className="w-8 h-8 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-[13px] font-bold text-white px-2 min-w-[120px]">{monthName}</span>
        <button onClick={goToday} className="px-3 h-8 rounded-lg border border-ink-700 text-slate-300 text-[12px] hover:bg-ink-800">Today</button>
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Content Types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option>{(cal?.legend || []).map((l) => <option key={l.label}>{l.label}</option>)}</select>
        <select value={assigneeF} onChange={(e) => setAssigneeF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[130px]"><option>All Assignees</option>{assignees.map((a) => <option key={a}>{a}</option>)}</select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-ink-700 p-0.5">{(["Month", "List"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 h-7 rounded-md text-[11px] font-semibold ${view === v ? "bg-brand-600 text-white" : "text-slate-400"}`}>{v}</button>)}</div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create Content</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <FadeUp>
          {loading ? <div className="rounded-2xl border border-ink-800 bg-ink-900/50 grid place-items-center py-24"><Loader2 className="w-7 h-7 animate-spin text-slate-600" /></div> : view === "Month" ? (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-ink-800">{DOW.map((d) => <div key={d} className="text-[10px] font-semibold text-slate-500 text-center py-2">{d}</div>)}</div>
              <div className="grid grid-cols-7">
                {cells.map((c, i) => { const its = c.key ? (byDay[c.key] || []) : []; const isToday = c.key === todayKey;
                  return (
                    <div key={i} className={`min-h-[96px] border-b border-r border-ink-900 p-1.5 ${!c.cur ? "bg-ink-950/40" : ""}`}>
                      {c.cur && <div className={`text-[10px] mb-1 ${isToday ? "w-5 h-5 rounded-full bg-brand-600 text-white grid place-items-center font-bold" : "text-slate-500"}`}>{c.day}</div>}
                      <div className="space-y-1">
                        {its.slice(0, 2).map((it) => (
                          <motion.button key={it.id} onClick={() => setActive(it)} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-left rounded-md px-1.5 py-1 hover:brightness-125" style={{ background: `${it.color}22`, borderLeft: `2px solid ${it.color}` }}>
                            <div className="text-[9px] font-semibold text-white leading-tight line-clamp-2">{it.title}</div>
                            <div className="text-[8px] text-slate-400 mt-0.5">{it.time}</div>
                          </motion.button>
                        ))}
                        {its.length > 2 && <button onClick={() => setView("List")} className="text-[8px] text-brand-400 font-semibold">+{its.length - 2} more</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 space-y-2">
              {[...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((it) => (
                <button key={it.id} onClick={() => setActive(it)} className="w-full flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3 hover:border-brand-500/40 text-left">
                  <span className="w-10 h-11 rounded-lg bg-ink-950 border border-ink-800 grid place-items-center text-center shrink-0"><span className="text-[7px] uppercase text-slate-500 leading-none">{new Date(it.date).toLocaleDateString("en-US", { month: "short" })}</span><span className="text-[13px] font-bold text-white leading-none mt-0.5">{new Date(it.date).getDate()}</span></span>
                  <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-white truncate">{it.title}</div><div className="text-[10px] text-slate-500">{it.time} · {it.assignee}</div></div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${CAL_TYPE_TONE[it.type] || "bg-slate-500/15 text-slate-400"}`}>{it.type}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${it.color}22`, color: it.color }}>{it.status}</span>
                </button>
              ))}
              {items.length === 0 && <div className="py-10 text-center text-[12px] text-slate-500">No content scheduled this month.</div>}
            </div>
          )}
        </FadeUp>

        <div className="space-y-5">
          <FadeUp><Card title="Upcoming Content" right={<ViewAll label="View All" />}>
            <ul className="space-y-2">{(cal?.upcoming || []).map((u) => <li key={u.id} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><FileText className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{u.title}</div><div className="text-[9px] text-slate-500">{u.type} · {fmtBD(u.date)}</div></div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${BST[u.status] || "bg-slate-500/15 text-slate-400"}`}>{u.status}</span></li>)}
            {(cal?.upcoming || []).length === 0 && <li className="text-[11px] text-slate-500">Nothing upcoming.</li>}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Content by Type" right={<ViewAll label="View Report" />}>
            <div className="flex items-center gap-3"><MultiDonut segments={(cal?.byType || []).map((t) => ({ value: t.count, color: t.color }))} total={cal?.totalContent ?? 0} label="Total" size={110} stroke={13} /><ul className="space-y-1 flex-1">{(cal?.byType || []).map((t) => <li key={t.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: t.color }} /><span className="text-slate-400 flex-1 truncate">{t.label}</span><span className="text-white font-bold">{t.count}</span><span className="text-slate-600">({t.pct}%)</span></li>)}</ul></div>
          </Card></FadeUp>
          <FadeUp delay={0.1}><Card title="Content Publishing Streak">
            <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🔥</span><div><div className="text-xl font-extrabold text-white">{cal?.streak ?? 0} Days</div><div className="text-[10px] text-slate-500">{(cal?.streak ?? 0) > 0 ? "Keep publishing consistently!" : "Publish content to start a streak."}</div></div></div>
            <div className="flex items-center justify-between">{(cal?.streakDays || []).map((d, i) => <div key={i} className="flex flex-col items-center gap-1"><span className={`w-6 h-6 rounded-full grid place-items-center text-[9px] ${d.published ? "bg-emerald-500 text-white" : d.today ? "border-2 border-brand-500 text-slate-400" : "border border-ink-700 text-slate-600"}`}>{d.published ? "✓" : ""}</span><span className="text-[7px] text-slate-600">{d.label.split(" ")[1]}</span></div>)}</div>
          </Card></FadeUp>
          <FadeUp delay={0.15}><Card title="Calendar Legend">
            <div className="grid grid-cols-2 gap-1.5">{(cal?.legend || []).map((l) => <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.label}</span>)}</div>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {([["Total Content", sb?.total, "#8b5cf6"], ["Scheduled", sb?.scheduled, "#38bdf8"], ["In Progress", sb?.inProgress, "#a78bfa"], ["Drafts", sb?.drafts, "#94a3b8"], ["Published", sb?.published, "#34d399"], ["Needs Review", sb?.needsReview, "#fbbf24"], ["On Hold", sb?.onHold, "#fb7185"]] as [string, number | undefined, string][]).map(([l, v, c]) => (
        <div key={l} className="rounded-xl border border-ink-800 bg-ink-900/50 p-3 flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${c}22`, color: c }}><FileText className="w-4 h-4" /></span><div><div className="text-lg font-extrabold text-white leading-none">{v ?? 0}</div><div className="text-[9px] text-slate-500 mt-0.5">{l}</div></div></div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-ink-700 bg-ink-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-2"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${active.color}22`, color: active.color }}>{active.status}</span><button onClick={() => setActive(null)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
            <h3 className="text-base font-bold text-white">{active.title}</h3>
            <div className="grid grid-cols-2 gap-3 mt-3">{([["Type", active.type], ["Time", active.time], ["Date", fmtBD(active.date)], ["Assignee", active.assignee]] as [string, string][]).map(([k, v]) => <div key={k}><div className="text-[9px] uppercase tracking-wide text-slate-600">{k}</div><div className="text-[11px] font-semibold text-white">{v}</div></div>)}</div>
          </div>
        </div>
      )}
      {createOpen && <BriefModal authors={assignees} categories={[]} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(); }} />}
    </div>
  );
}

/* ----------------------------- TOPIC RESEARCH TAB ----------------------------- */
const OPP_DOT: Record<string, string> = { High: "#34d399", Medium: "#fbbf24", Low: "#8b5cf6" };
const INTENT_TONE: Record<string, string> = { Informational: "bg-violet-500/15 text-violet-300", Transactional: "bg-emerald-500/15 text-emerald-300", Commercial: "bg-amber-500/15 text-amber-300", Navigational: "bg-sky-500/15 text-sky-300" };
function MiniSpark({ data, color = "#34d399" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-5 w-16" />;
  const w = 64, h = 20, min = Math.min(...data), max = Math.max(...data), sp = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / sp) * (h - 3) - 1.5}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-16 h-5" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></svg>;
}
function Scatter({ data }: { data: TopicResearch["opportunityMap"] }) {
  const W = 360, H = 220, P = 24;
  const maxT = Math.max(1, ...data.map((d) => d.traffic)), maxV = Math.max(1, ...data.map((d) => d.volume));
  const x = (kd: number) => P + (kd / 100) * (W - 2 * P);
  const y = (t: number) => H - P - (t / maxT) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#1e293b" /><line x1={P} y1={P} x2={P} y2={H - P} stroke="#1e293b" />
      <text x={W - P} y={H - 8} fontSize="8" fill="#64748b" textAnchor="end">Difficulty →</text>
      <text x={6} y={P + 4} fontSize="8" fill="#64748b">Traffic ↑</text>
      {data.map((d, i) => { const r = 5 + (d.volume / maxV) * 12; return (
        <motion.g key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
          <circle cx={x(d.difficulty)} cy={y(d.traffic)} r={r} fill={OPP_DOT[d.opportunity] || "#64748b"} fillOpacity={0.55} stroke={OPP_DOT[d.opportunity]} />
          <title>{d.topic} · vol {d.volume} · KD {d.difficulty}</title>
        </motion.g>
      ); })}
    </svg>
  );
}

function TopicResearchTab() {
  const [d, setD] = useState<TopicResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [intentF, setIntentF] = useState("All Intent");
  const [oppOnly, setOppOnly] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => { setLoading(true); try { setD(await getTopicResearch()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 4000); };
  const discover = async () => { setBusy(true); flash("🔎 Searching the web for trending topics… (~1 min)"); try { const r = await discoverTopics(); flash(r.created ? `✓ ${r.created} new topic(s) discovered: ${r.topics.slice(0, 2).join(", ")}` : "No new topics found right now."); await load(); } catch { flash("Couldn't discover — check the LLM key/quota."); } finally { setBusy(false); } };
  const createBriefFor = async (id: string, theme: string) => { setBusy(true); try { await advanceBrief(id); flash(`✓ Brief started for "${theme.slice(0, 30)}".`); await load(); } finally { setBusy(false); } };

  if (loading || !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Topics Analyzed", value: kfmt(k.topicsAnalyzed), trend: k.topicsTrend, icon: Target, color: "#8b5cf6" },
    { label: "High Opportunity Topics", value: kfmt(k.highOpportunity), trend: k.highTrend, icon: TrendUp, color: "#34d399" },
    { label: "Est. Monthly Traffic", value: kfmt(k.estMonthlyTraffic), trend: k.trafficTrend, icon: BarChart3, color: "#38bdf8" },
    { label: "Avg. Difficulty Score", value: `${k.avgDifficulty} /100`, trend: k.difficultyTrend, icon: ShieldCheck, color: "#fbbf24" },
    { label: "Topic Ideas Generated", value: kfmt(k.ideasGenerated), trend: k.ideasTrend, icon: Sparkles, color: "#fb7185" },
  ];
  const opps = (oppOnly ? d.topOpportunities.filter((o) => o.opportunityScore >= 70) : d.topOpportunities).filter((o) => (intentF === "All Intent" || o.intent === intentF) && (!q || `${o.theme} ${o.keyword}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
      <div><h2 className="text-lg font-bold text-white">Topic Research</h2><p className="text-[12px] text-slate-500">Discover trending topics, analyze opportunities, and prioritize content ideas that drive traffic and engagement.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
        ); })}
      </Stagger>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics, keywords or phrases…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
        <select value={intentF} onChange={(e) => setIntentF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Intent</option>{d.intents.map((i) => <option key={i}>{i}</option>)}</select>
        <button onClick={() => setOppOnly((v) => !v)} className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border text-[11px] ${oppOnly ? "border-brand-500 text-brand-300 bg-brand-500/10" : "border-ink-700 text-slate-400"}`}><span className={`w-3 h-3 rounded-full border ${oppOnly ? "bg-brand-500 border-brand-500" : "border-ink-600"}`} /> Opportunities Only</button>
        <button onClick={discover} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Discover New Topics</button>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Topic Opportunity Map" right={<span className="text-[10px] text-slate-500">By Opportunity Score</span>}>
          <Scatter data={d.opportunityMap} />
          <div className="flex gap-3 mt-1">{([["High", "#34d399"], ["Medium", "#fbbf24"], ["Low", "#8b5cf6"]] as [string, string][]).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1 text-[9px] text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l} Opportunity</span>)}</div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Trending Topics" sub="Last 7 Days" right={<ViewAll label="View All Trending" />}>
          <ul className="space-y-2.5">{d.trending.map((t, i) => (
            <li key={i} className="flex items-center gap-2.5"><span className="w-5 h-5 rounded-md bg-ink-800 text-slate-400 text-[10px] font-bold grid place-items-center shrink-0">{i + 1}</span><span className="text-[11px] text-white flex-1 truncate capitalize">{t.topic}</span><MiniSpark data={t.spark} /><span className="text-[10px] font-bold text-emerald-400 w-10 text-right">↑ {t.change}%</span></li>
          ))}</ul>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Topics by Search Intent" right={<ViewAll label="View Full Intent Report" />}>
          <div className="flex items-center gap-3"><MultiDonut segments={d.byIntent.map((x) => ({ value: x.count, color: x.color }))} total={d.kpis.topicsAnalyzed} label="Total Topics" size={120} stroke={14} /><ul className="space-y-1.5 flex-1">{d.byIntent.map((x) => <li key={x.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: x.color }} /><span className="text-slate-400 flex-1">{x.label}</span><span className="text-white font-bold">{x.count}</span><span className="text-slate-600">({x.pct}%)</span></li>)}</ul></div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <FadeUp><Card title="Top Topic Opportunities">
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[640px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Topic / Keyword</th><th className="font-semibold">Intent</th><th className="font-semibold text-right">Volume</th><th className="font-semibold">Trend</th><th className="font-semibold text-right">KD</th><th className="font-semibold text-right">Opp.</th><th></th></tr></thead>
            <tbody>{opps.map((o) => (
              <tr key={o.id} className="border-b border-ink-900 hover:bg-ink-900/40"><td className="py-2"><div className="text-[11px] font-bold text-white truncate max-w-[160px]">{o.theme}</div><div className="text-[9px] text-slate-600">{o.keyword}</div></td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${INTENT_TONE[o.intent] || ""}`}>{o.intent}</span></td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(o.volume)}</td><td><MiniSpark data={o.trend} color="#34d399" /></td><td className="text-[10px] text-slate-400 text-right">{o.kd}</td><td className="text-right"><span className={`w-7 h-7 inline-grid place-items-center rounded-full border text-[10px] font-bold ${o.opportunityScore >= 80 ? "border-emerald-500/40 text-emerald-300" : o.opportunityScore >= 60 ? "border-amber-500/40 text-amber-300" : "border-violet-500/40 text-violet-300"}`}>{o.opportunityScore}</span></td><td><button onClick={() => createBriefFor(o.id, o.theme)} disabled={busy} className="text-[10px] font-semibold px-2 h-7 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white disabled:opacity-50">Create Brief</button></td></tr>
            ))}
            {opps.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-[11px] text-slate-500">No topics match.</td></tr>}</tbody></table></div>
        </Card></FadeUp>
        <div className="space-y-5">
          <FadeUp><Card title="Topic Clusters" sub="In Progress" right={<ViewAll />}>
            <ul className="space-y-2.5">{d.clusters.map((c) => (
              <li key={c.name}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-white font-semibold truncate">{c.name}</span><span className="text-slate-500">{c.topics} topics</span></div><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${c.progress}%` }} transition={{ duration: 0.7 }} /></div><span className="text-[9px] text-slate-400 w-7 text-right">{c.progress}%</span></div></li>
            ))}</ul>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Content Ideas Generated" right={<ViewAll label="View All Ideas" />}>
            <ul className="space-y-2">{d.contentIdeas.map((i, idx) => <li key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><span className="text-[11px] text-white truncate">{i.title}</span><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 shrink-0">{i.type}</span></li>)}</ul>
          </Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- CONTENT GAPS TAB ----------------------------- */
const GAP_INTENT_TONE: Record<string, string> = { Informational: "bg-violet-500/15 text-violet-300", Transactional: "bg-emerald-500/15 text-emerald-300", Commercial: "bg-amber-500/15 text-amber-300", Navigational: "bg-sky-500/15 text-sky-300" };
const PRIO_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-400" };
function GapVenn({ o }: { o: ContentGaps["gapOverview"] }) {
  return (
    <svg viewBox="0 0 240 150" className="w-full" style={{ maxHeight: 170 }}>
      <circle cx="95" cy="75" r="62" fill="#6366f1" fillOpacity="0.18" stroke="#6366f1" strokeOpacity="0.5" />
      <circle cx="150" cy="75" r="62" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeOpacity="0.5" />
      <text x="62" y="68" fontSize="9" fill="#a5b4fc" textAnchor="middle">Your Content</text>
      <text x="62" y="84" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">{kfmt(o.yourContent)}</text>
      <text x="183" y="68" fontSize="9" fill="#6ee7b7" textAnchor="middle">Competitors</text>
      <text x="183" y="84" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">{kfmt(o.competitors)}</text>
      <text x="122" y="70" fontSize="13" fontWeight="800" fill="#fff" textAnchor="middle">{o.gapKeywords}</text>
      <text x="122" y="84" fontSize="7" fill="#cbd5e1" textAnchor="middle">Gap KWs</text>
    </svg>
  );
}
function ContentGapsTab() {
  const [d, setD] = useState<ContentGaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [intentF, setIntentF] = useState("All Intent");
  const [compF, setCompF] = useState("All Competitors");
  const [highOnly, setHighOnly] = useState(false);
  const [note, setNote] = useState("");
  const load = async () => { setLoading(true); try { setD(await getContentGaps()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 3500); };
  const makeBrief = async (g: ContentGaps["topGaps"][number]) => { setBusy(true); try { await createBrief({ title: g.keyword.replace(/\b\w/g, (c) => c.toUpperCase()), primaryKeyword: g.keyword, contentType: "Blog Post", searchVolume: g.volume, keywordDifficulty: g.kd, category: "General", status: "Draft", priority: g.priority as "High" | "Medium" | "Low", description: `Content gap — competitor ${g.competitor} ranks, we don't.` }); flash(`✓ Brief created for "${g.keyword}".`); } catch { flash("Couldn't create brief."); } finally { setBusy(false); } };
  const exportCsv = () => { if (!d) return; const head = "Keyword,Intent,Volume,KD,Your Rank,Best Competitor,Est Traffic,Traffic Value (AED),Priority"; const lines = d.topGaps.map((g) => [g.keyword, g.intent, g.volume, g.kd, g.yourRank, g.competitor, g.estTraffic, g.trafficValue, g.priority].join(",")); const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "content-gaps.csv"; a.click(); URL.revokeObjectURL(url); flash("✓ Exported content-gaps.csv"); };

  if (loading || !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Total Content Gaps", value: kfmt(k.totalGaps), trend: k.totalTrend, icon: Layers, color: "#8b5cf6" },
    { label: "High Impact Gaps", value: kfmt(k.highImpact), trend: k.highTrend, icon: Target, color: "#fb7185" },
    { label: "Est. Monthly Traffic", value: kfmt(k.estMonthlyTraffic), trend: k.trafficTrend, icon: BarChart3, color: "#34d399" },
    { label: "Avg. Keyword Difficulty", value: String(k.avgKd), trend: k.kdTrend, icon: ShieldCheck, color: "#fbbf24" },
    { label: "Potential Traffic Value", value: `AED ${kfmt(k.potentialValue)}`, trend: k.valueTrend, icon: TrendUp, color: "#38bdf8" },
  ];
  const gaps = d.topGaps.filter((g) => (intentF === "All Intent" || g.intent === intentF) && (compF === "All Competitors" || g.competitor === compF) && (!highOnly || g.priority === "High") && (!q || g.keyword.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
      <div><h2 className="text-lg font-bold text-white">Content Gaps</h2><p className="text-[12px] text-slate-500">Identify content opportunities your competitors rank for that you don&apos;t. Fill the gaps and capture more traffic.</p></div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
        ); })}
      </Stagger>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords or topics…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
        <select value={intentF} onChange={(e) => setIntentF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Intent</option>{d.intents.map((i) => <option key={i}>{i}</option>)}</select>
        <select value={compF} onChange={(e) => setCompF(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Competitors</option>{d.competitors.map((c) => <option key={c}>{c}</option>)}</select>
        <button onClick={() => setHighOnly((v) => !v)} className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border text-[11px] ${highOnly ? "border-rose-500 text-rose-300 bg-rose-500/10" : "border-ink-700 text-slate-400"}`}><span className={`w-3 h-3 rounded-full border ${highOnly ? "bg-rose-500 border-rose-500" : "border-ink-600"}`} /> High Impact Only</button>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Download className="w-4 h-4" /> Export Gaps</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Gap Overview">
          <GapVenn o={d.gapOverview} />
          <ul className="mt-1 space-y-1.5">
            {([["You rank for", d.gapOverview.yourContent, "#6366f1"], ["Competitors rank for", d.gapOverview.competitors, "#10b981"], ["Common keywords", d.gapOverview.common, "#64748b"], ["Gap keywords", d.gapOverview.gapKeywords, "#fb7185"]] as [string, number, string][]).map(([l, v, c]) => (
              <li key={l} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-slate-400 flex-1">{l}</span><span className="text-white font-bold tabular-nums">{kfmt(v)}</span></li>
            ))}
          </ul>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Gap by Intent" right={<ViewAll label="View Full Intent Report" />}>
          <div className="flex items-center gap-3"><MultiDonut segments={d.gapByIntent.map((x) => ({ value: x.count, color: x.color }))} total={d.kpis.totalGaps} label="Total Gaps" size={120} stroke={14} /><ul className="space-y-1.5 flex-1">{d.gapByIntent.map((x) => <li key={x.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: x.color }} /><span className="text-slate-400 flex-1">{x.label}</span><span className="text-white font-bold">{x.count}</span><span className="text-slate-600">({x.pct}%)</span></li>)}</ul></div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Gap by Content Type" right={<ViewAll label="View Full Content Type Report" />}>
          <ul className="space-y-2.5">{d.gapByType.map((t) => (
            <li key={t.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{t.label}</span><span className="text-slate-500">{t.count} <span className="text-slate-600">({t.pct}%)</span></span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: t.color }} initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ duration: 0.7 }} /></div></li>
          ))}</ul>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp><Card title="Top Content Gaps">
          <div className="overflow-x-auto"><table className="w-full text-left min-w-[720px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Keyword / Topic</th><th className="font-semibold">Intent</th><th className="font-semibold text-right">Vol</th><th className="font-semibold text-right">KD</th><th className="font-semibold">Your Rank</th><th className="font-semibold">Best Competitor</th><th className="font-semibold text-right">Value</th><th className="font-semibold">Priority</th><th></th></tr></thead>
            <tbody>{gaps.map((g) => (
              <tr key={g.keyword} className="border-b border-ink-900 hover:bg-ink-900/40"><td className="py-2 text-[11px] font-semibold text-white truncate max-w-[150px]">{g.keyword}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${GAP_INTENT_TONE[g.intent] || ""}`}>{g.intent}</span></td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(g.volume)}</td><td className="text-[10px] text-slate-400 text-right">{g.kd}</td><td><span className={`text-[10px] font-semibold ${g.yourRank === "Not Ranked" ? "text-rose-400" : g.yourRank === "Ranked" ? "text-emerald-400" : "text-amber-400"}`}>{g.yourRank}</span></td><td className="text-[10px] text-slate-400 truncate max-w-[110px]">{g.competitor}</td><td className="text-[10px] text-emerald-300 text-right tabular-nums">AED {kfmt(g.trafficValue)}</td><td><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIO_TONE[g.priority] || ""}`}>{g.priority}</span></td><td><button onClick={() => makeBrief(g)} disabled={busy} className="text-[10px] font-semibold px-2 h-7 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white disabled:opacity-50">Create Brief</button></td></tr>
            ))}
            {gaps.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-[11px] text-slate-500">No gaps match.</td></tr>}</tbody></table></div>
        </Card></FadeUp>
        <div className="space-y-5">
          <FadeUp><Card title="Top Competitors You're Missing" right={<ViewAll label="View Competitor Gap Analysis" />}>
            <ul className="space-y-2">{d.competitorsMissing.map((c) => (
              <li key={c.domain} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-3 py-2"><span className="text-[11px] text-white truncate flex-1">{c.domain}</span><span className="text-[10px] text-slate-400 tabular-nums">{kfmt(c.missingKeywords)}</span><span className="text-[10px] text-emerald-300 tabular-nums w-12 text-right">{kfmt(c.estTraffic)}</span></li>
            ))}</ul>
            <div className="flex justify-between text-[8px] uppercase tracking-wide text-slate-600 mt-1.5 px-3"><span>Domain</span><span>Missing KW · Est Traffic</span></div>
          </Card></FadeUp>
          <FadeUp delay={0.05}><Card title="Recommended Actions" right={<ViewAll label="View All Recommendations" />}>
            <ul className="space-y-2.5">{d.recommendedActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /><div className="flex-1"><div className="text-[11px] font-semibold text-white">{a.title}</div><div className="text-[10px] text-slate-500">{a.detail}</div></div><ArrowRight className="w-3.5 h-3.5 text-slate-600 mt-0.5" /></li>
            ))}</ul>
          </Card></FadeUp>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- SERP INSIGHTS TAB ----------------------------- */
function sparkOf(seed: string): number[] {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: number[] = []; let v = 40 + (h % 30);
  for (let i = 0; i < 7; i++) { h = (h * 1103515245 + 12345) >>> 0; v = Math.max(15, Math.min(100, v + ((h % 24) - 9))); out.push(v); }
  return out;
}
const FEATURE_ICON: Record<string, { Icon: typeof Link2; color: string; title: string }> = {
  link: { Icon: Link2, color: "#8b5cf6", title: "Sitelinks" }, image: { Icon: ImageIcon, color: "#38bdf8", title: "Images" },
  review: { Icon: Star, color: "#fbbf24", title: "Reviews" }, paa: { Icon: HelpCircle, color: "#fb7185", title: "People Also Ask" },
  video: { Icon: Video, color: "#a78bfa", title: "Videos" }, local: { Icon: MapPin, color: "#34d399", title: "Local Pack" },
};
const IMPACT_TONE: Record<string, string> = { High: "text-emerald-400", Medium: "text-amber-400", Low: "text-slate-400" };
function CorrelationBar({ v }: { v: number }) {
  return <div className="h-1.5 w-16 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: 0.7 }} /></div>;
}
function ScoreBar({ v }: { v: number }) {
  const c = v >= 70 ? "#34d399" : v >= 45 ? "#fbbf24" : "#fb7185";
  return <div className="flex items-center gap-1.5"><div className="h-1.5 w-12 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.6 }} /></div><span className="text-[9px] text-slate-400 tabular-nums">{v}/100</span></div>;
}
function SerpInsightsTab() {
  const [d, setD] = useState<SerpInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [kw, setKw] = useState("yacht rental dubai");
  const [loc, setLoc] = useState("Dubai, UAE");
  const [device, setDevice] = useState("Desktop");
  const [engine, setEngine] = useState("Google");
  const [lang, setLang] = useState("English");
  const [openPaa, setOpenPaa] = useState<number | null>(0);
  const [note, setNote] = useState("");
  const load = async (q = kw) => { setLoading(true); try { setD(await getSerpInsights(q)); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 4000); };
  const analyze = async () => { setAnalyzing(true); flash("🔎 Analyzing live Google SERP… (~40s)"); try { const r = await analyzeSerp(kw); setD(r); flash(r.live ? `✓ Live SERP analyzed — ${r.sources.length} sources.` : "Analyzed (computed — LLM offline)."); } catch { flash("Couldn't analyze — check LLM key/quota."); } finally { setAnalyzing(false); } };

  if (loading || !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Keyword Difficulty", value: `${k.keywordDifficulty}`, unit: "/100", sub: "Possible", subColor: "#fbbf24", spark: null },
    { label: "Search Volume", value: kfmt(k.searchVolume), unit: "", sub: "Monthly", subColor: "#64748b", spark: sparkOf(d.keyword + "v") },
    { label: "Clicks (Est.)", value: kfmt(k.clicks), unit: "", sub: "Monthly", subColor: "#64748b", spark: sparkOf(d.keyword + "c") },
    { label: "CPC (Est.)", value: `AED ${k.cpc.toFixed(2)}`, unit: "", sub: "High", subColor: "#fb7185", spark: null },
    { label: "Global Volume", value: kfmt(k.globalVolume), unit: "", sub: "Monthly", subColor: "#64748b", spark: sparkOf(d.keyword + "g") },
    { label: "SERP Features", value: `${k.serpFeatures}`, unit: "", sub: "On SERP", subColor: "#34d399", spark: null },
  ];
  const SELECTS: [string, string, (v: string) => void, string[]][] = [
    ["Location", loc, setLoc, ["Dubai, UAE", "Abu Dhabi, UAE", "United Arab Emirates"]],
    ["Device", device, setDevice, ["Desktop", "Mobile", "Tablet"]],
    ["Search Engine", engine, setEngine, ["Google", "Bing"]],
    ["Language", lang, setLang, ["English", "Arabic"]],
  ];

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl">{note}</div>}
      <div><h2 className="text-lg font-bold text-white">SERP Insights</h2><p className="text-[12px] text-slate-500">Analyze search engine results pages to understand ranking factors, content opportunities, and competitor strategies.</p></div>

      {/* query bar */}
      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-3">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyze()} placeholder="Enter a keyword…" className="w-full rounded-lg border border-ink-700 bg-ink-950 pl-7 pr-2 h-10 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500" /></div>
          {SELECTS.map(([label, val, set, opts]) => (
            <div key={label} className="min-w-[110px]"><label className="block text-[9px] text-slate-500 mb-0.5">{label}</label><select value={val} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 h-10 px-2 text-[11px] text-slate-300 focus:outline-none">{opts.map((o) => <option key={o}>{o}</option>)}</select></div>
          ))}
          <button onClick={analyze} disabled={analyzing} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Analyze SERP</button>
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-slate-500"><span>{d.live ? "Live SERP" : "Last updated: just now"}</span><button onClick={() => load()} className="hover:text-brand-300"><RefreshCw className="w-3 h-3" /></button></div>
      </div>

      {/* KPIs */}
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((c) => (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="text-[10px] text-slate-500 leading-tight">{c.label}</div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}<span className="text-xs text-slate-500 font-semibold">{c.unit}</span></div><div className="mt-1 flex items-center justify-between"><span className="text-[10px] font-semibold" style={{ color: c.subColor }}>{c.sub}</span>{c.spark && <MiniSpark data={c.spark} color="#8b5cf6" />}</div></Item>
        ))}
      </Stagger>

      {/* row 1: SERP overview | features | PAA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp className="xl:col-span-1"><Card title="SERP Overview" right={<ViewAll label="View Full SERP Analysis" />}>
          <div className="space-y-2">{d.serpOverview.map((r) => (
            <div key={r.rank} className="flex items-start gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2 hover:border-ink-700">
              <span className="w-5 h-5 rounded-md bg-ink-800 text-slate-400 text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">{r.rank}</span>
              <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{r.title}</div><a href={r.url} target="_blank" rel="noreferrer" className="text-[9px] text-sky-400/80 truncate block hover:underline">{r.url}</a>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500"><span>DR <b className="text-slate-300">{r.domainRating}</b></span><span>BL <b className="text-slate-300">{kfmt(r.backlinks)}</b></span><span>Traffic <b className="text-slate-300">{kfmt(r.estTraffic)}</b></span>
                  <span className="flex items-center gap-0.5 ml-auto">{r.features.map((f, i) => { const m = FEATURE_ICON[f]; return m ? <span key={i} title={m.title} className="w-4 h-4 grid place-items-center rounded" style={{ color: m.color }}><m.Icon className="w-3 h-3" /></span> : null; })}</span>
                </div>
              </div>
            </div>
          ))}</div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="SERP Features Breakdown" right={<ViewAll label="View SERP Features History" />}>
          <div className="flex items-center gap-3"><MultiDonut segments={d.serpFeatures.map((x) => ({ value: x.count, color: x.color }))} total={d.kpis.serpFeatures} label="Total Features" size={120} stroke={14} /><ul className="space-y-1 flex-1">{d.serpFeatures.map((x) => <li key={x.label} className="flex items-center gap-1.5 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: x.color }} /><span className="text-slate-400 flex-1 truncate">{x.label}</span><span className="text-white font-bold">{x.pct}%</span><span className="text-slate-600">({x.count})</span></li>)}</ul></div>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="People Also Ask" right={<ViewAll label="View All Questions" />}>
          <ul className="space-y-1.5">{d.peopleAlsoAsk.map((p, i) => (
            <li key={i} className="rounded-lg border border-ink-800 bg-ink-950/40 overflow-hidden"><button onClick={() => setOpenPaa(openPaa === i ? null : i)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"><span className="text-[11px] text-white">{p.q}</span><ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${openPaa === i ? "rotate-180" : ""}`} /></button>{openPaa === i && <div className="px-3 pb-2.5 text-[10px] text-slate-400">{p.a || "This question appears in Google's People Also Ask. Run Analyze SERP for the live answer snippet."}</div>}</li>
          ))}</ul>
        </Card></FadeUp>
      </div>

      {/* row 2: content insights | ranking factors | competitor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Content Insights" right={<ViewAll label="View Content Optimization Tips" />}>
          <table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Metric</th><th className="font-semibold text-right">Top Avg</th><th className="font-semibold text-right">You</th><th className="font-semibold text-right">Opp.</th></tr></thead>
            <tbody>{d.contentInsights.map((c) => (
              <tr key={c.metric} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-slate-300">{c.metric}</td><td className="text-[11px] text-white text-right tabular-nums">{kfmt(c.top)}</td><td className="text-[11px] text-slate-400 text-right tabular-nums">{kfmt(c.your)}</td><td className="text-right text-[11px] font-bold tabular-nums">{c.opportunity > 0 ? <span className="text-emerald-400">+{kfmt(c.opportunity)}</span> : <span className="text-sky-400">✓</span>}</td></tr>
            ))}</tbody></table>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Top Ranking Factors" right={<ViewAll label="View All Ranking Factors" />}>
          <table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Factor</th><th className="font-semibold">Corr.</th><th className="font-semibold">Impact</th><th className="font-semibold text-right">Your Score</th></tr></thead>
            <tbody>{d.rankingFactors.map((f) => (
              <tr key={f.factor} className="border-b border-ink-900"><td className="py-1.5 text-[11px] text-slate-300">{f.factor}</td><td><div className="flex items-center gap-1.5"><CorrelationBar v={f.correlation} /><span className="text-[9px] text-slate-500">{f.correlation}</span></div></td><td><span className={`text-[10px] font-bold ${IMPACT_TONE[f.impact]}`}>{f.impact}</span></td><td className="text-right"><div className="flex justify-end"><ScoreBar v={f.score} /></div></td></tr>
            ))}</tbody></table>
        </Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Competitor Comparison" right={<ViewAll label="View Full Competitor Analysis" />}>
          <table className="w-full text-left"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Domain</th><th className="font-semibold text-right">Traffic</th><th className="font-semibold text-right">BL</th><th className="font-semibold text-right">DR</th><th className="font-semibold text-right">KW Cov.</th></tr></thead>
            <tbody>{d.competitorComparison.map((c) => (
              <tr key={c.domain} className="border-b border-ink-900"><td className="py-1.5 text-[10px] text-white truncate max-w-[120px]">{c.domain}</td><td className="text-[10px] text-slate-300 text-right tabular-nums">{kfmt(c.estTraffic)}</td><td className="text-[10px] text-slate-400 text-right tabular-nums">{kfmt(c.backlinks)}</td><td className="text-[10px] text-slate-400 text-right">{c.dr}</td><td className="text-[10px] text-emerald-300 text-right tabular-nums">{c.keywordCoverage}K</td></tr>
            ))}</tbody></table>
        </Card></FadeUp>
      </div>

      {/* recommendations */}
      <FadeUp><Card title="Recommendations" right={<ViewAll label="View All Recommendations" />}>
        <p className="text-[12px] text-slate-400 mb-3">{d.recoSummary}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{d.recommendations.map((r, i) => (
          <Item key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center"><Sparkles className="w-3.5 h-3.5" /></span><span className="text-[12px] font-bold text-white">{r.title}</span></div><p className="text-[10px] text-slate-500 mt-1.5">{r.detail}</p><span className={`inline-block mt-2 text-[9px] font-bold ${r.impact.startsWith("High") ? "text-emerald-400" : "text-amber-400"}`}>{r.impact}</span></Item>
        ))}</div>
      </Card></FadeUp>

      {d.sources.length > 0 && <FadeUp><Card title="Sources"><ul className="flex flex-wrap gap-2">{d.sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline"><Globe className="w-3 h-3" />{s.title?.slice(0, 30) || s.url.slice(0, 30)}</a></li>)}</ul></Card></FadeUp>}
    </div>
  );
}

/* ----------------------------- AI WRITING TAB ----------------------------- */
const WSTATUS_TONE: Record<string, string> = { Draft: "bg-amber-500/15 text-amber-300", "In Review": "bg-sky-500/15 text-sky-300", Ready: "bg-violet-500/15 text-violet-300", Published: "bg-emerald-500/15 text-emerald-300", Scheduled: "bg-slate-500/15 text-slate-300" };
function ScoreGauge({ score }: { score: number }) {
  const R = 52, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  const color = score >= 85 ? "#34d399" : score >= 70 ? "#fbbf24" : "#fb7185";
  return (
    <div className="relative w-[140px] h-[140px] mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90"><circle cx="70" cy="70" r={R} fill="none" stroke="#1e293b" strokeWidth="12" /><motion.circle cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: off }} transition={{ duration: 1 }} /></svg>
      <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="text-3xl font-extrabold text-white">{score}</div><div className="text-[9px] text-slate-500">/100</div></div></div>
    </div>
  );
}
function ago(d?: string | null): string {
  if (!d) return "never";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 0) { const f = -s; if (f < 3600) return `in ${Math.max(1, Math.floor(f / 60))}m`; if (f < 86400) return `in ${Math.floor(f / 3600)}h`; return `in ${Math.floor(f / 86400)}d`; }
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
}
function AIWritingTab() {
  const [dash, setDash] = useState<WritingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<WritingDraft | null>(null);
  const [title, setTitle] = useState("");
  const [words, setWords] = useState(0);
  const [savedAt, setSavedAt] = useState<string>("");
  const [busy, setBusy] = useState<string>(""); // "gen" | "save" | "pub" | action key
  const [note, setNote] = useState("");
  const [assistPanel, setAssistPanel] = useState<{ label: string; result?: string; options?: string[] } | null>(null);
  const [body, setBody] = useState("");
  // form
  const [type, setType] = useState("Blog Post");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [briefId, setBriefId] = useState("");
  const [tone, setTone] = useState("Professional");
  const [lang, setLang] = useState("English (US)");
  const [wc, setWc] = useState("1500 - 2000 words");

  const load = async () => { setLoading(true); try { setDash(await getWriting()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 4500); };
  const syncWords = (html: string) => { const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); setWords(t ? t.split(/\s+/).length : 0); };
  useEffect(() => { if (draft) { setBody(draft.body); setTitle(draft.title); setWords(draft.score?.words || 0); } /* eslint-disable-next-line */ }, [draft?.id]);

  const generate = async () => {
    if (!topic.trim() && !briefId) { flash("Enter a topic/keyword or pick a brief."); return; }
    setBusy("gen"); flash("🧠 Agent thinking: researching the web → planning → drafting → self-editing… (~2 min)");
    try { const r = await generateContent({ type, topic, audience, tone, language: lang, wordCount: wc, briefId }); if (r.ok && r.draft) { setDraft(r.draft); flash(`✓ Draft created — score ${r.draft.score.overall}/100. Edit, then Save & Publish.`); load(); } else flash(r.message || "Generation failed."); }
    finally { setBusy(""); }
  };
  const openDraft = async (id: string) => { setBusy("open"); try { const r = await getWritingDraft(id); if (r.ok && r.draft) setDraft(r.draft); } finally { setBusy(""); } };
  const save = async (status?: string) => {
    if (!draft) return; setBusy("save");
    try { const r = await saveWritingDraft(draft.id, { title, body, ...(status ? { status } : {}) }); if (r.ok && r.draft) { setDraft(r.draft); setSavedAt("just now"); flash(`✓ Saved — score ${r.draft.score.overall}/100.`); load(); } }
    finally { setBusy(""); }
  };
  const publish = async () => {
    if (!draft) return; setBusy("pub");
    try { await saveWritingDraft(draft.id, { title, body }); const r = await publishWritingDraft(draft.id); if (r.ok && r.draft) { setDraft(r.draft); flash(`🚀 Published & live → ${r.url}`); load(); } else flash(r.message || "Publish failed."); }
    finally { setBusy(""); }
  };
  const removeDraft = async (id: string) => { await deleteWritingDraft(id); if (draft?.id === id) setDraft(null); flash("Draft deleted."); load(); };
  const runNow = async () => { if (!dash) return; setBusy("auto"); flash(`🤖 Auto-writer running — writing ${dash.autoWriter.count} full drafts (~several min)…`); try { const r = await runBlogAgent(dash.autoWriter.count); flash(`✓ Auto-writer wrote ${r.created.length} draft(s). See them below.`); load(); } catch { flash("Auto-writer failed — check the LLM key/quota."); } finally { setBusy(""); } };
  const runAssist = async (key: string) => {
    setBusy(key); setAssistPanel(null);
    const sel = window.getSelection?.()?.toString() || "";
    try { const r = await writingAssist({ action: key, text: sel || body, topic: topic || title, title, body }); if (r.ok) { if (r.options) setAssistPanel({ label: r.label || "", options: r.options }); else setAssistPanel({ label: r.label || "", result: r.result }); flash(`✓ ${r.label} ready.`); } else flash(r.message || "Assistant failed."); }
    finally { setBusy(""); }
  };
  const insertResult = (html: string) => { const nb = `${body}\n${html}`; setBody(nb); syncWords(nb); setAssistPanel(null); flash("Inserted into editor."); };
  const applyTemplate = (skeleton: string) => { if (!draft) { flash("Generate or open a draft first, then apply a template."); return; } setBody(skeleton); syncWords(skeleton); flash("Template applied — now edit & save."); };

  if (loading || !dash) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = dash.kpis;
  const aw = dash.autoWriter;
  const sc = draft?.score;
  const kpis = [
    { label: "Content Generated", value: kfmt(k.contentGenerated), trend: k.contentTrend, icon: FileText, color: "#8b5cf6" },
    { label: "Words Generated", value: kfmt(k.wordsGenerated), trend: k.wordsTrend, icon: Type, color: "#38bdf8" },
    { label: "Avg. Content Score", value: `${k.avgScore}/100`, trend: k.scoreTrend, icon: BarChart3, color: "#34d399" },
    { label: "Content Published", value: kfmt(k.contentPublished), trend: k.publishedTrend, icon: Globe, color: "#fbbf24" },
    { label: "Time Saved", value: `${k.timeSaved} hrs`, trend: k.timeTrend, icon: Sparkles, color: "#fb7185" },
  ];

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-sm">{note}</div>}
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-white">AI Writing</h2><p className="text-[12px] text-slate-500">Create high-quality, SEO-optimized content 10x faster with the power of AI.</p></div>{!dash.llm && <span className="text-[10px] text-amber-400 border border-amber-500/30 rounded-lg px-2 py-1">LLM offline — set ANTHROPIC_API_KEY</span>}</div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span><span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}</div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
        ); })}
      </Stagger>

      {/* Auto-Writer — watch the agent write on its own */}
      <FadeUp><div className="rounded-2xl border border-ink-800 bg-gradient-to-br from-ink-900/70 to-ink-950/40 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1"><span className="relative flex h-2.5 w-2.5">{aw.enabled && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />}<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aw.enabled ? "bg-emerald-400" : "bg-slate-600"}`} /></span><h3 className="text-sm font-bold text-white">Auto-Writer</h3><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${aw.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>{aw.enabled ? "LIVE" : "OFF"}</span></div>
            <p className="text-[11px] text-slate-500">The agent writes <b className="text-slate-300">{aw.schedule}</b> on its own. Drafts land below for you to review & publish.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-lg bg-ink-900/60 border border-ink-800 px-2.5 py-2"><div className="text-[9px] text-slate-500">Last run</div><div className="text-[12px] font-bold text-white">{ago(aw.lastRunAt)}</div><div className="text-[9px] text-emerald-400">{aw.lastRunCreated != null ? `+${aw.lastRunCreated} draft${aw.lastRunCreated === 1 ? "" : "s"}` : "—"}</div></div>
              <div className="rounded-lg bg-ink-900/60 border border-ink-800 px-2.5 py-2"><div className="text-[9px] text-slate-500">Next run</div><div className="text-[12px] font-bold text-white">{aw.enabled ? ago(aw.nextRunAt) : "paused"}</div><div className="text-[9px] text-slate-500">{aw.pendingDrafts} pending · {aw.totalWritten} written</div></div>
            </div>
            <button onClick={runNow} disabled={!!busy} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-brand-500/40 bg-brand-500/10 text-brand-200 text-[12px] font-semibold hover:bg-brand-500/20 disabled:opacity-50">{busy === "auto" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Run auto-writer now ({aw.count})</button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-semibold text-slate-300">Recently auto-written</span><span className="text-[9px] text-slate-600">click to open in editor</span></div>
            {aw.feed.length === 0 ? <div className="text-[11px] text-slate-500 py-6 text-center">No agent-written drafts yet — hit “Run auto-writer now”.</div> :
              <ul className="space-y-1.5">{aw.feed.map((f) => (
                <li key={f.id} onClick={() => openDraft(f.id)} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2 cursor-pointer hover:border-brand-500/40">
                  <span className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-300 grid place-items-center shrink-0"><Wand2 className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{f.title}</div><div className="text-[9px] text-slate-600">Copywriter Agent · {ago(f.date)}</div></div>
                  <span className="w-6 h-6 rounded-full border border-emerald-500/30 text-emerald-300 text-[9px] font-bold grid place-items-center shrink-0">{f.score}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${WSTATUS_TONE[f.status] || ""}`}>{f.status}</span>
                </li>
              ))}</ul>}
            {aw.runHistory.length > 0 && <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[9px] text-slate-600">Runs:{aw.runHistory.slice(0, 5).map((h, i) => <span key={i} className="px-1.5 py-0.5 rounded bg-ink-900 border border-ink-800">+{h.created} · {ago(h.at)}</span>)}</div>}
          </div>
        </div>
      </div></FadeUp>

      {/* create | recent drafts | assistant */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Create New Content">
          <div className="flex flex-wrap gap-1.5 mb-3">{dash.contentTypes.map((t) => <button key={t} onClick={() => setType(t)} className={`text-[10px] px-2.5 py-1 rounded-lg border ${type === t ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 text-slate-400 hover:text-white"}`}>{t}</button>)}</div>
          <div className="space-y-2.5">
            <div><label className="block text-[10px] text-slate-500 mb-1">Topic / Keyword</label><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. yacht rental dubai" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500" /></div>
            <div><label className="block text-[10px] text-slate-500 mb-1">Target Audience</label><input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Travelers looking for luxury yacht rentals" className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
            <div><label className="block text-[10px] text-slate-500 mb-1">Content Brief</label><select value={briefId} onChange={(e) => setBriefId(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-9 text-[12px] text-slate-300 focus:outline-none"><option value="">None — free topic</option>{dash.briefOptions.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-[10px] text-slate-500 mb-1">Tone of Voice</label><select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-9 text-[12px] text-slate-300">{["Professional", "Casual", "Friendly", "Authoritative", "Witty"].map((o) => <option key={o}>{o}</option>)}</select></div>
              <div><label className="block text-[10px] text-slate-500 mb-1">Language</label><select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-9 text-[12px] text-slate-300">{["English (US)", "English (UK)", "Arabic"].map((o) => <option key={o}>{o}</option>)}</select></div>
            </div>
            <div><label className="block text-[10px] text-slate-500 mb-1">Word Count</label><select value={wc} onChange={(e) => setWc(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2 h-9 text-[12px] text-slate-300">{["500 - 1000 words", "1000 - 1500 words", "1500 - 2000 words", "2000 - 3000 words"].map((o) => <option key={o}>{o}</option>)}</select></div>
            <button onClick={generate} disabled={busy === "gen"} className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-60">{busy === "gen" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Content</button>
            <p className="text-[9px] text-slate-600 text-center">Real Claude generation → creates an editable draft.</p>
          </div>
        </Card></FadeUp>

        <FadeUp delay={0.05}><Card title="Recent AI Drafts" right={<ViewAll label="View All Drafts" />}>
          <ul className="space-y-1.5">{dash.recentDrafts.map((dft) => (
            <li key={dft.id} className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer ${draft?.id === dft.id ? "border-brand-500/50 bg-brand-500/5" : "border-ink-800 bg-ink-950/40 hover:border-ink-700"}`} onClick={() => openDraft(dft.id)}>
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{dft.title}</div><div className="text-[9px] text-slate-600">{dft.words.toLocaleString()} words</div></div>
              <span className="w-6 h-6 rounded-full border border-emerald-500/30 text-emerald-300 text-[9px] font-bold grid place-items-center shrink-0">{dft.score}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${WSTATUS_TONE[dft.status] || ""}`}>{dft.status}</span>
              <button onClick={(e) => { e.stopPropagation(); removeDraft(dft.id); }} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}{dash.recentDrafts.length === 0 && <li className="text-[11px] text-slate-500 py-4 text-center">No drafts yet — generate one.</li>}</ul>
        </Card></FadeUp>

        <FadeUp delay={0.1}><Card title="AI Writing Assistant" sub="Get help from AI at any stage">
          <ul className="space-y-1">{dash.assistant.map((a) => (
            <li key={a.key}><button onClick={() => runAssist(a.key)} disabled={!!busy} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-ink-800/60 text-left disabled:opacity-50">
              <span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0">{busy === a.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}</span>
              <span className="flex-1 min-w-0"><span className="block text-[11px] font-semibold text-white truncate">{a.label}</span><span className="block text-[9px] text-slate-500 truncate">{a.desc}</span></span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </button></li>
          ))}</ul>
          {assistPanel && <div className="mt-2 rounded-lg border border-brand-500/30 bg-ink-950/60 p-2.5"><div className="flex items-center justify-between mb-1.5"><span className="text-[10px] font-bold text-brand-300">{assistPanel.label}</span><button onClick={() => setAssistPanel(null)}><X className="w-3 h-3 text-slate-500" /></button></div>
            {assistPanel.options ? <div className="space-y-1">{assistPanel.options.map((o, i) => <button key={i} onClick={() => { setTitle(o); flash("Title set."); }} className="w-full text-left text-[10px] text-slate-300 hover:text-white rounded px-2 py-1 hover:bg-ink-800">{o}</button>)}</div>
              : <><div className="text-[10px] text-slate-400 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: assistPanel.result || "" }} /><button onClick={() => insertResult(assistPanel.result || "")} className="mt-1.5 text-[10px] font-semibold text-brand-300 hover:text-brand-200">+ Insert into editor</button></>}
          </div>}
        </Card></FadeUp>
      </div>

      {/* editor | score | templates */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px_260px] gap-5">
        <FadeUp><Card title="AI Content Editor">
          {!draft ? <div className="py-16 text-center text-[12px] text-slate-500"><Wand2 className="w-7 h-7 mx-auto mb-2 text-slate-700" />Generate or open a draft to start editing.</div> : <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent text-lg font-bold text-white mb-2 focus:outline-none border-b border-ink-800 pb-1.5" />
            <RichTextEditor value={body} onChange={(h) => { setBody(h); syncWords(h); }} minHeight={320} placeholder="Write your article…" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-500">{words.toLocaleString()} words {savedAt && <span className="text-emerald-500">· Saved {savedAt}</span>}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => save("In Review")} disabled={!!busy} className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 hover:text-white disabled:opacity-50"><Eye className="w-3.5 h-3.5" /> Review</button>
                <button onClick={() => save()} disabled={!!busy} className="inline-flex items-center gap-1 text-[11px] px-2.5 h-8 rounded-lg bg-ink-700 text-white disabled:opacity-50">{busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save</button>
                <button onClick={publish} disabled={!!busy || draft.status === "Published"} className="inline-flex items-center gap-1 text-[11px] px-3 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold disabled:opacity-50">{busy === "pub" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} {draft.status === "Published" ? "Published" : "Publish"}</button>
              </div>
            </div>
            {draft.status === "Published" && draft.url && <a href={`http://localhost:3000${draft.url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 hover:underline"><Globe className="w-3 h-3" /> Live on site: {draft.url}</a>}
          </>}
        </Card></FadeUp>

        <FadeUp delay={0.05}><Card title="Content Score" right={<ViewAll label="View Full Analysis" />}>
          {sc ? <><ScoreGauge score={sc.overall} /><p className="text-center text-[10px] text-emerald-400 font-semibold mt-1">{sc.overall >= 85 ? "Excellent! Well-optimized" : sc.overall >= 70 ? "Good — minor tweaks" : "Needs work"}</p>
            <ul className="mt-3 space-y-2">{([["SEO Score", sc.seo], ["Readability", sc.readability], ["Structure", sc.structure], ["Engagement", sc.engagement], ["Originality", sc.originality]] as [string, number][]).map(([l, v]) => (
              <li key={l}><div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-400">{l}</span><span className="text-white font-bold">{v}/100</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: v >= 70 ? "#34d399" : v >= 45 ? "#fbbf24" : "#fb7185" }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.7 }} /></div></li>
            ))}</ul></>
            : <div className="py-12 text-center text-[11px] text-slate-500">Open a draft to see its score.</div>}
        </Card></FadeUp>

        <FadeUp delay={0.1}><Card title="Templates" right={<ViewAll label="View All Templates" />}>
          <ul className="space-y-1.5">{dash.templates.map((t) => (
            <li key={t.id}><button onClick={() => { setType(t.type); applyTemplate(t.skeleton); }} className="w-full text-left rounded-lg border border-ink-800 bg-ink-950/40 hover:border-brand-500/40 px-2.5 py-2"><div className="text-[11px] font-semibold text-white">{t.name}</div><div className="text-[9px] text-slate-500">{t.desc}</div></button></li>
          ))}</ul>
        </Card></FadeUp>
      </div>

      {/* bottom strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <FadeUp><Card title="AI Writing Insights"><ul className="space-y-2">{dash.insights.map((i, idx) => <li key={idx} className="flex items-start gap-2"><span className="w-4 h-4 rounded bg-ink-800 text-[9px] text-slate-400 grid place-items-center shrink-0 mt-0.5">{idx + 1}</span><div><div className="text-[11px] text-white capitalize">{i.keyword}</div><div className="text-[9px] text-slate-500">{i.traffic} · {i.competition}</div></div></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.04}><Card title="Content Suggestions"><ul className="space-y-1.5">{dash.suggestions.map((s, i) => <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300"><CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /><span className="truncate">{s}</span></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.08}><Card title="Content Opportunities"><ul className="space-y-1.5">{dash.opportunities.map((o, i) => <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300"><Target className="w-3 h-3 text-violet-400 shrink-0" /><span className="truncate capitalize">{o}</span></li>)}{dash.opportunities.length === 0 && <li className="text-[10px] text-slate-600">No low-competition gaps right now.</li>}</ul></Card></FadeUp>
        <FadeUp delay={0.12}><Card title="Optimization Tips"><ul className="space-y-1.5">{dash.optimizationTips.map((t, i) => <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300"><Lightbulb className={`w-3 h-3 shrink-0 ${t.recommended ? "text-amber-400" : "text-slate-600"}`} /><span>{t.tip}{t.recommended && <span className="text-[8px] text-amber-400 ml-1">(recommended)</span>}</span></li>)}</ul></Card></FadeUp>
        <FadeUp delay={0.16}><Card title="AI Credits Usage"><div className="flex items-center gap-2"><Coins className="w-4 h-4 text-brand-400" /><span className="text-xl font-extrabold text-white">{dash.credits.used.toLocaleString()}</span><span className="text-[11px] text-slate-500">/ {dash.credits.total.toLocaleString()}</span></div><div className="h-2 rounded-full bg-ink-800 overflow-hidden mt-2"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${(dash.credits.used / dash.credits.total) * 100}%` }} transition={{ duration: 0.8 }} /></div><div className="text-[9px] text-slate-600 mt-1">{dash.credits.resetLabel} · ~50 credits / generation (est.)</div></Card></FadeUp>
      </div>
    </div>
  );
}

/* ----------------------------- OPTIMIZATION TAB ----------------------------- */
const OPT_STATUS_TONE: Record<string, string> = { "Fully Optimized": "text-emerald-400", "Needs Improvement": "text-amber-400", "Needs Major Work": "text-rose-400", "Not Analyzed": "text-slate-500" };
const SEV_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-400" };
function AreaTrend({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return null;
  const W = 320, H = 130, P = 8;
  const max = Math.max(...data.map((d) => d.value), 100), min = Math.min(...data.map((d) => d.value), 0);
  const sp = max - min || 1;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / sp) * (H - 2 * P);
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 150 }}>
      <defs><linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
      <motion.polygon points={area} fill="url(#optGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
      <motion.polyline points={line} fill="none" stroke="#8b5cf6" strokeWidth={2} vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r={3} fill="#8b5cf6" />
      <text x={x(data.length - 1) - 4} y={y(data[data.length - 1].value) - 6} fontSize="10" fill="#c4b5fd" textAnchor="end" fontWeight="700">{data[data.length - 1].value}</text>
    </svg>
  );
}
function OptimizationTab() {
  const [d, setD] = useState<Optimization | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sub, setSub] = useState("Content Optimization");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const load = async () => { setLoading(true); try { setD(await getOptimization()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 4500); };
  const apply = async (key: string) => { setBusy(key); try { const r = await applyOptimization(key); flash(`✓ ${r.message}`); load(); } catch { flash("Couldn't apply."); } finally { setBusy(""); } };
  const exportCsv = () => { if (!d) return; const head = "Page,URL,Score,Status,Issues,Impressions,Clicks,Traffic Impact,Last Analyzed"; const lines = d.audit.map((a) => [a.title.replace(/,/g, " "), a.url, a.score, a.status, a.issues, a.impressions, a.clicks, `${a.trafficImpact}%`, new Date(a.lastAnalyzed).toISOString().slice(0, 10)].join(",")); const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "optimization-audit.csv"; a.click(); URL.revokeObjectURL(url); flash("✓ Exported optimization-audit.csv"); };

  if (loading || !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const k = d.kpis;
  const kpis = [
    { label: "Average Content Score", value: `${k.avgScore}`, unit: "/100", trend: k.scoreTrend, tUnit: "pts", icon: Target, color: "#8b5cf6", ring: k.avgScore },
    { label: "Pages Optimized", value: kfmt(k.pagesOptimized), unit: "", trend: k.pagesTrend, tUnit: "%", icon: CheckCircle2, color: "#34d399" },
    { label: "Top 3 Ranking Improvements", value: kfmt(k.top3Improvements), unit: "", trend: k.top3Trend, tUnit: "%", icon: TrendUp, color: "#38bdf8" },
    { label: "Organic Traffic Impact", value: `+${k.organicTrafficImpact}%`, unit: "", trend: k.trafficTrend, tUnit: "%", icon: BarChart3, color: "#fbbf24" },
    { label: "Impressions Gained", value: kfmt(k.impressionsGained), unit: "", trend: k.impressionsTrend, tUnit: "%", icon: Eye, color: "#fb7185" },
  ];
  const DIM: Record<string, string[]> = { "On-Page SEO": ["onpage"], "Technical SEO": ["technical"], Readability: ["content"], "Engagement & UX": ["content", "technical"] };
  const opps = sub === "Content Optimization" ? d.opportunities : d.opportunities.filter((o) => (DIM[sub] || []).includes(o.dim));
  const audit = d.audit.filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.url.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      {note && <div className="fixed top-4 right-4 z-[70] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-sm">{note}</div>}
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-lg font-bold text-white">Optimization</h2><p className="text-[12px] text-slate-500">Optimize your content to improve search rankings, drive more traffic, and increase conversions.</p></div><button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div>

      {/* sub-tabs */}
      <div className="flex gap-1 border-b border-ink-800 overflow-x-auto scrollbar-thin">{d.subTabs.map((s) => <button key={s} onClick={() => setSub(s)} className={`relative px-3 py-2 text-[12px] font-medium whitespace-nowrap ${sub === s ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{s}{sub === s && <motion.span layoutId="optSub" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div>

      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500 leading-tight">{c.label}</span>{c.ring != null ? <span className="relative w-8 h-8"><svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="4" /><circle cx="18" cy="18" r="15" fill="none" stroke={c.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 15} strokeDashoffset={2 * Math.PI * 15 * (1 - c.ring / 100)} /></svg></span> : <span className="w-7 h-7 rounded-lg bg-ink-800 grid place-items-center" style={{ color: c.color }}><Ico className="w-3.5 h-3.5" /></span>}</div><div className="mt-1.5 text-xl font-extrabold text-white">{c.value}<span className="text-xs text-slate-500 font-semibold">{c.unit}</span></div><div className="mt-0.5"><Trend n={c.trend} /></div></Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <FadeUp><Card title="Content Optimization Overview">
          <div className="flex items-center gap-3"><MultiDonut segments={d.overview.map((x) => ({ value: x.count, color: x.color }))} total={d.totals.total} label="Total Pages" size={130} stroke={15} /><ul className="space-y-1.5 flex-1">{d.overview.map((x) => <li key={x.label} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-full" style={{ background: x.color }} /><span className="text-slate-400 flex-1">{x.label}</span><span className="text-white font-bold">{x.count}</span><span className="text-slate-600">({x.pct}%)</span></li>)}</ul></div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="Optimization Score Trend" sub="Recent" right={<span className="text-[10px] text-slate-500">Avg Content Score</span>}><AreaTrend data={d.trend} /></Card></FadeUp>
        <FadeUp delay={0.1}><Card title="Top Optimization Opportunities" right={<ViewAll />}>
          <ul className="space-y-2">{opps.map((o) => (
            <li key={o.key} className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-ink-800 text-brand-300 grid place-items-center shrink-0"><Wand2 className="w-3.5 h-3.5" /></span><div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-white truncate">{o.label}</div><div className="text-[9px] text-slate-500">{o.count} {o.unit}</div></div><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${SEV_TONE[o.severity]}`}>{o.severity}</span></li>
          ))}{opps.length === 0 && <li className="text-[11px] text-slate-500 py-4 text-center">No opportunities in this category — nicely optimized.</li>}</ul>
        </Card></FadeUp>
      </div>

      <FadeUp><Card title="Content Optimization Audit">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-7 pr-2 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none" /></div>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Download className="w-3.5 h-3.5" /> Export</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left min-w-[760px]"><thead><tr className="text-[9px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-1.5 font-semibold">Page / URL</th><th className="font-semibold text-center">Score</th><th className="font-semibold">Status</th><th className="font-semibold text-center">Issues</th><th className="font-semibold text-right">Impr.</th><th className="font-semibold text-right">Clicks</th><th className="font-semibold text-right">Impact</th><th className="font-semibold text-right">Analyzed</th></tr></thead>
          <tbody>{audit.map((a) => (
            <tr key={a.id} className="border-b border-ink-900 hover:bg-ink-900/40"><td className="py-2"><div className="text-[11px] font-semibold text-white truncate max-w-[200px]">{a.title}</div><div className="text-[9px] text-slate-600 truncate max-w-[200px]">{a.url}</div></td><td className="text-center"><span className={`w-7 h-7 inline-grid place-items-center rounded-full border text-[10px] font-bold ${a.score >= 85 ? "border-emerald-500/40 text-emerald-300" : a.score >= 70 ? "border-amber-500/40 text-amber-300" : a.score > 0 ? "border-rose-500/40 text-rose-300" : "border-ink-700 text-slate-600"}`}>{a.score || "—"}</span></td><td><span className={`text-[10px] font-semibold ${OPT_STATUS_TONE[a.status]}`}>{a.status}</span></td><td className="text-center text-[11px] text-slate-300">{a.issues}</td><td className="text-right text-[10px] text-slate-400 tabular-nums">{kfmt(a.impressions)}</td><td className="text-right text-[10px] text-slate-400 tabular-nums">{kfmt(a.clicks)}</td><td className={`text-right text-[10px] font-semibold tabular-nums ${a.trafficImpact >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{a.trafficImpact >= 0 ? "+" : ""}{a.trafficImpact}%</td><td className="text-right text-[9px] text-slate-500">{new Date(a.lastAnalyzed).toLocaleDateString()}</td></tr>
          ))}{audit.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-[11px] text-slate-500">No pages match.</td></tr>}</tbody></table></div>
      </Card></FadeUp>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
        <FadeUp><Card title="Optimization Impact" right={<ViewAll label="View Full Impact Report" />}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] text-slate-500">Organic Traffic</div><div className="text-2xl font-extrabold text-emerald-400">{d.impact.organicTraffic}%</div><Trend n={d.impact.organicTrend} /></div>
            <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[10px] text-slate-500">Average Ranking</div><div className="text-2xl font-extrabold text-white">↑ {d.impact.avgRanking}</div><Trend n={d.impact.rankingTrend} /></div>
          </div>
          <div className="grid grid-cols-4 gap-2">{([["Top 3", d.impact.top3Rankings, d.impact.top3Trend], ["Top 10", d.impact.top10Rankings, d.impact.top10Trend], ["Impr.", d.impact.impressions, d.impact.impressionsTrend], ["Clicks", d.impact.clicks, d.impact.clicksTrend]] as [string, number, number][]).map(([l, v, t]) => (
            <div key={l} className="rounded-lg bg-ink-900/60 border border-ink-800 px-2 py-2 text-center"><div className="text-[8px] text-slate-500">{l}</div><div className="text-sm font-bold text-white">{kfmt(v)}</div><div className="text-[8px] text-emerald-400">↑{t}%</div></div>
          ))}</div>
        </Card></FadeUp>
        <FadeUp delay={0.05}><Card title="AI Optimization Recommendations" right={<ViewAll label="View All Recommendations" />}>
          <ul className="space-y-2">{d.recommendations.map((r) => (
            <li key={r.key} className="flex items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2"><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-3.5 h-3.5" /></span><div className="flex-1 min-w-0"><div className="text-[11px] font-semibold text-white">{r.title}</div><div className="text-[9px] text-slate-500 truncate">{r.detail}</div></div><span className={`text-[8px] font-bold ${r.impact.startsWith("High") ? "text-emerald-400" : r.impact.startsWith("Medium") ? "text-amber-400" : "text-slate-500"}`}>{r.impact.split(" ")[0]}</span>{r.action === "apply" ? <button onClick={() => apply(r.key)} disabled={!!busy} className="text-[10px] font-semibold px-2.5 h-7 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white disabled:opacity-50">{busy === r.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}</button> : <button onClick={() => { setSub("Content Optimization"); flash(`${r.detail}`); }} className="text-[10px] font-semibold px-2.5 h-7 rounded-lg border border-ink-700 text-slate-300">View</button>}</li>
          ))}</ul>
        </Card></FadeUp>
      </div>
    </div>
  );
}
