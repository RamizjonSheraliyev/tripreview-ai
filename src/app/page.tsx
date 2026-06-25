"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
import { login, fetchMe, setStoredUser, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // Already signed in (cookie present) + Admin → straight to dashboard.
  useEffect(() => {
    let off = false;
    fetchMe()
      .then((r) => {
        if (off) return;
        if (r.user?.role === "Admin") {
          setStoredUser(r.user);
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => !off && setChecking(false));
    return () => {
      off = true;
    };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await login(email.trim(), password);
      if (r.user?.role !== "Admin") {
        setError("This dashboard is for administrators only.");
        setBusy(false);
        return;
      }
      setStoredUser(r.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Try again.");
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ink-950">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 px-4 relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-brand-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full bg-violet-600/20 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <form onSubmit={submit} className="bg-ink-850 border border-ink-700 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-white">Command Center Login</h1>
          <p className="text-xs text-slate-400 mt-1 mb-5">Sign in with your administrator account.</p>

          <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
          <div className="relative mb-3">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-ink-900 border border-ink-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
          <div className="relative mb-4">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-ink-900 border border-ink-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 hover:opacity-95 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-600 mt-4">After login, voice activation starts the command center.</p>
      </div>
    </main>
  );
}
