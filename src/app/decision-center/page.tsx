"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel, Loader2, Bell, Calendar, CheckCircle2, X, Clock, Activity as ActivityIcon,
  ShieldCheck, Sparkles, ArrowRight, Globe, ChevronRight, CircleDashed, AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp } from "@/components/motion";
import {
  fetchMe, getStoredUser, getCeoOrchestration, executeCeoTask, rejectCeoProposal, getActivity,
  getCeoCompletedFixes,
  type OrchTask, type OrchStatus, type Activity, type CompletedFix,
} from "@/lib/api";

// Public site for "view the affected page" links (never localhost).
const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae").replace(/\/+$/, "");
const pageUrl = (path?: string) => (path ? `${PUBLIC_SITE}/en${path === "/" ? "" : path}` : "");

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const prettyAction = (a?: string) => String(a || "").replace(/^agent\./, "").replace(/\./g, " · ").replace(/_/g, " ");
const impactPill = (i: string) => (i === "High" ? "bg-rose-500/15 text-rose-300" : i === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");

// One place that maps every task status to its colour, label and icon.
type StatusKind = "approval" | "progress" | "done" | "failed" | "queued";
function statusMeta(s: OrchStatus): { kind: StatusKind; label: string; pill: string; Icon: React.ElementType } {
  switch (s) {
    case "Waiting Approval": return { kind: "approval", label: "Needs approval", pill: "bg-amber-500/15 text-amber-300", Icon: ShieldCheck };
    case "In Progress": return { kind: "progress", label: "In progress", pill: "bg-sky-500/15 text-sky-300", Icon: Clock };
    case "Completed": return { kind: "done", label: "Completed", pill: "bg-emerald-500/15 text-emerald-300", Icon: CheckCircle2 };
    case "Failed/Blocked": return { kind: "failed", label: "Failed", pill: "bg-rose-500/15 text-rose-300", Icon: AlertTriangle };
    default: return { kind: "queued", label: "Queued", pill: "bg-slate-500/15 text-slate-300", Icon: CircleDashed };
  }
}

type Tab = "approval" | "progress" | "done" | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "approval", label: "Needs Approval" },
  { key: "progress", label: "In Progress" },
  { key: "done", label: "Completed" },
  { key: "all", label: "All Tasks" },
];
function inTab(t: OrchTask, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "approval") return t.status === "Waiting Approval";
  if (tab === "progress") return t.status === "In Progress" || t.status === "Pending";
  return t.status === "Completed" || t.status === "Failed/Blocked";
}

