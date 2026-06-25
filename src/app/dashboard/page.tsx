"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Sparkles, Bell, Loader2, RefreshCw, ArrowRight, CheckCircle2, XCircle,
  Users, ListChecks, CheckCheck, FileText, Building2, DollarSign, Zap,
  Crown, Search, PenLine, Send, Share2, Radar, Megaphone, Handshake, UserCheck,
  Plus, UserPlus, FilePlus2, BarChart3, MessagesSquare, TrendingUp,
} from "lucide-react";
import {
  fetchMe, getStoredUser, getStats, getActivity, getBrainTasks, approveBrainTask, dismissBrainTask,
  getCeoOverview,
  type Stats, type Activity, type BrainTask, type CeoOverview,
} from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, AnimatedNumber, StatusDot, motion } from "@/components/motion";
import { AGENTS, type AgentDef } from "@/lib/agents";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001/admin";
const AGENT_ICONS: Record<string, React.ElementType> = { Crown, Megaphone, Search, PenLine, Send, Share2, Radar, Building2, Handshake, UserCheck };
const AED = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
const impactTone = (i: string) => (i === "High" ? "bg-rose-500/15 text-rose-300" : i === "Medium" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300");

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();

  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [acts, setActs] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let off = false;
    fetchMe()
      .then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); })
      .catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useMemo(() => async () => {
    const [ov, st, ac, tk] = await Promise.all([
      getCeoOverview().then((r) => r.overview).catch(() => null),
      getStats().catch(() => null),
      getActivity(7).then((r) => r.activities ?? []).catch(() => []),
      getBrainTasks().then((r) => r.tasks ?? []).catch(() => []),
    ]);
    setOverview(ov); setStats(st); setActs(ac as Activity[]); setTasks(tk);
  }, []);

  useEffect(() => { if (!ready) return; setLoading(true); load().finally(() => setLoading(false)); }, [ready, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const act = async (id: string, kind: "approve" | "dismiss") => {
    setTasks((p) => p.filter((t) => t._id !== id));
    try { kind === "approve" ? await approveBrainTask(id) : await dismissBrainTask(id); } catch { /* ignore */ }
  };

  const ctx = (overview?._ctx || {}) as Record<string, number>;
  const liveCount = AGENTS.filter((a) => a.live).length;

  // Task Summary donut (real-derived)
  const completed = ctx.tasksDone ?? 0;
  const inProgress = ctx.blogDrafts ?? 0;
  const waiting = tasks.length || ctx.pendingApprovalTasks || 0;
  const failed = 0;
  const totalTasks = completed + inProgress + waiting + failed;
  const donut = [
    { name: "Completed", value: completed, color: "#10b981" },
    { name: "In Progress", value: inProgress, color: "#3b82f6" },
    { name: "Waiting Approval", value: waiting, color: "#f59e0b" },
    { name: "Failed", value: failed, color: "#ef4444" },
  ];

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">AI Workforce Command Center</h1>
            <p className="text-[11px] text-slate-500 truncate">Monitor, manage & scale your AI agents and automate growth for TripReview.ae</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={refresh} className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800" title="Refresh"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></button>
            <Link href="/ceo" className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold hover:opacity-90"><Sparkles className="w-4 h-4" /> Ask AI CEO</Link>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
            <div className="hidden sm:flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div>
              <div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div>
            </div>
          </div>
        </header>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <>
              {!overview?._ai && (
                <FadeUp><div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">⚠ AI brain in fallback mode. Add <b>ANTHROPIC_API_KEY</b> to backend .env for real Claude reasoning.</div></FadeUp>
              )}

              {/* Stat row */}
              <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard icon={Users} tone="brand" label="Total Agents" value={<AnimatedNumber value={AGENTS.length} />} sub={`${liveCount} Active · ${AGENTS.length - liveCount} Idle`} />
                <StatCard icon={ListChecks} tone="violet" label="Active Tasks" value={<AnimatedNumber value={ctx.pendingApprovalTasks ?? tasks.length ?? 0} />} />
                <StatCard icon={CheckCheck} tone="emerald" label="Tasks Completed" value={<AnimatedNumber value={completed} />} />
                <StatCard icon={FileText} tone="sky" label="Content Published" value={<AnimatedNumber value={ctx.blogPublished ?? 0} />} />
                <StatCard icon={Building2} tone="amber" label="Providers" value={<AnimatedNumber value={ctx.providers ?? stats?.providers ?? 0} />} />
                <StatCard icon={DollarSign} tone="emerald" label="Revenue Impact" value={<>AED <AnimatedNumber value={stats?.revenue ?? 0} /></>} delta={stats?.bookingsGrowth ? `+${stats.bookingsGrowth}%` : undefined} />
              </Stagger>

              {/* Row: workforce map / live activity / pending approvals */}
              <div className="grid lg:grid-cols-[1.3fr_1fr_0.9fr] gap-4">
                <FadeUp><WorkforceMap liveCount={liveCount} /></FadeUp>
                <FadeUp delay={0.05}>
                  <Panel title="Live Activity Feed" sub="Real-time workforce updates">
                    <ul className="space-y-3">
                      {acts.map((a, i) => (
                        <li key={a.id || i} className="flex items-start gap-3">
                          <span className="mt-0.5"><StatusDot tone="emerald" pulse={i < 2} /></span>
                          <div className="flex-1 min-w-0"><div className="text-[12px] text-slate-200">{a.action || "Activity"}</div>{a.entityLabel && <div className="text-[11px] text-slate-500 truncate">{a.entityLabel}</div>}</div>
                          <span className="text-[10px] text-slate-600 shrink-0">{rel(a.createdAt)}</span>
                        </li>
                      ))}
                      {acts.length === 0 && <li className="text-xs text-slate-500">No recent activity.</li>}
                    </ul>
                  </Panel>
                </FadeUp>
                <FadeUp delay={0.1}>
                  <Panel title="Pending Approvals" right={<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{tasks.length}</span>}>
                    <ul className="space-y-2.5">
                      {tasks.slice(0, 4).map((t) => (
                        <li key={t._id} className="rounded-xl border border-ink-800 p-2.5">
                          <div className="text-[12px] font-semibold text-white leading-tight">{t.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</div>
                          <div className="flex gap-1.5 mt-2">
                            <button onClick={() => act(t._id, "approve")} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                            <button onClick={() => act(t._id, "dismiss")} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-bold hover:bg-ink-800"><XCircle className="w-3 h-3" /> Reject</button>
                          </div>
                        </li>
                      ))}
                      {tasks.length === 0 && <li className="text-xs text-slate-500">Nothing awaiting approval. 🎉</li>}
                    </ul>
                  </Panel>
                </FadeUp>
              </div>

              {/* Row: performance + priorities | task summary + insights */}
              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
                <div className="space-y-4">
                  <FadeUp><AgentPerformance /></FadeUp>
                  <FadeUp delay={0.05}>
                    <Panel title="Priority Opportunities" sub="High-impact opportunities for growth">
                      <ul className="divide-y divide-ink-800">
                        {(overview?.priorities || []).map((p, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="text-[12px] text-slate-300">{p.title}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${impactTone(p.impact)}`}>{p.impact} Impact</span>
                          </li>
                        ))}
                        {(!overview?.priorities || overview.priorities.length === 0) && <li className="py-2.5 text-xs text-slate-500">No opportunities yet.</li>}
                      </ul>
                    </Panel>
                  </FadeUp>
                </div>
                <div className="space-y-4">
                  <FadeUp>
                    <Panel title="Task Summary" sub="Tasks across all agents">
                      <div className="flex items-center gap-4">
                        <div className="relative w-32 h-32 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart><Pie data={donut.filter((d) => d.value > 0).length ? donut : [{ name: "None", value: 1, color: "#1e293b" }]} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={2} stroke="none">{donut.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie></PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-extrabold text-white"><AnimatedNumber value={totalTasks} /></div><div className="text-[9px] text-slate-500">Total Tasks</div></div></div>
                        </div>
                        <ul className="flex-1 space-y-2 text-[12px]">
                          {donut.map((d) => (
                            <li key={d.name} className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}</span>
                              <span className="font-bold text-white">{d.value} <span className="text-slate-500 font-normal">({totalTasks ? Math.round((d.value / totalTasks) * 100) : 0}%)</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Panel>
                  </FadeUp>
                  <FadeUp delay={0.05}>
                    <Panel title="AI CEO Insights" sub="Based on today's data">
                      <ul className="space-y-2.5">
                        {(overview?.insights || []).slice(0, 4).map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[12px] text-slate-300"><Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" /> {s}</li>
                        ))}
                        {(!overview?.insights || overview.insights.length === 0) && <li className="text-xs text-slate-500">No insights yet.</li>}
                      </ul>
                    </Panel>
                  </FadeUp>
                </div>
              </div>

              {/* Quick Actions */}
              <FadeUp>
                <Panel title="Quick Actions">
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                    <QuickAction icon={Plus} title="Create New Task" sub="Assign task to any agent" href="/ceo" tone="brand" />
                    <QuickAction icon={UserPlus} title="Add New Provider" sub="Manually add provider" href={`${ADMIN_URL}/providers/add`} external tone="violet" />
                    <QuickAction icon={FilePlus2} title="Create Blog Post" sub="Start new content" href="/agents/blog" tone="emerald" />
                    <QuickAction icon={BarChart3} title="View Reports" sub="Performance & analytics" href="/ceo" tone="amber" />
                    <QuickAction icon={MessagesSquare} title="Agent Chat" sub="Communicate with agents" href="/ceo" tone="sky" />
                  </div>
                </Panel>
              </FadeUp>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ----------------------------- Pieces ----------------------------- */
function Panel({ title, sub, right, children }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
      {(title || right) && <div className="flex items-start justify-between gap-3 mb-3"><div>{title && <h3 className="text-sm font-bold text-white">{title}</h3>}{sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}</div>{right}</div>}
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, delta, tone = "brand" }: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; delta?: string; tone?: string }) {
  const tones: Record<string, string> = { brand: "from-brand-500/20 text-brand-300", emerald: "from-emerald-500/20 text-emerald-300", amber: "from-amber-500/20 text-amber-300", violet: "from-violet-500/20 text-violet-300", sky: "from-sky-500/20 text-sky-300" };
  return (
    <Item className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
      <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{label}</span><span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tones[tone] || tones.brand} to-transparent grid place-items-center`}><Icon className="w-4 h-4" /></span></div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
      {sub && <div className="mt-1 text-[10px] text-slate-500">{sub}</div>}
      {delta && <div className="mt-1 text-[11px] text-emerald-400 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {delta}</div>}
    </Item>
  );
}

function WorkforceMap({ liveCount }: { liveCount: number }) {
  const ring = AGENTS.filter((a) => a.id !== "ceo");
  const R = 37; // orbit radius in viewBox units
  const nodes = ring.map((a, i) => {
    const ang = (-90 + i * (360 / ring.length)) * (Math.PI / 180);
    return { a, x: 50 + R * Math.cos(ang), y: 50 + R * Math.sin(ang) };
  });
  return (
    <Panel title="AI Workforce Map" sub="Your agents and their current status" right={<Link href="/ceo" className="text-[11px] font-semibold text-brand-400 hover:underline inline-flex items-center gap-1">View All Agents <ArrowRight className="w-3 h-3" /></Link>}>
      <div className="relative w-full max-w-[440px] aspect-square mx-auto">
        {/* SVG connectors + flowing data */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
          <defs>
            <radialGradient id="wfGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(124,58,237,0.18)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#wfGlow)" />
          {/* orbit ring connecting agents */}
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(71,85,105,0.35)" strokeWidth="0.3" strokeDasharray="1.5 2" />
          {nodes.map((n, i) => {
            const live = n.a.live;
            const col = n.a.dept === "Growth" ? "#6366f1" : "#0ea5e9";
            return (
              <g key={n.a.id}>
                <motion.line x1="50" y1="50" x2={n.x} y2={n.y} stroke={live ? col : "rgba(71,85,105,0.4)"} strokeWidth="0.35"
                  initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.6, delay: 0.15 + i * 0.05 }} />
                {/* flowing pulse from CEO → agent */}
                <motion.circle r={live ? 1.1 : 0.8} fill={live ? col : "#64748b"}
                  initial={{ cx: 50, cy: 50, opacity: 0 }}
                  animate={{ cx: [50, n.x], cy: [50, n.y], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.9, delay: i * 0.18, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }} />
              </g>
            );
          })}
        </svg>

        {/* Agent nodes (orbit) */}
        {nodes.map((n, i) => {
          const Icon = AGENT_ICONS[n.a.icon] || Sparkles;
          const tone = n.a.dept === "Growth" ? "from-brand-500/30 text-brand-200" : "from-sky-500/30 text-sky-200";
          return (
            <motion.div key={n.a.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}
              initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
              transition={{ scale: { duration: 0.4, delay: 0.2 + i * 0.05, type: "spring", stiffness: 260, damping: 16 }, opacity: { duration: 0.3, delay: 0.2 + i * 0.05 }, y: { duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut" } }}>
              <motion.div whileHover={{ scale: 1.15 }} className="group relative grid place-items-center cursor-default">
                <span className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${tone} to-ink-900 border border-ink-700 grid place-items-center shadow-lg`}>
                  <Icon className="w-5 h-5" />
                  {n.a.live && <motion.span className="absolute -inset-0.5 rounded-xl ring-1 ring-emerald-400/60" animate={{ opacity: [0, 0.9, 0], scale: [0.9, 1.15, 0.9] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} />}
                  <span className="absolute -bottom-0.5 -right-0.5"><StatusDot tone={n.a.live ? "emerald" : "slate"} pulse={n.a.live} /></span>
                </span>
                <span className="absolute top-full mt-1 text-[8px] font-semibold text-slate-400 whitespace-nowrap">{n.a.name.replace(" Agent", "").replace(" / Orchestrator", "")}</span>
              </motion.div>
            </motion.div>
          );
        })}

        {/* CEO core — locked to the exact center (where all connectors converge) */}
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <motion.div className="relative" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 14 }}>
            <motion.span className="absolute -inset-3 rounded-full bg-amber-500/25 blur-xl" animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.12, 1] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
            <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center shadow-xl shadow-amber-500/30 border-2 border-amber-300/40">
              <Crown className="w-7 h-7 text-white" />
            </div>
          </motion.div>
        </div>
      </div>
      <div className="mt-2 text-center text-[10px] text-emerald-400 inline-flex items-center gap-1 w-full justify-center"><StatusDot /> AI CEO active · coordinating {ring.length} agents · {liveCount} live</div>
    </Panel>
  );
}

function AgentPerformance() {
  return (
    <Panel title="Agent Performance Overview" sub="Performance of all AI agents" right={<Link href="/ceo" className="text-[11px] font-semibold text-brand-400 hover:underline">Full report</Link>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b border-ink-800">
            <th className="py-2 pr-3 font-semibold">Agent</th><th className="py-2 px-3 font-semibold">Status</th><th className="py-2 px-3 font-semibold">Tasks</th><th className="py-2 px-3 font-semibold">Trend (7D)</th>
          </tr></thead>
          <tbody className="divide-y divide-ink-800">
            {AGENTS.map((a, i) => {
              const Icon = AGENT_ICONS[a.icon] || Sparkles;
              return (
                <tr key={a.id} className="hover:bg-ink-900/50">
                  <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-2 text-slate-200"><Icon className="w-4 h-4 text-brand-300" /> {a.name}</span></td>
                  <td className="py-2.5 px-3"><span className={`inline-flex items-center gap-1 text-[11px] ${a.live ? "text-emerald-400" : "text-slate-500"}`}><StatusDot tone={a.live ? "emerald" : "slate"} pulse={a.live} /> {a.live ? "Active" : "Idle"}</span></td>
                  <td className="py-2.5 px-3 text-slate-400">{a.live ? "—" : "0"}</td>
                  <td className="py-2.5 px-3"><Spark seed={i} live={a.live} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// Decorative deterministic mini trend line (not a data claim).
function Spark({ seed, live }: { seed: number; live: boolean }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const v = 10 - (((seed * 7 + i * 13) % 9));
    return `${(i / 11) * 60},${4 + Math.abs(v)}`;
  }).join(" ");
  return <svg viewBox="0 0 60 22" className="w-16 h-5"><polyline points={pts} fill="none" stroke={live ? "#10b981" : "#475569"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function QuickAction({ icon: Icon, title, sub, href, external, tone = "brand" }: { icon: React.ElementType; title: string; sub: string; href: string; external?: boolean; tone?: string }) {
  const tones: Record<string, string> = { brand: "from-brand-500/20 text-brand-300", emerald: "from-emerald-500/20 text-emerald-300", amber: "from-amber-500/20 text-amber-300", violet: "from-violet-500/20 text-violet-300", sky: "from-sky-500/20 text-sky-300" };
  const inner = (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 hover:bg-ink-800/60 hover:border-ink-700 transition-colors p-3 flex items-center gap-3 h-full">
      <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tones[tone] || tones.brand} to-transparent grid place-items-center shrink-0`}><Icon className="w-5 h-5" /></span>
      <div className="min-w-0"><div className="text-[13px] font-bold text-white truncate">{title}</div><div className="text-[11px] text-slate-500 truncate">{sub}</div></div>
    </div>
  );
  return external ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : <Link href={href}>{inner}</Link>;
}

function rel(iso?: string) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
