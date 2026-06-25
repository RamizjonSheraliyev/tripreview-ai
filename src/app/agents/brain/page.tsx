"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Play, Check, X, AlertTriangle, ExternalLink, Zap } from "lucide-react";
import AgentPageShell, { StatusPill } from "@/components/AgentPageShell";
import {
  scanBrain, tickBrain, getBrainTasks, approveBrainTask, dismissBrainTask,
  getAgentStatus, type BrainIssue, type BrainTask, type AgentStatus,
} from "@/lib/api";

const sevCls: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  info: "border-ink-700 bg-ink-900",
};
const sevDot: Record<string, string> = { high: "bg-red-400", warn: "bg-amber-400", info: "bg-brand-400" };

export default function BrainPage() {
  const [issues, setIssues] = useState<BrainIssue[]>([]);
  const [tasks, setTasks] = useState<BrainTask[]>([]);
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [ticking, setTicking] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    scanBrain().then((r) => setIssues(r.issues)).catch(() => {});
    getBrainTasks().then((r) => setTasks(r.tasks)).catch(() => {});
    getAgentStatus().then(setAgent).catch(() => {});
  };
  useEffect(load, []);

  const runCycle = async () => {
    setTicking(true); setMsg("");
    try {
      const r = await tickBrain();
      setMsg(`🧠 ${r.issues.length} muammo aniqlandi · ${r.autoActions.length} ta avto bajarildi · ${r.queued} ta navbatga qo‘shildi.`);
      load();
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : "Brain xatosi"}`);
    } finally {
      setTicking(false);
      setTimeout(() => setMsg(""), 9000);
    }
  };

  const approve = async (id: string) => {
    setBusyId(id);
    try { await approveBrainTask(id); load(); } catch { /* ignore */ } finally { setBusyId(""); }
  };
  const dismiss = async (id: string) => {
    setBusyId(id);
    try { await dismissBrainTask(id); load(); } catch { /* ignore */ } finally { setBusyId(""); }
  };

  return (
    <AgentPageShell title="Brain — Orkestrator" subtitle="Platformani kuzatadi, muammolarni topadi, hal qiladi" icon={<Bot className="w-5 h-5" />} accent="from-cyan-500 to-blue-700">
      <div className="flex items-center justify-between gap-3 mb-5">
        <StatusPill status={agent?.llmConfigured ? "active" : "pending"} />
        <button
          onClick={runCycle}
          disabled={ticking}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 disabled:opacity-50 text-sm font-bold text-white"
        >
          {ticking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {ticking ? "Miya o‘ylayapti…" : "Miya tsiklini ishga tushirish"}
        </button>
      </div>
      {msg && <div className="mb-5 text-sm text-slate-100 bg-ink-800 border border-ink-600 rounded-xl px-4 py-3">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Detected issues */}
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Aniqlangan holat</h3>
          {issues.length ? (
            <div className="space-y-2.5">
              {issues.map((it) => (
                <div key={it.kind} className={`rounded-xl border p-3 ${sevCls[it.severity] || sevCls.info}`}>
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${sevDot[it.severity] || sevDot.info}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {it.title}
                        {it.tier === "safe" && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400"><Zap className="w-3 h-3" />AUTO</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{it.description}</div>
                      {it.link && <a href={it.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 mt-1">Admin panelda ochish <ExternalLink className="w-3 h-3" /></a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">✅ Hozircha muammo yo‘q. Tsiklni ishga tushiring.</p>
          )}
        </div>

        {/* Approval queue */}
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Tasdiq navbati</h3>
          {tasks.length ? (
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div key={t._id} className="rounded-xl border border-ink-700 bg-ink-900 p-3">
                  <div className="text-sm font-bold text-white">{t.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t.description}</div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <button onClick={() => approve(t._id)} disabled={busyId === t._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-[11px] font-bold text-white">
                      {busyId === t._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Tasdiqlash
                    </button>
                    <button onClick={() => dismiss(t._id)} disabled={busyId === t._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-700 hover:bg-ink-800 text-[11px] font-bold text-slate-300">
                      <X className="w-3.5 h-3.5" /> Rad etish
                    </button>
                    {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="ml-auto text-[11px] font-bold text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">Ochish <ExternalLink className="w-3 h-3" /></a>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Navbat bo‘sh. Miya tsikli muammolarni shu yerga qo‘yadi.</p>
          )}
        </div>
      </div>

      <p className="mt-5 text-[11px] text-slate-600">Miya xavfsiz ishlarni o‘zi bajaradi (masalan blog qoralamalari). Publish, o‘chirish, narx kabi ishlar — tasdiq bilan.</p>
    </AgentPageShell>
  );
}