export default function DecisionCenterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<OrchTask[]>([]);          // ALL tasks, every status
  const [fixes, setFixes] = useState<CompletedFix[]>([]);      // applied changes (before → after)
  const [stats, setStats] = useState<{ total: number; waiting: number; inProgress: number; completed: number }>({ total: 0, waiting: 0, inProgress: 0, completed: 0 });
  const [feed, setFeed] = useState<Activity[]>([]);
  const [tab, setTab] = useState<Tab>("approval");
  const [busyId, setBusyId] = useState("");
  const [flash, setFlash] = useState("");
  const [sel, setSel] = useState<OrchTask | null>(null);       // detail drawer

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      const [orch, act, fx] = await Promise.all([
        getCeoOrchestration().catch(() => null),
        getActivity(40).then((r) => r.activities).catch(() => []),
        getCeoCompletedFixes().then((r) => r.fixes).catch(() => []),
      ]);
      if (orch) {
        setTasks(orch.tasks);
        setStats({ total: orch.stats.total, waiting: orch.stats.waiting, inProgress: orch.stats.inProgress, completed: orch.stats.completed });
      }
      setFeed(act || []);
      setFixes(fx || []);
    } finally { if (!soft) setLoading(false); }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 4000); };

  const decide = async (t: OrchTask, decision: "approve" | "reject") => {
    setBusyId(t.id);
    try {
      const r = decision === "approve" ? await executeCeoTask(t.id) : await rejectCeoProposal(t.id);
      note(decision === "approve" ? `✓ Approved — ${("message" in r && r.message) || t.task}` : `Rejected — ${t.task}`);
      if (sel?.id === t.id) setSel(null);
      load(true);
    } catch (e) { note(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusyId(""); }
  };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const kpis = [
    { label: "Needs Approval", value: stats.waiting, icon: Gavel, color: "bg-amber-500/15 text-amber-300" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "bg-sky-500/15 text-sky-300" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-300" },
    { label: "Total Tasks", value: stats.total, icon: ActivityIcon, color: "bg-brand-500/15 text-brand-300" },
  ];
  const count = (tb: Tab) => tasks.filter((t) => inTab(t, tb)).length;
  const shown = tasks.filter((t) => inTab(t, tab));

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shrink-0"><Gavel className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Decision Center</h1><p className="text-[11px] text-slate-500 truncate">Every task the AI workforce is running — done, in progress, and awaiting your approval.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <button onClick={() => load()} className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" />{stats.waiting > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}</button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {flash && <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-[12px] text-brand-200">{flash}</div>}

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
                <span className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${k.color}`}><k.icon className="w-4.5 h-4.5" /></span>
                <div className="text-2xl font-extrabold text-white leading-tight">{k.value}</div>
                <div className="text-[12px] text-slate-500">{k.label}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid place-items-center py-24"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
              {/* Task board — all statuses, tabbed */}
              <FadeUp>
                <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink-800">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">AI Workforce Tasks</h2>
                    <span className="ml-auto text-[10px] text-slate-500">click any task for full detail</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 flex-wrap">
                    {TABS.map((tb) => {
                      const on = tab === tb.key;
                      return (
                        <button key={tb.key} onClick={() => setTab(tb.key)} className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold border transition-colors ${on ? "bg-brand-600 border-brand-600 text-white" : "border-ink-700 text-slate-300 hover:text-white hover:bg-ink-800"}`}>
                          {tb.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${on ? "bg-white/25 text-white" : "bg-ink-800 text-slate-400"}`}>{count(tb.key)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="divide-y divide-ink-900">
                    {shown.length === 0 ? (
                      <div className="px-5 py-12 text-center text-[13px] text-slate-500"><CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />Nothing here right now.</div>
                    ) : shown.map((t) => {
                      const m = statusMeta(t.status);
                      const isApproval = t.status === "Waiting Approval";
                      const showBar = t.status === "In Progress" || t.status === "Pending";
                      return (
                        <div key={t.id} onClick={() => setSel(t)} className="px-5 py-3.5 cursor-pointer hover:bg-ink-800/30 transition-colors group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${m.pill}`}><m.Icon className="w-3 h-3" />{m.label}</span>
                                <span className="text-[13px] font-semibold text-white group-hover:text-brand-500">{t.task}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactPill(t.impact)}`}>{t.impact} impact</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{t.agent} · {t.department}{t.page ? ` · ${t.page}` : ""}</div>
                              {(t.reason || t.description) && <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{t.reason || t.description}</p>}
                              {showBar && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="h-1.5 flex-1 max-w-[180px] rounded-full bg-ink-800 overflow-hidden"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, Math.min(100, t.progress || 0))}%` }} /></div>
                                  <span className="text-[10px] text-slate-500">{t.progress || 0}%</span>
                                </div>
                              )}
                              {t.status === "Completed" && t.output && <p className="text-[11px] text-emerald-400/80 mt-1.5 line-clamp-1">✓ {t.output}</p>}
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-400/80 opacity-0 group-hover:opacity-100 transition-opacity">View details <ChevronRight className="w-3 h-3" /></div>
                            </div>
                            {isApproval ? (
                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => decide(t, "approve")} disabled={!!busyId} title="Approve & execute" className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25 disabled:opacity-50">{busyId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve</button>
                                <button onClick={() => decide(t, "reject")} disabled={!!busyId} title="Reject" className="inline-flex items-center gap-1 px-2 h-8 rounded-lg border border-rose-500/40 text-rose-300 text-[11px] font-bold hover:bg-rose-500/10 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 mt-1 group-hover:text-slate-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* On the Completed tab, show concrete before → after of what was applied */}
                  {tab === "done" && fixes.length > 0 && (
                    <div className="border-t border-ink-800">
                      <div className="px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Recently applied changes</div>
                      <div className="divide-y divide-ink-900">
                        {fixes.slice(0, 12).map((f) => (
                          <div key={f.id} className="px-5 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${f.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{f.status === "Completed" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}{f.status}</span>
                              <span className="text-[12px] font-semibold text-white">{f.task}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{f.agent} · {f.department}{f.page ? ` · ${f.page}` : ""}{f.appliedAt ? ` · ${timeAgo(f.appliedAt)}` : ""}</div>
                            {f.changes?.slice(0, 3).map((c, i) => (
                              <div key={i} className="mt-1.5 text-[11px]">
                                <div className="text-slate-500">{c.field}</div>
                                <div className="flex items-start gap-1.5 text-slate-400"><span className="line-through opacity-70 break-words">{c.before || "—"}</span><ArrowRightLeft className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" /><span className="text-emerald-400 break-words">{c.after || "—"}</span></div>
                              </div>
                            ))}
                            {f.path && <a href={pageUrl(f.path)} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-brand-400 hover:underline"><Globe className="w-3 h-3" /> View live page <ArrowRight className="w-3 h-3" /></a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FadeUp>

              {/* Live web activity — what every agent is doing */}
              <FadeUp>
                <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink-800">
                    <ActivityIcon className="w-4 h-4 text-brand-400" />
                    <h2 className="text-sm font-bold text-white">Live Web Activity</h2>
                    <span className="ml-auto text-[10px] text-slate-500">what the agents are doing</span>
                  </div>
                  <div className="divide-y divide-ink-900 max-h-[620px] overflow-y-auto">
                    {feed.length === 0 ? (
                      <div className="px-5 py-12 text-center text-[13px] text-slate-500">No activity yet.</div>
                    ) : feed.map((a, i) => (
                      <div key={a.id || i} className="px-5 py-3 flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-ink-800 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Sparkles className="w-3.5 h-3.5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] text-slate-200 leading-snug"><span className="font-semibold text-white">{a.actorName || "Agent"}</span> · {prettyAction(a.action)}</div>
                          {a.entityLabel && <div className="text-[11px] text-slate-500 truncate">{a.entityLabel}</div>}
                          <div className="text-[10px] text-slate-600 mt-0.5">{timeAgo(a.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            </div>
          )}
        </div>

        {sel && (() => {
          const m = statusMeta(sel.status);
          const isApproval = sel.status === "Waiting Approval";
          return (
            <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
              <div className="relative w-full max-w-md h-full overflow-y-auto bg-ink-950 border-l border-ink-800 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${m.pill}`}><m.Icon className="w-3 h-3" />{m.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactPill(sel.impact)}`}>{sel.impact} impact</span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug mt-1">{sel.task}</h3>
                  </div>
                  <button onClick={() => setSel(null)} className="text-slate-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([["Agent", sel.agent], ["Department", sel.department], ["Priority", sel.priority], ["Confidence", sel.confidence ? `${sel.confidence}%` : "—"]] as [string, string][]).map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-ink-800 bg-ink-900/50 p-2"><div className="text-[10px] text-slate-500">{l}</div><div className="text-[12px] text-slate-200 font-semibold truncate">{v}</div></div>
                  ))}
                </div>

                {(sel.status === "In Progress" || sel.status === "Pending") && (
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="font-bold text-sky-300">Progress</span><span className="text-slate-400">{sel.progress || 0}%</span></div>
                    <div className="h-2 rounded-full bg-ink-800 overflow-hidden"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(4, Math.min(100, sel.progress || 0))}%` }} /></div>
                  </div>
                )}

                {sel.status === "Completed" && sel.output && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="text-[11px] font-bold text-emerald-300 mb-1">What was done</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{sel.output}</p>
                  </div>
                )}

                {sel.description && (
                  <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">What this is</div>
                    <p className="text-[12px] text-slate-300 leading-relaxed">{sel.description}</p>
                  </div>
                )}

                {sel.reason && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="text-[11px] font-bold text-amber-300 mb-1">Why this matters</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{sel.reason}</p>
                  </div>
                )}

                {sel.plan && sel.plan.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">{isApproval ? "What happens on approval" : "Plan"}</div>
                    <ol className="space-y-1.5">{sel.plan.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[11px] text-slate-300"><span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 grid place-items-center text-[8px] font-bold shrink-0 mt-0.5">{i + 1}</span><span>{s}</span></li>
                    ))}</ol>
                  </div>
                )}

                {sel.subtasks && sel.subtasks.length > 0 && !(sel.plan && sel.plan.length) && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Checklist</div>
                    <ul className="space-y-1">{sel.subtasks.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-slate-300"><CheckCircle2 className={`w-3.5 h-3.5 ${s.done ? "text-emerald-400" : "text-slate-600"}`} />{s.label}</li>
                    ))}</ul>
                  </div>
                )}

                {sel.path && (
                  <a href={pageUrl(sel.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-400 hover:underline">
                    <Globe className="w-3.5 h-3.5" /> {sel.page ? `${sel.page} — ` : ""}/en{sel.path === "/" ? "" : sel.path} <ArrowRight className="w-3 h-3" />
                  </a>
                )}

                {isApproval ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-ink-800">
                    <button onClick={() => decide(sel, "approve")} disabled={!!busyId} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">{busyId === sel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve & Execute</button>
                    <button onClick={() => decide(sel, "reject")} disabled={!!busyId} className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg border border-rose-500/40 text-rose-300 text-sm font-semibold hover:bg-rose-500/10 disabled:opacity-50"><X className="w-4 h-4" /> Reject</button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-ink-800 text-[11px] text-slate-500 flex items-center gap-1.5"><m.Icon className="w-3.5 h-3.5" /> This task is {m.label.toLowerCase()} — no action needed.</div>
                )}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
