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
