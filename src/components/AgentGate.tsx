"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, Sparkles } from "lucide-react";
import { getAgentToggles, setAgentEnabled } from "@/lib/api";

// Drop <AgentGate agentId="marketing" label="Marketing Director" /> at the top of
// any agent page. When that agent is OFF (default — token saving), it covers the
// page with a centered "Enable" call-to-action. Clicking it switches the agent on
// and reloads so all the page's real data + automations start flowing. When the
// agent is already on, it renders nothing.
export default function AgentGate({ agentId, label, accent = "from-emerald-500 to-teal-600" }: { agentId: string; label: string; accent?: string }) {
  const [state, setState] = useState<"loading" | "on" | "off">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    getAgentToggles()
      .then((r) => { if (!off) setState(r.enabled?.[agentId] ? "on" : "off"); })
      .catch(() => { if (!off) setState("on"); }); // fail open — never block on a fetch error
    return () => { off = true; };
  }, [agentId]);

  if (state === "on") return null;

  const enable = async () => {
    setBusy(true);
    try { await setAgentEnabled(agentId, true); window.location.reload(); }
    catch { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 lg:left-64 bg-ink-950/75 backdrop-blur-sm grid place-items-center p-6">
      {state === "loading" ? (
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      ) : (
        <div className="w-full max-w-md text-center rounded-2xl border border-ink-800 bg-ink-900 p-8 shadow-2xl">
          <span className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accent} grid place-items-center mx-auto mb-4`}><Power className="w-7 h-7 text-white" /></span>
          <h3 className="text-lg font-bold text-white">{label} is off</h3>
          <p className="text-[12px] text-slate-400 mt-2 leading-relaxed">This agent is disabled to save tokens — everything reads 0 and nothing runs. Enable it to start: its data, tasks &amp; automations activate for <span className="text-slate-200 font-semibold">this agent only</span>.</p>
          <button onClick={enable} disabled={busy} className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Enable {label}
          </button>
          <p className="text-[10px] text-slate-600 mt-3">You can switch it back off anytime from the AI Command Center or Communication Center.</p>
        </div>
      )}
    </div>
  );
}
