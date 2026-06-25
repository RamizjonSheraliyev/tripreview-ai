"use client";

import { useRef, useState } from "react";
import { Mic, Power, Loader2, Lock, Check, X } from "lucide-react";
import { speakUz } from "@/lib/voice";

// Minimal Web Speech typings.
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const CODE = (process.env.NEXT_PUBLIC_VOICE_CODE || "1909").replace(/\D/g, "");
const LANG = process.env.NEXT_PUBLIC_VOICE_LANG || "uz-UZ";

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type Phase = "start" | "asking" | "listening" | "ok" | "denied" | "unsupported";

export default function VoiceGate({ onActivate }: { onActivate: () => void }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [heard, setHeard] = useState("");
  const recRef = useRef<Recognition | null>(null);

  const verify = (digits: string) => {
    if (digits.includes(CODE)) {
      setPhase("ok");
      speakUz("Xush kelibsiz.", () => setTimeout(onActivate, 200));
    } else {
      setPhase("denied");
      speakUz("Kod noto‘g‘ri.");
    }
  };

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) { setPhase("unsupported"); return; }
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = LANG;
    rec.continuous = false;
    rec.interimResults = true;
    let last = "";
    rec.onresult = (e: RecognitionEvent) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      last = t;
      setHeard(t);
    };
    rec.onerror = () => { setPhase("denied"); speakUz("Eshitilmadi."); };
    rec.onend = () => {
      const digits = last.replace(/\D/g, "");
      if (digits) verify(digits);
      else if (phase === "listening") { setPhase("denied"); speakUz("Eshitilmadi."); }
    };
    try { rec.start(); setPhase("listening"); } catch { setPhase("unsupported"); }
  };

  // First user tap (needed for browser audio autoplay): greet, then listen.
  const begin = () => {
    setPhase("asking");
    setHeard("");
    speakUz("Kodingizni ayting.", listen);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/95 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/15 blur-[140px]" />
      <div className="relative text-center max-w-md w-full">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-5">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Ovozli faollashtirish</h1>
        <p className="text-sm text-slate-400 mt-2">
          Tugmani bosing — tizim sizdan <span className="font-bold text-brand-400">tasdiqlash kodini</span> so‘raydi. Kodni ovozda ayting.
        </p>

        {/* Big action button */}
        <button
          onClick={phase === "start" || phase === "denied" ? begin : undefined}
          disabled={phase === "asking" || phase === "listening" || phase === "ok"}
          className={`mt-7 mx-auto flex items-center justify-center w-28 h-28 rounded-full border-2 transition ${
            phase === "listening" ? "border-brand-500 bg-brand-500/10"
              : phase === "ok" ? "border-emerald-500 bg-emerald-500/10"
              : "border-ink-700 bg-ink-850 hover:border-brand-500"
          }`}
        >
          {phase === "asking" ? <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
            : phase === "listening" ? (
              <span className="relative flex items-center justify-center">
                <span className="absolute w-28 h-28 rounded-full bg-brand-500/20 live-dot" />
                <Mic className="w-10 h-10 text-brand-400 relative" />
              </span>
            )
            : phase === "ok" ? <Check className="w-10 h-10 text-emerald-400" />
            : <Power className="w-10 h-10 text-slate-300" />}
        </button>

        <div className="mt-4 text-sm h-5">
          {phase === "start" && <span className="text-slate-500">Tizimni yoqish uchun bosing</span>}
          {phase === "asking" && <span className="text-brand-300">Kod so‘ralyapti…</span>}
          {phase === "listening" && <span className="text-brand-300">Tinglayapman… {heard && <span className="text-slate-400">“{heard}”</span>}</span>}
          {phase === "ok" && <span className="text-emerald-400 font-bold">Xush kelibsiz! Ochilmoqda…</span>}
          {phase === "denied" && <span className="text-red-400 inline-flex items-center gap-1.5"><X className="w-4 h-4" /> Kod noto‘g‘ri — qaytadan bosing</span>}
          {phase === "unsupported" && <span className="text-amber-400">Brauzer ovozni qo‘llamaydi — kodni qo‘lda kiriting</span>}
        </div>

        <p className="mt-6 text-[11px] text-slate-600">Tasdiqlash faqat ovoz orqali. Asosiy himoya — parol bilan kirish.</p>
      </div>
    </div>
  );
}
