"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import AgentPageShell, { StatusPill } from "@/components/AgentPageShell";
import { getAgentStatus, type AgentStatus } from "@/lib/api";

export default function SeoAgentPage() {
  const [agent, setAgent] = useState<AgentStatus | null>(null);
  useEffect(() => { getAgentStatus().then(setAgent).catch(() => {}); }, []);
  const status = agent ? (agent.llmConfigured ? "active" : "pending") : "pending";

  return (
    <AgentPageShell title="SEO Agent" subtitle="Sarlavha, meta va kalit so‘zlarni optimallashtiradi" icon={<SearchIcon className="w-5 h-5" />} accent="from-violet-500 to-violet-700">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <StatusPill status={status} />
          <h3 className="text-sm font-bold text-white mt-4 mb-2">Hozir nima qilyapti?</h3>
          <ul className="space-y-2 text-xs text-slate-400 list-disc pl-4">
            <li>Har bir blog qoralamasi yaratilganda SEO sarlavha va meta-tavsifni shakllantiradi.</li>
            <li>Maqolaga mos teglar va kalit so‘zlarni qo‘shadi.</li>
            <li>Dubai sayohat (car / yacht / airport / activities) so‘rovlariga moslaydi.</li>
          </ul>
          {!agent?.llmConfigured && agent && (
            <div className="mt-4 text-xs text-amber-400">⚠️ LLM kalit yo‘q — backend’ga ANTHROPIC_API_KEY qo‘ying.</div>
          )}
        </div>
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-2">Keyingi bosqich</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Mavjud blog postlarini ko‘rib chiqib, eski sarlavha/metalarni qayta optimallashtirish — keyingi versiyada qo‘shiladi.</p>
        </div>
      </div>
    </AgentPageShell>
  );
}
