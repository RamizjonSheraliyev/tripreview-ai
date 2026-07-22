"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListChecks, Plus, Search, MoreHorizontal, CheckCircle2, Circle, CircleDot,
  Calendar, ArrowLeft, ChevronLeft, ChevronRight, PenLine, MessageSquare,
  X, Trash2, FileText, Download, Users, Bell, Loader2, AlertTriangle, Send, CheckSquare, Paperclip, Smile, Sparkles,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getTaskStats, listTasks, getTask, createTask, updateTask, deleteTask,
  completeTask, toggleChecklistItem, addChecklistItem, addTaskComment, generateTaskBrief, runTaskAI,
  type TaskRow, type TaskFull, type TaskStats, type TaskInput,
} from "@/lib/api";

const ST: Record<string, string> = { "To Do": "bg-sky-500/15 text-sky-300", "In Progress": "bg-amber-500/15 text-amber-300", "In Review": "bg-violet-500/15 text-violet-300", Completed: "bg-emerald-500/15 text-emerald-300", Overdue: "bg-rose-500/15 text-rose-300" };
const PR: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-emerald-500/15 text-emerald-300" };
const PR_BAR: Record<string, string> = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };
const DONUT_COLOR: Record<string, string> = { "To Do": "#38bdf8", "In Progress": "#fbbf24", "In Review": "#a78bfa", Completed: "#34d399", Overdue: "#fb7185" };
const FILE_COLOR: Record<string, string> = { pdf: "text-rose-300", excel: "text-emerald-300", ppt: "text-amber-300", file: "text-sky-300" };

function fmtDate(d: string | null | undefined) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }
function fmtDateTime(d: string | null | undefined) { return d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"; }
function dueLabel(d: string | null | undefined, overdue?: boolean) {
  if (!d) return "";
  const ms = new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  const days = Math.round(ms / 86400000);
  if (overdue || days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days left`;
}
function fmtMin(m: number) { const h = Math.floor(m / 60), mm = m % 60; return `${h}h ${String(mm).padStart(2, "0")}m`; }
function Avatar({ name }: { name: string }) {
  const colors = ["from-brand-500 to-violet-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-sky-500 to-blue-600", "from-rose-500 to-pink-600"];
  const idx = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
  return <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[idx]} grid place-items-center text-[9px] font-bold text-white shrink-0`}>{name.charAt(0)}</span>;
}
function Donut({ pct, size = 132, stroke = 14, color = "#8b5cf6", children }: { pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (pct / 100) * circ }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
function MultiDonut({ segments, total, size = 150, stroke = 18 }: { segments: { count: number; color: string }[]; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.filter((s) => s.count > 0).map((s, i) => { const pct = total ? (s.count / total) * 100 : 0; const node = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} initial={{ strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDashoffset: -acc, opacity: 1 }} transition={{ duration: 0.8, delay: i * 0.08 }} />; acc += pct; return node; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-2xl font-extrabold text-white">{total}</div><div className="text-[9px] text-slate-500">Total</div></div></div>
    </div>
  );
}

const TABS = ["All Tasks", "My Tasks", "Assigned to Me", "Created by Me", "Overdue", "Completed"];

export default function TaskCenterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><ListChecks className="w-5 h-5 text-white" /></span>
          <div className="min-w-0"><h1 className="text-base font-bold text-white leading-tight truncate">Task Center</h1><p className="text-[11px] text-slate-500 truncate">Organize, assign, and track tasks to keep your team aligned and productive.</p></div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px]"><Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
            <div className="hidden sm:flex items-center gap-2 pl-1"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div><div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div></div>
          </div>
        </header>
        <div className="p-5">
          {selId ? <TaskDetail id={selId} onBack={() => setSelId(null)} onOpen={setSelId} /> : <TaskList onOpen={setSelId} />}
        </div>
      </main>
    </div>
  );
}

