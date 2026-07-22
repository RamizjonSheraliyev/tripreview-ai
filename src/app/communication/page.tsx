"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown, Megaphone, Search, PenLine, Send, Share2, Radar, Building2, Handshake, UserCheck,
  Sparkles, MessageSquare, Loader2, RefreshCw, Bell, Users, AlertTriangle, FileText,
  CheckCircle2, X, GitBranch, Globe, Wand2, ChevronDown, Paperclip, Plus, MoreHorizontal,
  Mail, Calendar, Eye, Award, AtSign, Clock, Zap, Download, Copy, Trash2, Smartphone, FileText as FileIcon,
  Mic, Volume2, VolumeX, Check,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { FadeUp, motion } from "@/components/motion";
import { AGENTS, type AgentDef } from "@/lib/agents";
import { speakReply, stopSpeaking, sttSupported, createRecognizer } from "@/lib/voice";
import {
  fetchMe, getStoredUser, getWorkforce, getTeam, getCeoOrchestration,
  getAgentToggles, setAgentEnabled,
  chatHistoryApi, chatSendApi, chatActApi, type ChatMsg, type ChatCard, type ChatStep,
  listAnnouncements, getAnnouncement, getAnnouncementStats, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getWorkflows,
  getAlertStats, listAlerts, getAlertById, alertAction,
  getTemplateStats, listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, useTemplate,
  type Workforce, type AgentChatTurn, type OrchTask,
  type AnnouncementItem, type AnnouncementStats, type AnnouncementInput,
  type Workflows, type WorkflowRow,
  type AlertStats, type SystemAlertItem,
  type TemplateItem, type TemplateStats, type TemplateInput,
} from "@/lib/api";

const AGENT_ICONS: Record<string, React.ElementType> = {
  Crown, Megaphone, Search, PenLine, Send, Share2, Radar, Building2, Handshake, UserCheck,
};
const iconFor = (id: string) => {
  const a = AGENTS.find((x) => x.id === id);
  return (a && AGENT_ICONS[a.icon]) || Sparkles;
};
const nameFor = (id: string) => AGENTS.find((x) => x.id === id)?.name || id;

const TABS = ["Team Inbox", "Agent Conversations", "Announcements", "Workflow Updates", "System Alerts", "Message Templates"] as const;
type Tab = (typeof TABS)[number];

type Msg = {
  id: number; role: "founder" | "agent"; agentId?: string; name?: string; text: string; ts: number; image?: string;
  // Persisted task-card fields (from the chat/send + chat/act endpoints).
  sid?: string; card?: ChatCard | null; actionStatus?: string; actionResult?: string; steps?: ChatStep[];
};
const fromServer = (m: ChatMsg, id: number): Msg => ({
  id, sid: m.id, role: m.role, agentId: m.agentId || undefined, name: m.name || undefined,
  text: m.text, ts: new Date(m.createdAt).getTime(), card: m.card, actionStatus: m.actionStatus,
  actionResult: m.actionResult, steps: m.steps || [],
});

// The work an agent actually did before it spoke. Shown above the reply so the
// founder can see it acted on live data instead of taking its word for it.
function Steps({ steps }: { steps: ChatStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="mb-1.5 space-y-0.5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
          {s.ok ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <X className="w-3 h-3 text-rose-500 shrink-0" />}
          <span className="font-mono text-slate-600">{s.tool}</span>
          {s.summary && <span className="truncate">— {s.summary}</span>}
        </div>
      ))}
    </div>
  );
}
type ImgAtt = { base64: string; type: string; preview: string };

// Downscale an image to ≤1280px JPEG so it fits the API limit.
async function fileToImg(file: File): Promise<ImgAtt> {
  const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const im = new window.Image();
  await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = dataUrl; });
  const scale = Math.min(1, 1280 / Math.max(im.width, im.height));
  const c = document.createElement("canvas");
  c.width = Math.round(im.width * scale); c.height = Math.round(im.height * scale);
  c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
  const out = c.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1] || "", type: "image/jpeg", preview: out };
}

