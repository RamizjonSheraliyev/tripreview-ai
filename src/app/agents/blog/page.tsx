"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, ExternalLink, Sparkles } from "lucide-react";
import AgentPageShell, { StatusPill } from "@/components/AgentPageShell";
import { getAgentStatus, runBlogAgent, getActivity, type AgentStatus, type Activity } from "@/lib/api";

const ADMIN_BLOG_URL = (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001/admin") + "/blog";

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.round(h / 24)} kun oldin`;
}

export default function BlogAgentPage() {
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  const [runs, setRuns] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    getAgentStatus().then(setAgent).catch(() => {});
    getActivity(20, "agent.blog.run").then((r) => setRuns(r.activities)).catch(() => {});
  };
  useEffect(load, []);

  const run = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await runBlogAgent(5);
      setMsg(`✅ ${r.created.length} ta qoralama yaratildi${r.errors ? `, ${r.errors} ta xato` : ""}. Admin panelda ko‘rib chiqing.`);
      load();
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : "Xatolik"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AgentPageShell title="Blog Agent" subtitle="Har kuni SEO blog qoralamalarini yozadi" icon={<FileText className="w-5 h-5" />} accent="from-blue-500 to-blue-700">
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Status + action */}
        <div className="lg:col-span-2 bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <StatusPill status={agent?.blog.status || "pending"} />
            <button
              onClick={run}
              disabled={busy || !agent?.llmConfigured}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-sm font-bold text-white"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "5 ta qoralama yozilyapti…" : "Hozir ishga tushirish (5 ta)"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Metric label="Tayyor qoralamalar" value={agent ? String(agent.blog.draftCount) : "—"} />
            <Metric label="Oxirgi ishga tushish" value={agent ? timeAgo(agent.blog.lastRunAt || undefined) : "—"} />
            <Metric label="Oxirgi yaratilgan" value={agent?.blog.lastRunCreated != null ? String(agent.blog.lastRunCreated) : "—"} />
          </div>

          {msg && <div className="mt-4 text-xs text-slate-200 bg-ink-900 border border-ink-700 rounded-lg px-3 py-2">{msg}</div>}
          {!agent?.llmConfigured && agent && (
            <div className="mt-4 text-xs text-amber-400">⚠️ Backend’da LLM kalit yo‘q — ANTHROPIC_API_KEY (yoki GROQ/OPENROUTER/GEMINI) qo‘ying.</div>
          )}

          <a href={ADMIN_BLOG_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-brand-400 hover:text-brand-300">
            Qoralamalarni admin panelda ko‘rish & chop etish <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* What it does */}
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-2">Bu agent nima qiladi?</h3>
          <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4">
            <li>Dubai sayohat mavzularida original SEO maqola yozadi.</li>
            <li>Sarlavha, qisqacha, matn, teglar va muqova rasmni tayyorlaydi.</li>
            <li>Doim <span className="text-slate-200 font-semibold">Draft</span> sifatida saqlaydi — avtomatik chop etmaydi.</li>
            <li>Kuniga 5 ta (sozlanadi), 09:00 Dubai vaqtida.</li>
          </ul>
        </div>
      </div>

      {/* Run history */}
      <div className="mt-4 bg-ink-850 border border-ink-700 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Ishga tushishlar tarixi</h3>
        {runs.length ? (
          <ul className="space-y-3">
            {runs.map((a, i) => (
              <li key={a.id || i} className="flex items-center justify-between gap-3 text-xs border-b border-ink-800 last:border-0 pb-3 last:pb-0">
                <span className="text-slate-300">{a.entityLabel || "blog run"}</span>
                <span className="text-slate-500">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Hali ishga tushmagan. “Hozir ishga tushirish” tugmasini bosing.</p>
        )}
      </div>
    </AgentPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-bold text-white mt-1">{value}</div>
    </div>
  );
}