/* ----------------------------- LIST VIEW ----------------------------- */
function TaskList({ onOpen }: { onOpen: (id: string) => void }) {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [items, setItems] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All Tasks");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All Statuses");
  const [prioF, setPrioF] = useState("All Priorities");
  const [assigneeF, setAssigneeF] = useState("All Assignees");
  const [catF, setCatF] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [menuId, setMenuId] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listTasks({ tab, status: statusF, priority: prioF, assignee: assigneeF, category: catF, q, page: p, limit: 10 }),
        getTaskStats(),
      ]);
      setItems(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setStats(s);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => reload(1), 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, statusF, prioF, assigneeF, catF, q]);

  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulk = async (kind: "complete" | "delete") => {
    setBusy(true);
    try { for (const id of Array.from(sel)) { if (kind === "complete") await completeTask(id); else await deleteTask(id); } setSel(new Set()); await reload(page); } finally { setBusy(false); }
  };
  const quickComplete = async (id: string) => { setMenuId(""); setBusy(true); try { await completeTask(id); await reload(page); } finally { setBusy(false); } };
  const quickDelete = async (id: string) => { setMenuId(""); setBusy(true); try { await deleteTask(id); await reload(page); } finally { setBusy(false); } };

  const tabCount = (t: string) => { const s = stats; if (!s) return 0; return t === "All Tasks" ? s.total : t === "My Tasks" ? s.mine : t === "Assigned to Me" ? s.assignedToMe : t === "Created by Me" ? s.createdByMe : t === "Overdue" ? s.overdue : s.completed; };
  const kpis = [
    { label: "Total Tasks", value: stats?.total ?? 0, icon: Users, tone: "brand" },
    { label: "To Do", value: stats?.todo ?? 0, icon: CircleDot, tone: "sky" },
    { label: "In Progress", value: stats?.inProgress ?? 0, icon: Loader2, tone: "amber" },
    { label: "In Review", value: stats?.inReview ?? 0, icon: AlertTriangle, tone: "violet" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, tone: "emerald" },
  ];
  const start = total === 0 ? 0 : (page - 1) * 10 + 1, end = Math.min(total, page * 10);

  return (
    <div className="space-y-5">
      <Stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((c) => { const Ico = c.icon; return (
          <Item key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{c.label}</span><span className={`w-8 h-8 rounded-lg grid place-items-center ${c.tone === "brand" ? "bg-brand-600/15 text-brand-300" : c.tone === "sky" ? "bg-sky-500/15 text-sky-300" : c.tone === "amber" ? "bg-amber-500/15 text-amber-300" : c.tone === "violet" ? "bg-violet-500/15 text-violet-300" : "bg-emerald-500/15 text-emerald-300"}`}><Ico className="w-4 h-4" /></span></div>
            <div className="mt-2 text-2xl font-extrabold text-white">{c.value}</div>
          </Item>
        ); })}
      </Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="p-4 flex items-center justify-between gap-2 flex-wrap border-b border-ink-800">
              <div className="flex items-center gap-1 overflow-x-auto">
                {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap rounded-lg inline-flex items-center gap-1.5 ${tab === t ? "text-white bg-ink-800" : "text-slate-500 hover:text-slate-300"}`}>{t} <span className={`text-[9px] px-1 rounded ${tab === t ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{tabCount(t)}</span></button>)}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create Task</button>
              </div>
            </div>

            <div className="p-4 flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Statuses</option>{["To Do", "In Progress", "In Review", "Completed"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={prioF} onChange={(e) => setPrioF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Priorities</option>{["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}</select>
              <select value={assigneeF} onChange={(e) => setAssigneeF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Assignees</option>{(stats?.assignees || []).map((s) => <option key={s}>{s}</option>)}</select>
              <select value={catF} onChange={(e) => setCatF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-9 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Categories</option>{(stats?.categories || []).map((s) => <option key={s}>{s}</option>)}</select>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>

            {sel.size > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-[12px] text-brand-100">
                <span className="font-semibold">{sel.size} selected</span>
                <button disabled={busy} onClick={() => bulk("complete")} className="ml-auto inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-semibold disabled:opacity-50"><CheckCircle2 className="w-3 h-3" /> Complete</button>
                <button disabled={busy} onClick={() => bulk("delete")} className="inline-flex items-center gap-1 px-2 h-7 rounded-lg border border-rose-500/40 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="w-3 h-3" /> Delete</button>
                <button onClick={() => setSel(new Set())} className="text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-3 w-8"></th><th className="font-semibold">Task</th><th className="font-semibold">Assignee</th><th className="font-semibold">Priority</th><th className="font-semibold">Status</th><th className="font-semibold">Due Date</th><th className="font-semibold">Category</th><th className="font-semibold">Created By</th><th></th></tr></thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="border-b border-ink-900 hover:bg-ink-900/40 cursor-pointer" onClick={() => onOpen(t.id)}>
                      <td className="px-3" onClick={(e) => { e.stopPropagation(); toggleSel(t.id); }}><span className={`w-4 h-4 rounded grid place-items-center border ${sel.has(t.id) ? "bg-brand-500 border-brand-500" : "border-ink-600"}`}>{sel.has(t.id) && <CheckSquare className="w-3 h-3 text-white" />}</span></td>
                      <td className="py-2.5"><div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${t.overdue ? "bg-rose-500/15 text-rose-300" : "bg-brand-600/15 text-brand-300"}`}>{t.status === "Completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />}</span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[230px]">{t.title}</div><div className="text-[10px] text-slate-600">{t.taskId} · {t.progress.done}/{t.progress.total} done</div></div></div></td>
                      <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><Avatar name={t.assignee} />{t.assignee.replace(" Agent", "")}</span></td>
                      <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PR[t.priority]}`}>◆ {t.priority}</span></td>
                      <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ST[t.status]}`}>{t.status}</span></td>
                      <td className="whitespace-nowrap"><div className="text-[11px] text-slate-300">{fmtDate(t.dueDate)}</div><div className={`text-[9px] ${t.overdue ? "text-rose-400" : "text-slate-600"}`}>{dueLabel(t.dueDate, t.overdue)}</div></td>
                      <td className="text-[11px] text-slate-400 whitespace-nowrap">{t.category}</td>
                      <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Avatar name={t.createdByAgent} />{t.createdByAgent.replace(" / Orchestrator", "")}</span></td>
                      <td className="relative pr-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuId(menuId === t.id ? "" : t.id)} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                        {menuId === t.id && (
                          <div className="absolute right-2 top-9 z-30 w-36 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                            <MenuItem onClick={() => { setMenuId(""); onOpen(t.id); }}>View Details</MenuItem>
                            {t.status !== "Completed" && <MenuItem onClick={() => quickComplete(t.id)}>Mark Complete</MenuItem>}
                            <MenuItem danger onClick={() => quickDelete(t.id)}>Delete</MenuItem>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && items.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[12px] text-slate-500">No tasks here. Click <span className="text-brand-300 font-semibold">Create Task</span>.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} tasks</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-[12px] font-bold text-white mb-3">My Tasks</div>
              <ul className="space-y-2">
                {([["Assigned to me", stats?.assignedToMe ?? 0, "brand"], ["Due this week", stats?.dueThisWeek ?? 0, "amber"], ["Overdue", stats?.overdue ?? 0, "rose"], ["In Progress", stats?.inProgress ?? 0, "sky"]] as [string, number, string][]).map(([l, v, tone]) => (
                  <li key={l} className="flex items-center gap-2.5"><span className={`w-7 h-7 rounded-lg grid place-items-center text-[11px] font-bold ${tone === "brand" ? "bg-brand-600/15 text-brand-300" : tone === "amber" ? "bg-amber-500/15 text-amber-300" : tone === "rose" ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300"}`}>{v}</span><span className="text-[12px] text-slate-300">{l}</span></li>
                ))}
              </ul>
            </div>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-[12px] font-bold text-white mb-3">Tasks by Status</div>
              <div className="flex items-center gap-3">
                <MultiDonut segments={(stats?.statusDonut || []).map((s) => ({ count: s.count, color: DONUT_COLOR[s.label] || "#64748b" }))} total={stats?.total ?? 0} size={120} stroke={14} />
                <ul className="space-y-1.5 flex-1">{(stats?.statusDonut || []).map((s) => <li key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLOR[s.label] || "#64748b" }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="text-white font-bold">{s.count}</span><span className="text-slate-600">({s.pct}%)</span></li>)}</ul>
              </div>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-[12px] font-bold text-white mb-3">Tasks by Priority</div>
              <ul className="space-y-2.5">
                {(stats?.priorityBars || []).map((p) => { const max = Math.max(1, ...(stats?.priorityBars || []).map((x) => x.count)); return (
                  <li key={p.label}><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-300">{p.label}</span><span className="text-white font-bold">{p.count}</span></div><div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className={`h-full rounded-full ${PR_BAR[p.label]}`} initial={{ width: 0 }} animate={{ width: `${(p.count / max) * 100}%` }} transition={{ duration: 0.8 }} /></div></li>
                ); })}
              </ul>
            </div>
          </FadeUp>
          <FadeUp delay={0.15}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-[12px] font-bold text-white mb-3">Upcoming Due Dates</div>
              <ul className="space-y-2.5">
                {(stats?.upcoming || []).map((u) => (
                  <li key={u.id} onClick={() => onOpen(u.id)} className="flex items-start gap-2.5 cursor-pointer group"><span className="w-9 h-9 rounded-lg bg-ink-950 border border-ink-800 grid place-items-center shrink-0 text-center"><span className="text-[8px] text-slate-500 leading-none">{new Date(u.dueDate).toLocaleDateString("en-US", { month: "short" })}</span><span className="text-[12px] font-bold text-white leading-none">{new Date(u.dueDate).getDate()}</span></span><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate group-hover:text-brand-300">{u.title}</div><div className={`text-[9px] ${PR[u.priority].split(" ")[1]}`}>{u.priority} Priority · {fmtDate(u.dueDate)}</div></div></li>
                ))}
                {(stats?.upcoming || []).length === 0 && <li className="text-[11px] text-slate-500">Nothing due soon. 🎉</li>}
              </ul>
            </div>
          </FadeUp>
        </div>
      </div>

      {createOpen && <TaskModal categories={stats?.categories || []} assignees={stats?.assignees || []} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(1); }} />}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] ${danger ? "text-rose-300 hover:bg-rose-500/10" : "text-slate-300 hover:bg-ink-800"}`}>{children}</button>;
}

/* ----------------------------- DETAIL VIEW ----------------------------- */
function TaskDetail({ id, onBack, onOpen }: { id: string; onBack: () => void; onOpen: (id: string) => void }) {
  const [t, setT] = useState<TaskFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Overview" | "Checklist" | "Comments" | "Attachments" | "Activity Log">("Overview");
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [lc, setLc] = useState("");
  const [newItem, setNewItem] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => { setLoading(true); try { setT((await getTask(id)).task); } finally { setLoading(false); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (loading || !t) return <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  const act = async (fn: () => Promise<{ task: TaskFull }>) => { setBusy(true); try { setT((await fn()).task); } finally { setBusy(false); } };
  const genBrief = async () => { setBusy(true); try { const r = await generateTaskBrief(id); setT(r.task); } finally { setBusy(false); } };
  const [runNote, setRunNote] = useState("");
  const runAI = async () => {
    setBusy(true); setRunNote("⏳ The agent is doing the task with its tools — this can take a minute…");
    try {
      const r = await runTaskAI(id);
      if (r.task) setT(r.task);
      setRunNote(r.ok ? `✓ ${r.agent} ran it${r.pendingApprovals ? ` — ${r.pendingApprovals} approval card(s) waiting in the Communication Center` : ""}. Result is in Comments.` : (r.message || "The agent couldn't run it."));
    } catch { setRunNote("The agent couldn't run it — check the backend/LLM key."); }
    finally { setBusy(false); setTimeout(() => setRunNote(""), 9000); }
  };
  const toggle = (itemId: string) => act(() => toggleChecklistItem(id, itemId));
  const complete = () => act(() => completeTask(id));
  const addItem = async () => { if (!newItem.trim()) return; await act(() => addChecklistItem(id, newItem.trim())); setNewItem(""); };
  const post = async (text: string) => { const x = text.trim(); if (!x) return; await act(() => addTaskComment(id, x, "Founder")); };
  const postComment = async () => { await post(comment); setComment(""); };
  const reply = (author: string) => { setTab("Comments"); setComment((v) => (v.includes(`@${author}`) ? v : `@${author} ${v}`)); };

  return (
    <FadeUp className="space-y-4">
      {runNote && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{runNote}</div>}
      {/* breadcrumb + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to Tasks</button>
        <div className="flex items-center gap-2">
          <button disabled={busy || t.status === "Completed"} onClick={runAI} title="The assigned agent executes this task with its real tools and reports back" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-brand-600 text-white text-[12px] font-bold hover:bg-brand-500 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Run with AI</button>
          <button disabled={busy} onClick={genBrief} title="AI: fill objective, deliverables, acceptance criteria & checklist" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-violet-500/30 text-violet-300 text-[12px] font-semibold hover:bg-violet-500/10 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Brief</button>
          <button disabled={busy || t.status === "Completed"} onClick={complete} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-emerald-500/30 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/10 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /> {t.status === "Completed" ? "Completed" : "Mark Complete"}</button>
          <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800"><PenLine className="w-4 h-4" /> Edit Task</button>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PR[t.priority]}`}>◆ {t.priority} Priority</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ST[t.overdue ? "Overdue" : t.status]}`}>{t.status}</span>
          {t.overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300">{dueLabel(t.dueDate, true)}</span>}
        </div>
        <h2 className="text-xl font-bold text-white">{t.title}</h2>
        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed max-w-3xl">{t.description}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-ink-800">
          {([["Task ID", t.taskId], ["Created By", t.createdByAgent], ["Created On", fmtDateTime(t.createdAt)], ["Last Updated", fmtDateTime(t.updatedAt)]] as [string, string][]).map(([k, v]) => (
            <div key={k}><div className="text-[9px] uppercase tracking-wide text-slate-600">{k}</div><div className="text-[11px] font-semibold text-white truncate">{v}</div></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50">
            <div className="flex border-b border-ink-800 px-2 overflow-x-auto">
              {(["Overview", "Checklist", "Comments", "Attachments", "Activity Log"] as const).map((x) => {
                const n = x === "Checklist" ? `${t.progress.done}/${t.progress.total}` : x === "Comments" ? t.comments.length : x === "Attachments" ? t.attachments.length : "";
                return <button key={x} onClick={() => setTab(x)} className={`px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap ${tab === x ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{x}{n !== "" && <span className="ml-1 text-[10px] text-slate-500">({n})</span>}</button>;
              })}
            </div>
            <div className="p-5">
              {tab === "Overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <Section title="Task Description"><p className="text-[12px] text-slate-400 leading-relaxed">{t.description}</p></Section>
                    {t.objective.length > 0 && <Section title="Objective"><ul className="space-y-1.5">{t.objective.map((o, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />{o}</li>)}</ul></Section>}
                    {t.deliverables.length > 0 && <Section title="Deliverables"><ul className="space-y-1.5">{t.deliverables.map((o, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300"><span className="w-1 h-1 rounded-full bg-brand-400 mt-2 shrink-0" />{o}</li>)}</ul></Section>}
                    {t.acceptanceCriteria.length > 0 && <Section title="Acceptance Criteria"><ul className="space-y-1.5">{t.acceptanceCriteria.map((o, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />{o}</li>)}</ul></Section>}
                    {t.objective.length === 0 && t.deliverables.length === 0 && t.acceptanceCriteria.length === 0 && (
                      <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-4 text-center">
                        <Sparkles className="w-5 h-5 text-violet-300 mx-auto mb-1.5" />
                        <div className="text-[12px] font-semibold text-white">No detailed brief yet</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Let AI turn this task into a full brief — objective, deliverables, acceptance criteria and a step-by-step checklist.</p>
                        <button onClick={genBrief} disabled={busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Brief</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Meta label="Assignee" value={<span className="inline-flex items-center gap-1.5"><Avatar name={t.assignee} />{t.assignee}</span>} />
                    {t.collaborators.length > 0 && <Meta label="Collaborators" value={<span className="inline-flex items-center gap-1">{t.collaborators.map((c) => <Avatar key={c} name={c} />)}<span className="text-slate-500 text-[10px] ml-1">+{t.collaborators.length}</span></span>} />}
                    <Meta label="Category" value={t.category} />
                    <Meta label="Priority" value={<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PR[t.priority]}`}>◆ {t.priority}</span>} />
                    <Meta label="Status" value={<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ST[t.status]}`}>{t.status}</span>} />
                    <Meta label="Due Date" value={<span>{fmtDate(t.dueDate)} <span className={t.overdue ? "text-rose-400" : "text-slate-500"}>· {dueLabel(t.dueDate, t.overdue)}</span></span>} />
                    <Meta label="Time Tracking" value={`${fmtMin(t.timeTrackedMin)} tracked`} />
                    <Meta label="Estimated Time" value={t.estimatedTime || "—"} />
                    {t.tags.length > 0 && <Meta label="Tags" value={<span className="flex flex-wrap gap-1">{t.tags.map((g) => <span key={g} className="text-[10px] text-brand-200 bg-brand-500/10 border border-brand-500/30 rounded px-1.5 py-0.5">{g}</span>)}</span>} />}
                    {t.relatedTasks.length > 0 && <Meta label="Related Tasks" value={<span className="space-y-1">{t.relatedTasks.map((r, i) => <span key={i} className="flex items-center gap-1.5 text-[11px]"><CheckSquare className="w-3 h-3 text-slate-500" />{r.title} <span className={`text-[8px] px-1 rounded ${ST[r.status] || ""}`}>{r.status}</span></span>)}</span>} />}
                    {t.dependency && <Meta label="Dependency" value={<span className="text-brand-300">Depends on: {t.dependency}</span>} />}
                  </div>
                </div>
              )}

              {tab === "Checklist" && (
                <div className="max-w-xl">
                  <ul className="space-y-2">
                    {t.checklist.map((c) => (
                      <li key={c.id}><button onClick={() => toggle(c.id)} disabled={busy} className="w-full flex items-center gap-2.5 text-left py-1.5 group">{c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />}<span className={`text-[12px] ${c.done ? "text-slate-500 line-through" : "text-slate-200"}`}>{c.label}</span></button></li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-3">
                    <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Add a checklist item…" className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    <button onClick={addItem} disabled={busy || !newItem.trim()} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white text-[12px] font-semibold disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> Add</button>
                  </div>
                </div>
              )}

              {tab === "Comments" && (
                <div className="space-y-4">
                  <div className="flex items-end gap-2">
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Write a comment…" className="flex-1 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
                    <button onClick={postComment} disabled={busy || !comment.trim()} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50"><Send className="w-4 h-4" /> Post</button>
                  </div>
                  <ul className="space-y-3">
                    {t.comments.map((c) => (
                      <li key={c.id} className="flex gap-2.5"><Avatar name={c.author} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-[12px] font-bold text-white">{c.author}</span><span className="text-[10px] text-slate-600">{fmtDateTime(c.at)}</span></div><p className="text-[12px] text-slate-300 mt-0.5 leading-snug">{c.text}</p>{c.attachment?.name && <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-slate-400 border border-ink-800 rounded-lg px-2 py-1"><FileText className="w-3 h-3" /> {c.attachment.name} <span className="text-slate-600">{c.attachment.size}</span></div>}</div></li>
                    ))}
                    {t.comments.length === 0 && <li className="text-[12px] text-slate-500">No comments yet — start the discussion.</li>}
                  </ul>
                </div>
              )}

              {tab === "Attachments" && (
                <ul className="space-y-2">
                  {t.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/40 p-3"><FileText className={`w-5 h-5 shrink-0 ${FILE_COLOR[a.type] || "text-sky-300"}`} /><div className="min-w-0 flex-1"><div className="text-[12px] font-semibold text-white truncate">{a.name}</div><div className="text-[10px] text-slate-500">{a.size} · {a.type.toUpperCase()}</div></div><button className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><Download className="w-3.5 h-3.5" /></button></li>
                  ))}
                  {t.attachments.length === 0 && <li className="text-[12px] text-slate-500">No attachments.</li>}
                </ul>
              )}

              {tab === "Activity Log" && (
                <ul className="space-y-3">
                  {t.activity.map((a, i) => (
                    <li key={i} className="flex gap-2.5"><span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${a.type === "status" ? "bg-emerald-500/15 text-emerald-300" : a.type === "checklist" ? "bg-sky-500/15 text-sky-300" : a.type === "comment" ? "bg-violet-500/15 text-violet-300" : "bg-ink-800 text-slate-400"}`}>{a.type === "comment" ? <MessageSquare className="w-3.5 h-3.5" /> : a.type === "checklist" ? <CheckSquare className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />}</span><div className="min-w-0 flex-1"><div className="text-[12px] text-slate-200">{a.note}</div><div className="text-[10px] text-slate-600">{fmtDateTime(a.at)} · {a.by}</div></div></li>
                  ))}
                  {t.activity.length === 0 && <li className="text-[12px] text-slate-500">No activity yet.</li>}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* right column: progress + notes + attachments + snapshot */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="text-[12px] font-bold text-white mb-3">Task Progress</div>
            <div className="flex flex-col items-center">
              <Donut pct={t.progress.pct} size={130} stroke={13} color="#8b5cf6"><div><div className="text-2xl font-extrabold text-white">{t.progress.pct}%</div><div className="text-[9px] text-slate-500">{t.progress.done} of {t.progress.total} completed</div></div></Donut>
            </div>
            <ul className="space-y-1.5 mt-4">
              {t.checklist.map((c) => (
                <li key={c.id}><button onClick={() => toggle(c.id)} disabled={busy} className="w-full flex items-center gap-2 text-left py-1 group">{c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />}<span className={`text-[11px] ${c.done ? "text-slate-500 line-through" : "text-slate-300"}`}>{c.label}</span></button></li>
              ))}
            </ul>
          </div>

          {t.notes && <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="text-[12px] font-bold text-white mb-2">Notes</div><p className="text-[11px] text-slate-400 leading-snug">{t.notes}</p></div>}

          {t.attachments.length > 0 && (
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Attachments ({t.attachments.length})</div></div>
              <ul className="space-y-2">{t.attachments.slice(0, 4).map((a) => <li key={a.id} className="flex items-center gap-2"><FileText className={`w-4 h-4 shrink-0 ${FILE_COLOR[a.type] || "text-sky-300"}`} /><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{a.name}</div><div className="text-[9px] text-slate-500">{a.size}</div></div><Download className="w-3.5 h-3.5 text-slate-500" /></li>)}</ul>
            </div>
          )}

          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="text-[12px] font-bold text-white mb-2">Activity Snapshot</div>
            <ul className="space-y-2.5">{t.activity.slice(0, 4).map((a, i) => <li key={i} className="flex gap-2"><span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.type === "status" ? "bg-emerald-400" : a.type === "comment" ? "bg-violet-400" : "bg-sky-400"}`} /><div className="min-w-0"><div className="text-[11px] text-slate-300 leading-snug">{a.note}</div><div className="text-[9px] text-slate-600">{fmtDateTime(a.at)} · {a.by}</div></div></li>)}</ul>
          </div>
        </div>
      </div>

      {/* Latest Comments — full-width, post + reply (Figma) */}
      <FadeUp delay={0.05}>
        <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Latest Comments</h3>
            <button onClick={() => setTab("Comments")} className="text-[11px] text-brand-400 font-semibold hover:underline">View All Comments</button>
          </div>
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-2 mb-4 focus-within:ring-1 focus-within:ring-brand-500">
            <textarea value={lc} onChange={(e) => setLc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(lc).then(() => setLc("")); } }} rows={2} placeholder="Write a comment…" className="w-full bg-transparent px-1.5 py-1 text-[13px] text-white placeholder:text-slate-600 focus:outline-none resize-none" />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <button onClick={() => setTab("Attachments")} title="Attachments" className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-ink-800"><Paperclip className="w-4 h-4" /></button>
                <button onClick={() => setLc((v) => `${v} 🙂`)} title="Add emoji" className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-ink-800"><Smile className="w-4 h-4" /></button>
              </div>
              <button onClick={() => post(lc).then(() => setLc(""))} disabled={busy || !lc.trim()} className="inline-flex items-center gap-1.5 px-4 h-8 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Post</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            {t.comments.slice(0, 6).map((c) => (
              <motion.div key={c.id} className="flex gap-2.5" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Avatar name={c.author} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-[12px] font-bold text-white">{c.author}</span><span className="text-[10px] text-slate-600">{fmtDateTime(c.at)}</span></div>
                  <p className="text-[12px] text-slate-300 mt-0.5 leading-snug">{c.text}</p>
                  {c.attachment?.name && <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950/40 px-2 py-1.5 text-[10px] text-slate-300"><FileText className="w-3.5 h-3.5 text-emerald-300 shrink-0" />{c.attachment.name}<span className="text-slate-600">{c.attachment.size}</span><Download className="w-3 h-3 text-slate-500" /></div>}
                  <button onClick={() => reply(c.author)} className="mt-1 block text-[10px] text-brand-400 font-semibold hover:underline">Reply</button>
                </div>
              </motion.div>
            ))}
            {t.comments.length === 0 && <div className="text-[12px] text-slate-500">No comments yet — start the discussion.</div>}
          </div>
        </div>
      </FadeUp>

      {editOpen && <TaskModal task={t} categories={[]} assignees={[]} onClose={() => setEditOpen(false)} onSaved={(nt) => { setEditOpen(false); if (nt) setT(nt); else load(); }} />}
    </FadeUp>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="text-[12px] font-bold text-white mb-1.5">{title}</div>{children}</div>;
}
function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3 py-1.5 border-b border-ink-900"><span className="text-[11px] text-slate-500 shrink-0">{label}</span><span className="text-[11px] font-semibold text-white text-right">{value}</span></div>;
}

/* ----------------------------- CREATE / EDIT MODAL ----------------------------- */
function TaskModal({ task, categories, assignees, onClose, onSaved }: { task?: TaskFull; categories: string[]; assignees: string[]; onClose: () => void; onSaved: (t?: TaskFull) => void }) {
  const [f, setF] = useState<TaskInput>(() => task
    ? { title: task.title, description: task.description, status: task.status, priority: task.priority, category: task.category, assignee: task.assignee, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "", estimatedTime: task.estimatedTime, tags: task.tags }
    : { title: "", description: "", status: "To Do", priority: "Medium", category: "General", assignee: "AI CEO / Orchestrator", dueDate: "", estimatedTime: "", tags: [] });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof TaskInput, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const fieldCls = "w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-9 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500";
  const label = "block text-[10px] uppercase tracking-wide text-slate-500 mb-1";
  const cats = categories.length ? categories : ["Strategy", "SEO", "Content", "Outreach", "Research", "Reporting", "Social Media", "Operations", "General"];
  const ppl = assignees.length ? assignees : ["AI CEO / Orchestrator", "Marketing Director", "SEO Agent", "Copywriter Agent", "Publisher Agent", "Sales Agent"];

  const save = async () => {
    setBusy(true);
    try { const r = task ? await updateTask(task.id, f) : await createTask(f); onSaved(r.task); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-950 max-h-[88vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-ink-800 flex items-center justify-between sticky top-0 bg-ink-950 z-10"><h3 className="text-sm font-bold text-white">{task ? "Edit Task" : "Create Task"}</h3><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button></div>
        <div className="p-4 space-y-3">
          <div><label className={label}>Title</label><input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Task title" className={fieldCls} /></div>
          <div><label className={label}>Description</label><textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="What needs to be done?" className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={fieldCls}>{["To Do", "In Progress", "In Review", "Completed"].map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className={label}>Priority</label><select value={f.priority} onChange={(e) => set("priority", e.target.value)} className={fieldCls}><option>High</option><option>Medium</option><option>Low</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Category</label><select value={f.category} onChange={(e) => set("category", e.target.value)} className={fieldCls}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label}>Assignee</label><select value={f.assignee} onChange={(e) => set("assignee", e.target.value)} className={fieldCls}>{ppl.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Due Date</label><input type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={fieldCls} /></div>
            <div><label className={label}>Estimated Time</label><input value={f.estimatedTime} onChange={(e) => set("estimatedTime", e.target.value)} placeholder="e.g. 8h 00m" className={fieldCls} /></div>
          </div>
        </div>
        <div className="p-4 border-t border-ink-800 flex items-center justify-end gap-2 sticky bottom-0 bg-ink-950">
          <button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
          <button disabled={busy || !(f.title || "").trim()} onClick={save} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {task ? "Save Changes" : "Create Task"}</button>
        </div>
      </div>
    </div>
  );
}