// Post-style task card an agent drops into the chat — the deliverable itself
// (blog preview, SEO-fix plan, distribution plan, provider list) with REAL
// Approve/Reject buttons. The decision + execution result render in place.
function TaskCard({ msg, busy, onAct }: { msg: Msg; busy: boolean; onAct: (d: "approve" | "reject") => void }) {
  const c = msg.card!;
  const pending = msg.actionStatus === "pending";
  const running = msg.actionStatus === "running";
  const approved = msg.actionStatus === "approved";
  const rejected = msg.actionStatus === "rejected";
  const failed = msg.actionStatus === "failed";
  return (
    <div className="rounded-2xl rounded-tl-md border border-ink-700 bg-ink-950/70 overflow-hidden max-w-lg">
      {msg.text && <div className="px-3.5 pt-2.5 text-[13px] text-slate-200 leading-relaxed">{msg.text}</div>}
      {c.image && <img src={c.image} alt="" className="w-full h-40 object-cover mt-2.5" />}
      <div className="p-3.5 space-y-2.5">
        <div>
          <div className="text-[14px] font-bold text-white leading-snug">{c.title}</div>
          {c.subtitle && <div className="text-[10px] text-slate-500 mt-0.5">{c.subtitle}</div>}
        </div>
        {c.body && <p className="text-[12px] text-slate-300 leading-relaxed">{c.body}{c.body.length >= 200 ? "…" : ""}</p>}
        {c.why && (
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-2.5 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wide text-amber-300/90 mb-0.5">Why this matters</div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{c.why}</p>
          </div>
        )}
        {c.plan && c.plan.length > 0 && !approved && (
          <div className="rounded-lg border border-brand-500/15 bg-brand-500/5 px-2.5 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wide text-brand-300/90 mb-1">What I&apos;ll do</div>
            <ol className="space-y-1">
              {c.plan.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-snug">
                  <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-brand-500/20 text-brand-300 grid place-items-center text-[8px] font-bold mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}
        {c.fields && c.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {c.fields.map((f) => (
              <div key={f.label} className="rounded-lg border border-ink-800 bg-ink-900/50 px-2 py-1.5"><div className="text-[9px] text-slate-500">{f.label}</div><div className="text-[11px] text-slate-200 truncate">{f.value}</div></div>
            ))}
          </div>
        )}
        {c.items && c.items.length > 0 && (
          <ul className="space-y-1.5">
            {c.items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 px-2.5 py-2">
                <UserCheck className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                <div className="min-w-0"><div className="text-[12px] text-slate-200 font-medium truncate">{it.label}</div><div className="text-[9px] text-slate-500 truncate">{it.sub}</div></div>
              </li>
            ))}
          </ul>
        )}
        {c.fix && c.fix.changes?.length > 0 && (
          <div className="space-y-1.5">
            {c.fix.changes.map((ch, i) => (
              <div key={i} className="space-y-1">
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5"><div className="text-[8px] font-bold uppercase text-rose-300/80">Before · {ch.field}</div><div className="text-[11px] text-slate-300 break-words">{ch.before || <span className="italic text-slate-600">(empty)</span>}</div></div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5"><div className="text-[8px] font-bold uppercase text-emerald-300/80">After</div><div className="text-[11px] text-slate-200 break-words">{ch.after}</div></div>
              </div>
            ))}
          </div>
        )}
        {c.links && c.links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.links.map((l) => (
              <a key={l.label} href={l.url} target={l.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="inline-flex items-center gap-1 px-2 h-7 rounded-lg border border-ink-700 text-[11px] font-semibold text-brand-300 hover:bg-ink-800">
                <Globe className="w-3 h-3" /> {l.label}
              </a>
            ))}
          </div>
        )}
        {running && (
          <div className="rounded-lg px-2.5 py-2 text-[11px] leading-relaxed border border-amber-500/20 bg-amber-500/5 text-amber-200 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span><span className="font-bold">Working on it</span> — this takes a few minutes. It&apos;ll post here when it&apos;s done; you can carry on in the meantime.</span>
          </div>
        )}
        {failed && (
          <div className="rounded-lg px-2.5 py-2 text-[11px] leading-relaxed border border-rose-500/20 bg-rose-500/5 text-rose-200">
            <span className="font-bold">Didn&apos;t go through</span>{msg.actionResult ? ` — ${msg.actionResult}` : ""}
          </div>
        )}
        {(approved || rejected) && (
          <div className={`rounded-lg px-2.5 py-2 text-[11px] leading-relaxed border ${approved ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-rose-500/20 bg-rose-500/5 text-rose-200"}`}>
            <span className="font-bold">{approved ? "✓ Approved" : "✕ Rejected"}</span>{msg.actionResult ? ` — ${msg.actionResult}` : ""}
          </div>
        )}
        {pending && (
          <div className="flex gap-2 pt-0.5">
            <button onClick={() => onAct("approve")} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[12px] font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {c.approveLabel || "Approve"}
            </button>
            <button onClick={() => onAct("reject")} disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg border border-rose-500/30 text-rose-300 text-[12px] font-bold hover:bg-rose-500/10 disabled:opacity-50">
              <X className="w-3.5 h-3.5" /> {c.rejectLabel || "Reject"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatInput({ members, busy, mentionId, setMentionId, onSend, statusOf, placeholder, seed, voiceOut, onToggleVoiceOut }: {
  members: AgentDef[]; busy: boolean; mentionId: string; setMentionId: (id: string) => void;
  onSend: (text: string, img: ImgAtt | null) => void; statusOf?: (id: string) => string; placeholder?: string;
  seed?: { text: string; key: string }; voiceOut?: boolean; onToggleVoiceOut?: () => void;
}) {
  const [text, setText] = useState(seed?.text || "");
  const [img, setImg] = useState<ImgAtt | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [canSTT, setCanSTT] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const baseRef = useRef("");
  const seedKey = seed?.key;
  useEffect(() => { if (seedKey !== undefined) setText(seed?.text || ""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [seedKey]);
  useEffect(() => { setCanSTT(sttSupported()); }, []);
  const submitText = (val: string) => { const t = val.trim(); if ((!t && !img) || busy) return; onSend(t, img); setText(""); setImg(null); };
  const submit = () => submitText(text);
  const attach = async (f: File | null) => { if (!f) return; try { setImg(await fileToImg(f)); } catch { /* ignore */ } };

  // Push-to-talk dictation. Speak → live transcript fills the box → auto-sends
  // on the final result. Click again to stop early.
  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    baseRef.current = text ? text + " " : "";
    const rec = createRecognizer({
      onStart: () => setListening(true),
      onInterim: (s) => setText(baseRef.current + s),
      onFinal: (s) => { const full = baseRef.current + s; setText(full); setTimeout(() => submitText(full), 120); },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!rec) return;
    recRef.current = rec;
    rec.start();
  };

  return (
    <div className="border-t border-ink-800 p-3 shrink-0 relative">
      {(mentionId || img) && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {mentionId && <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-300 bg-brand-500/10 border border-brand-500/30 rounded-full px-2.5 py-1">To: {nameFor(mentionId)} <button onClick={() => setMentionId("")} className="hover:text-white"><X className="w-3 h-3" /></button></span>}
          {img && <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-950 p-1 pr-2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img.preview} alt="" className="h-8 w-auto rounded" /><span className="text-[10px] text-slate-400">Image attached</span><button onClick={() => setImg(null)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button></span>}
        </div>
      )}
      {pickerOpen && (
        <div className="absolute bottom-16 left-3 z-20 w-56 max-h-60 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1 scrollbar-thin">
          {members.map((a) => { const Icon = AGENT_ICONS[a.icon] || Sparkles; const on = statusOf ? statusOf(a.id) === "Active" : a.live;
            return <button key={a.id} onClick={() => { setMentionId(a.id); setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}@${a.name} `); setPickerOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-ink-800"><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3 h-3" /></span><span className="text-[11px] text-white flex-1 truncate">{a.name}</span><span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-slate-600"}`} /></button>;
          })}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={mentionId ? `Message ${nameFor(mentionId)}…` : (placeholder || "Type a message…")} className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none max-h-32" />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => fileRef.current?.click()} title="Attach image" className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-300"><Paperclip className="w-4 h-4" /></button>
        <button type="button" onClick={() => setPickerOpen((v) => !v)} title="Mention an agent" className={`w-8 h-8 grid place-items-center rounded-lg ${pickerOpen ? "text-brand-300 bg-brand-500/10" : "text-slate-500 hover:text-slate-300"}`}><AtSign className="w-4 h-4" /></button>
        {canSTT && (
          <button type="button" onClick={toggleMic} title={listening ? "Stop listening" : "Speak your message"} className={`w-8 h-8 grid place-items-center rounded-lg relative ${listening ? "text-white bg-rose-500" : "text-slate-500 hover:text-slate-300"}`}>
            <Mic className="w-4 h-4" />
            {listening && <span className="absolute inset-0 rounded-lg ring-2 ring-rose-400 animate-ping" />}
          </button>
        )}
        {onToggleVoiceOut && (
          <button type="button" onClick={onToggleVoiceOut} title={voiceOut ? "Voice replies: on (click to mute)" : "Voice replies: off (click to hear agents)"} className={`w-8 h-8 grid place-items-center rounded-lg ${voiceOut ? "text-emerald-300 bg-emerald-500/10" : "text-slate-500 hover:text-slate-300"}`}>
            {voiceOut ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
        <button type="submit" disabled={busy || (!text.trim() && !img)} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50 shrink-0"><Send className="w-4 h-4" /> Send</button>
      </form>
      {listening && <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> Listening… speak now</div>}
    </div>
  );
}

const QUICK_PROMPTS = [
  "Give me today's analytics — how are we doing?",
  "How is our SEO doing right now?",
  "What should we prioritize this week?",
  "What's the state of our content pipeline?",
];

let MID = 1;

export default function CommunicationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();
  const [tab, setTab] = useState<Tab>("Team Inbox");
  const [refreshing, setRefreshing] = useState(false);

  const [wf, setWf] = useState<Workforce | null>(null);
  const [tasks, setTasks] = useState<OrchTask[]>([]);

  useEffect(() => {
    let off = false;
    fetchMe()
      .then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); })
      .catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const load = useMemo(() => async () => {
    const [w, o] = await Promise.all([
      getWorkforce().catch(() => null),
      getCeoOrchestration().catch(() => null),
    ]);
    if (w) setWf(w);
    if (o) setTasks(o.tasks || []);
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><MessageSquare className="w-5 h-5 text-white" /></span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">Communication Center</h1>
            <p className="text-[11px] text-slate-500 truncate">Real-time group chat across your AI workforce — ask, and the right agent answers.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={refresh} className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:text-white hover:bg-ink-800" title="Refresh"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></button>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-ink-700 text-slate-400 relative"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white">{(user?.name || "F").charAt(0)}</div>
              <div className="leading-tight"><div className="text-xs font-semibold text-white">{user?.name || "Founder"}</div><div className="text-[10px] text-slate-500">CEO Access</div></div>
            </div>
          </div>
        </header>

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin shrink-0">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {t}{tab === t && <motion.span layoutId="commTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === "Team Inbox" ? (
            <GroupChat wf={wf} group={false} />
          ) : tab === "Agent Conversations" ? (
            <AgentConversations wf={wf} tasks={tasks} />
          ) : (
            <div className="h-full overflow-y-auto p-5 space-y-5">
              {tab === "Workflow Updates" ? <WorkflowUpdates />
                : tab === "System Alerts" ? <SystemAlerts />
                : tab === "Announcements" ? <Announcements />
                : <MessageTemplates onUse={(t) => { sessionStorage.setItem("comm-prefill", t); setTab("Team Inbox"); }} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* --------------------------- Group chat (real) --------------------------- */

const REACTIONS = ["👍", "🚀", "✅", "❤️"];

function GroupChat({ wf }: { wf: Workforce | null; group: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState("");          // "" = All / auto-route, else agent id
  const [convTab, setConvTab] = useState<"All" | "Unread" | "Mentions">("All");
  const [reacts, setReacts] = useState<Record<string, Record<string, number>>>({});
  const [seed, setSeed] = useState<{ text: string; key: string } | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const prefill = (txt: string) => setSeed({ text: txt, key: "k" + MID++ });

  // Consume a template "Use" hand-off from the Message Templates tab.
  useEffect(() => {
    const p = typeof window !== "undefined" ? sessionStorage.getItem("comm-prefill") : null;
    if (p) { sessionStorage.removeItem("comm-prefill"); setSeed({ text: p, key: "k" + MID++ }); }
  }, []);

  // Persisted history — the group chat (and each DM) survives reloads. If a job
  // was still running when the page was closed, pick the watch back up so the
  // result lands here rather than being lost with the tab.
  useEffect(() => {
    let off = false;
    chatHistoryApi(to || "all").then((r) => {
      if (off) return;
      setMsgs(r.messages.map((m, i) => fromServer(m, MID++ + i)));
      const live = r.messages.find((m) => m.actionStatus === "running");
      if (live) watchJob(live.id);
    }).catch(() => {});
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const members = AGENTS;
  const wfA = (id: string) => wf?.agents.find((a) => a.id === id);
  const statusOf = (id: string) => wfA(id)?.status || "Idle";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const activeCount = wf?.summary.active ?? 0;
  const [voiceOut, setVoiceOut] = useState(false);
  // Agent master switches (OFF by default → token saving). Flip on to activate.
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [togBusy, setTogBusy] = useState("");
  useEffect(() => { getAgentToggles().then((r) => setEnabled(r.enabled || {})).catch(() => {}); }, []);
  const toggleAgent = async (id: string) => {
    const next = !enabled[id]; setTogBusy(id); setEnabled((e) => ({ ...e, [id]: next }));
    try { await setAgentEnabled(id, next); } catch { setEnabled((e) => ({ ...e, [id]: !next })); } finally { setTogBusy(""); }
  };

  const send = async (text: string, mention: string, img: ImgAtt | null) => {
    const t = text.trim();
    if ((!t && !img) || busy) return;
    setMsgs((m) => [...m, { id: MID++, role: "founder", text: t, ts: Date.now(), image: img?.preview }]);
    setBusy(true);
    try {
      const history: AgentChatTurn[] = msgs.slice(-10).map((m) => ({ role: m.role, name: m.name, text: m.text }));
      const r = await chatSendApi(t || "Analyze this image.", { history, mentionId: mention, imageBase64: img?.base64, imageType: img?.type });
      setMsgs((m) => [...m, ...r.messages.map((sm) => fromServer(sm, MID++))]);
      if (voiceOut) { const spoken = r.messages.filter((x) => x.role === "agent").map((x) => x.text).join(". "); if (spoken) speakReply(spoken); }
    } catch {
      setMsgs((m) => [...m, { id: MID++, role: "agent", agentId: "ceo", name: "AI CEO / Orchestrator", text: "Couldn't reach the team right now — check the backend.", ts: Date.now() }]);
    } finally { setBusy(false); }
  };
  const react = (mid: number, e: string) => setReacts((r) => ({ ...r, [mid]: { ...(r[mid] || {}), [e]: (r[mid]?.[e] || 0) + 1 } }));

  // Approve / Reject a task card — runs the REAL backend action, then swaps in
  // the decided card (with its result / diff / live links).
  const [actBusy, setActBusy] = useState<string | null>(null);
  // Watch a background job (writing an article takes minutes) until the backend
  // flips it off "running", pulling in the agent's follow-up message when it
  // lands. Polling, not a blocked request — the browser stays usable.
  const watchJob = (sid: string) => {
    const started = Date.now();
    const tick = async () => {
      if (Date.now() - started > 15 * 60 * 1000) return; // give up after 15 min
      const r = await chatHistoryApi(to || "all").catch(() => null);
      if (!r) { setTimeout(tick, 8000); return; }
      setMsgs(r.messages.map((m, i) => fromServer(m, MID++ + i)));
      const job = r.messages.find((m) => m.id === sid);
      if (job && job.actionStatus === "running") setTimeout(tick, 5000);
    };
    setTimeout(tick, 5000);
  };

  const act = async (m: Msg, decision: "approve" | "reject") => {
    if (!m.sid || actBusy) return;
    setActBusy(m.sid);
    try {
      const r = await chatActApi(m.sid, decision);
      if (r.ok && r.msg) {
        setMsgs((all) => all.map((x) => (x.sid === m.sid ? { ...x, card: r.msg!.card, actionStatus: r.msg!.actionStatus, actionResult: r.msg!.actionResult } : x)));
        if (r.running && m.sid) watchJob(m.sid);
      }
      else if (!r.ok) setMsgs((all) => [...all, { id: MID++, role: "agent", agentId: m.agentId, name: m.name, text: `⚠ ${r.message || "Action failed."}`, ts: Date.now() }]);
    } catch {
      setMsgs((all) => [...all, { id: MID++, role: "agent", agentId: "ceo", name: "AI CEO / Orchestrator", text: "⚠ Couldn't execute the action — check the backend.", ts: Date.now() }]);
    } finally { setActBusy(null); }
  };

  const convList = members.filter((a) => convTab === "All" || (convTab === "Unread" && statusOf(a.id) === "Active") || (convTab === "Mentions" && false));
  const selName = to ? nameFor(to) : "AI Workforce";
  const selSub = to ? (members.find((a) => a.id === to)?.role || "") : `Orchestrating ${members.length} agents`;
  const SelIcon = to ? iconFor(to) : Users;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr_300px]">
      {/* ===== LEFT: conversation list ===== */}
      <aside className="hidden lg:flex flex-col border-r border-ink-800 min-h-0">
        <div className="p-3 space-y-2.5 border-b border-ink-800 shrink-0">
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input placeholder="Search conversations…" className="w-full rounded-xl border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
          <button className="w-full inline-flex items-center justify-between rounded-lg border border-ink-700 px-3 h-8 text-[11px] text-slate-400">All Conversations <ChevronDown className="w-3 h-3" /></button>
          <div className="flex gap-1">
            {(["All", "Unread", "Mentions"] as const).map((t) => {
              const n = t === "All" ? members.length : t === "Unread" ? activeCount : 0;
              return <button key={t} onClick={() => setConvTab(t)} className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold ${convTab === t ? "bg-brand-600/15 text-brand-300" : "text-slate-500 hover:text-slate-300"}`}>{t} <span className={`text-[9px] px-1 rounded ${convTab === t ? "bg-brand-500/20" : "bg-ink-800"}`}>{n}</span></button>;
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <button onClick={() => setTo("")} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-l-2 ${to === "" ? "bg-ink-900/60 border-brand-500" : "border-transparent hover:bg-ink-900/40"}`}>
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center shrink-0"><Users className="w-4 h-4 text-white" /></span>
            <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-white">All Agents</div><div className="text-[10px] text-slate-500 truncate">Group · auto-routes to the right agent</div></div>
          </button>
          {convList.map((a) => {
            const Icon = AGENT_ICONS[a.icon] || Sparkles; const w = wfA(a.id); const on = (w?.status || "Idle") === "Active";
            return (
              <button key={a.id} onClick={() => setTo(a.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-l-2 ${to === a.id ? "bg-ink-900/60 border-brand-500" : "border-transparent hover:bg-ink-900/40"}`}>
                <span className="relative w-9 h-9 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-4 h-4" /><span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-ink-950 ${on ? "bg-emerald-400" : "bg-slate-500"}`} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><div className="text-[12px] font-bold text-white truncate">{a.name}</div><div className="text-[9px] text-slate-600 shrink-0">{w?.lastActive || ""}</div></div>
                  <div className="text-[10px] text-slate-500 truncate">{w?.currentTask || a.role}</div>
                </div>
              </button>
            );
          })}
          <button className="w-full text-center py-3 text-[11px] text-brand-400 font-semibold hover:underline">View Archived Conversations →</button>
        </div>
      </aside>

      {/* ===== CENTER: chat ===== */}
      <section className="flex flex-col min-h-0 min-w-0">
        <div className="h-14 px-4 border-b border-ink-800 flex items-center gap-3 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><SelIcon className="w-4 h-4" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13px] font-bold text-white truncate">{selName}</div><div className="text-[10px] text-slate-500 truncate">{selSub}</div></div>
          <button onClick={() => prefill("Create a task: ")} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-ink-700 text-slate-300 text-[11px] font-semibold hover:bg-ink-800"><Plus className="w-3.5 h-3.5" /> Create Task</button>
          <button className="w-8 h-8 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:bg-ink-800"><MoreHorizontal className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          <div className="flex items-center gap-3 text-[10px] text-slate-600"><div className="flex-1 h-px bg-ink-800" />Today · {today}<div className="flex-1 h-px bg-ink-800" /></div>
          {msgs.length === 0 && (
            <div className="max-w-lg mx-auto text-center py-8">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center mx-auto mb-3"><MessageSquare className="w-6 h-6 text-white" /></span>
              <div className="text-sm font-bold text-white">Talk to your AI workforce</div>
              <p className="text-[12px] text-slate-500 mt-1">Post a message and the right agent answers — grounded in your live site data. Pick a member on the left to address one directly, or keep it on All Agents to auto-route.</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {QUICK_PROMPTS.map((p) => <button key={p} onClick={() => send(p, to, null)} className="text-[11px] px-3 py-1.5 rounded-full border border-ink-700 text-slate-300 hover:bg-ink-800 hover:border-brand-400">{p}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m) => {
            const time = new Date(m.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            if (m.role === "founder") return (
              <div key={m.id} className="flex flex-col items-end"><div className="max-w-[75%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.image} alt="attached" className="rounded-lg mb-2 max-h-40 w-auto" />}{m.text}</div><div className="text-[9px] text-slate-600 mt-0.5 mr-1">{time}</div></div>
            );
            const Icon = iconFor(m.agentId || "ceo"); const rx = reacts[m.id] || {};
            return (
              <div key={m.id} className="flex gap-2.5 max-w-[82%]">
                <span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Icon className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-[11px] font-bold text-white">{m.name}</span><span className="text-[9px] text-slate-600">{time}</span>{m.agentId === "ceo" && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300">BROADCAST</span>}</div>
                  <Steps steps={m.steps || []} />
                  {m.card ? (
                    <TaskCard msg={m} busy={actBusy === m.sid} onAct={(d) => act(m, d)} />
                  ) : (
                    <div className="rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</div>
                  )}
                  <div className="flex items-center gap-1 mt-1.5">
                    {REACTIONS.map((e) => (
                      <button key={e} onClick={() => react(m.id, e)} className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[11px] border ${rx[e] ? "border-brand-500/40 bg-brand-500/10 text-brand-200" : "border-ink-800 text-slate-500 hover:border-ink-700"}`}>{e}{rx[e] ? <span className="text-[10px]">{rx[e]}</span> : null}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {busy && <div className="flex gap-2.5"><span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">An agent is replying…</div></div>}
          <div ref={endRef} />
        </div>

        <ChatInput members={members} busy={busy} mentionId={to} setMentionId={setTo} statusOf={statusOf} seed={seed} onSend={(text, img) => send(text, to, img)} placeholder="Type a message… (auto-routes to the right agent)" voiceOut={voiceOut} onToggleVoiceOut={() => setVoiceOut((v) => { if (v) stopSpeaking(); return !v; })} />
      </section>

      {/* ===== RIGHT: overview + announcements + quick actions ===== */}
      <aside className="hidden lg:block border-l border-ink-800 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Team Overview</div><span className="text-[10px] text-brand-400">View All →</span></div>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {([["Active", wf?.summary.active, "text-emerald-400"], ["Idle", wf?.summary.idle, "text-amber-400"], ["Live", wf?.summary.live, "text-sky-400"], ["Off", wf?.summary.scaffolded, "text-slate-400"]] as [string, number | undefined, string][]).map(([l, v, c]) => (
                <div key={l} className="text-center"><div className={`text-base font-extrabold ${c}`}>{v ?? "—"}</div><div className="text-[9px] text-slate-500">{l}</div></div>
              ))}
            </div>
            <ul className="space-y-1.5">
              {members.map((a) => { const Icon = AGENT_ICONS[a.icon] || Sparkles; const on = !!enabled[a.id];
                return <li key={a.id} className="flex items-center gap-2"><span className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 ${on ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-800 text-slate-500"}`}><Icon className="w-3 h-3" /></span><span className="text-[11px] text-slate-300 flex-1 truncate">{a.name}</span><span className={`text-[9px] ${on ? "text-emerald-400" : "text-slate-500"}`}>{on ? "On" : "Off"}</span>
                  <button onClick={() => toggleAgent(a.id)} disabled={togBusy === a.id} role="switch" aria-checked={on} title={on ? "Switch off" : "Switch on"} className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-ink-700"}`}><span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${on ? "translate-x-[15px]" : "translate-x-0.5"}`} /></button>
                </li>;
              })}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Recent Announcements</div><span className="text-[10px] text-brand-400">View All →</span></div>
            <ul className="space-y-2">
              {([["Site health update", `Health ${wf?.kpis.healthScore ?? "—"}/100 · ${wf?.kpis.pendingApprovals ?? 0} fixes queued`, "emerald", "New"], ["SEO crawl complete", `On-page SEO ${wf?.kpis.seoScore ?? "—"}/100`, "violet", "Info"], ["Content pipeline", `${wf?.kpis.contentPublished ?? 0} published · ${wf?.kpis.contentDrafts ?? 0} drafts`, "amber", "Report"]] as [string, string, string, string][]).map(([t, b, tone, badge]) => (
                <li key={t} className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-950/40 p-2.5">
                  <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : tone === "violet" ? "bg-violet-500/15 text-violet-300" : "bg-amber-500/15 text-amber-300"}`}><Megaphone className="w-3.5 h-3.5" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-white truncate">{t}</span><span className="text-[8px] font-bold px-1 py-0.5 rounded bg-ink-800 text-slate-400 shrink-0">{badge}</span></div><div className="text-[10px] text-slate-500 truncate">{b}</div></div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[12px] font-bold text-white mb-2">Quick Actions</div>
            <div className="grid grid-cols-2 gap-1.5">
              <QA icon={Megaphone} label="Broadcast Message" onClick={() => { setTo(""); prefill("Team — broadcast update: "); }} />
              <QA icon={Plus} label="Create Announcement" onClick={() => send("Draft a short team announcement based on our current priorities.", "ceo", null)} />
              <QA icon={Sparkles} label="Send to AI CEO" onClick={() => setTo("ceo")} />
              <QA icon={Users} label="Message All Agents" onClick={() => setTo("")} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function QA({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2.5 text-left hover:bg-ink-800 hover:border-brand-400"><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3.5 h-3.5" /></span><span className="text-[10px] font-semibold text-slate-300 leading-tight">{label}</span></button>;
}

/* --------------------------- Workflow Updates (real) --------------------------- */

/* --------------------------- Agent Conversations (real) --------------------------- */

type Topic = { id: string; title: string; lead: string; icon: string; preview: string; goal: string; opener: string; priority: "High" | "Medium" | "Low"; participants: string[] };
const TOPICS: Topic[] = [
  { id: "content", title: "Content Strategy Discussion", lead: "ceo", icon: "Crown", preview: "Plan & prioritize high-impact content", goal: "Plan and prioritize high-impact content for the next 2 weeks across all channels.", opener: "Team, let's align on content priorities for the next 2 weeks. Based on our data, what should we focus on?", priority: "High", participants: ["ceo", "marketing", "seo", "copywriter", "publisher", "distribution", "intel", "marketplace"] },
  { id: "seo-kw", title: "SEO Keyword Research Sync", lead: "seo", icon: "Search", preview: "Find high-value keyword opportunities", goal: "Identify the highest-value keyword opportunities and their traffic potential.", opener: "@seo what are the top keyword opportunities right now and the potential traffic for each?", priority: "High", participants: ["ceo", "seo", "copywriter", "marketing"] },
  { id: "yacht-campaign", title: "Yacht Rental Campaign Plan", lead: "marketing", icon: "Megaphone", preview: "Channels, budget split, priorities", goal: "Draft a yacht rental campaign — channels, budget split and priorities.", opener: "@marketing draft a yacht rental campaign plan — which channels, budget split and priorities?", priority: "High", participants: ["ceo", "marketing", "distribution", "copywriter"] },
  { id: "outreach", title: "Provider Outreach Update", lead: "sales", icon: "Handshake", preview: "Status of outreach & hot leads", goal: "Review provider outreach progress and the hottest leads.", opener: "@sales what's the status of provider outreach and which leads are hottest right now?", priority: "Medium", participants: ["ceo", "sales", "marketplace", "onboarding"] },
  { id: "weekly", title: "Weekly Performance Review", lead: "ceo", icon: "Crown", preview: "What's up, what's down, what to fix", goal: "Review this week's performance and decide what to fix next.", opener: "@ceo give me this week's performance review — what's up, what's down, and what should we fix?", priority: "Medium", participants: ["ceo", "marketing", "seo", "marketplace"] },
  { id: "tech-seo", title: "Technical SEO Audit", lead: "seo", icon: "Search", preview: "Top fixes from the latest crawl", goal: "Summarize the technical SEO audit and prioritize the top fixes.", opener: "@seo summarize the technical SEO audit findings and the top fixes we should prioritize.", priority: "High", participants: ["ceo", "seo", "publisher"] },
  { id: "publishing", title: "Content Publishing Plan", lead: "publisher", icon: "Send", preview: "What's scheduled next week", goal: "Lay out the publishing plan and schedule for next week.", opener: "@publisher what's the publishing plan for next week and what's already scheduled?", priority: "Medium", participants: ["ceo", "publisher", "copywriter", "distribution"] },
  { id: "competitive", title: "Competitive Analysis Update", lead: "intel", icon: "Radar", preview: "What rivals are doing", goal: "Surface competitor moves we should respond to.", opener: "@intel what are competitors doing right now that we should respond to?", priority: "Medium", participants: ["ceo", "intel", "marketing", "seo"] },
];

function AgentConversations({ wf, tasks }: { wf: Workforce | null; tasks: OrchTask[] }) {
  const [selId, setSelId] = useState("content");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [to, setTo] = useState("");
  const [reacts, setReacts] = useState<Record<string, Record<string, number>>>({});
  const [convTab, setConvTab] = useState<"All" | "Direct" | "Group">("All");
  const endRef = useRef<HTMLDivElement>(null);
  const topic = TOPICS.find((t) => t.id === selId) || TOPICS[0];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const pickTopic = (id: string) => { setSelId(id); setMsgs([]); setReacts({}); setTo(""); };

  // Persisted topic history — each topic thread lives in Mongo under
  // "topic:<id>", so the conversation survives reloads and redeploys instead
  // of resetting to the template opener.
  useEffect(() => {
    let off = false;
    chatHistoryApi(`topic:${selId}`).then((r) => {
      if (off) return;
      setMsgs(r.messages.map((m, i) => fromServer(m, MID++ + i)));
    }).catch(() => {});
    return () => { off = true; };
  }, [selId]);

  const statusOf = (id: string) => wf?.agents.find((a) => a.id === id)?.status || "Idle";
  const react = (mid: number, e: string) => setReacts((r) => ({ ...r, [mid]: { ...(r[mid] || {}), [e]: (r[mid]?.[e] || 0) + 1 } }));

  const [voiceOut, setVoiceOut] = useState(false);
  // "Create Task" prefill — overrides the topic opener seed until used.
  const [seedOverride, setSeedOverride] = useState<{ text: string; key: string } | null>(null);
  const send = async (text: string, mention: string, img: ImgAtt | null) => {
    const t = text.trim();
    if ((!t && !img) || busy) return;
    const isOpener = t === topic.opener;
    setMsgs((m) => [...m, { id: MID++, role: "founder", text: t, ts: Date.now(), image: img?.preview }]);
    setBusy(true);
    try {
      const history: AgentChatTurn[] = msgs.slice(-10).map((m) => ({ role: m.role, name: m.name, text: m.text }));
      // Persisted path — the same engine as the Team Inbox, keyed to this
      // topic's own conversation, so nothing is lost on reload.
      const r = await chatSendApi(t || "Analyze this image.", { history, conversation: `topic:${selId}`, mentionId: mention || (isOpener ? topic.lead : ""), imageBase64: img?.base64, imageType: img?.type });
      setMsgs((m) => [...m, ...r.messages.map((sm) => fromServer(sm, MID++))]);
      const last = r.messages[r.messages.length - 1];
      if (voiceOut && last?.text) speakReply(last.text);
    } catch {
      setMsgs((m) => [...m, { id: MID++, role: "agent", agentId: "ceo", name: "AI CEO / Orchestrator", text: "Couldn't reach the team right now — check the LLM key/quota.", ts: Date.now() }]);
    } finally { setBusy(false); }
  };

  const taskTone = (s: string) => s === "Completed" ? "bg-emerald-500/15 text-emerald-300" : s === "In Progress" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300";
  const relatedTasks = tasks.slice(0, 5);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_1fr_300px]">
      {/* LEFT: topic list */}
      <aside className="hidden lg:flex flex-col border-r border-ink-800 min-h-0">
        <div className="p-3 space-y-2.5 border-b border-ink-800 shrink-0">
          <div className="relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input placeholder="Search conversations…" className="w-full rounded-xl border border-ink-700 bg-ink-900 pl-8 pr-3 h-9 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
          <div className="flex gap-1">
            {(["All", "Direct", "Group"] as const).map((t) => { const n = t === "All" ? TOPICS.length : t === "Group" ? TOPICS.length : 0;
              return <button key={t} onClick={() => setConvTab(t)} className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold ${convTab === t ? "bg-brand-600/15 text-brand-300" : "text-slate-500 hover:text-slate-300"}`}>{t} <span className={`text-[9px] px-1 rounded ${convTab === t ? "bg-brand-500/20" : "bg-ink-800"}`}>{n}</span></button>;
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {TOPICS.map((t) => { const Icon = AGENT_ICONS[t.icon] || Sparkles;
            return (
              <button key={t.id} onClick={() => pickTopic(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-l-2 ${selId === t.id ? "bg-ink-900/60 border-brand-500" : "border-transparent hover:bg-ink-900/40"}`}>
                <span className="w-9 h-9 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1"><div className="text-[12px] font-bold text-white truncate">{t.title}</div><div className="text-[10px] text-slate-500 truncate">{t.preview}</div></div>
              </button>
            );
          })}
          <button className="w-full text-center py-3 text-[11px] text-brand-400 font-semibold hover:underline">View Archived Conversations →</button>
        </div>
      </aside>

      {/* CENTER: discussion */}
      <section className="flex flex-col min-h-0 min-w-0">
        <div className="h-14 px-4 border-b border-ink-800 flex items-center gap-3 shrink-0">
          <span className="w-9 h-9 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Users className="w-4 h-4" /></span>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><div className="text-[13px] font-bold text-white truncate">{topic.title}</div><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">Group</span></div><div className="text-[10px] text-slate-500 truncate">{topic.participants.length} agents in this conversation</div></div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 border border-ink-700 rounded-lg px-2 h-8"><Users className="w-3.5 h-3.5" /> {topic.participants.length}</span>
          <button className="w-8 h-8 grid place-items-center rounded-lg border border-ink-700 text-slate-400 hover:bg-ink-800"><MoreHorizontal className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="text-[12px] font-semibold text-white">Goal: {topic.goal}</div><div className="text-[10px] text-slate-500 mt-0.5">Created by AI CEO / Orchestrator · {today}</div></div>
          {msgs.length === 0 && (
            <div className="text-center py-6"><p className="text-[12px] text-slate-500">Hit <span className="text-brand-300 font-semibold">Send</span> to start the discussion — the team replies for real from your live data.</p></div>
          )}
          {msgs.map((m) => {
            const time = new Date(m.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            if (m.role === "founder") return (
              <div key={m.id} className="flex flex-col items-end"><div className="max-w-[75%] rounded-2xl rounded-br-md bg-brand-600 text-white px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.image} alt="attached" className="rounded-lg mb-2 max-h-40 w-auto" />}{m.text}</div><div className="text-[9px] text-slate-600 mt-0.5 mr-1">{time}</div></div>
            );
            const Icon = iconFor(m.agentId || "ceo"); const rx = reacts[m.id] || {};
            return (
              <div key={m.id} className="flex gap-2.5 max-w-[82%]">
                <span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0 mt-0.5"><Icon className="w-4 h-4" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-[11px] font-bold text-white">{m.name}</span><span className="text-[9px] text-slate-600">{time}</span></div>
                  <div className="rounded-2xl rounded-tl-md bg-ink-800 text-slate-200 px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.text}</div>
                  <div className="flex items-center gap-1 mt-1.5">{REACTIONS.map((e) => <button key={e} onClick={() => react(m.id, e)} className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[11px] border ${rx[e] ? "border-brand-500/40 bg-brand-500/10 text-brand-200" : "border-ink-800 text-slate-500 hover:border-ink-700"}`}>{e}{rx[e] ? <span className="text-[10px]">{rx[e]}</span> : null}</button>)}</div>
                </div>
              </div>
            );
          })}
          {busy && <div className="flex gap-2.5"><span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin" /></span><div className="rounded-2xl bg-ink-800 px-3.5 py-2.5 text-[12px] text-slate-500">An agent is replying…</div></div>}
          <div ref={endRef} />
        </div>

        <ChatInput members={AGENTS} busy={busy} mentionId={to} setMentionId={setTo} statusOf={statusOf} seed={seedOverride || { text: topic.opener, key: selId }} onSend={(text, img) => send(text, to, img)} placeholder={`Message ${topic.title}… (@ to mention, 📎 to attach an image)`} voiceOut={voiceOut} onToggleVoiceOut={() => setVoiceOut((v) => { if (v) stopSpeaking(); return !v; })} />
      </section>

      {/* RIGHT: details + participants + related tasks */}
      <aside className="hidden lg:block border-l border-ink-800 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Conversation Details</div><span className="text-[10px] text-brand-400">Edit</span></div>
            <div className="space-y-2">
              {([["Topic", topic.title], ["Created By", "AI CEO / Orchestrator"], ["Created On", `${today} 9:30 AM`]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2 text-[11px]"><span className="text-slate-500">{k}</span><span className="font-semibold text-white text-right">{v}</span></div>
              ))}
              <div className="flex items-center justify-between text-[11px]"><span className="text-slate-500">Priority</span><span className={`font-bold px-1.5 py-0.5 rounded ${topic.priority === "High" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>{topic.priority}</span></div>
              <div className="flex items-center justify-between text-[11px]"><span className="text-slate-500">Status</span><span className="inline-flex items-center gap-1 text-emerald-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Active</span></div>
              <div className="text-[11px]"><div className="text-slate-500 mb-0.5">Description</div><p className="text-slate-300 leading-snug">{topic.goal}</p></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Participants ({topic.participants.length})</div><span className="text-[10px] text-brand-400 inline-flex items-center gap-0.5"><Plus className="w-3 h-3" /> Add</span></div>
            <ul className="space-y-1.5">
              {topic.participants.map((id) => { const a = AGENTS.find((x) => x.id === id); if (!a) return null; const Icon = AGENT_ICONS[a.icon] || Sparkles; const on = statusOf(id) === "Active";
                return <li key={id} className="flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Icon className="w-3 h-3" /></span><span className="text-[11px] text-slate-300 flex-1 truncate">{a.name}</span>{id === "ceo" && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-brand-500/15 text-brand-300">Admin</span>}<span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-slate-600"}`} /></li>;
              })}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2"><div className="text-[12px] font-bold text-white">Related Tasks ({relatedTasks.length})</div><span className="text-[10px] text-brand-400">View All →</span></div>
            <ul className="space-y-2">
              {relatedTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 rounded-xl border border-ink-800 bg-ink-950/40 p-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{t.task}</div><div className="text-[9px] text-slate-600 truncate">{t.agent}</div></div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${taskTone(t.status)}`}>{t.status}</span>
                </li>
              ))}
              {relatedTasks.length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No related tasks.</li>}
            </ul>
            <button onClick={() => setSeedOverride({ text: "Create a task: ", key: "ct" + MID++ })} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-bold"><Plus className="w-3.5 h-3.5" /> Create Task</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

const WF_STATUS_TONE: Record<string, string> = { "In Progress": "bg-amber-500/15 text-amber-300", Started: "bg-sky-500/15 text-sky-300", Completed: "bg-emerald-500/15 text-emerald-300", Blocked: "bg-rose-500/15 text-rose-300", Failed: "bg-rose-600/20 text-rose-300", Scheduled: "bg-slate-500/15 text-slate-300" };
const WF_BAR = (s: string) => s === "Completed" ? "from-emerald-500 to-emerald-400" : s === "Blocked" || s === "Failed" ? "from-rose-500 to-rose-400" : "from-brand-500 to-violet-500";
const HEALTH_COLORS = { healthy: "#34d399", atRisk: "#fbbf24", blocked: "#f43f5e", failed: "#fb7185" };

function WfTrend({ n, unit = "vs yesterday" }: { n: number; unit?: string }) {
  if (!n) return <span className="text-[10px] text-slate-500">No change</span>;
  const up = n > 0;
  return <span className={`text-[10px] ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? "▲" : "▼"} {Math.abs(n)}% {unit}</span>;
}

function WorkflowUpdates() {
  const [data, setData] = useState<Workflows | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Started" | "In Progress" | "Completed" | "Blocked" | "Failed">("All");
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("All Types");
  const [ownerF, setOwnerF] = useState("All Owners");
  const [prioF, setPrioF] = useState("All Priority");
  const [scope, setScope] = useState("All Workflows");
  const [range, setRange] = useState("All time");
  const [page, setPage] = useState(1);
  const PER = 8;

  const load = async () => { setLoading(true); try { setData(await getWorkflows()); } finally { setLoading(false); } };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const all = data?.workflows || [];
  const types = useMemo(() => Array.from(new Set(all.map((w) => w.type))), [all]);
  const owners = useMemo(() => Array.from(new Set(all.map((w) => w.owner))), [all]);

  const rows = useMemo(() => {
    const now = Date.now();
    const rangeMs = range === "Today" ? 86400000 : range === "Last 7 days" ? 7 * 86400000 : 0;
    return all.filter((w) => {
      if (filter !== "All" && w.status !== filter) return false;
      if (scope === "Active only" && (w.status === "Completed" || w.status === "Failed")) return false;
      if (scope === "Completed" && w.status !== "Completed") return false;
      if (typeF !== "All Types" && w.type !== typeF) return false;
      if (ownerF !== "All Owners" && w.owner !== ownerF) return false;
      if (prioF !== "All Priority" && w.priority !== prioF) return false;
      if (rangeMs && now - new Date(w.lastUpdateAt).getTime() > rangeMs) return false;
      if (q && !(`${w.title} ${w.owner} ${w.type} ${w.nextStep}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [all, filter, scope, typeF, ownerF, prioF, range, q]);

  useEffect(() => { setPage(1); }, [filter, scope, typeF, ownerF, prioF, range, q]);
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const pageRows = rows.slice((page - 1) * PER, page * PER);
  const start = rows.length === 0 ? 0 : (page - 1) * PER + 1;
  const end = Math.min(rows.length, page * PER);

  const k = data?.kpis;
  const c = k?.counts;
  const cards = [
    { label: "Active Workflows", value: k?.active ?? 0, trend: k?.activeTrend ?? 0, icon: GitBranch, tone: "brand" },
    { label: "Completed (Today)", value: k?.completedToday ?? 0, trend: k?.completedTrend ?? 0, icon: CheckCircle2, tone: "emerald" },
    { label: "In Progress", value: k?.inProgress ?? 0, trend: 0, icon: RefreshCw, tone: "sky" },
    { label: "Blocked", value: k?.blocked ?? 0, trend: 0, icon: AlertTriangle, tone: "rose" },
    { label: "Avg. Completion Time", value: k?.avgCompletion ?? "—", trend: 0, icon: Clock, tone: "violet" },
  ];
  const tabs = [
    { key: "All", n: c?.total ?? 0 }, { key: "Started", n: c?.started ?? 0 }, { key: "In Progress", n: c?.inProgress ?? 0 },
    { key: "Completed", n: c?.completed ?? 0 }, { key: "Blocked", n: c?.blocked ?? 0 }, { key: "Failed", n: c?.failed ?? 0 },
  ] as const;

  const h = data?.health;
  const healthSegs = h && h.total ? [
    { pct: (h.healthy / h.total) * 100, color: HEALTH_COLORS.healthy },
    { pct: (h.atRisk / h.total) * 100, color: HEALTH_COLORS.atRisk },
    { pct: (h.blocked / h.total) * 100, color: HEALTH_COLORS.blocked },
    { pct: (h.failed / h.total) * 100, color: HEALTH_COLORS.failed },
  ] : [];
  const healthLegend = h ? [
    { label: "Healthy", count: h.healthy, color: HEALTH_COLORS.healthy },
    { label: "At Risk", count: h.atRisk, color: HEALTH_COLORS.atRisk },
    { label: "Blocked", count: h.blocked, color: HEALTH_COLORS.blocked },
    { label: "Failed", count: h.failed, color: HEALTH_COLORS.failed },
  ] : [];
  const maxOwner = Math.max(1, ...(data?.topOwners || []).map((o) => o.count));

  const exportCsv = () => {
    const head = ["Workflow", "Type", "Status", "Progress", "Owner", "Last Update", "Next Step", "Priority"];
    const body = rows.map((w) => [w.title, w.type, w.status, `${w.progress}%`, w.owner, w.lastUpdate, w.nextStep, w.priority]);
    const csv = [head, ...body].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "workflow-updates.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h2 className="text-lg font-bold text-white">Workflow Updates</h2><p className="text-[12px] text-slate-500">Track real-time updates and progress across all automated workflows.</p></div>
        <div className="flex items-center gap-2">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2.5 text-[12px] text-slate-300 focus:outline-none"><option>All Workflows</option><option>Active only</option><option>Completed</option></select>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-ink-700 bg-ink-900 h-9 px-2.5 text-[12px] text-slate-300 focus:outline-none"><option>All time</option><option>Today</option><option>Last 7 days</option></select>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((cd) => { const Ico = cd.icon; return (
          <FadeUp key={cd.label}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[11px] text-slate-500 leading-tight">{cd.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${cd.tone === "brand" ? "bg-brand-600/15 text-brand-300" : cd.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : cd.tone === "sky" ? "bg-sky-500/15 text-sky-300" : cd.tone === "rose" ? "bg-rose-500/15 text-rose-300" : "bg-violet-500/15 text-violet-300"}`}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-2 text-2xl font-extrabold text-white">{cd.value}</div><div className="mt-0.5"><WfTrend n={cd.trend} /></div></div></FadeUp>
        ); })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center gap-1 border-b border-ink-800 mb-3 overflow-x-auto">
              {tabs.map((t) => <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${filter === t.key ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{t.key} <span className={`text-[9px] px-1 rounded ${filter === t.key ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{t.n}</span></button>)}
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search workflows…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-8 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
              <select value={ownerF} onChange={(e) => setOwnerF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Owners</option>{owners.map((o) => <option key={o}>{o}</option>)}</select>
              <select value={prioF} onChange={(e) => setPrioF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Priority</option><option>High</option><option>Medium</option><option>Low</option></select>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Workflow</th><th className="font-semibold">Type</th><th className="font-semibold">Status</th><th className="font-semibold">Progress</th><th className="font-semibold">Owner / Agent</th><th className="font-semibold">Last Update</th><th className="font-semibold">Next Step</th><th className="font-semibold">Priority</th></tr></thead>
                <tbody>
                  {pageRows.map((w) => { const Ico = TYPE_ICON[w.type] || GitBranch; const OIco = iconFor(w.ownerId);
                    return (
                      <tr key={w.id} className="border-b border-ink-900 hover:bg-ink-900/40">
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5" /></span><div className="text-[12px] font-bold text-white truncate max-w-[200px]">{w.title}</div></div></td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{w.type}</td>
                        <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${WF_STATUS_TONE[w.status]}`}>{w.status}</span></td>
                        <td><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className={`h-full bg-gradient-to-r ${WF_BAR(w.status)}`} initial={{ width: 0 }} animate={{ width: `${w.progress}%` }} transition={{ duration: 0.6 }} /></div><span className="text-[10px] text-slate-400 tabular-nums">{w.progress}%</span></div></td>
                        <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300"><span className="w-5 h-5 rounded bg-brand-600/15 text-brand-300 grid place-items-center"><OIco className="w-3 h-3" /></span>{w.owner}</span></td>
                        <td className="text-[10px] text-slate-500 whitespace-nowrap">{w.lastUpdate}</td>
                        <td className="text-[11px] text-slate-400 truncate max-w-[150px]">{w.nextStep}</td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIO_TONE[w.priority]}`}>{w.priority}</span></td>
                      </tr>
                    );
                  })}
                  {!loading && pageRows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[12px] text-slate-500">No workflows match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {rows.length} updates</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">‹</button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">›</button>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="space-y-5">
          <FadeUp>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between mb-3"><div className="text-[12px] font-bold text-white">Workflow Activity Feed</div><span className="text-[10px] text-brand-400">View All →</span></div>
              <ul className="space-y-2.5">
                {(data?.activity || []).map((a) => { const Ico = a.status === "failure" ? AlertTriangle : a.status === "info" ? RefreshCw : CheckCircle2; const tone = a.status === "failure" ? "text-rose-300 bg-rose-500/15" : a.status === "info" ? "text-sky-300 bg-sky-500/15" : "text-emerald-300 bg-emerald-500/15";
                  return (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${tone}`}><Ico className="w-3.5 h-3.5" /></span>
                      <div className="min-w-0 flex-1"><div className="text-[11px] font-bold text-white truncate">{a.title}</div><div className="text-[10px] text-slate-500 truncate capitalize">{a.sub}</div></div>
                      <span className="text-[9px] text-slate-600 shrink-0 whitespace-nowrap">{a.time}</span>
                    </li>
                  );
                })}
                {(data?.activity || []).length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No agent activity yet.</li>}
              </ul>
              <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline">View All Activity →</button>
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="text-[12px] font-bold text-white mb-3">Workflow Health</div>
              <div className="flex items-center gap-3">
                <MiniDonut segments={healthSegs} total={h?.total ?? 0} label="Total" />
                <ul className="space-y-1.5 flex-1">{healthLegend.map((l) => <li key={l.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: l.color }} /><span className="text-slate-400 flex-1">{l.label}</span><span className="text-white font-bold">{l.count}</span><span className="text-slate-600">({h && h.total ? Math.round((l.count / h.total) * 100) : 0}%)</span></li>)}</ul>
              </div>
              <button className="mt-3 w-full text-center text-[11px] text-brand-400 font-semibold hover:underline">View Health Dashboard →</button>
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between mb-3"><div className="text-[12px] font-bold text-white">Top Workflow Owners</div><span className="text-[10px] text-brand-400">View All →</span></div>
              <ul className="space-y-2.5">
                {(data?.topOwners || []).map((o) => { const Ico = iconFor(o.id);
                  return (
                    <li key={o.name} className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5" /></span>
                      <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-white truncate">{o.name}</div><div className="mt-1 h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-brand-500 to-violet-500" initial={{ width: 0 }} animate={{ width: `${(o.count / maxOwner) * 100}%` }} transition={{ duration: 0.6 }} /></div></div>
                      <span className="text-[12px] font-extrabold text-white shrink-0">{o.count}</span>
                    </li>
                  );
                })}
                {(data?.topOwners || []).length === 0 && <li className="text-[11px] text-slate-500 text-center py-3">No owners yet.</li>}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between mb-3"><div className="text-[12px] font-bold text-white">Automations</div><span className="text-[10px] text-brand-400">Manage →</span></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">Active Automations</span><Zap className="w-3.5 h-3.5 text-amber-300" /></div><div className="text-xl font-extrabold text-white mt-1">{data?.automations.active ?? 0}</div><WfTrend n={data?.automations.activeTrend ?? 0} unit="vs last 7 days" /></div>
                <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3"><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">Success Rate</span><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /></div><div className="text-xl font-extrabold text-white mt-1">{data?.automations.successRate ?? 0}%</div><WfTrend n={data?.automations.successTrend ?? 0} unit="vs last 7 days" /></div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- System Alerts (real) --------------------------- */

const ALERT_SEV_TONE: Record<string, string> = { Critical: "bg-rose-600/20 text-rose-300", High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-sky-500/15 text-sky-300" };
const ALERT_STATUS_TONE: Record<string, string> = { Active: "bg-rose-500/15 text-rose-300", Acknowledged: "bg-sky-500/15 text-sky-300", Resolved: "bg-emerald-500/15 text-emerald-300" };
const alertIcon = (sev: string, status: string) => (status === "Resolved" ? CheckCircle2 : sev === "Low" ? Bell : AlertTriangle);
function fmtDur(min: number) {
  if (!min) return "0 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function Spark({ data, color = "#38bdf8" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return <div className="h-8" />;
  const w = 100, h = 28, min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></svg>;
}

function SystemAlerts() {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [items, setItems] = useState<SystemAlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [systemF, setSystemF] = useState("All Systems");
  const [typeF, setTypeF] = useState("All Alert Types");
  const [ownerF, setOwnerF] = useState("All Owners");
  const [sel, setSel] = useState<SystemAlertItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState("");
  const selRef = useRef<string>("");
  selRef.current = sel?.id || "";

  const loadDetail = async (id: string) => { try { setSel((await getAlertById(id)).alert); } catch { /* ignore */ } };
  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listAlerts({ tab, type: typeF, system: systemF, owner: ownerF, q, page: p, limit: 8 }),
        getAlertStats(),
      ]);
      setItems(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setStats(s);
      const keep = r.items.find((x) => x.id === selRef.current) || r.items[0] || null;
      if (keep) loadDetail(keep.id); else setSel(null);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => reload(1), 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, typeF, systemF, ownerF, q]);
  useEffect(() => { const t = setInterval(() => reload(page), 30000); return () => clearInterval(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, tab, typeF, systemF, ownerF, q]);

  const doAction = async (id: string, action: "acknowledge" | "escalate" | "resolve" | "incident") => {
    setBusy(true); setMenuId("");
    try { const r = await alertAction(id, action); setSel(r.alert); await reload(page); } finally { setBusy(false); }
  };

  const trendStr = (n: number) => (n > 0 ? `▲ ${n}% vs yesterday` : n < 0 ? `▼ ${Math.abs(n)}% vs yesterday` : "No change");
  const cards = [
    { label: "Total Alerts", value: stats?.total ?? 0, sub: trendStr(stats?.trendTotal ?? 0), icon: Bell, tone: "brand" },
    { label: "Critical", value: stats?.critical ?? 0, sub: "Needs action", icon: AlertTriangle, tone: "rose" },
    { label: "High", value: stats?.high ?? 0, sub: "Investigate", icon: AlertTriangle, tone: "amber" },
    { label: "Medium", value: stats?.medium ?? 0, sub: "Monitor", icon: AlertTriangle, tone: "sky" },
    { label: "Low", value: stats?.low ?? 0, sub: "Informational", icon: Bell, tone: "violet" },
  ];
  const tabs = [
    { key: "All", label: "All Alerts", n: stats?.total ?? 0 }, { key: "Critical", label: "Critical", n: stats?.critical ?? 0 },
    { key: "High", label: "High", n: stats?.high ?? 0 }, { key: "Medium", label: "Medium", n: stats?.medium ?? 0 },
    { key: "Low", label: "Low", n: stats?.low ?? 0 }, { key: "Resolved", label: "Resolved", n: stats?.resolved ?? 0 },
  ];
  const SelIco = sel ? alertIcon(sel.severity, sel.status) : AlertTriangle;
  const start = total === 0 ? 0 : (page - 1) * 8 + 1;
  const end = Math.min(total, page * 8);

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-bold text-white">System Alerts</h2><p className="text-[12px] text-slate-500">Monitor system health, performance, and security alerts across the platform.</p></div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((cd) => { const Ico = cd.icon; return (
          <FadeUp key={cd.label}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{cd.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${cd.tone === "brand" ? "bg-brand-600/15 text-brand-300" : cd.tone === "rose" ? "bg-rose-500/15 text-rose-300" : cd.tone === "amber" ? "bg-amber-500/15 text-amber-300" : cd.tone === "sky" ? "bg-sky-500/15 text-sky-300" : "bg-violet-500/15 text-violet-300"}`}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-2 text-2xl font-extrabold text-white">{cd.value}</div><div className={`text-[10px] mt-0.5 ${cd.sub.startsWith("▲") ? "text-rose-400" : cd.sub.startsWith("▼") ? "text-emerald-400" : "text-slate-500"}`}>{cd.sub}</div></div></FadeUp>
        ); })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center gap-1 border-b border-ink-800 mb-3 overflow-x-auto">
              {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${tab === t.key ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{t.label} <span className={`text-[9px] px-1 rounded ${tab === t.key ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{t.n}</span></button>)}
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alerts…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-8 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={systemF} onChange={(e) => setSystemF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Systems</option>{(stats?.systems || []).map((s) => <option key={s}>{s}</option>)}</select>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Alert Types</option>{(stats?.types || []).map((t) => <option key={t}>{t}</option>)}</select>
              <select value={ownerF} onChange={(e) => setOwnerF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Owners</option>{(stats?.owners || []).map((o) => <option key={o}>{o}</option>)}</select>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Alert</th><th className="font-semibold">System / Component</th><th className="font-semibold">Type</th><th className="font-semibold">Severity</th><th className="font-semibold">Status</th><th className="font-semibold">Triggered At</th><th className="font-semibold">Owner</th><th></th></tr></thead>
                <tbody>
                  {items.map((a) => { const Ico = alertIcon(a.severity, a.status);
                    return (
                      <tr key={a.id} onClick={() => loadDetail(a.id)} className={`border-b border-ink-900 cursor-pointer transition-colors ${sel?.id === a.id ? "bg-ink-900/60" : "hover:bg-ink-900/40"}`}>
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${ALERT_SEV_TONE[a.severity]}`}><Ico className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[190px]">{a.title}</div><div className="text-[10px] text-slate-600 truncate max-w-[190px]">{a.message}</div></div></div></td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{a.system}</td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{a.type}</td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ALERT_SEV_TONE[a.severity]}`}>{a.severity}</span></td>
                        <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ALERT_STATUS_TONE[a.status]}`}>{a.status}</span></td>
                        <td className="text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(a.triggeredAt)}</td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{a.owner}</td>
                        <td className="relative pr-2">
                          <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === a.id ? "" : a.id); }} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuId === a.id && (
                            <div className="absolute right-2 top-9 z-30 w-36 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1" onClick={(e) => e.stopPropagation()}>
                              {a.status !== "Acknowledged" && a.status !== "Resolved" && <MenuBtn onClick={() => doAction(a.id, "acknowledge")}>Acknowledge</MenuBtn>}
                              <MenuBtn onClick={() => doAction(a.id, "escalate")}>Escalate</MenuBtn>
                              {a.status !== "Resolved" && <MenuBtn onClick={() => doAction(a.id, "resolve")}>Resolve</MenuBtn>}
                              <MenuBtn onClick={() => doAction(a.id, "incident")}>Create Incident</MenuBtn>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && items.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[12px] text-slate-500">No alerts here — everything looks healthy. 🎉</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} alerts</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">‹</button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">›</button>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            {!sel ? (
              <div className="p-8 text-center text-[12px] text-slate-500">Select an alert to see its details, metrics, activity and actions.</div>
            ) : (
            <>
            <div className="p-4 border-b border-ink-800 flex items-start justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-600">Alert Details</div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ALERT_SEV_TONE[sel.severity]}`}>{sel.severity}</span>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="flex items-start gap-2.5">
                <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${ALERT_SEV_TONE[sel.severity]}`}><SelIco className="w-4.5 h-4.5" /></span>
                <div className="min-w-0"><div className="text-[13px] font-bold text-white">{sel.title}</div><div className="text-[11px] text-slate-500 leading-snug">{sel.message}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {([["System / Component", sel.system], ["Triggered At", fmtDate(sel.triggeredAt)], ["Alert Type", sel.type], ["Last Updated", fmtDate(sel.lastUpdated)], ["Severity", sel.severity], ["Duration", fmtDur(sel.durationMin)], ["Status", sel.status], ["Owner", sel.owner]] as [string, string][]).map(([k, v]) => (
                  <div key={k}><div className="text-[9px] uppercase tracking-wide text-slate-600">{k}</div><div className={`text-[11px] font-semibold ${k === "Severity" ? (sel.severity === "Critical" || sel.severity === "High" ? "text-rose-300" : "text-white") : "text-white"}`}>{v}</div></div>
                ))}
              </div>

              {sel.metrics.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Current Metrics</div>
                  <div className="grid grid-cols-3 gap-2">
                    {sel.metrics.slice(0, 3).map((m, i) => (
                      <div key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-2.5">
                        <div className="text-[9px] text-slate-500 truncate">{m.label}</div>
                        <div className="text-sm font-extrabold text-white">{m.value}{m.unit}</div>
                        <Spark data={sel.sparkline || []} color={i === 0 ? "#f43f5e" : i === 1 ? "#38bdf8" : "#fbbf24"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Recent Activity</div>
                <ul className="space-y-2">
                  {(sel.activity || []).slice(0, 6).map((h, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-1.5 text-slate-300"><span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${h.state.includes("Resolved") ? "bg-emerald-400" : h.state.includes("triggered") || h.state.includes("Re-trig") ? "bg-rose-400" : "bg-amber-400"}`} /><span>{h.state}</span></span>
                      <span className="text-slate-600 whitespace-nowrap shrink-0">{fmtDate(h.at)}</span>
                    </li>
                  ))}
                  {(sel.activity || []).length === 0 && <li className="text-[10px] text-slate-500">No activity recorded.</li>}
                </ul>
                <button className="mt-2 text-[11px] text-brand-400 font-semibold hover:underline">View full timeline →</button>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy || sel.status === "Acknowledged" || sel.status === "Resolved"} onClick={() => doAction(sel.id, "acknowledge")} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-semibold disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge</button>
                  <button disabled={busy} onClick={() => doAction(sel.id, "escalate")} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><AlertTriangle className="w-3.5 h-3.5" /> Escalate</button>
                  <button disabled={busy} onClick={() => doAction(sel.id, "incident")} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> {sel.incidentId ? sel.incidentId : "Create Incident"}</button>
                  <button disabled={busy || sel.status === "Resolved"} onClick={() => doAction(sel.id, "resolve")} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/10 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</button>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

/* --------------------------- Announcements (real) --------------------------- */

const TYPE_TONE: Record<string, string> = { Strategy: "bg-violet-500/15 text-violet-300", System: "bg-slate-500/15 text-slate-300", SEO: "bg-brand-500/15 text-brand-300", Content: "bg-sky-500/15 text-sky-300", Update: "bg-emerald-500/15 text-emerald-300", Report: "bg-amber-500/15 text-amber-300", Alert: "bg-rose-500/15 text-rose-300", Policy: "bg-indigo-500/15 text-indigo-300", Recognition: "bg-violet-500/15 text-violet-300" };
const PRIO_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-sky-500/15 text-sky-300" };
const STATUS_TONE: Record<string, string> = { Published: "bg-emerald-500/15 text-emerald-300", Scheduled: "bg-sky-500/15 text-sky-300", Draft: "bg-amber-500/15 text-amber-300", Archived: "bg-slate-500/15 text-slate-400" };
const CHANNEL_ICON: Record<string, React.ElementType> = { "In-App": MessageSquare, Email: Mail, "Agent Inbox": Users, System: Bell };
const TYPE_ICON: Record<string, React.ElementType> = { Strategy: Sparkles, System: AlertTriangle, SEO: Globe, Content: FileText, Update: RefreshCw, Report: Award, Alert: AlertTriangle, Policy: GitBranch, Recognition: Award };
const ALL_CHANNELS = ["In-App", "Email", "Agent Inbox", "System"];
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function MiniDonut({ segments, total, label = "Recipients" }: { segments: { pct: number; color: string }[]; total: number; label?: string }) {
  const r = 42, size = 110, stroke = 14; let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth={stroke} />
        {segments.map((sg, i) => { const node = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sg.color} strokeWidth={stroke} pathLength={100} strokeDasharray={`${sg.pct} ${100 - sg.pct}`} strokeDashoffset={-acc} />; acc += sg.pct; return node; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-lg font-extrabold text-white">{total}</div><div className="text-[8px] text-slate-500">{label}</div></div></div>
    </div>
  );
}

function MenuBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] ${danger ? "text-rose-300 hover:bg-rose-500/10" : "text-slate-300 hover:bg-ink-800"}`}>{children}</button>;
}

function Announcements() {
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"All" | "Published" | "Scheduled" | "Draft" | "Archived">("All");
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("All Types");
  const [prioF, setPrioF] = useState("All Priority");
  const [sel, setSel] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; edit: AnnouncementItem | null }>({ open: false, edit: null });
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuId, setMenuId] = useState("");
  const selRef = useRef<string>("");
  selRef.current = sel?.id || "";

  const loadDetail = async (id: string) => { try { const r = await getAnnouncement(id); setSel(r.announcement); } catch { /* ignore */ } };
  const reload = async (p = 1) => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listAnnouncements({ status: filter, type: typeF, priority: prioF, q, page: p, limit: 8 }),
        getAnnouncementStats(),
      ]);
      setItems(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setStats(s);
      const keep = r.items.find((x) => x.id === selRef.current) || r.items[0] || null;
      if (keep) loadDetail(keep.id); else setSel(null);
    } finally { setLoading(false); }
  };
  // refetch on filter/search changes (debounced).
  useEffect(() => { const t = setTimeout(() => reload(1), 250); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter, typeF, prioF, q]);

  const save = async (input: AnnouncementInput, id?: string) => {
    setBusy(true);
    try { if (id) await updateAnnouncement(id, input); else await createAnnouncement(input); setModal({ open: false, edit: null }); await reload(page); }
    finally { setBusy(false); }
  };
  const aiDraft = async () => {
    setBusy(true); setMoreOpen(false);
    try { const r = await createAnnouncement({ ai: true, status: "Draft" }); await reload(1); loadDetail(r.announcement.id); }
    finally { setBusy(false); }
  };
  const changeStatus = async (id: string, status: string) => { setBusy(true); try { await updateAnnouncement(id, { status }); await reload(page); } finally { setBusy(false); } };
  const remove = async (id: string) => { setBusy(true); try { await deleteAnnouncement(id); if (selRef.current === id) setSel(null); await reload(page); } finally { setBusy(false); } };

  const trendStr = (n: number) => (n > 0 ? `▲ ${n}% vs last 30 days` : n < 0 ? `▼ ${Math.abs(n)}% vs last 30 days` : "No change");
  const cards = [
    { label: "Total Announcements", value: stats?.total ?? 0, sub: trendStr(stats?.trendTotal ?? 0), icon: Megaphone, tone: "brand" },
    { label: "Published", value: stats?.published ?? 0, sub: "Live to the team", icon: CheckCircle2, tone: "emerald" },
    { label: "Scheduled", value: stats?.scheduled ?? 0, sub: "Queued to send", icon: Calendar, tone: "sky" },
    { label: "Drafts", value: stats?.draft ?? 0, sub: "In progress", icon: PenLine, tone: "amber" },
    { label: "Avg. Read Rate", value: stats?.avgReadTracked ? `${stats.avgReadRate}%` : "—", sub: stats?.avgReadTracked ? "Across published" : "No reads yet", icon: Eye, tone: "violet" },
  ];
  const tabs = [
    { key: "All", n: stats?.total ?? 0 }, { key: "Published", n: stats?.published ?? 0 }, { key: "Scheduled", n: stats?.scheduled ?? 0 },
    { key: "Draft", n: stats?.draft ?? 0 }, { key: "Archived", n: stats?.archived ?? 0 },
  ] as const;
  const selType = sel ? (TYPE_ICON[sel.type] || Megaphone) : Megaphone;
  const SelIco = selType;
  const start = total === 0 ? 0 : (page - 1) * 8 + 1;
  const end = Math.min(total, page * 8);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h2 className="text-lg font-bold text-white">Announcements</h2><p className="text-[12px] text-slate-500">Create, manage and broadcast important updates across your AI workforce.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ open: true, edit: null })} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create Announcement</button>
          <div className="relative">
            <button onClick={() => setMoreOpen((v) => !v)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">More <ChevronDown className="w-3.5 h-3.5" /></button>
            {moreOpen && (
              <div className="absolute right-0 top-10 z-30 w-52 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
                <MenuBtn onClick={aiDraft}><span className="inline-flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5 text-brand-400" /> AI-draft from today&apos;s data</span></MenuBtn>
                <MenuBtn onClick={() => { setMoreOpen(false); reload(page); }}><span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</span></MenuBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => { const Ico = c.icon; return (
          <FadeUp key={c.label}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[11px] text-slate-500 leading-tight">{c.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${c.tone === "brand" ? "bg-brand-600/15 text-brand-300" : c.tone === "emerald" ? "bg-emerald-500/15 text-emerald-300" : c.tone === "sky" ? "bg-sky-500/15 text-sky-300" : c.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-violet-500/15 text-violet-300"}`}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-2 text-2xl font-extrabold text-white">{c.value}</div><div className={`text-[10px] mt-0.5 ${c.sub.startsWith("▲") ? "text-emerald-400" : c.sub.startsWith("▼") ? "text-rose-400" : "text-slate-500"}`}>{c.sub}</div></div></FadeUp>
        ); })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center gap-1 border-b border-ink-800 mb-3 overflow-x-auto">
              {tabs.map((t) => <button key={t.key} onClick={() => setFilter(t.key)} className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${filter === t.key ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{t.key} <span className={`text-[9px] px-1 rounded ${filter === t.key ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{t.n}</span></button>)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-0"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-8 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Types</option>{(stats?.types || []).map((t) => <option key={t}>{t}</option>)}</select>
              <select value={prioF} onChange={(e) => setPrioF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Priority</option><option>High</option><option>Medium</option><option>Low</option></select>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Announcement</th><th className="font-semibold">Type</th><th className="font-semibold">Priority</th><th className="font-semibold">Audience</th><th className="font-semibold">Channels</th><th className="font-semibold">Status</th><th className="font-semibold">Created On</th><th className="font-semibold">Read</th><th></th></tr></thead>
                <tbody>
                  {items.map((a) => { const Ico = TYPE_ICON[a.type] || Megaphone;
                    return (
                      <tr key={a.id} onClick={() => loadDetail(a.id)} className={`border-b border-ink-900 cursor-pointer transition-colors ${sel?.id === a.id ? "bg-ink-900/60" : "hover:bg-ink-900/40"}`}>
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><Ico className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[180px]">{a.title}</div><div className="text-[10px] text-slate-600 truncate max-w-[180px]">{a.sub}</div></div></div></td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_TONE[a.type] || "bg-slate-500/15 text-slate-300"}`}>{a.type}</span></td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIO_TONE[a.priority]}`}>{a.priority}</span></td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{a.audience}</td>
                        <td><div className="flex items-center gap-1 text-slate-500">{a.channels.slice(0, 3).map((ch) => { const I = CHANNEL_ICON[ch] || Bell; return <I key={ch} className="w-3.5 h-3.5" />; })}</div></td>
                        <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[a.status]}`}>{a.status}</span></td>
                        <td className="text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                        <td className="text-[11px] font-bold text-white whitespace-nowrap">{a.status === "Published" ? `${a.readRate}%` : "—"}</td>
                        <td className="relative pr-2">
                          <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === a.id ? "" : a.id); }} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuId === a.id && (
                            <div className="absolute right-2 top-9 z-30 w-32 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1" onClick={(e) => e.stopPropagation()}>
                              <MenuBtn onClick={() => { setMenuId(""); setModal({ open: true, edit: a }); }}>Edit</MenuBtn>
                              {a.status !== "Published" && <MenuBtn onClick={() => { setMenuId(""); changeStatus(a.id, "Published"); }}>Publish</MenuBtn>}
                              {a.status !== "Archived" && <MenuBtn onClick={() => { setMenuId(""); changeStatus(a.id, "Archived"); }}>Archive</MenuBtn>}
                              <MenuBtn danger onClick={() => { setMenuId(""); remove(a.id); }}>Delete</MenuBtn>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && items.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-[12px] text-slate-500">No announcements yet. Click <span className="text-brand-300 font-semibold">Create Announcement</span> or AI-draft one from today&apos;s data.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} announcements</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">‹</button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">›</button>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            {!sel ? (
              <div className="p-8 text-center text-[12px] text-slate-500">Select an announcement to see its details, audience reach and engagement.</div>
            ) : (
            <>
            <div className="p-4 border-b border-ink-800 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0"><span className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-300 grid place-items-center shrink-0"><SelIco className="w-4 h-4" /></span><div className="min-w-0"><div className="text-[10px] uppercase tracking-wide text-slate-600">Announcement Details</div><div className="text-[13px] font-bold text-white truncate">{sel.title}</div></div></div>
              <button onClick={() => setModal({ open: true, edit: sel })} className="text-[10px] text-brand-400 shrink-0 hover:underline">Edit</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_TONE[sel.status]}`}>{sel.status}</span>
                {sel.status !== "Published" && <button disabled={busy} onClick={() => changeStatus(sel.id, "Published")} className="text-[10px] font-semibold px-2 h-6 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">Publish</button>}
                {sel.status !== "Archived" && <button disabled={busy} onClick={() => changeStatus(sel.id, "Archived")} className="text-[10px] font-semibold px-2 h-6 rounded-lg border border-ink-700 text-slate-400 hover:bg-ink-800 disabled:opacity-50">Archive</button>}
                <button disabled={busy} onClick={() => remove(sel.id)} className="text-[10px] font-semibold px-2 h-6 rounded-lg text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">Delete</button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {([["Type", sel.type], ["Priority", sel.priority], ["Created By", "AI CEO / Orchestrator"], ["Created On", fmtDate(sel.createdAt)]] as [string, string][]).map(([k, v]) => (
                  <div key={k}><div className="text-[9px] uppercase tracking-wide text-slate-600">{k}</div><div className="text-[11px] font-semibold text-white">{v}</div></div>
                ))}
              </div>
              {sel.body && <p className="text-[11px] text-slate-400 leading-snug whitespace-pre-wrap">{sel.body}</p>}
              <div><div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Channels</div><div className="flex flex-wrap gap-1.5">{sel.channels.map((ch) => { const I = CHANNEL_ICON[ch] || Bell; return <span key={ch} className="inline-flex items-center gap-1 text-[10px] text-slate-300 border border-ink-700 rounded-lg px-2 h-7"><I className="w-3 h-3" />{ch}</span>; })}</div></div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Audience &amp; Reach</div>
                <div className="flex items-center gap-3">
                  <MiniDonut segments={(sel.breakdown || []).map((d) => ({ pct: d.pct, color: d.color }))} total={sel.recipients} />
                  <ul className="space-y-1 flex-1">{(sel.breakdown || []).map((d) => <li key={d.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-slate-400 flex-1">{d.label}</span><span className="text-white font-bold">{d.count}</span><span className="text-slate-600">({d.pct}%)</span></li>)}</ul>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Engagement Metrics</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {([["Read", sel.status === "Published" ? `${sel.readRate}%` : "—"], ["Reads", String(sel.reads)], ["Reach", String(sel.recipients)], ["Replies", String(sel.replies)]] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-ink-800 bg-ink-950/40 py-2"><div className="text-sm font-extrabold text-white">{v}</div><div className="text-[9px] text-slate-500">{k}</div></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">History</div>
                <ul className="space-y-1.5 text-[10px]">
                  {(sel.history || []).map((h, i) => <li key={i} className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-slate-300"><span className={`w-1.5 h-1.5 rounded-full ${h.state === "Published" ? "bg-emerald-400" : h.state === "Archived" ? "bg-slate-400" : "bg-brand-400"}`} />{h.state}</span><span className="text-slate-600">{h.by} · {fmtDate(h.at)}</span></li>)}
                </ul>
              </div>
            </div>
            </>
            )}
          </div>
        </FadeUp>
      </div>

      {modal.open && <AnnModal stats={stats} initial={modal.edit} busy={busy} onClose={() => setModal({ open: false, edit: null })} onSave={save} />}
    </div>
  );
}

function AnnModal({ stats, initial, busy, onClose, onSave }: { stats: AnnouncementStats | null; initial: AnnouncementItem | null; busy: boolean; onClose: () => void; onSave: (input: AnnouncementInput, id?: string) => void }) {
  const [f, setF] = useState<AnnouncementInput>(() => initial
    ? { title: initial.title, sub: initial.sub, body: initial.body, type: initial.type, priority: initial.priority, audienceKey: initial.audienceKey, channels: initial.channels, status: initial.status }
    : { title: "", sub: "", body: "", type: "Update", priority: "Medium", audienceKey: "all", channels: ["In-App"], status: "Draft" });
  const set = (k: keyof AnnouncementInput, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const toggleCh = (c: string) => setF((s) => { const ch = s.channels || []; return { ...s, channels: ch.includes(c) ? ch.filter((x) => x !== c) : [...ch, c] }; });
  const types = stats?.types || ["Strategy", "System", "SEO", "Content", "Update", "Report", "Alert", "Policy", "Recognition"];
  const audiences = stats?.audiences || [];
  const label = "block text-[10px] uppercase tracking-wide text-slate-500 mb-1";
  const fieldCls = "w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-9 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-950 max-h-[88vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-ink-800 flex items-center justify-between sticky top-0 bg-ink-950 z-10">
          <h3 className="text-sm font-bold text-white">{initial ? "Edit Announcement" : "Create Announcement"}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className={label}>Title</label><input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Announcement title" className={fieldCls} /></div>
          <div><label className={label}>Subtitle</label><input value={f.sub} onChange={(e) => set("sub", e.target.value)} placeholder="Short one-line summary" className={fieldCls} /></div>
          <div><label className={label}>Body</label><textarea value={f.body} onChange={(e) => set("body", e.target.value)} rows={4} placeholder="What do you want the team to know?" className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Type</label><select value={f.type} onChange={(e) => set("type", e.target.value)} className={fieldCls}>{types.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className={label}>Priority</label><select value={f.priority} onChange={(e) => set("priority", e.target.value)} className={fieldCls}><option>High</option><option>Medium</option><option>Low</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Audience</label><select value={f.audienceKey} onChange={(e) => set("audienceKey", e.target.value)} className={fieldCls}>{audiences.map((a) => <option key={a.key} value={a.key}>{a.label} ({a.count})</option>)}</select></div>
            <div><label className={label}>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={fieldCls}><option>Draft</option><option>Scheduled</option><option>Published</option></select></div>
          </div>
          <div>
            <label className={label}>Channels</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CHANNELS.map((c) => { const on = (f.channels || []).includes(c); const I = CHANNEL_ICON[c] || Bell; return (
                <button key={c} type="button" onClick={() => toggleCh(c)} className={`inline-flex items-center gap-1 text-[11px] rounded-lg px-2.5 h-8 border ${on ? "border-brand-500/40 bg-brand-500/10 text-brand-200" : "border-ink-700 text-slate-400 hover:bg-ink-800"}`}><I className="w-3 h-3" />{c}</button>
              ); })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-ink-800 flex items-center justify-end gap-2 sticky bottom-0 bg-ink-950">
          <button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
          <button disabled={busy || !(f.title || "").trim()} onClick={() => onSave(f, initial?.id)} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {initial ? "Save Changes" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Message Templates --------------------------- */

const TPL_CHANNEL_ICON: Record<string, React.ElementType> = { Email: Mail, "In-App": MessageSquare, Alert: AlertTriangle, SMS: Smartphone };
const TPL_CHANNEL_TONE: Record<string, string> = { Email: "bg-sky-500/15 text-sky-300", "In-App": "bg-violet-500/15 text-violet-300", Alert: "bg-rose-500/15 text-rose-300", SMS: "bg-emerald-500/15 text-emerald-300" };
const TPL_STATUS_TONE: Record<string, string> = { Active: "bg-emerald-500/15 text-emerald-300", Draft: "bg-amber-500/15 text-amber-300", Paused: "bg-slate-500/15 text-slate-400" };
const tplVars = (s: string) => { const set = new Set<string>(); const re = /\{\{\s*([\w.]+)\s*\}\}/g; let m; while ((m = re.exec(s || "")) !== null) set.add(m[1]); return Array.from(set); };

function MessageTemplates({ onUse }: { onUse: (text: string) => void }) {
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("All Categories");
  const [statusF, setStatusF] = useState("All Status");
  const [creatorF, setCreatorF] = useState("Created By");
  const [sel, setSel] = useState<TemplateItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuId, setMenuId] = useState("");
  const [modal, setModal] = useState<{ open: boolean; edit: TemplateItem | null }>({ open: false, edit: null });
  const [moreOpen, setMoreOpen] = useState(false);
  const selRef = useRef<string>("");
  selRef.current = sel?.id || "";

  const loadDetail = async (id: string) => { try { setSel((await getTemplate(id)).template); } catch { /* ignore */ } };
  const reload = async (p = page) => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        listTemplates({ channel: tab, category: catF, status: statusF, createdBy: creatorF, q, page: p, limit: 10 }),
        getTemplateStats(),
      ]);
      setItems(r.items); setTotal(r.total); setPages(r.pages); setPage(r.page); setStats(s);
      const keep = r.items.find((x) => x.id === selRef.current) || r.items[0] || null;
      if (keep) loadDetail(keep.id); else setSel(null);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => reload(1), 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, catF, statusF, creatorF, q]);

  const save = async (input: TemplateInput, id?: string) => {
    setBusy(true);
    try { if (id) await updateTemplate(id, input); else await createTemplate(input); setModal({ open: false, edit: null }); await reload(page); }
    finally { setBusy(false); }
  };
  const onUseTpl = async (t: TemplateItem) => {
    setBusy(true); setMenuId("");
    try { const r = await useTemplate(t.id); setSel(r.template); await reload(page); const full = r.template; onUse(full.subject ? `${full.subject}\n\n${full.body || ""}` : (full.body || full.name)); }
    finally { setBusy(false); }
  };
  const onDup = async (id: string) => { setBusy(true); setMenuId(""); try { const r = await duplicateTemplate(id); await reload(page); loadDetail(r.template.id); } finally { setBusy(false); } };
  const onDel = async (id: string) => { setBusy(true); setMenuId(""); try { await deleteTemplate(id); if (selRef.current === id) setSel(null); await reload(page); } finally { setBusy(false); } };

  const trendStr = (n: number) => (n > 0 ? `▲ ${n}% vs last 30 days` : n < 0 ? `▼ ${Math.abs(n)}% vs last 30 days` : "No change");
  const cards = [
    { label: "Total Templates", value: stats?.total ?? 0, sub: trendStr(stats?.trendTotal ?? 0), icon: FileIcon, tone: "brand" },
    { label: "Email Templates", value: stats?.email ?? 0, sub: "Email channel", icon: Mail, tone: "sky" },
    { label: "In-App Templates", value: stats?.inApp ?? 0, sub: "In-app channel", icon: MessageSquare, tone: "violet" },
    { label: "Alert Templates", value: stats?.alert ?? 0, sub: "Alert channel", icon: AlertTriangle, tone: "amber" },
    { label: "SMS Templates", value: stats?.sms ?? 0, sub: "SMS channel", icon: Smartphone, tone: "emerald" },
  ];
  const tabs = [
    { key: "All", label: "All Templates", n: stats?.total ?? 0 }, { key: "Email", label: "Email", n: stats?.email ?? 0 },
    { key: "In-App", label: "In-App", n: stats?.inApp ?? 0 }, { key: "Alert", label: "Alert", n: stats?.alert ?? 0 }, { key: "SMS", label: "SMS", n: stats?.sms ?? 0 },
  ];
  const start = total === 0 ? 0 : (page - 1) * 10 + 1;
  const end = Math.min(total, page * 10);
  const SelIco = sel ? (TPL_CHANNEL_ICON[sel.channel] || Mail) : Mail;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div><h2 className="text-lg font-bold text-white">Message Templates</h2><p className="text-[12px] text-slate-500">Create, manage, and use reusable message templates for consistent communication.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ open: true, edit: null })} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Create Template</button>
          <div className="relative">
            <button onClick={() => setMoreOpen((v) => !v)} className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">More <ChevronDown className="w-3.5 h-3.5" /></button>
            {moreOpen && <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1"><MenuBtn onClick={() => { setMoreOpen(false); reload(page); }}><span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</span></MenuBtn></div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((cd) => { const Ico = cd.icon; return (
          <FadeUp key={cd.label}><div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4"><div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{cd.label}</span><span className={`w-7 h-7 rounded-lg grid place-items-center ${cd.tone === "brand" ? "bg-brand-600/15 text-brand-300" : cd.tone === "sky" ? "bg-sky-500/15 text-sky-300" : cd.tone === "violet" ? "bg-violet-500/15 text-violet-300" : cd.tone === "amber" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}><Ico className="w-3.5 h-3.5" /></span></div><div className="mt-2 text-2xl font-extrabold text-white">{cd.value}</div><div className={`text-[10px] mt-0.5 ${cd.sub.startsWith("▲") ? "text-emerald-400" : cd.sub.startsWith("▼") ? "text-rose-400" : "text-slate-500"}`}>{cd.sub}</div></div></FadeUp>
        ); })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <FadeUp>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4">
            <div className="flex items-center gap-1 border-b border-ink-800 mb-3 overflow-x-auto">
              {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 text-[12px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 ${tab === t.key ? "text-white border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>{t.label} <span className={`text-[9px] px-1 rounded ${tab === t.key ? "bg-brand-500/20 text-brand-300" : "bg-ink-800 text-slate-500"}`}>{t.n}</span></button>)}
            </div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="relative flex-1 min-w-[140px]"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="w-full rounded-lg border border-ink-700 bg-ink-900 pl-8 pr-3 h-8 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500" /></div>
              <select value={catF} onChange={(e) => setCatF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>All Categories</option>{(stats?.categories || []).map((c) => <option key={c}>{c}</option>)}</select>
              <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="hidden md:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none"><option>All Status</option><option>Active</option><option>Draft</option><option>Paused</option></select>
              <select value={creatorF} onChange={(e) => setCreatorF(e.target.value)} className="hidden lg:block rounded-lg border border-ink-700 bg-ink-900 h-8 px-2 text-[11px] text-slate-300 focus:outline-none max-w-[150px]"><option>Created By</option>{(stats?.creators || []).map((c) => <option key={c}>{c}</option>)}</select>
              {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[820px]">
                <thead><tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-ink-800"><th className="py-2 px-2 font-semibold">Template Name</th><th className="font-semibold">Channel</th><th className="font-semibold">Category</th><th className="font-semibold">Created By</th><th className="font-semibold">Last Updated</th><th className="font-semibold">Status</th><th className="font-semibold">Usage</th><th></th></tr></thead>
                <tbody>
                  {items.map((t) => { const Ico = TPL_CHANNEL_ICON[t.channel] || Mail;
                    return (
                      <tr key={t.id} onClick={() => loadDetail(t.id)} className={`border-b border-ink-900 cursor-pointer transition-colors ${sel?.id === t.id ? "bg-ink-900/60" : "hover:bg-ink-900/40"}`}>
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${TPL_CHANNEL_TONE[t.channel]}`}><Ico className="w-3.5 h-3.5" /></span><div className="min-w-0"><div className="text-[12px] font-bold text-white truncate max-w-[200px]">{t.name}</div><div className="text-[10px] text-slate-600 truncate max-w-[200px]">{t.description}</div></div></div></td>
                        <td><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TPL_CHANNEL_TONE[t.channel]}`}>{t.channel}</span></td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{t.category}</td>
                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{t.createdByAgent}</td>
                        <td className="text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(t.updatedAt)}</td>
                        <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TPL_STATUS_TONE[t.status]}`}>{t.status}</span></td>
                        <td className="text-[11px] font-bold text-white tabular-nums">{t.usageCount}</td>
                        <td className="relative pr-2">
                          <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === t.id ? "" : t.id); }} className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800 hover:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuId === t.id && (
                            <div className="absolute right-2 top-9 z-30 w-32 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1" onClick={(e) => e.stopPropagation()}>
                              <MenuBtn onClick={() => onUseTpl(t)}>Use</MenuBtn>
                              <MenuBtn onClick={() => { setMenuId(""); setModal({ open: true, edit: t }); }}>Edit</MenuBtn>
                              <MenuBtn onClick={() => onDup(t.id)}>Duplicate</MenuBtn>
                              <MenuBtn danger onClick={() => onDel(t.id)}>Delete</MenuBtn>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && items.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[12px] text-slate-500">No templates match these filters. Click <span className="text-brand-300 font-semibold">Create Template</span>.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-slate-600">Showing {start} to {end} of {total} templates</div>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1 || loading} onClick={() => reload(page - 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">‹</button>
                <span className="text-[11px] text-slate-400 px-2">{page} / {pages}</span>
                <button disabled={page >= pages || loading} onClick={() => reload(page + 1)} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-700 text-slate-400 disabled:opacity-40 hover:bg-ink-800">›</button>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/50 overflow-hidden">
            {!sel ? (
              <div className="p-8 text-center text-[12px] text-slate-500">Select a template to preview it, its variables and usage.</div>
            ) : (
            <>
            <div className="p-4 border-b border-ink-800 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0"><span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${TPL_CHANNEL_TONE[sel.channel]}`}><SelIco className="w-4 h-4" /></span><div className="min-w-0"><div className="text-[13px] font-bold text-white truncate">{sel.name}</div><div className="text-[10px] text-slate-500">{sel.channel} Template</div></div></div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TPL_STATUS_TONE[sel.status]}`}>{sel.status}</span>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {([["Category", sel.category], ["Created By", sel.createdByAgent], ["Created On", fmtDate(sel.createdAt)], ["Last Updated", fmtDate(sel.updatedAt)], ["Usage Count", `${sel.usageCount} times`]] as [string, string][]).map(([k, v]) => (
                  <div key={k}><div className="text-[9px] uppercase tracking-wide text-slate-600">{k}</div><div className="text-[11px] font-semibold text-white">{v}</div></div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5"><div className="text-[10px] uppercase tracking-wide text-slate-600">Template Preview</div><button onClick={() => setModal({ open: true, edit: sel })} className="text-[10px] text-brand-400 inline-flex items-center gap-1 hover:underline"><PenLine className="w-3 h-3" /> Edit Content</button></div>
                <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 text-[11px] text-slate-300 leading-relaxed max-h-44 overflow-y-auto scrollbar-thin">
                  {sel.subject ? <div className="mb-1.5"><span className="text-slate-500">Subject: </span><span className="font-semibold text-white">{sel.subject}</span></div> : null}
                  <pre className="whitespace-pre-wrap font-sans">{sel.body}</pre>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5"><div className="text-[10px] uppercase tracking-wide text-slate-600">Variables ({sel.variables?.length ?? 0})</div><button onClick={() => setModal({ open: true, edit: sel })} className="text-[10px] text-brand-400 inline-flex items-center gap-0.5 hover:underline"><Plus className="w-3 h-3" /> Add Variable</button></div>
                <div className="flex flex-wrap gap-1.5">{(sel.variables || []).map((v) => <span key={v} className="text-[10px] font-mono text-brand-200 bg-brand-500/10 border border-brand-500/30 rounded px-1.5 py-0.5">{`{{${v}}}`}</span>)}{(sel.variables || []).length === 0 && <span className="text-[10px] text-slate-500">No variables.</span>}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1"><div className="text-[10px] uppercase tracking-wide text-slate-600">Template Usage</div><span className="text-[9px] text-slate-500">Last 30 Days</span></div>
                <div className="flex items-end justify-between mb-1"><div className="text-xl font-extrabold text-white">{sel.usageChart?.last30 ?? 0}<span className="text-[10px] font-normal text-slate-500 ml-1">total uses</span></div><WfTrend n={sel.usageTrend ?? 0} unit="vs previous 30 days" /></div>
                <Spark data={(sel.usageChart?.series || []).map((d) => d.count)} color="#8b5cf6" />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-600 mb-2">Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} onClick={() => onUseTpl(sel)} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[12px] font-semibold disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Use Template</button>
                  <button disabled={busy} onClick={() => onDup(sel.id)} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                  <button disabled={busy} onClick={() => { navigator.clipboard?.writeText(sel.subject ? `${sel.subject}\n\n${sel.body || ""}` : (sel.body || "")); }} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:bg-ink-800 disabled:opacity-50"><Share2 className="w-3.5 h-3.5" /> Copy</button>
                  <button disabled={busy} onClick={() => onDel(sel.id)} className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-ink-700 text-rose-300 text-[12px] font-semibold hover:bg-rose-500/10 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </FadeUp>
      </div>

      {modal.open && <TplModal stats={stats} initial={modal.edit} busy={busy} onClose={() => setModal({ open: false, edit: null })} onSave={save} />}
    </div>
  );
}

function TplModal({ stats, initial, busy, onClose, onSave }: { stats: TemplateStats | null; initial: TemplateItem | null; busy: boolean; onClose: () => void; onSave: (input: TemplateInput, id?: string) => void }) {
  const [f, setF] = useState<TemplateInput>(() => initial
    ? { name: initial.name, description: initial.description, channel: initial.channel, category: initial.category, subject: initial.subject || "", body: initial.body || "", status: initial.status, createdByAgent: initial.createdByAgent }
    : { name: "", description: "", channel: "In-App", category: "General", subject: "", body: "", status: "Draft", createdByAgent: "AI CEO / Orchestrator" });
  const set = (k: keyof TemplateInput, v: string) => setF((s) => ({ ...s, [k]: v }));
  const vars = tplVars(`${f.subject || ""} ${f.body || ""}`);
  const label = "block text-[10px] uppercase tracking-wide text-slate-500 mb-1";
  const fieldCls = "w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 h-9 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500";
  const cats = stats?.categories || ["General"];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-ink-700 bg-ink-950 max-h-[88vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-ink-800 flex items-center justify-between sticky top-0 bg-ink-950 z-10">
          <h3 className="text-sm font-bold text-white">{initial ? "Edit Template" : "Create Template"}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-ink-800"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div><label className={label}>Name</label><input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Template name" className={fieldCls} /></div>
          <div><label className={label}>Description</label><input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description" className={fieldCls} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Channel</label><select value={f.channel} onChange={(e) => set("channel", e.target.value)} className={fieldCls}>{["In-App", "Email", "Alert", "SMS"].map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label}>Status</label><select value={f.status} onChange={(e) => set("status", e.target.value)} className={fieldCls}><option>Active</option><option>Draft</option><option>Paused</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Category</label><select value={f.category} onChange={(e) => set("category", e.target.value)} className={fieldCls}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={label}>Created By</label><input value={f.createdByAgent} onChange={(e) => set("createdByAgent", e.target.value)} className={fieldCls} /></div>
          </div>
          {f.channel === "Email" && <div><label className={label}>Subject</label><input value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Email subject — use {{Variables}}" className={fieldCls} /></div>}
          <div><label className={label}>Body</label><textarea value={f.body} onChange={(e) => set("body", e.target.value)} rows={6} placeholder="Message body — use {{Variables}} for dynamic content" className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono" /></div>
          <div><label className={label}>Detected Variables ({vars.length})</label><div className="flex flex-wrap gap-1.5">{vars.map((v) => <span key={v} className="text-[10px] font-mono text-brand-200 bg-brand-500/10 border border-brand-500/30 rounded px-1.5 py-0.5">{`{{${v}}}`}</span>)}{vars.length === 0 && <span className="text-[10px] text-slate-500">Add {`{{Variables}}`} in the body to make it dynamic.</span>}</div></div>
        </div>
        <div className="p-4 border-t border-ink-800 flex items-center justify-end gap-2 sticky bottom-0 bg-ink-950">
          <button onClick={onClose} className="px-3.5 h-9 rounded-lg border border-ink-700 text-slate-300 text-sm">Cancel</button>
          <button disabled={busy || !(f.name || "").trim()} onClick={() => onSave(f, initial?.id)} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {initial ? "Save Changes" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
