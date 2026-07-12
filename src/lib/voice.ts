// Shared speech helper. Browsers rarely ship a native Uzbek TTS voice, so we
// pick the closest-sounding available voice (Uzbek → Turkish → Russian →
// English) to make the Uzbek text sound as natural as possible.

const LANG = process.env.NEXT_PUBLIC_VOICE_LANG || "en-US";

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const vs = window.speechSynthesis.getVoices() || [];
  if (!vs.length) return null;
  const by = (p: string) => vs.find((v) => (v.lang || "").toLowerCase().startsWith(p));
  return by("en") || by("uz") || by("tr") || by("ru") || vs[0] || null;
}

/** Speak Uzbek text with the best available voice. Calls cb when finished. */
export function speakUz(text: string, cb?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { cb?.(); return; }
  const synth = window.speechSynthesis;
  const run = () => {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG;
      u.rate = 1.0;
      const v = pickVoice();
      if (v) u.voice = v;
      let done = false;
      const finish = () => { if (!done) { done = true; cb?.(); } };
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      setTimeout(finish, Math.min(12000, 1800 + text.length * 70));
    } catch {
      cb?.();
    }
  };
  // Voices may load asynchronously; wait once if not ready yet.
  if (!synth.getVoices().length) {
    let started = false;
    const start = () => { if (!started) { started = true; run(); } };
    synth.addEventListener?.("voiceschanged", start, { once: true } as AddEventListenerOptions);
    setTimeout(start, 250);
  } else {
    run();
  }
}

/** Speak an agent reply aloud (strips HTML/markdown first). */
export function speakReply(text: string, cb?: () => void) {
  const said = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_#`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
  if (!said) { cb?.(); return; }
  speakUz(said, cb);
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}
export function sttSupported(): boolean {
  return typeof window !== "undefined" && (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));
}
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

type RecognizerHandlers = {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
};

// One-utterance speech recognizer (push-to-talk). Returns null if unsupported.
export function createRecognizer(h: RecognizerHandlers): { start: () => void; stop: () => void } | null {
  if (!sttSupported()) return null;
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = h.lang || process.env.NEXT_PUBLIC_VOICE_LANG || "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onstart = () => h.onStart?.();
  rec.onerror = (e: any) => h.onError?.(String(e?.error || "error"));
  rec.onend = () => h.onEnd?.();
  rec.onresult = (e: any) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (final) h.onFinal?.(final.trim());
    else if (interim) h.onInterim?.(interim.trim());
  };
  return {
    start: () => { try { rec.start(); } catch { /* already started */ } },
    stop: () => { try { rec.stop(); } catch { /* already stopped */ } },
  };
}
