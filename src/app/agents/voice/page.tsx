"use client";

import { useState } from "react";
import { Mic, Volume2, Loader2 } from "lucide-react";
import AgentPageShell, { StatusPill } from "@/components/AgentPageShell";
import VoiceAssistant from "@/components/VoiceAssistant";
import { askAnalytics } from "@/lib/api";
import { speakUz } from "@/lib/voice";

const LANG = process.env.NEXT_PUBLIC_VOICE_LANG || "uz-UZ";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: RecognitionEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void };
type Ctor = new () => Recognition;

export default function VoiceAgentPage() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setBusy(true); setA("");
    try { const r = await askAnalytics(question.trim()); setA(r.answer); speakUz(r.answer); }
    catch (e) { setA(e instanceof Error ? e.message : "Javob berolmadim."); }
    finally { setBusy(false); }
  };

  const listen = () => {
    const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) { setA("Brauzer ovozni qo‘llamaydi."); return; }
    const rec = new C(); rec.lang = LANG; rec.interimResults = true; rec.continuous = false;
    let last = "";
    rec.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; last = t; setQ(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => { setListening(false); if (last.trim()) ask(last); };
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  return (
    <AgentPageShell title="Voice Agent" subtitle="Ovozli analitika — o‘zbekcha so‘rang, ovozda javob" icon={<Mic className="w-5 h-5" />} accent="from-emerald-500 to-emerald-700">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <StatusPill status="active" />
          <h3 className="text-sm font-bold text-white mt-4 mb-3">Ovozli konsol</h3>
          <button
            onClick={listen}
            disabled={listening || busy}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold mb-3 ${listening ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-ink-700 bg-ink-900 text-slate-200 hover:border-emerald-500"}`}
          >
            {listening ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-dot" /> : <Mic className="w-4 h-4" />}
            {listening ? "Tinglayapman…" : "Bosing va o‘zbekcha gapiring"}
          </button>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="masalan: bugun nechta bron?" className="flex-1 px-3 py-2 rounded-lg bg-ink-900 border border-ink-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "So‘rash"}</button>
          </form>
          {a && (
            <div className="mt-4 flex items-start gap-2 text-sm text-slate-200 bg-ink-900 border border-ink-700 rounded-lg p-3">
              <Volume2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> <span>{a}</span>
            </div>
          )}
        </div>
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-2">Namuna savollar</h3>
          <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
            <li>Bugun nechta yangi foydalanuvchi?</li>
            <li>Nechta sharh tasdiqlashni kutmoqda?</li>
            <li>Umumiy daromad qancha?</li>
            <li>Nechta faol e‘lon bor?</li>
          </ul>
          <p className="mt-4 text-[11px] text-slate-600">Til: {LANG}. Pastki o‘ng burchakdagi mikrofon har sahifada ishlaydi.</p>
        </div>
      </div>
      <VoiceAssistant />
    </AgentPageShell>
  );
}
