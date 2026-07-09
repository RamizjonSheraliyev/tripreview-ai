"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel, Loader2, Bell, Calendar, CheckCircle2, X, Clock, Activity as ActivityIcon,
  ShieldCheck, Sparkles, ArrowRight, AlertTriangle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp } from "@/components/motion";
import {
  fetchMe, getStoredUser, getCeoOrchestration, executeCeoTask, rejectCeoProposal, getActivity,
  type OrchTask, type Activity,
} from "@/lib/api";

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

export default function DecisionCenterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<OrchTask[]>([]);
  const [stats, setStats] = useState<{ waiting: number; inProgress: number; completed: number }>({ waiting: 0, inProgress: 0, completed: 0 });
  const [feed, setFeed] = useState<Activity[]>([]);
  const [busyId, setBusyId] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orch, act] = await Promise.all([
        getCeoOrchestration().catch(() => null),
        getActivity(30).then((r) => r.activities).catch(() => []),
      ]);
      if (orch) {
        setTasks(orch.tasks.filter((t) => t.status === "Waiting Approval"));
        setStats({ waiting: orch.stats.waiting, inProgress: orch.stats.inProgress, completed: orch.stats.completed });
      }
      setFeed(act || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 4000); };

  const decide = async (t: OrchTask, decision: "approve" | "reject") => {
    setBusyId(t.id);
    try {
      const r = decision === "approve" ? await executeCeoTask(t.id) : await rejectCeoProposal(t.id);
      note(decision === "approve" ? `✓ Approved — ${("message" in r && r.message) || t.task}` : `Rejected — ${t.task}`);
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
      load();
    } catch (e) { note(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusyId(""); }
  };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const kpis = [
    { label: "Needs Approval", value: stats.waiting, icon: Gavel, color: "bg-amber-500/15 text-amber-300" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "bg-sky-500/15 text-sky-300" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-300" },
  ];

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center shrink-0"><Gavel className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Decision Center</h1><p className="text-[11px] text-slate-500 truncate">Everything at a glance — what the AI workforce is doing on the web, and what needs your approval.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <button onClick={load} className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" />{stats.waiting > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}</button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {flash && <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-[12px] text-brand-200">{flash}</div>}

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
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
              {/* Needs approval */}
              <FadeUp>
                <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink-800">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">Needs Your Approval</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">{tasks.length}</span>
                  </div>
                  <div className="divide-y divide-ink-900">
                    {tasks.length === 0 ? (
                      <div className="px-5 py-12 text-center text-[13px] text-slate-500"><CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />You&apos;re all caught up — nothing waiting for approval.</div>
                    ) : tasks.map((t) => (
                      <div key={t.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-white">{t.task}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactPill(t.impact)}`}>{t.impact} impact</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{t.agent} · {t.department}{t.page ? ` · ${t.page}` : ""}</div>
                            {(t.reason || t.description) && <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{t.reason || t.description}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => decide(t, "approve")} disabled={!!busyId} title="Approve & execute" className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25 disabled:opacity-50">{busyId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve</button>
                            <button onClick={() => decide(t, "reject")} disabled={!!busyId} title="Reject" className="inline-flex items-center gap-1 px-2 h-8 rounded-lg border border-rose-500/40 text-rose-300 text-[11px] font-bold hover:bg-rose-500/10 disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Live web activity */}
              <FadeUp>
                <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-ink-800">
                    <ActivityIcon className="w-4 h-4 text-brand-400" />
                    <h2 className="text-sm font-bold text-white">Live Web Activity</h2>
                    <span className="ml-auto text-[10px] text-slate-500">what the agents are doing</span>
                  </div>
                  <div className="divide-y divide-ink-900 max-h-[560px] overflow-y-auto">
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
      </main>
    </div>
  );
}
