"use client";

// Destination agent panel — one click fills each destination's "Explore <city>
// by Areas" cards on the public site with real neighbourhoods + on-theme
// photos. Uses the LLM when a key is set, else the curated UAE fallback. Lives
// in the Page Builder because it builds the destination detail pages.
import { useCallback, useEffect, useState } from "react";
import { MapPin, Loader2, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  listAgentDestinations, generateDestinationAreas, generateAllDestinationAreas,
  type AgentDestination,
} from "@/lib/api";

export default function DestinationAreasPanel({ onNote }: { onNote: (m: string) => void }) {
  const [rows, setRows] = useState<AgentDestination[] | null>(null);
  const [busy, setBusy] = useState<string>(""); // destination id, or "__all__"

  const load = useCallback(async () => {
    try { const r = await listAgentDestinations(); setRows(r.destinations); }
    catch { setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const genOne = async (d: AgentDestination) => {
    setBusy(d.id);
    try {
      const r = await generateDestinationAreas(d.id);
      onNote(`✓ ${r.name}: ${r.count} areas written (${r.source === "ai" ? "AI" : "curated"}).`);
      await load();
    } catch (e) { onNote(e instanceof Error ? e.message : "Generate failed."); }
    finally { setBusy(""); }
  };

  const genAll = async () => {
    setBusy("__all__");
    try {
      const r = await generateAllDestinationAreas();
      onNote(`✓ Filled areas for ${r.updated} destination${r.updated === 1 ? "" : "s"}.`);
      await load();
    } catch (e) { onNote(e instanceof Error ? e.message : "Generate failed."); }
    finally { setBusy(""); }
  };

  return (
    <div className="rounded-2xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950 p-4">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-brand-400" />
        <h2 className="text-sm font-bold text-white">Destination pages — Explore by Areas</h2>
        <button
          onClick={genAll}
          disabled={!!busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          {busy === "__all__" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Filling…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate all</>}
        </button>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">Fills each destination&apos;s neighbourhood cards on the live site with real areas + on-theme photos. Runs on the DB — shows on the next page load.</p>

      {rows === null ? (
        <div className="grid place-items-center py-8 text-slate-600"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-[11px] text-slate-500">No destinations yet — add one in the admin panel.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/40 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-white truncate">{d.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{d.country}</div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${d.areaCount ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-amber-500/10 text-amber-300 border-amber-500/25"}`}>
                {d.areaCount ? <><CheckCircle2 className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />{d.areaCount} areas</> : "empty"}
              </span>
              <button
                onClick={() => genOne(d)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-300 border border-ink-700 hover:bg-ink-800 disabled:opacity-40 transition-colors"
              >
                {busy === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {d.areaCount ? "Regenerate" : "Generate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
