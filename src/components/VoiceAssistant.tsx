"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, X, Loader2, Send, Volume2 } from "lucide-react";
import { askAnalytics } from "@/lib/api";
import { speakUz } from "@/lib/voice";

// Voice navigation: keyword -> route + spoken confirmation.
const NAV: { test: RegExp; href: string; say: string }[] = [
  { test: /\bblog/i, href: "/agents/blog", say: "Blog bo‘limiga o‘tdim." },
  { test: /\bseo|с[еэ]о/i, href: "/agents/seo", say: "SEO bo‘limiga o‘tdim." },
  { test: /ovoz|voice|voys|mikrofon/i, href: "/agents/voice", say: "Ovoz bo‘limiga o‘tdim." },
  { test: /dashboard|bosh sahifa|asosiy|boshqaruv|bош/i, href: "/dashboard", say: "Asosiy panelga o‘tdim." },
];
const ACTION = /\bkir|o['‘`]t|och|bo['‘`]lim|sahifa|ber\b/i;

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const LANG = process.env.NEXT_PUBLIC_VOICE_LANG || "en-US";

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}


export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef<Recognition | null>(null);
  const router = useRouter();

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setErr("");
    setAnswer("");
    try {
      const r = await askAnalytics(query);
      setAnswer(r.answer);
      speakUz(r.answer);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Javob berolmadim.");
    } finally {
      setBusy(false);
    }
  };

  // Route on a navigation command (e.g. "blog bo'limiga kir"); else treat as a
  // question. Returns true if it navigated.
  const handle = (text: string): void => {
    const t = text.trim();
    if (!t) return;
    if (ACTION.test(t)) {
      const m = NAV.find((n) => n.test.test(t));
      if (m) {
        setAnswer(m.say);
        speakUz(m.say);
        router.push(m.href);
        return;
      }
    }
    ask(t);
  };

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) { setErr("Bu brauzer ovozni qo‘llamaydi. Yozib so‘rang."); return; }
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = LANG;
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e: RecognitionEvent) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      finalText = t;
      setQuestion(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) handle(finalText);
    };
    try { rec.start(); setListening(true); setErr(""); } catch { setListening(false); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 shadow-xl shadow-brand-600/30 flex items-center justify-center hover:scale-105 transition"
        aria-label="Voice assistant"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[340px] bg-ink-850 border border-ink-700 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center"><Volume2 className="w-4 h-4 text-white" /></span>
            <div>
              <div className="text-sm font-bold text-white leading-none">Atlasdan so‘rang</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ovozli analitika — ko‘rsatkichlar haqida so‘rang</div>
            </div>
          </div>

          <button
            onClick={listen}
            disabled={listening || busy}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-bold mb-2 ${
              listening ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-ink-700 bg-ink-900 text-slate-200 hover:border-brand-500"
            }`}
          >
            {listening ? <span className="w-2 h-2 rounded-full bg-brand-400 live-dot" /> : <Mic className="w-4 h-4" />}
            {listening ? "Tinglayapman…" : "Bosing va gapiring"}
          </button>

          <form
            onSubmit={(e) => { e.preventDefault(); handle(question); }}
            className="flex items-center gap-2 mb-3"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="masalan: bugun nechta murojaat?"
              className="flex-1 px-3 py-2 rounded-lg bg-ink-900 border border-ink-700 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" disabled={busy} className="w-9 h-9 rounded-lg bg-brand-600 hover:bg-brand-700 flex items-center justify-center disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </form>

          {err && <div className="text-[11px] text-red-400 mb-2">{err}</div>}
          {answer && (
            <div className="text-xs text-slate-200 bg-ink-900 border border-ink-700 rounded-lg p-3 leading-relaxed max-h-48 overflow-y-auto">
              {answer}
            </div>
          )}
          {!answer && !err && (
            <div className="text-[11px] text-slate-500">Masalan: &ldquo;bugun nechta bron?&rdquo;, &ldquo;nechta sharh kutmoqda?&rdquo;, &ldquo;umumiy daromad qancha?&rdquo;</div>
          )}
        </div>
      )}
    </>
  );
}
