"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck, Loader2, Bell, TrendingUp, TrendingDown, FileText, UserCog, ShieldCheck, Users, PieChart, Clock,
  ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Star, RefreshCw, Sparkles, Send, BadgeCheck, XCircle, Image as ImageIcon, Package, Zap, Layers,
  Search, Eye, Mail, MessageCircle, Globe, Phone, ChevronLeft, ChevronRight, Pencil, DollarSign, Tag, Info, X, CreditCard, Repeat, Wallet,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, getOnboardingOverview, getOnboardingProviders, getClaimRequests, getVerificationCenter, getProfileCompletion, getServiceListings, setListingStatus, getSubscriptions, updateSubscriptionPlan, getApprovalQueue, queueAction, getMissingInformation, getOnboardingFunnel, getBadgeCenter, onbVerify, onbActivate, onbReject, onbRequestInfo, onbApproveClaim, onbRejectClaim, resolveMedia,
  getGrowthJobs, startDiscoverySweep, startReviewHarvest, type GrowthJob,
  type OnboardingOverview, type OnbProvider, type ClaimRequestsData, type VerificationData, type CompletionData, type CompletionRow, type ServiceListingsData, type ServiceRow, type SubscriptionsData, type SubPackage, type ApprovalQueueData, type QueueRow, type MissingInfoData, type MissingRow, type FunnelData, type BadgeCenterData, type BadgeRow, type Kpi, type Seg,
} from "@/lib/api";

const TABS = ["Overview", "Claim Requests", "Verification Center", "Profile Completion", "Service Listings", "Media Manager", "Subscription & Packages", "Provider Activation", "Approval Queue", "Missing Information", "Provider Health Score", "Onboarding Funnel", "Verification Badge Center"];
const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : `${n}`);
const mfmt = (n: number) => (n >= 1e6 ? `AED ${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `AED ${(n / 1000).toFixed(1)}K` : `AED ${n.toLocaleString()}`);
const ago = (d?: string | null) => { if (!d) return "—"; const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };

function AnimatedNumber({ value, className, suffix }: { value: number; className?: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const dur = 750, t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)) * 10) / 10); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{Number.isInteger(value) ? Math.round(n).toLocaleString() : n.toFixed(1)}{suffix}</span>;
}
function Card({ title, children, right, sub }: { title?: string; children: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 h-full transition-colors duration-200 hover:border-ink-700 hover:shadow-lg hover:shadow-black/20">{(title || right) && <div className="flex items-start justify-between gap-2 mb-3"><div>{title && <div className="text-[13px] font-bold text-white">{title}</div>}{sub && <div className="text-[10px] text-slate-500">{sub}</div>}</div>{right}</div>}{children}</motion.div>;
}
const ViewAll = ({ onClick, label = "View All" }: { onClick?: () => void; label?: string }) => <button onClick={onClick} className="inline-flex items-center gap-1 text-[10px] text-brand-400 font-semibold hover:text-brand-300">{label} <ArrowRight className="w-3 h-3" /></button>;
function Trend({ n }: { n: number }) { if (!n) return <span className="text-[10px] text-slate-500">vs last 7 days</span>; const up = n > 0; return <span className={`text-[10px] inline-flex items-center gap-0.5 ${up ? "text-emerald-400" : "text-rose-400"}`}>{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(n)}% <span className="text-slate-600">vs 7d</span></span>; }
function Donut({ segments, total, label }: { segments: Seg[]; total: number; label: string }) {
  const R = 46, C = 2 * Math.PI * R; let off = 0;
  return <div className="relative w-[120px] h-[120px] shrink-0"><svg viewBox="0 0 120 120" className="w-full h-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="#1e293b" strokeWidth="14" />{segments.filter((s) => s.count > 0).map((s, i) => { const len = (s.count / Math.max(1, total)) * C; const el = <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeLinecap="round" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.09, ease: "easeOut" }} />; off += len; return el; })}</svg><div className="absolute inset-0 grid place-items-center"><div className="text-center"><AnimatedNumber value={total} className="text-2xl font-extrabold text-white" /><div className="text-[9px] text-slate-500">{label}</div></div></div></div>;
}
function Gauge({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "#34d399" : value >= 60 ? "#38bdf8" : value >= 40 ? "#fbbf24" : "#fb7185";
  const R = 52, C = Math.PI * R, len = (Math.min(100, value) / 100) * C;
  return <div className="relative w-[150px] h-[88px]"><svg viewBox="0 0 130 74" className="w-full h-full"><path d="M9 70 A56 56 0 0 1 121 70" fill="none" stroke="#1e293b" strokeWidth="11" strokeLinecap="round" /><motion.path d="M9 70 A56 56 0 0 1 121 70" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C}` }} transition={{ duration: 0.9, ease: "easeOut" }} /></svg><div className="absolute inset-x-0 bottom-0 text-center"><AnimatedNumber value={value} className="text-3xl font-extrabold text-white" /><div className="text-[10px] font-semibold" style={{ color }}>{label}</div></div></div>;
}
function ScoreDot({ s }: { s: number }) { return <span className={`relative w-8 h-8 inline-grid place-items-center rounded-full border text-[11px] font-bold ${s >= 80 ? "border-emerald-500/40 text-emerald-300" : s >= 60 ? "border-sky-500/40 text-sky-300" : s >= 40 ? "border-amber-500/40 text-amber-300" : "border-rose-500/40 text-rose-300"}`}>{s >= 90 && <span className="absolute inset-0 rounded-full border border-emerald-400/60 animate-ping" />}{s}</span>; }
function Logo({ url, name }: { url?: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  // Show the real logo when it loads; on a broken/404 URL (common for niche
  // Clearbit domains) fall back to clean initials — never a broken image.
  if (url && !err) return <img src={url} alt={name} onError={() => setErr(true)} className="w-9 h-9 rounded-lg object-cover bg-white border border-ink-800 shrink-0" />;
  return <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-[10px] font-bold text-white shrink-0">{initials}</span>;
}
const TONE: Record<string, string> = {
  Verified: "bg-emerald-500/15 text-emerald-300", Active: "bg-emerald-500/15 text-emerald-300", "Closed Won": "bg-emerald-500/15 text-emerald-300",
  "In Review": "bg-sky-500/15 text-sky-300", Reviewing: "bg-sky-500/15 text-sky-300", Pending: "bg-amber-500/15 text-amber-300", "New Request": "bg-amber-500/15 text-amber-300",
  "Needs Info": "bg-amber-500/15 text-amber-300", Rejected: "bg-rose-500/15 text-rose-300", Suspended: "bg-rose-500/15 text-rose-300",
  Critical: "bg-rose-500/15 text-rose-300", High: "bg-amber-500/15 text-amber-300", Medium: "bg-sky-500/15 text-sky-300", Low: "bg-slate-500/15 text-slate-300",
};
const Badge = ({ s }: { s: string }) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TONE[s] || "bg-slate-500/15 text-slate-300"}`}>{s}</span>;
function Bar({ pct, color }: { pct: number; color: string }) { return <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} /></div>; }

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState<OnboardingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const user = getStoredUser();

  useEffect(() => { let off = false; fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/")); return () => { off = true; }; }, [router]);
  const load = useCallback(async () => { setLoading(true); try { setData(await getOnboardingOverview()); } finally { setLoading(false); } }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 6000); };

  // Growth jobs — discovery sweep + review harvest. Poll while either runs so
  // the admin watches real progress lines, and refresh the overview when done.
  const [jobs, setJobs] = useState<{ discovery: GrowthJob; harvest: GrowthJob } | null>(null);
  const anyRunning = !!(jobs?.discovery.running || jobs?.harvest.running);
  useEffect(() => {
    if (!ready) return;
    let stop = false;
    const tick = async () => {
      const j = await getGrowthJobs().catch(() => null);
      if (stop) return;
      if (j) {
        setJobs((prev) => {
          // A job just finished → pull fresh overview numbers.
          if (prev && ((prev.discovery.running && !j.discovery.running) || (prev.harvest.running && !j.harvest.running))) void load();
          return j;
        });
      }
      setTimeout(tick, j && (j.discovery.running || j.harvest.running) ? 4000 : 20000);
    };
    tick();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const runSweep = async () => {
    try { const r = await startDiscoverySweep(8); flash(r.message); setJobs(await getGrowthJobs().catch(() => null) || jobs); }
    catch (e) { flash(e instanceof Error ? e.message : "Could not start the sweep."); }
  };
  const runHarvest = async () => {
    try { const r = await startReviewHarvest(800, 120); flash(r.message); setJobs(await getGrowthJobs().catch(() => null) || jobs); }
    catch (e) { flash(e instanceof Error ? e.message : "Could not start the harvest."); }
  };

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-ink-950 text-slate-200">
      <Sidebar />
        <AgentGate agentId="onboarding" label="Provider Onboarding" accent="from-emerald-500 to-green-600" />
      <main className="flex-1 min-w-0">
        {note && <div className="fixed top-4 right-4 z-[80] rounded-xl border border-brand-500/40 bg-ink-900 px-4 py-2.5 text-[12px] text-brand-100 shadow-2xl max-w-md">{note}</div>}
        <header className="sticky top-0 z-30 h-16 border-b border-ink-800 bg-ink-950/80 backdrop-blur flex items-center gap-3 px-5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-white"><UserCheck className="w-5 h-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2"><h1 className="text-base font-bold text-white leading-tight truncate">Provider Onboarding Agent</h1><span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span> Active</span></div><p className="text-[11px] text-slate-500 truncate">Helps providers claim, verify, complete & manage their TripReview profiles</p></div>
          <div className="ml-auto flex items-center gap-2">
            {data && <span className="text-[10px] px-2 py-1 rounded-lg border border-ink-700 text-slate-400">{data.meta.totalProviders} providers</span>}
            <button onClick={runSweep} disabled={jobs?.discovery.running} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50 text-sm font-bold">
              {jobs?.discovery.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Find Providers
            </button>
            <button onClick={runHarvest} disabled={jobs?.harvest.running} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-sm font-bold">
              {jobs?.harvest.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} Harvest Reviews
            </button>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-ink-700 text-slate-300 hover:text-white hover:border-ink-600 text-sm font-medium"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <div className="w-8 h-8 rounded-full bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{(user?.name || "A").slice(0, 1)}</div>
          </div>
        </header>

        {/* Live growth-job progress — real log lines from the running job. */}
        {(anyRunning || jobs?.discovery.log.length || jobs?.harvest.log.length) ? (
          <div className="px-5 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {([["discovery", "Provider discovery sweep", jobs?.discovery], ["harvest", "Review harvest", jobs?.harvest]] as const).map(([key, label, j]) =>
              j && (j.running || j.log.length) ? (
                <div key={key} className={`rounded-xl border p-3 ${j.running ? "border-brand-500/30 bg-brand-500/5" : j.error ? "border-rose-500/30 bg-rose-500/5" : "border-ink-800 bg-ink-900/50"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {j.running ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" /> : j.error ? <XCircle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="text-[12px] font-bold text-white">{label}</span>
                    <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
                      {key === "harvest" ? `${j.stats.added ?? 0}/${j.stats.target ?? 0} reviews` : `${j.stats.created ?? 0} providers · ${j.stats.categories ?? 0} categories`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{j.progress || "—"}</div>
                  {j.running && j.log.length > 1 && (
                    <div className="mt-1.5 max-h-20 overflow-y-auto scrollbar-thin space-y-0.5">
                      {j.log.slice(-6).map((l, i) => <div key={i} className="text-[10px] text-slate-600 font-mono truncate">{l}</div>)}
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
        ) : null}

        <div className="border-b border-ink-800 px-5 overflow-x-auto scrollbar-thin"><div className="flex gap-1">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-3 text-[13px] font-medium whitespace-nowrap ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>{t}{tab === t && <motion.span layoutId="onbTab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}</button>)}</div></div>

        <div className="p-5">
          {loading || !data ? <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>
            : tab === "Overview" ? <Overview data={data} go={setTab} />
            : tab === "Claim Requests" ? <ClaimRequestsView flash={flash} reload={load} />
            : tab === "Verification Center" ? <VerificationCenterView flash={flash} reload={load} />
            : tab === "Profile Completion" ? <ProfileCompletionView flash={flash} reload={load} />

            : tab === "Service Listings" ? <ServiceListingsView flash={flash} />

            : tab === "Media Manager" ? <ProvidersTab filter="media" kind="media" flash={flash} reload={load} />
            : tab === "Subscription & Packages" ? <SubscriptionsView flash={flash} />
            : tab === "Provider Activation" ? <ProvidersTab filter="activation" kind="activation" flash={flash} reload={load} />
            : tab === "Approval Queue" ? <ApprovalQueueView flash={flash} />

            : tab === "Missing Information" ? <MissingInfoView flash={flash} />
            : tab === "Onboarding Funnel" ? <OnboardingFunnelView flash={flash} />
            : tab === "Verification Badge Center" ? <BadgeCenterView flash={flash} />

            : tab === "Provider Health Score" ? <HealthTab data={data} flash={flash} reload={load} />
            : null}
        </div>
      </main>
    </div>
  );
}

/* ============================== OVERVIEW ============================== */
function KpiCard({ icon: Icon, label, kpi, color }: { icon: React.ElementType; label: string; kpi: Kpi; color: string }) {
  return (
    <Item>
      <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/30 hover:bg-ink-900/70">
        <div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span></div>
        <div className="text-[12px] text-slate-500 mb-0.5">{label}</div>
        <div className="text-2xl font-extrabold text-white"><AnimatedNumber value={kpi.value} suffix={kpi.suffix} /></div>
        <div className="mt-1 flex items-center gap-1.5"><Trend n={kpi.trend} />{kpi.est && <span className="text-[9px] text-slate-600">(est.)</span>}</div>
      </motion.div>
    </Item>
  );
}

function Overview({ data, go }: { data: OnboardingOverview; go: (t: string) => void }) {
  const k = data.kpis;
  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);
  const FUN_COLORS = ["#818cf8", "#6366f1", "#8b5cf6", "#a855f7", "#34d399", "#10b981"];
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={FileText} label="Pending Claims" kpi={k.pendingClaims} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={UserCog} label="Profiles In Progress" kpi={k.profilesInProgress} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={ShieldCheck} label="Verification Requests" kpi={k.verificationRequests} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Users} label="Active Providers" kpi={k.activeProviders} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={PieChart} label="Completion Rate" kpi={k.completionRate} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Clock} label="Avg Onboarding Time" kpi={k.avgOnboardingDays} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      {/* Funnel + Claim Requests + Progress */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Onboarding Funnel">
          <div className="space-y-2.5">
            {data.funnel.map((f, i) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-400">{f.label}</span><span className="font-bold text-white">{f.count}</span></div>
                <Bar pct={(f.count / maxFunnel) * 100} color={FUN_COLORS[i]} />
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between"><span className="text-[12px] text-slate-400">Conversion Rate</span><span className="text-sm font-bold text-emerald-400">{data.conversionRate}%</span></div>
        </Card></FadeUp>

        <FadeUp><div className="xl:col-span-2 h-full"><Card title="Recent Claim Requests" right={<ViewAll onClick={() => go("Claim Requests")} label="View All Claim Requests" />}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px]">
              <thead><tr className="text-slate-500 text-left"><th className="font-medium py-1.5 px-2">Company</th><th className="font-medium px-2">Contact</th><th className="font-medium px-2">Submitted</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Assigned To</th></tr></thead>
              <tbody>
                {data.claimRequests.length === 0 ? <tr><td colSpan={5} className="text-center text-slate-600 py-6">No claim requests yet.</td></tr> :
                  data.claimRequests.map((c) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-ink-800/70 hover:bg-ink-800/30">
                      <td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={c.logoUrl} name={c.company} /><div className="min-w-0"><div className="font-semibold text-white truncate flex items-center gap-1">{c.company}{c.ratingCount > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300"><Star className="w-2.5 h-2.5 fill-amber-300" />{c.rating}</span>}</div><div className="text-[10px] text-slate-500 truncate">{c.category}</div></div></div></td>
                      <td className="px-2"><div className="text-slate-300 truncate max-w-[140px]">{c.contact}</div><div className="text-[10px] text-slate-500 truncate max-w-[140px]">{c.contactEmail}</div></td>
                      <td className="px-2 text-slate-400 whitespace-nowrap">{ago(c.submittedAt)}</td>
                      <td className="px-2"><Badge s={c.status} /></td>
                      <td className="px-2 text-slate-400 whitespace-nowrap">{c.assignedTo}</td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card></div></FadeUp>
      </div>

      {/* Progress slider + Verification + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><div className="xl:col-span-2"><ProgressSlider data={data} go={go} /></div></FadeUp>
        <FadeUp><Card title="Verification Overview" right={<ViewAll onClick={() => go("Verification Center")} />}>
          <div className="flex items-center gap-4">
            <Donut segments={data.verification.segments} total={data.verification.total} label="Total Requests" />
            <div className="space-y-1.5 flex-1">{data.verification.segments.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px] w-10 text-right">{s.pct}%</span></div>))}</div>
          </div>
        </Card></FadeUp>
      </div>

      {/* Missing + Categories + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Missing Information" right={<ViewAll onClick={() => go("Missing Information")} label="View All Missing Items" />}>
          {data.missingInfo.length === 0 ? <div className="text-[12px] text-slate-500 py-4">All providers have complete info. 🎉</div> :
            <div className="space-y-2">{data.missingInfo.map((m) => (<div key={m.label} className="flex items-center gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /><span className="text-slate-300 flex-1">{m.label}</span><span className="font-bold text-white">{m.count}</span><Badge s={m.severity} /></div>))}</div>}
        </Card></FadeUp>
        <FadeUp><Card title="Top Categories" right={<ViewAll onClick={() => go("Service Listings")} label="View Category Report" />}>
          <div className="flex items-center gap-4"><Donut segments={data.topCategories.items} total={data.topCategories.total} label="Active Providers" />
            <div className="space-y-1.5 flex-1">{data.topCategories.items.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div>))}</div>
          </div>
        </Card></FadeUp>
        <FadeUp><Card title="Recent Onboarding Activity">
          {data.activity.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No recent activity.</div> :
            <div className="space-y-2.5">{data.activity.map((a, i) => (<div key={i} className="flex items-start gap-2.5"><span className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 ${a.status === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}><CheckCircle2 className="w-3.5 h-3.5" /></span><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{a.title}</div><div className="text-[11px] text-slate-500 truncate">{a.detail}</div></div><span className="text-[10px] text-slate-600 whitespace-nowrap">{ago(a.at)}</span></div>))}</div>}
        </Card></FadeUp>
      </div>

      {/* Health + Plans + Next Steps + Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Provider Health Score" right={<ViewAll onClick={() => go("Provider Health Score")} label="View Report" />}>
          <div className="grid place-items-center py-1"><Gauge value={data.health.avg} label={data.health.label} /></div>
          <div className="space-y-1 mt-2">{data.health.distribution.map((d) => (<div key={d.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-slate-400 flex-1">{d.label}</span><span className="font-bold text-white">{d.count}</span></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Plan Distribution" right={<ViewAll onClick={() => go("Subscription & Packages")} />}>
          <div className="flex items-center gap-3"><Donut segments={data.plans.items} total={data.plans.total} label="Providers" />
            <div className="space-y-1 flex-1">{data.plans.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div>
          </div>
          {data.plans.source === "tier-flags" && <div className="mt-2 text-[9px] text-slate-600">From verified/featured tiers (est.) — no paid subscriptions yet.</div>}
        </Card></FadeUp>
        <FadeUp><Card title="Next Steps (AI Recommendations)">
          {data.nextSteps.length === 0 ? <div className="text-[12px] text-slate-500 py-4">All caught up. 🎉</div> :
            <div className="space-y-2">{data.nextSteps.map((s, i) => (<div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-ink-800/40"><Sparkles className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" /><span className="text-[11.5px] text-slate-300 flex-1">{s.text}</span><Badge s={s.priority} /></div>))}</div>}
        </Card></FadeUp>
        <FadeUp><Card title="Onboarding Summary" sub="This Week">
          <div className="space-y-2">
            {[
              ["Claims Submitted", data.summary.claimsSubmitted],
              ["Profiles Completed", data.summary.profilesCompleted],
              ["Providers Activated", data.summary.providersActivated],
              ["New Subscriptions", data.summary.newSubscriptions],
            ].map(([label, kpi]) => { const v = kpi as Kpi; return (<div key={label as string} className="flex items-center justify-between text-[12px]"><span className="text-slate-400">{label as string}</span><span className="flex items-center gap-2"><span className="font-bold text-white">{v.value}</span><Trend n={v.trend} /></span></div>); })}
            <div className="flex items-center justify-between text-[12px] pt-2 border-t border-ink-800"><span className="text-slate-400">Revenue Generated</span><span className="flex items-center gap-2"><span className="font-bold text-emerald-400">{mfmt(data.summary.revenueGenerated.value)}</span><Trend n={data.summary.revenueGenerated.trend} /></span></div>
          </div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* Onboarding progress — 3 cards at a time with a slider (comment #60). */
function ProgressSlider({ data, go }: { data: OnboardingOverview; go: (t: string) => void }) {
  const [i, setI] = useState(0);
  const items = data.progressProviders;
  const page = items.slice(i, i + 3);
  const canPrev = i > 0, canNext = i + 3 < items.length;
  return (
    <Card title="Onboarding Progress" right={<ViewAll onClick={() => go("Profile Completion")} label="View Full Progress" />}>
      {items.length === 0 ? <div className="text-[12px] text-slate-500 py-6">No profiles in progress.</div> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {page.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                <div className="flex items-center gap-2 mb-2"><Logo url={p.logoUrl} name={p.company} /><div className="min-w-0"><div className="text-[12px] font-semibold text-white truncate">{p.company}</div><div className="text-[10px] text-slate-500 truncate">{p.category}</div></div></div>
                <div className="relative grid place-items-center my-2"><svg viewBox="0 0 80 80" className="w-16 h-16 -rotate-90"><circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="7" /><motion.circle cx="40" cy="40" r="32" fill="none" stroke={p.strength >= 80 ? "#34d399" : p.strength >= 50 ? "#38bdf8" : "#fbbf24"} strokeWidth="7" strokeLinecap="round" initial={{ strokeDasharray: `0 ${2 * Math.PI * 32}` }} animate={{ strokeDasharray: `${(p.strength / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}` }} transition={{ duration: 0.8 }} /></svg><span className="absolute text-sm font-extrabold text-white">{p.strength}%</span></div>
                <div className="text-center text-[10px] font-semibold text-emerald-400 mb-2">{p.label}</div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">{p.checklist.map((c) => (<div key={c.key} className="flex items-center gap-1.5 text-[10.5px]">{c.status === "Complete" ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : c.status === "Pending" ? <Clock className="w-3 h-3 text-amber-400 shrink-0" /> : <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}<span className="text-slate-400 flex-1 truncate">{c.key}</span>{c.status !== "Complete" && <span className={`text-[9px] ${c.status === "Pending" ? "text-amber-400" : "text-rose-400"}`}>{c.status}</span>}</div>))}</div>
              </motion.div>
            ))}
          </div>
          {items.length > 3 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button onClick={() => setI(Math.max(0, i - 3))} disabled={!canPrev} className="w-7 h-7 rounded-lg border border-ink-700 grid place-items-center disabled:opacity-30 hover:border-ink-600"><ArrowLeft className="w-3.5 h-3.5" /></button>
              <div className="flex gap-1">{Array.from({ length: Math.ceil(items.length / 3) }).map((_, p) => <span key={p} className={`w-1.5 h-1.5 rounded-full ${p === Math.floor(i / 3) ? "bg-brand-500" : "bg-ink-700"}`} />)}</div>
              <button onClick={() => setI(Math.min(items.length - 3, i + 3))} disabled={!canNext} className="w-7 h-7 rounded-lg border border-ink-700 grid place-items-center disabled:opacity-30 hover:border-ink-600"><ArrowRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ============================== PROVIDER TABS ============================== */
function ProvidersTab({ filter, kind, flash, reload }: { filter: string; kind: string; flash: (m: string) => void; reload: () => void }) {
  const [rows, setRows] = useState<OnbProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const fetchRows = useCallback(async () => { setLoading(true); try { const r = await getOnboardingProviders({ filter, q }); setRows(r.providers); } finally { setLoading(false); } }, [filter, q]);
  useEffect(() => { fetchRows(); }, [fetchRows]);

  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => {
    setBusy(id + lbl); try { const r = await fn(); flash(r.ok ? `✓ ${r.message || "Done"}` : (r.message || "Failed")); await fetchRows(); reload(); } finally { setBusy(""); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><div className="relative flex-1 max-w-xs"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers…" className="w-full bg-ink-900 border border-ink-800 rounded-lg pl-3 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div><span className="text-[11px] text-slate-500">{rows.length} providers</span></div>
      {loading ? <div className="grid place-items-center py-24 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div> :
        rows.length === 0 ? <div className="text-center text-slate-500 py-20 text-[13px]">No providers in this view.</div> :
          <Stagger><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((p) => (
              <Item key={p.id}><motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 hover:border-ink-700">
                <div className="flex items-start gap-3">
                  <Logo url={p.logoUrl} name={p.company} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold text-white truncate">{p.company}</span><Badge s={p.status} />{p.verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400" />}</div>
                    <div className="text-[11px] text-slate-500 truncate">{p.category} · {p.contact}</div>
                  </div>
                  <ScoreDot s={kind === "profile" || kind === "media" ? p.strength : p.health} />
                </div>

                {/* per-kind body */}
                {(kind === "profile" || kind === "media" || kind === "activation") && <div className="mt-3"><div className="flex items-center justify-between text-[11px] mb-1"><span className="text-slate-500">Profile strength</span><span className="font-bold text-white">{p.strength}%</span></div><Bar pct={p.strength} color={p.strength >= 80 ? "#34d399" : p.strength >= 50 ? "#38bdf8" : "#fbbf24"} /></div>}
                {kind === "services" && <div className="mt-3 flex items-center gap-4 text-[12px]"><span className="text-slate-400 inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {p.services} listings</span><span className="text-slate-400 inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {p.rating} ({p.ratingCount})</span></div>}
                {kind === "media" && <div className="mt-2 flex items-center gap-3 text-[11px]"><span className={p.hasLogo ? "text-emerald-400" : "text-rose-400"}>{p.hasLogo ? "✓" : "✗"} Logo</span><span className={p.galleryCount >= 3 ? "text-emerald-400" : "text-amber-400"}><ImageIcon className="w-3 h-3 inline" /> {p.galleryCount} photos</span></div>}
                {kind === "verify" && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]"><Badge s={p.vstate} />{p.docs.length > 0 ? p.docs.map((d, i) => <span key={i} className="text-slate-500">{d.label}: <span className={d.status === "Verified" ? "text-emerald-400" : d.status === "Rejected" ? "text-rose-400" : "text-amber-400"}>{d.status}</span></span>) : <span className="text-slate-600">No documents uploaded</span>}</div>}
                {kind === "claims" && <div className="mt-2 flex items-center gap-2 text-[11px]"><Badge s={p.claimStatus} /><span className="text-slate-500">{p.services} listings · {p.strength}% complete</span></div>}
                {(p.missing.length > 0 && (kind === "profile")) && <div className="mt-2 flex flex-wrap gap-1">{p.missing.slice(0, 4).map((m) => <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">{m}</span>)}</div>}

                {/* actions */}
                <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-2">
                  {!p.verified && <button onClick={() => act(p.id, () => onbVerify(p.id), "v")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50">{busy === p.id + "v" ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Verify</button>}
                  {p.status !== "Active" && <button onClick={() => act(p.id, () => onbActivate(p.id), "a")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-brand-500/15 text-brand-300 text-[12px] font-semibold hover:bg-brand-500/25 disabled:opacity-50">{busy === p.id + "a" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Activate</button>}
                  {p.missing.length > 0 && <button onClick={() => act(p.id, () => onbRequestInfo(p.id, p.missing), "r")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:border-ink-600 disabled:opacity-50">{busy === p.id + "r" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Request Info</button>}
                  {kind === "verify" && p.verified && <button onClick={() => act(p.id, () => onbReject(p.id), "x")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-rose-300 text-[12px] font-semibold hover:border-rose-500/40 disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>}
                </div>
              </motion.div></Item>
            ))}
          </div></Stagger>}
    </div>
  );
}

/* ============================== MISSING / HEALTH / PLANS ============================== */
function MissingTab({ data, flash, reload }: { data: OnboardingOverview; flash: (m: string) => void; reload: () => void }) {
  return (
    <div className="space-y-4">
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.missingInfo.map((m) => (
          <Item key={m.label}><motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 text-center hover:border-ink-700"><div className="text-3xl font-extrabold text-white"><AnimatedNumber value={m.count} /></div><div className="text-[12px] text-slate-400 mt-1">{m.label}</div><div className="mt-2"><Badge s={m.severity} /></div></motion.div></Item>
        ))}
      </div></Stagger>
      <ProvidersTab filter="missing" kind="profile" flash={flash} reload={reload} />
    </div>
  );
}
function HealthTab({ data, flash, reload }: { data: OnboardingOverview; flash: (m: string) => void; reload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Average Health Score"><div className="grid place-items-center py-2"><Gauge value={data.health.avg} label={data.health.label} /></div></Card>
        <div className="lg:col-span-2"><Card title="Health Distribution"><div className="space-y-3 py-2">{data.health.distribution.map((d) => (<div key={d.label}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-400">{d.label}</span><span className="font-bold text-white">{d.count} · {d.pct}%</span></div><Bar pct={d.pct} color={d.color} /></div>))}</div></Card></div>
      </div>
      <ProvidersTab filter="health" kind="health" flash={flash} reload={reload} />
    </div>
  );
}
function PlansTab({ data, flash, reload }: { data: OnboardingOverview; flash: (m: string) => void; reload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Plan Distribution"><div className="flex items-center gap-4"><Donut segments={data.plans.items} total={data.plans.total} label="Providers" /><div className="space-y-1.5 flex-1">{data.plans.items.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div>))}</div></div>{data.plans.source === "tier-flags" && <div className="mt-3 text-[10px] text-slate-600 flex items-center gap-1"><Package className="w-3 h-3" /> Derived from verified/featured tiers — no paid subscriptions recorded yet.</div>}</Card>
        <div className="lg:col-span-2"><Card title="Revenue (This Week)"><div className="py-6 text-center"><div className="text-4xl font-extrabold text-emerald-400">{mfmt(data.summary.revenueGenerated.value)}</div><div className="mt-1"><Trend n={data.summary.revenueGenerated.trend} /></div><div className="text-[11px] text-slate-500 mt-2">{data.summary.newSubscriptions.value} new subscriptions this week</div></div></Card></div>
      </div>
      <ProvidersTab filter="plans" kind="services" flash={flash} reload={reload} />
    </div>
  );
}

/* ============================== CLAIM REQUESTS (full view) ============================== */
function LineChart({ series, color = "#a855f7", height = 64 }: { series: number[]; color: string; height?: number }) {
  const w = 280, h = height, n = series.length, max = Math.max(...series, 1);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => h - (v / max) * (h - 10) - 5;
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
      {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={color} />)}
    </svg>
  );
}
const CH_ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  WhatsApp: { icon: MessageCircle, cls: "text-emerald-400" }, Email: { icon: Mail, cls: "text-sky-400" },
  Website: { icon: Globe, cls: "text-violet-400" }, Phone: { icon: Phone, cls: "text-amber-400" },
};

function ClaimRequestsView({ flash, reload }: { flash: (m: string) => void; reload: () => void }) {
  const [d, setD] = useState<ClaimRequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");

  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getClaimRequests({ q, status, category, page, perPage: 8 })); } finally { setLoading(false); } }, [q, status, category, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, status, category]);

  // Approve a website profile-claim → grants the verified badge (via claimService).
  const approve = async (id: string) => { setBusy(id); try { const r = await onbApproveClaim(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); reload(); } finally { setBusy(""); } };
  const reject = async (id: string) => {
    const reason = window.prompt("Reject reason (emailed to the applicant, optional):", "");
    if (reason === null) return; // cancelled
    setBusy(id);
    try { const r = await onbRejectClaim(id, reason); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); reload(); } finally { setBusy(""); }
  };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;
  const from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={FileText} label="Total Claim Requests" kpi={k.total} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Sparkles} label="New Requests" kpi={k.newRequests} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Clock} label="Under Review" kpi={k.underReview} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={BadgeCheck} label="Verified" kpi={k.verified} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={XCircle} label="Rejected" kpi={k.rejected} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={Clock} label="Avg Review Time" kpi={{ ...k.avgReviewDays, suffix: " days" }} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: filters + table */}
        <div className="xl:col-span-2 space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by company, contact, email…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 h-9 text-[12px] text-slate-300 outline-none"><option value="">All Status</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 h-9 text-[12px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Company / Contact</th><th className="font-medium px-2">Category</th><th className="font-medium px-2">Channel</th><th className="font-medium px-2">Submitted</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Score</th><th className="font-medium px-2">Assigned</th><th className="font-medium px-2"></th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={8} className="text-center text-slate-600 py-10">No claim requests match.</td></tr> :
                    d.table.rows.map((r) => { const CI = CH_ICON[r.channel] || CH_ICON.Email; const Ic = CI.icon; return (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.company} /><div className="min-w-0"><div className="font-semibold text-white truncate flex items-center gap-1">{r.company}{r.ratingCount > 0 && <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300"><Star className="w-2.5 h-2.5 fill-amber-300" />{r.rating}</span>}</div><div className="text-[10px] text-slate-500 truncate">{r.contactEmail || r.location}</div></div></div></td>
                        <td className="px-2 text-slate-400">{r.category}</td>
                        <td className="px-2"><span className={`inline-flex items-center gap-1 ${CI.cls}`}><Ic className="w-3.5 h-3.5" /><span className="text-slate-400">{r.channel}</span></span></td>
                        <td className="px-2 text-slate-400 whitespace-nowrap">{ago(r.submittedAt)}</td>
                        <td className="px-2"><Badge s={r.status} /></td>
                        <td className="px-2"><div className="flex items-center gap-1.5 w-[72px]"><div className="flex-1"><Bar pct={r.score} color={r.score >= 80 ? "#34d399" : r.score >= 50 ? "#fbbf24" : "#fb7185"} /></div><span className="text-[10px] text-slate-400 w-6">{r.score}</span></div></td>
                        <td className="px-2 text-slate-400 whitespace-nowrap">{r.assignedTo}</td>
                        <td className="px-2">
                          <div className="flex items-center gap-1 justify-end">
                            {r.licenseUrl && <a href={resolveMedia(r.licenseUrl)} target="_blank" rel="noreferrer" title="View trade license" className="w-7 h-7 grid place-items-center rounded-lg bg-ink-800/60 text-slate-300 hover:bg-ink-700"><FileText className="w-3.5 h-3.5" /></a>}
                            {(r.status === "New Request" || r.status === "Under Review") ? <>
                              <button onClick={() => approve(r.id)} disabled={busy === r.id || !r.emailVerified} title={r.emailVerified ? "Approve & grant verified badge" : "Applicant must verify their email first"} className="w-7 h-7 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40">{busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}</button>
                              <button onClick={() => reject(r.id)} disabled={busy === r.id} title="Reject claim" className="w-7 h-7 grid place-items-center rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:opacity-40"><XCircle className="w-3.5 h-3.5" /></button>
                            </> : <Eye className="w-4 h-4 text-slate-600" />}
                          </div>
                        </td>
                      </motion.tr>
                    ); })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30 hover:border-ink-700"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400 hover:border-ink-700"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30 hover:border-ink-700"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <FadeUp><Card title="Claim Status Distribution">
            <div className="flex items-center gap-3"><Donut segments={d.statusDist.segments} total={d.statusDist.total} label="Total" />
              <div className="space-y-1 flex-1">{d.statusDist.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div>
            </div>
          </Card></FadeUp>
          <FadeUp><Card title="Average Review Time">
            <div className="text-3xl font-extrabold text-white"><AnimatedNumber value={d.avgReview.days} suffix=" days" /></div>
            <div className="mt-1"><Trend n={d.avgReview.trend} /></div>
            <LineChart series={d.reviewTimeSeries.map((x) => x.value)} color="#a855f7" />
          </Card></FadeUp>
          <FadeUp><Card title="Top Claim Channels">
            {d.channels.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No channels yet.</div> :
              <div className="space-y-2.5">{d.channels.map((c) => { const CI = CH_ICON[c.label] || CH_ICON.Email; const Ic = CI.icon; return (<div key={c.label}><div className="flex items-center gap-2 text-[12px] mb-1"><Ic className={`w-3.5 h-3.5 ${CI.cls}`} /><span className="text-slate-300 flex-1">{c.label}</span><span className="font-bold text-white">{c.count}</span><span className="text-slate-600 text-[10px]">{c.pct}%</span></div><Bar pct={c.pct} color={c.color} /></div>); })}</div>}
          </Card></FadeUp>
        </div>
      </div>

      {/* Bottom: charts */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Claims Over Time" sub="Last 8 days"><LineChart series={d.claimsOverTime.map((x) => x.count)} color="#818cf8" height={88} /><div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{d.claimsOverTime[0]?.label}</span><span>{d.claimsOverTime[d.claimsOverTime.length - 1]?.label}</span></div></Card></FadeUp>
        <FadeUp><Card title="Claims by Category"><div className="flex items-center gap-3"><Donut segments={d.byCategory.items} total={d.byCategory.total} label="Total" /><div className="space-y-1 flex-1">{d.byCategory.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div></div></Card></FadeUp>
        <FadeUp><Card title="Verification Score Overview">
          <div className="flex items-baseline gap-1"><AnimatedNumber value={d.scoreOverview.avg} className="text-4xl font-extrabold text-white" /><span className="text-[12px] text-slate-500">/100</span></div>
          <div className="text-[10px] text-slate-500 mb-2">Average Score</div>
          <div className="space-y-2">{d.scoreOverview.bands.map((b) => (<div key={b.label}><div className="flex items-center justify-between text-[11px] mb-0.5"><span className="text-slate-400">{b.label}</span><span className="font-bold text-white">{b.count} · {b.pct}%</span></div><Bar pct={b.pct} color={b.color} /></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Recent Activity">
          {d.activity.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No recent activity.</div> :
            <div className="space-y-2.5">{d.activity.map((a, i) => (<div key={i} className="flex items-start gap-2"><span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 mt-0.5 ${a.status === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}><CheckCircle2 className="w-3 h-3" /></span><div className="min-w-0 flex-1"><div className="text-[11.5px] text-white truncate">{a.title}</div><div className="text-[10px] text-slate-500 truncate">{a.detail} · {ago(a.at)}</div></div></div>))}</div>}
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== VERIFICATION CENTER (full view) ============================== */
function MultiLineChart({ series, labels }: { series: { points: number[]; color: string; label: string }[]; labels: string[] }) {
  const w = 300, h = 110, n = Math.max(...series.map((s) => s.points.length), 1), max = Math.max(1, ...series.flatMap((s) => s.points));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w), y = (v: number) => h - (v / max) * (h - 14) - 7;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
        {series.map((s, si) => (<g key={si}><motion.polyline points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: si * 0.12 }} />{s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={s.color} />)}</g>))}
      </svg>
      <div className="flex items-center justify-between mt-1"><div className="flex gap-3">{series.map((s) => <span key={s.label} className="inline-flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>)}</div><span className="text-[9px] text-slate-600">{labels[0]} – {labels[labels.length - 1]}</span></div>
    </div>
  );
}
const RISK: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-300" };

function VerificationCenterView({ flash, reload }: { flash: (m: string) => void; reload: () => void }) {
  const [d, setD] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [category, setCategory] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getVerificationCenter({ q, status, category, page, perPage: 8 })); } finally { setLoading(false); } }, [q, status, category, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, status, category]);
  const verify = async (id: string) => { setBusy(id); try { const r = await onbVerify(id); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); await fetchData(); reload(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;
  const maxFunnel = Math.max(...d.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-4">
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={ShieldCheck} label="Total Verifications" kpi={k.total} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Clock} label="Pending Verification" kpi={k.pending} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={BadgeCheck} label="Verified Providers" kpi={k.verified} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={XCircle} label="Rejected" kpi={k.rejected} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={PieChart} label="Verification Rate" kpi={k.rate} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Clock} label="Avg Verification Time" kpi={k.avgTime} color="bg-fuchsia-500/15 text-fuchsia-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by company, contact, email…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 h-9 text-[12px] text-slate-300 outline-none"><option value="">All Status</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2.5 h-9 text-[12px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Company / Contact</th><th className="font-medium px-2">Category</th><th className="font-medium px-2">Verification Type</th><th className="font-medium px-2">Submitted</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Score</th><th className="font-medium px-2"></th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-600 py-10">No verifications match.</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2.5 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.company} /><div className="min-w-0"><div className="font-semibold text-white truncate">{r.company}</div><div className="text-[10px] text-slate-500 truncate">{r.contactEmail || r.location}</div></div></div></td>
                        <td className="px-2 text-slate-400">{r.category}</td>
                        <td className="px-2 text-slate-300">{r.type}</td>
                        <td className="px-2 text-slate-400 whitespace-nowrap">{ago(r.submittedAt)}</td>
                        <td className="px-2"><Badge s={r.status} /></td>
                        <td className="px-2">{r.hasScore ? <div className="flex items-center gap-1.5 w-[72px]"><div className="flex-1"><Bar pct={r.score} color={r.score >= 80 ? "#34d399" : r.score >= 50 ? "#fbbf24" : "#fb7185"} /></div><span className="text-[10px] text-slate-400 w-6">{r.score}</span></div> : <span className="text-[11px] text-slate-600">—</span>}</td>
                        <td className="px-2">{r.status !== "Verified" ? <button onClick={() => verify(r.id)} disabled={busy === r.id} title="Verify" className="w-7 h-7 grid place-items-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">{busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}</button> : <Eye className="w-4 h-4 text-slate-600 mx-auto" />}</td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30 hover:border-ink-700"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400 hover:border-ink-700"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30 hover:border-ink-700"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Verification Score Distribution">
            <div className="flex items-center gap-3"><Donut segments={d.scoreDist.segments} total={d.scoreDist.total} label="Total" />
              <div className="space-y-1 flex-1">{d.scoreDist.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div>
            </div>
          </Card></FadeUp>
          <FadeUp><Card title="Verification by Type">
            <div className="space-y-2.5">{d.byType.map((t) => (<div key={t.label}><div className="flex items-center gap-2 text-[12px] mb-1"><span className="text-slate-300 flex-1">{t.label}</span><span className="font-bold text-white">{t.count}</span><span className="text-slate-600 text-[10px]">{t.pct}%</span></div><Bar pct={t.pct} color={t.color} /></div>))}</div>
          </Card></FadeUp>
          <FadeUp><Card title="AI Fraud Detection Alerts" right={d.fraudAlerts.length > 0 ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">{d.fraudAlerts.length}</span> : undefined}>
            {d.fraudAlerts.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No fraud signals detected. ✓</div> :
              <div className="space-y-2">{d.fraudAlerts.map((a, i) => (<div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-ink-800/40"><AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.risk === "High" ? "text-rose-400" : a.risk === "Medium" ? "text-amber-400" : "text-slate-400"}`} /><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{a.company}</div><div className="text-[10px] text-slate-500">{a.reason}</div></div><span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${RISK[a.risk]}`}>{a.risk} Risk</span></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Verification Funnel">
          <div className="space-y-2.5">{d.funnel.map((f, i) => (<div key={f.label}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-400">{f.label}</span><span className="font-bold text-white">{f.count} <span className="text-slate-600 text-[10px]">({d.funnel[0].count ? Math.round(f.count / d.funnel[0].count * 100) : 0}%)</span></span></div><Bar pct={(f.count / maxFunnel) * 100} color={["#818cf8", "#38bdf8", "#a855f7", "#34d399", "#fb7185"][i]} /></div>))}</div>
          <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between"><span className="text-[12px] text-slate-400">Conversion Rate</span><span className="text-sm font-bold text-emerald-400">{d.conversion}%</span></div>
        </Card></FadeUp>
        <FadeUp><Card title="Verification Trends" sub="Last 8 days">
          <MultiLineChart labels={d.trends.map((t) => t.label)} series={[{ points: d.trends.map((t) => t.submitted), color: "#38bdf8", label: "Submitted" }, { points: d.trends.map((t) => t.verified), color: "#34d399", label: "Verified" }, { points: d.trends.map((t) => t.rejected), color: "#fb7185", label: "Rejected" }]} />
        </Card></FadeUp>
        <FadeUp><Card title="Avg Verification Time" sub="By type">
          <div className="text-3xl font-extrabold text-white mb-1"><AnimatedNumber value={d.kpis.avgTime.value} suffix=" days" /></div>
          <div className="space-y-1.5 mt-2">{d.timeByType.length === 0 ? <div className="text-[11px] text-slate-600">No verified providers yet.</div> : d.timeByType.map((t) => (<div key={t.label} className="flex items-center gap-2 text-[11px]"><span className="text-slate-400 flex-1 truncate">{t.label}</span><span className="font-bold text-white">{t.days} days</span></div>))}</div>
        </Card></FadeUp>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FadeUp><Card title="Top Categories by Verification Rate">
          <div className="space-y-2.5">{d.topCatRate.map((c) => (<div key={c.label}><div className="flex items-center gap-2 text-[12px] mb-1"><span className="text-slate-300 flex-1 truncate">{c.label}</span><span className="font-bold text-white">{c.rate}%</span><span className="text-slate-600 text-[10px]">({c.verified}/{c.total})</span></div><Bar pct={c.rate} color="#34d399" /></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Verification Team Performance" sub="From activity log">
          {d.team.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No verifications recorded by agents yet. Verify a provider to populate this.</div> :
            <table className="w-full text-[12px]"><thead><tr className="text-slate-500 text-left"><th className="font-medium py-1.5">Agent</th><th className="font-medium">Verified</th><th className="font-medium">Success Rate</th><th className="font-medium">Avg Time</th></tr></thead>
              <tbody>{d.team.map((t) => (<tr key={t.agent} className="border-t border-ink-800/60"><td className="py-2 text-white font-medium">{t.agent}</td><td className="text-slate-300">{t.verified}</td><td><span className={`font-semibold ${t.successRate >= 85 ? "text-emerald-400" : t.successRate >= 70 ? "text-amber-400" : "text-slate-400"}`}>{t.successRate}%</span></td><td className="text-slate-400">{t.avgTime} days</td></tr>))}</tbody>
            </table>}
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== PROFILE COMPLETION (full view) ============================== */
const BANDS = [{ key: "", label: "All" }, { key: "complete", label: "Complete" }, { key: "progress", label: "In Progress" }, { key: "attention", label: "Needs Attention" }];

function ProfileCompletionView({ flash, reload }: { flash: (m: string) => void; reload: () => void }) {
  const [d, setD] = useState<CompletionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [band, setBand] = useState(""); const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getProfileCompletion({ q, band, page, perPage: 8 })); } finally { setLoading(false); } }, [q, band, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, band]);
  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => { setBusy(id + lbl); try { const r = await fn(); flash(r.ok ? `✓ ${r.message || "Done"}` : (r.message || "Failed")); await fetchData(); reload(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;

  return (
    <div className="space-y-4">
      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={PieChart} label="Avg Completion" kpi={k.avgCompletion} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={CheckCircle2} label="Fully Complete" kpi={k.fullyComplete} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={Clock} label="In Progress" kpi={k.inProgress} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={AlertTriangle} label="Needs Attention" kpi={k.needsAttention} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={BadgeCheck} label="Verified" kpi={k.verified} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Clock} label="Stalled (14d+)" kpi={k.stalled} color="bg-slate-500/15 text-slate-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><div className="xl:col-span-2"><Card title="Completion by Field" sub="% of providers with each field complete">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
            {d.fieldCompletion.map((f) => (<div key={f.label}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-300">{f.label}</span><span className="text-slate-500">{f.done}/{d.distribution.total} <span className="font-bold text-white">{f.pct}%</span></span></div><Bar pct={f.pct} color={f.pct >= 75 ? "#34d399" : f.pct >= 40 ? "#fbbf24" : "#fb7185"} /></div>))}
          </div>
        </Card></div></FadeUp>
        <FadeUp><Card title="Completion Distribution">
          <div className="flex items-center gap-4"><Donut segments={d.distribution.segments} total={d.distribution.total} label="Providers" />
            <div className="space-y-1.5 flex-1">{d.distribution.segments.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[11.5px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between text-[12px]"><span className="text-slate-400">Average completion</span><span className="font-bold text-white">{k.avgCompletion.value}%</span></div>
        </Card></FadeUp>
      </div>

      {/* Search + band filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers…" className="w-full bg-ink-900 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
        <div className="flex items-center gap-1">{BANDS.map((b) => <button key={b.key} onClick={() => setBand(b.key)} className={`px-3 h-9 rounded-lg text-[12px] font-medium ${band === b.key ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400 hover:text-white"}`}>{b.label}</button>)}</div>
        <span className="text-[11px] text-slate-500 ml-auto">{d.providers.total} providers</span>
      </div>

      {loading ? <div className="grid place-items-center py-16 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div> :
        d.providers.rows.length === 0 ? <div className="text-center text-slate-500 py-16 text-[13px]">No providers in this view.</div> :
          <Stagger><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {d.providers.rows.map((p) => <Item key={p.id}><CompletionCard p={p} busy={busy} act={act} /></Item>)}
          </div></Stagger>}

      {d.providers.pages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          {Array.from({ length: d.providers.pages }).slice(0, 8).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
          <button onClick={() => setPage(Math.min(d.providers.pages, page + 1))} disabled={page >= d.providers.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

function CompletionCard({ p, busy, act }: { p: CompletionRow; busy: string; act: (id: string, fn: () => Promise<{ ok: boolean; message?: string }>, lbl: string) => void }) {
  const R = 32, C = 2 * Math.PI * R, col = p.strength >= 80 ? "#34d399" : p.strength >= 50 ? "#38bdf8" : "#fbbf24";
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 hover:border-ink-700 h-full">
      <div className="flex items-start gap-3">
        <Logo url={p.logoUrl} name={p.company} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="font-semibold text-white truncate">{p.company}</span><Badge s={p.status} />{p.verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400" />}</div>
          <div className="text-[11px] text-slate-500 truncate">{p.category} · {p.contact}</div>
        </div>
        <div className="relative grid place-items-center shrink-0"><svg viewBox="0 0 80 80" className="w-16 h-16 -rotate-90"><circle cx="40" cy="40" r={R} fill="none" stroke="#1e293b" strokeWidth="7" /><motion.circle cx="40" cy="40" r={R} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${(p.strength / 100) * C} ${C}` }} transition={{ duration: 0.8 }} /></svg><span className="absolute text-[13px] font-extrabold text-white">{p.strength}%</span></div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
        {p.checklist.map((c) => (<div key={c.key} className="flex items-center gap-1.5 text-[11px]">{c.status === "Complete" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : c.status === "Pending" ? <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}<span className={`truncate ${c.status === "Complete" ? "text-slate-300" : "text-slate-500"}`}>{c.key}</span></div>))}
      </div>

      {p.missing.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{p.missing.map((m) => <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">{m}</span>)}</div>}

      <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-2">
        {p.missing.length > 0 && <button onClick={() => act(p.id, () => onbRequestInfo(p.id, p.missing), "r")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-ink-700 text-slate-300 text-[12px] font-semibold hover:border-ink-600 disabled:opacity-50">{busy === p.id + "r" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Request Info</button>}
        {!p.verified && <button onClick={() => act(p.id, () => onbVerify(p.id), "v")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 text-[12px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50">{busy === p.id + "v" ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Verify</button>}
        {p.status !== "Active" && <button onClick={() => act(p.id, () => onbActivate(p.id), "a")} disabled={!!busy} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-brand-500/15 text-brand-300 text-[12px] font-semibold hover:bg-brand-500/25 disabled:opacity-50">{busy === p.id + "a" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Activate</button>}
      </div>
    </motion.div>
  );
}

/* ============================== SERVICE LISTINGS (full view) ============================== */
const SVC_TONE: Record<string, string> = { Published: "bg-emerald-500/15 text-emerald-300", Draft: "bg-sky-500/15 text-sky-300", "Under Review": "bg-amber-500/15 text-amber-300", Inactive: "bg-rose-500/15 text-rose-300" };
const FEAT_TONE: Record<string, string> = { Featured: "bg-amber-500/15 text-amber-300", Instant: "bg-emerald-500/15 text-emerald-300", Bestseller: "bg-violet-500/15 text-violet-300" };
function SvcImg({ url, name }: { url?: string; name: string }) { return url ? <img src={url} alt={name} className="w-9 h-9 rounded-lg object-cover bg-ink-800 shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-ink-800 grid place-items-center text-slate-600 shrink-0"><Tag className="w-4 h-4" /></span>; }

function ServiceListingsView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ServiceListingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [category, setCategory] = useState(""); const [location, setLocation] = useState(""); const [provider, setProvider] = useState("");
  const [page, setPage] = useState(1); const [drawer, setDrawer] = useState<ServiceRow | null>(null);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getServiceListings({ q, status, category, location, provider, page, perPage: 8 })); } finally { setLoading(false); } }, [q, status, category, location, provider, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, status, category, location, provider]);

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      {drawer && <ListingDrawer row={drawer} onClose={() => setDrawer(null)} onChanged={() => { fetchData(); }} flash={flash} />}

      {/* What this view does */}
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Every service your providers have published on TripReview. The onboarding agent watches catalog health here — flagging listings <span className="text-slate-200">missing a price or photo</span> and <span className="text-slate-200">unpublished drafts</span> — so nothing silently blocks bookings. Edit a service to change its publish status.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={Layers} label="Total Services" kpi={k.total} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={CheckCircle2} label="Published" kpi={k.published} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={FileText} label="Draft" kpi={k.draft} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={XCircle} label="Inactive" kpi={k.inactive} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={DollarSign} label="With Pricing" kpi={k.withPricing} color="bg-amber-500/15 text-amber-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <div className="relative flex-1 min-w-[160px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by service, provider, category…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Status</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Providers</option>{d.providers.map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Service</th><th className="font-medium px-2">Provider</th><th className="font-medium px-2">Price</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Tags</th><th className="font-medium px-2">Views</th><th className="font-medium px-2">Bk</th><th className="font-medium px-2">Rating</th><th className="font-medium px-2 text-right">Edit</th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={9} className="text-center text-slate-600 py-10">No services match.</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2 px-2"><div className="flex items-center gap-2.5"><SvcImg url={r.image} name={r.name} /><div className="min-w-0"><div className="font-semibold text-white truncate">{r.name}</div><div className="text-[10px] text-slate-500 truncate">{r.category} · {r.location}</div></div></div></td>
                        <td className="px-2 text-slate-400 truncate max-w-[120px]">{r.provider}</td>
                        <td className="px-2 text-emerald-300 font-semibold whitespace-nowrap">{r.priceLabel}</td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SVC_TONE[r.status]}`}>{r.status}</span></td>
                        <td className="px-2"><div className="flex flex-wrap gap-1">{r.features.length === 0 ? <span className="text-slate-600">—</span> : r.features.map((f) => <span key={f} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${FEAT_TONE[f]}`}>{f}</span>)}</div></td>
                        <td className="px-2 text-slate-300">{kfmt(r.views)}</td>
                        <td className="px-2 text-slate-300">{r.bookings}</td>
                        <td className="px-2">{r.ratingCount > 0 ? <span className="inline-flex items-center gap-0.5 text-amber-300"><Star className="w-2.5 h-2.5 fill-amber-300" /> {r.rating}</span> : <span className="text-slate-600">—</span>}</td>
                        <td className="px-2 text-right"><button onClick={() => setDrawer(r)} title="Edit status" className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 text-slate-400 hover:text-white hover:border-ink-700 ml-auto"><Pencil className="w-3.5 h-3.5" /></button></td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Services by Category" sub="Where your catalog is concentrated">
            <div className="flex items-center gap-3"><Donut segments={d.byCategory.items} total={d.byCategory.total} label="Services" />
              <div className="space-y-1 flex-1">{d.byCategory.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div>
            </div>
          </Card></FadeUp>
          <FadeUp><Card title="Services Status Overview" sub="How many are live vs stuck">
            <div className="space-y-2.5">{d.statusOverview.map((s) => (<div key={s.label}><div className="flex items-center gap-2 text-[12px] mb-1"><span className="text-slate-300 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div><Bar pct={s.pct} color={s.color} /></div>))}</div>
          </Card></FadeUp>
          <FadeUp><Card title="Top Performing Services" sub="Most viewed this period">
            {d.topPerforming.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No services yet.</div> :
              <div className="space-y-2">{d.topPerforming.map((t, i) => (<div key={t.id} className="flex items-center gap-2.5"><span className="text-slate-600 text-[11px] w-3">{i + 1}</span><SvcImg url={t.image} name={t.name} /><div className="min-w-0 flex-1"><div className="text-[12px] text-white font-medium truncate">{t.name}</div><div className="text-[10px] text-slate-500 truncate">{t.provider}</div></div><div className="text-right"><div className="text-[11px] text-white font-bold">{kfmt(t.views)} <span className="text-slate-500 font-normal">views</span></div><div className="text-[10px] text-amber-300 inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-300" />{t.rating} · {t.bookings} bk</div></div></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Services Added Over Time" sub="Last 8 days"><LineChart series={d.addedOverTime.map((x) => x.count)} color="#818cf8" height={88} /><div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{d.addedOverTime[0]?.label}</span><span>{d.addedOverTime[d.addedOverTime.length - 1]?.label}</span></div></Card></FadeUp>
        <FadeUp><Card title="Price Range Distribution" sub="Of priced services">
          {d.priceDistribution.items.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No priced services yet.</div> :
            <div className="flex items-center gap-3"><Donut segments={d.priceDistribution.items} total={d.priceDistribution.total} label="Priced" /><div className="space-y-1 flex-1">{d.priceDistribution.items.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[10.5px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div></div>}
        </Card></FadeUp>
        <FadeUp><Card title="Services with vs without Pricing" sub="No price = far fewer bookings">
          <div className="flex items-center justify-around py-2"><div className="text-center"><div className="text-3xl font-extrabold text-emerald-400">{d.pricingSplit.withPricing}</div><div className="text-[10px] text-slate-500">With Pricing</div></div><div className="text-center"><div className="text-3xl font-extrabold text-rose-400">{d.pricingSplit.withoutPricing}</div><div className="text-[10px] text-slate-500">Without Pricing</div></div></div>
          <div className="flex h-2 rounded-full overflow-hidden mt-2"><div className="bg-emerald-500" style={{ width: `${d.pricingSplit.withPct}%` }} /><div className="bg-rose-500/60" style={{ width: `${d.pricingSplit.withoutPct}%` }} /></div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{d.pricingSplit.withPct}%</span><span>{d.pricingSplit.withoutPct}%</span></div>
        </Card></FadeUp>
        <FadeUp><Card title="AI Recommendations" sub="What to fix & why">
          {d.recommendations.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">Catalog is healthy. ✓</div> :
            <div className="space-y-2">{d.recommendations.map((r, i) => (<div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-ink-800/40"><Sparkles className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" /><span className="text-[11px] text-slate-300 flex-1">{r.text}</span><Badge s={r.impact} /></div>))}</div>}
        </Card></FadeUp>
      </div>
    </div>
  );
}

function ListingDrawer({ row, onClose, onChanged, flash }: { row: ServiceRow; onClose: () => void; onChanged: () => void; flash: (m: string) => void }) {
  const [busy, setBusy] = useState("");
  const [status, setStatusState] = useState(row.status);
  const STATES = [
    { label: "Published", desc: "Live and bookable on the site", icon: CheckCircle2, iconCls: "text-emerald-400", activeCls: "border-emerald-500/40 bg-emerald-500/10" },
    { label: "Draft", desc: "Hidden — provider still editing", icon: FileText, iconCls: "text-sky-400", activeCls: "border-sky-500/40 bg-sky-500/10" },
    { label: "Under Review", desc: "Awaiting agent/admin approval", icon: Clock, iconCls: "text-amber-400", activeCls: "border-amber-500/40 bg-amber-500/10" },
    { label: "Inactive", desc: "Taken down — not shown to users", icon: XCircle, iconCls: "text-rose-400", activeCls: "border-rose-500/40 bg-rose-500/10" },
  ];
  const setS = async (s: string) => { setBusy(s); try { const r = await setListingStatus(row.id, s); if (r.ok) { setStatusState(s); flash(`✓ ${r.message}`); onChanged(); } else flash(r.message || "Failed"); } finally { setBusy(""); } };
  const stats: [string, React.ReactNode][] = [["Provider", row.provider], ["Category", row.category], ["Location", row.location], ["Price", row.priceLabel], ["Views", kfmt(row.views)], ["Bookings", String(row.bookings)], ["Rating", row.ratingCount > 0 ? `★ ${row.rating} (${row.ratingCount})` : "No reviews"], ["Amenities listed", String(row.amenities)]];
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-[199]" onClick={onClose} />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="fixed inset-y-0 right-0 w-[min(92vw,440px)] bg-ink-950 border-l border-ink-800 z-[200] overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3"><SvcImg url={row.image} name={row.name} /><div><div className="font-bold text-white">{row.name}</div><div className="text-[11px] text-slate-500">{row.category} · {row.provider}</div></div></div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">{row.features.map((f) => <span key={f} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${FEAT_TONE[f]}`}>{f}</span>)}{!row.hasPricing && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300">No price</span>}{!row.hasCover && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">No photo</span>}</div>
        <div className="space-y-1 mb-5">{stats.map(([l, v], i) => (<div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-ink-800/60"><span className="text-slate-400">{l}</span><span className="font-semibold text-white">{v}</span></div>))}</div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Publish status</div>
        <div className="space-y-2">{STATES.map((s) => { const Ic = s.icon; const on = status === s.label; return (
          <button key={s.label} onClick={() => setS(s.label)} disabled={!!busy || on} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${on ? s.activeCls : "border-ink-800 hover:border-ink-700"}`}>
            <Ic className={`w-4 h-4 shrink-0 ${s.iconCls}`} />
            <div className="flex-1"><div className="text-[13px] font-semibold text-white">{s.label}</div><div className="text-[11px] text-slate-500">{s.desc}</div></div>
            {busy === s.label ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : on ? <CheckCircle2 className={`w-4 h-4 ${s.iconCls}`} /> : null}
          </button>
        ); })}</div>
      </motion.aside>
    </>
  );
}

/* ============================== SUBSCRIPTION & PACKAGES (full view) ============================== */
const SUB_TONE: Record<string, string> = { Active: "bg-emerald-500/15 text-emerald-300", Trialing: "bg-sky-500/15 text-sky-300", PastDue: "bg-amber-500/15 text-amber-300", Cancelled: "bg-rose-500/15 text-rose-300", Expired: "bg-rose-500/15 text-rose-300", Pending: "bg-slate-500/15 text-slate-300" };
const aed = (n: number) => `AED ${n.toLocaleString()}`;
function MoneyKpi({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: number; sub?: string; color: string }) {
  return <Item><motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-500/30"><div className="flex items-center justify-between mb-3"><span className={`w-9 h-9 rounded-xl grid place-items-center ${color}`}><Icon className="w-4.5 h-4.5" /></span></div><div className="text-[12px] text-slate-500 mb-0.5">{label}</div><div className="text-2xl font-extrabold text-white">AED <AnimatedNumber value={value} /></div><div className="mt-1 text-[10px] text-slate-500">{sub || "vs last 7 days"}</div></motion.div></Item>;
}

function SubscriptionsView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<SubPackage | null>(null);
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getSubscriptions()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;
  const maxFunnel = Math.max(...d.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-4">
      {editPlan && <PlanDrawer plan={editPlan} onClose={() => setEditPlan(null)} onSaved={() => { fetchData(); }} flash={flash} />}

      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Your subscription <span className="text-slate-200">packages</span> (the plans providers can buy) and live <span className="text-slate-200">revenue</span>. Packages are real config — edit a plan's price or status here. Subscriber, MRR and churn numbers are live from real subscriptions (they stay at 0 until providers actually subscribe — never faked).</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="Total Subscribers" kpi={k.totalSubscribers} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={CreditCard} label="Active Subscriptions" kpi={k.activeSubscriptions} color="bg-emerald-500/15 text-emerald-300" />
        <MoneyKpi icon={Wallet} label="MRR (This Month)" value={k.mrr.value} color="bg-sky-500/15 text-sky-300" />
        <MoneyKpi icon={DollarSign} label="ARR (This Year)" value={k.arr.value} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={TrendingDown} label="Churn Rate" kpi={k.churnRate} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={PieChart} label="Conversion Rate" kpi={k.conversionRate} color="bg-violet-500/15 text-violet-300" />
      </div></Stagger>

      {/* Packages + Revenue */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Subscription Packages" sub="The plans providers can subscribe to — edit price or status">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px]">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Package</th><th className="font-medium px-2">Price</th><th className="font-medium px-2">Billing</th><th className="font-medium px-2">Subs</th><th className="font-medium px-2">MRR</th><th className="font-medium px-2">Features</th><th className="font-medium px-2">Status</th><th className="font-medium px-2 text-right">Edit</th></tr></thead>
              <tbody>
                {d.packages.map((p) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                    <td className="py-2.5 px-2"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} /><span className="font-semibold text-white">{p.name}</span>{p.highlighted && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">{p.badge || "Popular"}</span>}</div></td>
                    <td className="px-2 text-white font-semibold">{aed(p.priceMonthly)}<span className="text-slate-500 font-normal text-[10px]">/mo</span></td>
                    <td className="px-2 text-slate-400">Monthly</td>
                    <td className="px-2 text-slate-300">{p.subscribers}</td>
                    <td className="px-2 text-emerald-300 font-semibold">{p.mrr ? aed(p.mrr) : "—"}</td>
                    <td className="px-2 text-slate-400">{p.featureCount} Features</td>
                    <td className="px-2"><Badge s={p.status} /></td>
                    <td className="px-2 text-right"><button onClick={() => setEditPlan(p)} title="Edit plan" className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 text-slate-400 hover:text-white hover:border-ink-700 ml-auto"><Pencil className="w-3.5 h-3.5" /></button></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[12px] text-slate-500">Showing {d.packages.length} of {d.plansCount} packages</div>
        </Card></div>

        <div className="space-y-4">
          <FadeUp><Card title="Revenue Overview" sub="MRR by plan">
            {d.revenueByPlan.segments.length === 0 ? <div className="text-[12px] text-slate-500 py-6 text-center">No revenue yet — no active paid subscriptions.</div> :
              <div className="flex items-center gap-3"><Donut segments={d.revenueByPlan.segments} total={d.revenueByPlan.total} label="MRR" /><div className="space-y-1 flex-1">{d.revenueByPlan.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{aed(s.count)}</span></div>))}</div></div>}
          </Card></FadeUp>
          <FadeUp><Card title="Upcoming Renewals" sub="Next billing dates">
            {d.upcoming.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No upcoming renewals.</div> :
              <div className="space-y-2">{d.upcoming.map((u, i) => (<div key={i} className="flex items-center gap-2.5"><Logo url={u.logoUrl} name={u.provider} /><div className="min-w-0 flex-1"><div className="text-[12px] text-white truncate">{u.provider}</div><div className="text-[10px] text-slate-500">{u.planName} Plan</div></div><span className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Repeat className="w-3 h-3" />{new Date(u.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>

      {/* Package Comparison matrix */}
      <FadeUp><Card title="Package Comparison" sub="What each plan includes">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-left border-b border-ink-800"><th className="font-medium text-slate-500 py-2 px-2">Feature</th>{d.comparison.plans.map((p, i) => <th key={p} className={`font-bold px-3 text-center ${i === 2 ? "text-violet-300" : "text-white"}`}>{p}</th>)}</tr></thead>
            <tbody>
              {d.comparison.rows.map((r) => (
                <tr key={r.feature} className="border-b border-ink-800/50"><td className="py-2 px-2 text-slate-400">{r.feature}</td>{r.values.map((v, i) => <td key={i} className={`px-3 py-2 text-center ${i === 2 ? "bg-violet-500/5" : ""}`}>{v === "✓" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : v === "—" ? <span className="text-slate-600">—</span> : <span className="text-slate-200 text-[11.5px] font-medium">{v}</span>}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card></FadeUp>

      {/* Recent subscriptions */}
      <FadeUp><Card title="Recent Subscriptions" sub="Latest providers who subscribed">
        {d.recent.length === 0 ? <div className="text-[13px] text-slate-500 py-8 text-center">No subscriptions yet — providers haven't subscribed to a paid plan. Once they do, they'll appear here with billing and renewal dates.</div> :
          <div className="overflow-x-auto -mx-1"><table className="w-full text-[12px]">
            <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Provider</th><th className="font-medium px-2">Package</th><th className="font-medium px-2">Billing</th><th className="font-medium px-2">Amount</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Start</th><th className="font-medium px-2">Renews</th></tr></thead>
            <tbody>{d.recent.map((r) => (<tr key={r.id} className="border-b border-ink-800/60 hover:bg-ink-800/30"><td className="py-2 px-2"><div className="flex items-center gap-2"><Logo url={r.logoUrl} name={r.provider} /><span className="text-white font-medium truncate">{r.provider}</span></div></td><td className="px-2 text-slate-300">{r.planName}</td><td className="px-2 text-slate-400">{r.billing}</td><td className="px-2 text-emerald-300 font-semibold">{aed(r.amount)}</td><td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SUB_TONE[r.status] || "bg-slate-500/15 text-slate-300"}`}>{r.status}</span></td><td className="px-2 text-slate-400">{r.startDate ? new Date(r.startDate).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}</td><td className="px-2 text-slate-400">{r.nextRenewal ? new Date(r.nextRenewal).toLocaleDateString("en", { month: "short", day: "numeric" }) : "—"}</td></tr>))}</tbody>
          </table></div>}
      </Card></FadeUp>

      {/* Bottom analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="MRR Trend" sub="Last 6 months"><div className="text-2xl font-extrabold text-white mb-1">{aed(k.mrr.value)}</div><LineChart series={d.mrrTrend.map((x) => x.value)} color="#818cf8" height={70} /><div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{d.mrrTrend[0]?.label}</span><span>{d.mrrTrend[d.mrrTrend.length - 1]?.label}</span></div></Card></FadeUp>
        <FadeUp><Card title="Subscription Status">
          {d.statusBreakdown.total === 0 ? <div className="text-[12px] text-slate-500 py-6 text-center">No subscriptions yet.</div> :
            <div className="flex items-center gap-3"><Donut segments={d.statusBreakdown.segments} total={d.statusBreakdown.total} label="Total" /><div className="space-y-1 flex-1">{d.statusBreakdown.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div>}
        </Card></FadeUp>
        <FadeUp><Card title="Churn Rate" sub="Cancelled vs active">
          <div className="py-4 text-center"><div className="text-4xl font-extrabold text-rose-400">{k.churnRate.value}%</div><div className="text-[11px] text-slate-500 mt-2">{k.churnRate.value === 0 ? "No cancellations yet" : "of subscriptions cancelled"}</div></div>
        </Card></FadeUp>
        <FadeUp><Card title="Conversion Funnel" sub="Providers → paying subscribers">
          <div className="space-y-2.5 mt-1">{d.funnel.map((f, i) => (<div key={f.label}><div className="flex items-center justify-between text-[12px] mb-1"><span className="text-slate-400">{f.label}</span><span className="font-bold text-white">{f.count}</span></div><Bar pct={(f.count / maxFunnel) * 100} color={["#818cf8", "#38bdf8", "#34d399"][i]} /></div>))}</div>
          <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between text-[12px]"><span className="text-slate-400">Provider → subscriber</span><span className="font-bold text-emerald-400">{k.conversionRate.value}%</span></div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

function PlanDrawer({ plan, onClose, onSaved, flash }: { plan: SubPackage; onClose: () => void; onSaved: () => void; flash: (m: string) => void }) {
  const [monthly, setMonthly] = useState(plan.priceMonthly);
  const [yearly, setYearly] = useState(plan.priceYearly);
  const [active, setActive] = useState(plan.status === "Active");
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { const r = await updateSubscriptionPlan(plan.id, { priceMonthly: Number(monthly), priceYearly: Number(yearly), active }); flash(r.ok ? `✓ ${r.message}` : (r.message || "Failed")); if (r.ok) { onSaved(); onClose(); } } finally { setBusy(false); } };
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-[199]" onClick={onClose} />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="fixed inset-y-0 right-0 w-[min(92vw,420px)] bg-ink-950 border-l border-ink-800 z-[200] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: plan.color }} /><div className="font-bold text-white text-lg">{plan.name} Plan</div></div><button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-800"><X className="w-4 h-4 text-slate-400" /></button></div>
        <div className="space-y-4">
          <div><label className="text-[12px] text-slate-400 block mb-1">Monthly price (AED)</label><input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="w-full bg-ink-900 border border-ink-800 rounded-lg px-3 h-10 text-[14px] text-white outline-none focus:border-brand-500/40" /></div>
          <div><label className="text-[12px] text-slate-400 block mb-1">Yearly price (AED)</label><input type="number" value={yearly} onChange={(e) => setYearly(Number(e.target.value))} className="w-full bg-ink-900 border border-ink-800 rounded-lg px-3 h-10 text-[14px] text-white outline-none focus:border-brand-500/40" /></div>
          <button onClick={() => setActive((v) => !v)} className={`w-full flex items-center justify-between p-3 rounded-xl border ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-ink-800"}`}><span className="text-[13px] font-semibold text-white">{active ? "Active — visible to providers" : "Inactive — hidden"}</span><span className={`w-10 h-5 rounded-full relative transition-colors ${active ? "bg-emerald-500" : "bg-ink-700"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${active ? "left-5" : "left-0.5"}`} /></span></button>
          <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-3 text-[11px] text-slate-500"><div className="flex justify-between py-0.5"><span>Subscribers</span><span className="text-white font-semibold">{plan.subscribers}</span></div><div className="flex justify-between py-0.5"><span>Current MRR</span><span className="text-white font-semibold">{aed(plan.mrr)}</span></div><div className="flex justify-between py-0.5"><span>Features</span><span className="text-white font-semibold">{plan.featureCount}</span></div></div>
          <button onClick={save} disabled={busy} className="w-full h-11 rounded-lg bg-gradient-to-r from-brand-500 to-violet-600 text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save changes</button>
        </div>
      </motion.aside>
    </>
  );
}

/* ============================== APPROVAL QUEUE (full view) ============================== */
const SLA_TONE: Record<string, string> = { "Within SLA": "bg-emerald-500/15 text-emerald-300", "SLA Warning": "bg-amber-500/15 text-amber-300", "SLA Breached": "bg-rose-500/15 text-rose-300" };
const STEP_TONE: Record<string, string> = { "Auto-Activate": "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25", Activate: "bg-brand-500/15 text-brand-300 hover:bg-brand-500/25", "Send Reminder": "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25", Escalate: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25", "Move to Review": "bg-slate-500/15 text-slate-300 hover:bg-slate-500/25" };
const STEP_ICON: Record<string, React.ElementType> = { zap: Zap, check: CheckCircle2, bell: Bell, alert: AlertTriangle, eye: Eye };
const TYPE_TONE: Record<string, string> = { Provider: "bg-violet-500/15 text-violet-300", Listing: "bg-sky-500/15 text-sky-300" };

function ApprovalQueueView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<ApprovalQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [category, setCategory] = useState(""); const [sla, setSla] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getApprovalQueue({ q, type, category, sla, page, perPage: 8 })); } finally { setLoading(false); } }, [q, type, category, sla, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, type, category, sla]);
  const runStep = async (r: QueueRow) => { setBusy(r.id); try { const res = await queueAction({ kind: r.kind, id: r.id, action: r.nextStep }); flash(res.ok ? `✓ ${res.message}` : (res.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Providers and listings moving through activation. The agent auto-activates items within <span className="text-slate-200">SLA</span>, nudges those running late, and escalates breaches. Each row's <span className="text-slate-200">Next Step</span> is a live action — click it to run it.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={BadgeCheck} label="Total Approved" kpi={k.totalApproved} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Zap} label="Ready for Activation" kpi={k.readyForActivation} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={CheckCircle2} label="Auto-Activated (7d)" kpi={k.autoActivated} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Clock} label="Pending Activation" kpi={k.pendingActivation} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={Clock} label="Avg Time in Queue" kpi={k.avgTimeInQueue} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={AlertTriangle} label="SLA Breached" kpi={k.slaBreached} color="bg-rose-500/15 text-rose-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <div className="relative flex-1 min-w-[160px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers, listings, ref…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={type} onChange={(e) => setType(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Types</option>{d.types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={sla} onChange={(e) => setSla(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">SLA Status</option>{d.slas.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Provider / Listing</th><th className="font-medium px-2">Type</th><th className="font-medium px-2">Approved By</th><th className="font-medium px-2">SLA</th><th className="font-medium px-2">In Queue</th><th className="font-medium px-2">Next Step</th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={6} className="text-center text-slate-600 py-10">No items in queue.</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.name} /><div className="min-w-0"><div className="font-semibold text-white truncate">{r.name}</div><div className="text-[10px] text-slate-500 truncate font-mono">{r.ref} · {r.category}</div></div></div></td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${TYPE_TONE[r.kind]}`}>{r.kind}</span></td>
                        <td className="px-2 text-slate-400 truncate max-w-[110px]">{r.approvedBy}</td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SLA_TONE[r.slaStatus]}`}>{r.slaStatus.replace("SLA ", "")}</span></td>
                        <td className="px-2 text-slate-300 whitespace-nowrap">{r.timeInQueue}d</td>
                        <td className="px-2"><button onClick={() => runStep(r)} disabled={busy === r.id} className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-semibold disabled:opacity-50 ${STEP_TONE[r.nextStep] || "bg-slate-500/15 text-slate-300"}`}>{busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{r.nextStep}</button></td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} items</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Approval Trend" sub="Approved per day"><LineChart series={d.approvalTrend.map((x) => x.count)} color="#818cf8" height={70} /></Card></FadeUp>
          <FadeUp><Card title="By Type"><div className="flex items-center gap-3"><Donut segments={d.byType.segments} total={d.byType.total} label="Total" /><div className="space-y-1 flex-1">{d.byType.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>))}</div></div></Card></FadeUp>
          <FadeUp><Card title="SLA Status"><div className="flex items-center gap-3"><Donut segments={d.slaStatus.segments} total={d.slaStatus.total} label="Total" /><div className="space-y-1 flex-1">{d.slaStatus.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div></Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <FadeUp><Card title="Queue Insights">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-[10px] text-slate-500">Fastest Approval</div><div className="text-[13px] font-bold text-white truncate">{d.queueInsights.fastest?.name || "—"}</div><div className="text-[11px] text-emerald-400">{d.queueInsights.fastest?.dur || "—"}</div></div>
            <div><div className="text-[10px] text-slate-500">Slowest Approval</div><div className="text-[13px] font-bold text-white truncate">{d.queueInsights.slowest?.name || "—"}</div><div className="text-[11px] text-rose-400">{d.queueInsights.slowest?.dur || "—"}</div></div>
            <div><div className="text-[10px] text-slate-500">Most Approvals By</div><div className="text-[13px] font-bold text-white truncate">{d.queueInsights.mostApprovalsBy?.name || "—"}</div><div className="text-[11px] text-slate-400">{d.queueInsights.mostApprovalsBy?.count || 0} approvals</div></div>
            <div><div className="text-[10px] text-slate-500">Auto-Activation Rate</div><div className="text-[20px] font-extrabold text-white">{d.queueInsights.autoActivationRate}%</div></div>
          </div>
        </Card></FadeUp>
        <FadeUp><Card title="Recent Activity">
          {d.activity.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No recent activity.</div> :
            <div className="space-y-2">{d.activity.map((a, i) => (<div key={i} className="flex items-start gap-2"><span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 mt-0.5 ${a.status === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}><CheckCircle2 className="w-3 h-3" /></span><div className="min-w-0 flex-1"><div className="text-[11.5px] text-white truncate">{a.title}</div><div className="text-[10px] text-slate-500 truncate">{a.detail} · {a.by} · {ago(a.at)}</div></div></div>))}</div>}
        </Card></FadeUp>
        <FadeUp><Card title="SLA Compliance" sub="Within target"><div className="grid place-items-center py-1"><Gauge value={d.slaCompliance} label={`${d.slaCompliance}% Within SLA`} /></div><div className="space-y-1 mt-1">{d.slaStatus.segments.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.pct}%</span></div>))}</div></Card></FadeUp>
        <FadeUp><Card title="Next Steps" sub="Pending actions in the queue">
          {d.nextSteps.length === 0 ? <div className="text-[12px] text-slate-500 py-2">Queue is clear. ✓</div> :
            <div className="space-y-2">{d.nextSteps.map((s) => { const Ic = STEP_ICON[s.icon] || Zap; return (<div key={s.label} className="flex items-center gap-2.5 text-[12px]"><span className="w-6 h-6 rounded-lg bg-ink-800 grid place-items-center text-slate-300"><Ic className="w-3.5 h-3.5" /></span><span className="text-slate-300 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span></div>); })}</div>}
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== MISSING INFORMATION (full view) ============================== */
const MISS_TONE: Record<string, string> = { Overdue: "bg-rose-500/15 text-rose-300", "Due Today": "bg-amber-500/15 text-amber-300", Pending: "bg-amber-500/15 text-amber-300", Upcoming: "bg-sky-500/15 text-sky-300" };

function MissingInfoView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<MissingInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [field, setField] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getMissingInformation({ q, category, field, status, page, perPage: 8 })); } finally { setLoading(false); } }, [q, category, field, status, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, category, field, status]);
  const remind = async (r: MissingRow) => { setBusy(r.id); try { const res = await onbRequestInfo(r.id, r.missingFields); flash(res.ok ? `✓ Reminder sent to ${r.name} (${r.missingCount} fields)` : (res.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Every required field or document a provider hasn't supplied yet. The agent sends <span className="text-slate-200">auto-reminders</span> as items go overdue. Click <span className="text-slate-200">Send Reminder</span> on a row to nudge a provider for their missing fields right now.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={AlertTriangle} label="Providers Missing Info" kpi={k.providersMissingInfo} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={FileText} label="Total Missing Fields" kpi={k.totalMissingFields} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={PieChart} label="Avg Missing / Provider" kpi={k.avgMissingPerProvider} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={Clock} label="Overdue Providers" kpi={k.overdueProviders} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Send} label="Auto-Reminders (7d)" kpi={k.autoRemindersSent} color="bg-emerald-500/15 text-emerald-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <div className="relative flex-1 min-w-[150px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers, ref…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={field} onChange={(e) => setField(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Missing Fields</option>{d.fields.map((f) => <option key={f} value={f}>{f}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Statuses</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Provider</th><th className="font-medium px-2">Missing Fields</th><th className="font-medium px-2">Count</th><th className="font-medium px-2">Overdue</th><th className="font-medium px-2">Last Reminder</th><th className="font-medium px-2">Status</th><th className="font-medium px-2 text-right">Action</th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-600 py-10">No missing information. 🎉</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.name} /><div className="min-w-0"><div className="font-semibold text-white truncate">{r.name}</div><div className="text-[10px] text-slate-500 truncate font-mono">{r.ref} · {r.category}</div></div></div></td>
                        <td className="px-2"><div className="flex flex-wrap gap-1 max-w-[200px]">{r.missingFields.slice(0, 2).map((f) => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">{f}</span>)}{r.missingCount > 2 && <span className="text-[10px] text-slate-500">+{r.missingCount - 2} more</span>}</div></td>
                        <td className="px-2 text-white font-bold">{r.missingCount}</td>
                        <td className="px-2"><span className={`font-bold ${r.daysOverdue > 0 ? "text-rose-400" : "text-emerald-400"}`}>{r.daysOverdue > 0 ? r.daysOverdue : r.daysOverdue}</span></td>
                        <td className="px-2 text-slate-400 whitespace-nowrap">{r.lastReminder ? ago(r.lastReminder) : "—"}</td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MISS_TONE[r.status] || "bg-slate-500/15 text-slate-300"}`}>{r.status}</span></td>
                        <td className="px-2 text-right"><button onClick={() => remind(r)} disabled={busy === r.id} title="Send reminder" className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-brand-500/15 text-brand-300 text-[11px] font-semibold hover:bg-brand-500/25 disabled:opacity-50 ml-auto">{busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Remind</button></td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} providers</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Missing Information Summary" sub="By document type">
            <div className="flex items-center gap-3"><Donut segments={d.summary.segments} total={d.summary.total} label="Total Fields" /><div className="space-y-1 flex-1">{d.summary.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div>
          </Card></FadeUp>
          <FadeUp><Card title="Missing by Category" sub="By provider category">
            <div className="space-y-2">{d.byCategory.map((c) => (<div key={c.label}><div className="flex items-center gap-2 text-[11.5px] mb-0.5"><span className="text-slate-300 flex-1 truncate">{c.label}</span><span className="font-bold text-white">{c.count}</span><span className="text-slate-600 text-[10px]">{c.pct}%</span></div><Bar pct={c.pct} color={c.color} /></div>))}</div>
          </Card></FadeUp>
          <FadeUp><Card title="Top Missing Fields">
            <div className="space-y-1.5">{d.topFields.slice(0, 8).map((f) => (<div key={f.label} className="flex items-center gap-2 text-[11.5px]"><span className="text-slate-300 flex-1 truncate">{f.label}</span><span className="font-bold text-white">{f.count}</span><span className="text-slate-600 text-[10px]">{f.pct}%</span></div>))}</div>
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Missing by SLA Status">
          <div className="flex items-center gap-3"><Donut segments={d.sla.segments} total={d.sla.total} label="Providers" /><div className="space-y-1.5 flex-1">{d.sla.segments.map((s) => (<div key={s.label} className="flex items-center gap-2 text-[12px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[10px]">{s.pct}%</span></div>))}</div></div>
        </Card></FadeUp>
        <FadeUp><Card title="Recent Reminders Sent">
          {d.recentReminders.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No reminders sent yet. Use the Remind button on a row.</div> :
            <div className="space-y-2">{d.recentReminders.map((r, i) => (<div key={i} className="flex items-center gap-2.5 text-[11.5px]"><Logo url={r.logoUrl} name={r.provider} /><div className="min-w-0 flex-1"><div className="text-white truncate">{r.provider}</div><div className="text-[10px] text-slate-500 truncate">{r.fields} fields · {ago(r.sentOn)}</div></div><span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{r.status}</span></div>))}</div>}
        </Card></FadeUp>
        <FadeUp><Card title="Automation Insights">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5"><span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 grid place-items-center shrink-0"><CheckCircle2 className="w-4 h-4" /></span><div><div className="text-[12px] font-semibold text-white">Auto-Reminders {d.automation.enabled ? "Enabled" : "Off"}</div><div className="text-[11px] text-slate-500">{d.automation.remindersThisWeek} reminders sent this week to overdue providers.</div></div></div>
            <div className="flex items-start gap-2.5"><span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 grid place-items-center shrink-0"><AlertTriangle className="w-4 h-4" /></span><div><div className="text-[12px] font-semibold text-white">Most Missing Field</div><div className="text-[11px] text-slate-500">{d.automation.mostMissingField ? `${d.automation.mostMissingField.name} — missing in ${d.automation.mostMissingField.count} records.` : "None"}</div></div></div>
            <div className="flex items-start gap-2.5"><span className="w-7 h-7 rounded-lg bg-brand-500/15 text-brand-300 grid place-items-center shrink-0"><Sparkles className="w-4 h-4" /></span><div><div className="text-[12px] font-semibold text-white">Suggestion</div><div className="text-[11px] text-slate-500">{d.automation.suggestion}</div></div></div>
          </div>
        </Card></FadeUp>
      </div>
    </div>
  );
}

/* ============================== ONBOARDING FUNNEL (full view) ============================== */
function OnboardingFunnelView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getOnboardingFunnel()); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  const remind = async (id: string, name: string) => { setBusy(id); try { const r = await onbRequestInfo(id, []); flash(r.ok ? `✓ Reminder sent to ${name}` : (r.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis;
  const STEP_ICONS = [Users, FileText, ShieldCheck, Layers, Search, BadgeCheck];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">The real journey every provider takes — from registration to going live. Each stage count is computed from actual completed steps, so you can see exactly <span className="text-slate-200">where providers drop off</span> and why.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="Total Started" kpi={k.totalStarted} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={BadgeCheck} label="Completed Onboarding" kpi={k.completedOnboarding} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={PieChart} label="Conversion Rate" kpi={k.conversionRate} color="bg-sky-500/15 text-sky-300" />
        <KpiCard icon={TrendingDown} label="Dropped Off" kpi={k.droppedOff} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={Clock} label="Avg Time to Activate" kpi={k.avgTimeToActivate} color="bg-violet-500/15 text-violet-300" />
        <KpiCard icon={Zap} label="Currently in Progress" kpi={k.inProgress} color="bg-amber-500/15 text-amber-300" />
      </div></Stagger>

      {/* Funnel chevrons */}
      <FadeUp><Card title="Onboarding Funnel Overview" sub="Providers reaching each stage">
        <div className="flex flex-wrap gap-2 mt-1">
          {d.funnel.map((s, i) => { const Ic = STEP_ICONS[i]; return (
            <div key={s.key} className="flex items-center gap-2 flex-1 min-w-[140px]">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex-1 rounded-xl p-3 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.color}28, ${s.color}10)`, border: `1px solid ${s.color}40` }}>
                <div className="flex items-center justify-center gap-1.5 mb-1"><span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-bold text-white" style={{ background: s.color }}>{s.key}</span><Ic className="w-3.5 h-3.5" style={{ color: s.color }} /></div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">{s.name}</div>
                <div className="text-xl font-extrabold text-white mt-1"><AnimatedNumber value={s.count} /></div>
                <div className="text-[10px] font-semibold" style={{ color: s.color }}>{s.pct}%</div>
              </motion.div>
              {i < 5 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden xl:block" />}
            </div>
          ); })}
        </div>
        {/* Drop-off row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-ink-800">
          {d.dropoff.map((dp) => (<div key={dp.dropStage} className="text-center"><div className="text-[10px] text-slate-500">Drop-off</div><div className="text-[15px] font-bold text-rose-400">{dp.count}</div><div className="text-[10px] text-slate-600">{dp.pct}%</div></div>))}
        </div>
        <div className="mt-3 pt-3 border-t border-ink-800 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="text-slate-400">Overall Conversion: <span className="font-bold text-emerald-400">{d.overallConversion}%</span></span>
          <span className="text-slate-400">Total Drop-off: <span className="font-bold text-rose-400">{d.totalDropoff} ({pct100(d.totalDropoff, k.totalStarted.value)}%)</span></span>
        </div>
      </Card></FadeUp>

      {/* Trend + Stage performance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><div className="xl:col-span-2"><Card title="Funnel Conversion Trend" sub="Conversion rate over time"><LineChart series={d.trend.map((t) => t.value)} color="#818cf8" height={120} /><div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{d.trend[0]?.label}</span><span>{d.trend[d.trend.length - 1]?.label}</span></div></Card></div></FadeUp>
        <FadeUp><Card title="Stage Performance">
          <table className="w-full text-[11.5px]"><thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1.5">Stage</th><th className="font-medium">Conv.</th><th className="font-medium">Drop</th></tr></thead>
            <tbody>{d.stagePerf.map((s) => (<tr key={s.num} className="border-t border-ink-800/60"><td className="py-1.5"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-300 truncate">{s.stage}</span></span></td><td className="text-white font-semibold">{s.conversionRate}%</td><td className="text-rose-400">{s.dropRate}%</td></tr>))}</tbody>
          </table>
        </Card></FadeUp>
      </div>

      {/* Drop-off analysis + reasons + time */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Drop-off Analysis" sub="Where providers leave">
          {d.dropAnalysis.segments.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-6 text-center">No drop-offs — everyone completed! 🎉</div> :
            <div className="flex items-center gap-3"><Donut segments={d.dropAnalysis.segments} total={d.dropAnalysis.total} label="Drop-offs" /><div className="space-y-1 flex-1">{d.dropAnalysis.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div>}
        </Card></FadeUp>
        <FadeUp><Card title="Top Drop-off Reasons">
          {d.topReasons.length === 0 ? <div className="text-[12px] text-slate-500 py-4">No drop-offs recorded.</div> :
            <table className="w-full text-[12px]"><thead><tr className="text-slate-500 text-left"><th className="font-medium pb-1.5">Reason</th><th className="font-medium text-right">Drop-offs</th><th className="font-medium text-right">%</th></tr></thead>
              <tbody>{d.topReasons.map((r) => (<tr key={r.reason} className="border-t border-ink-800/60"><td className="py-1.5 text-slate-300">{r.reason}</td><td className="text-right text-white font-semibold">{r.count}</td><td className="text-right text-slate-500">{r.pct}%</td></tr>))}</tbody>
            </table>}
        </Card></FadeUp>
        <FadeUp><Card title="Time to Activate" sub="Average per day">
          <div className="text-3xl font-extrabold text-white mb-1"><AnimatedNumber value={d.avgTimeToActivate} suffix=" days" /></div>
          <LineChart series={d.timeTrend.map((t) => t.value)} color="#34d399" height={80} />
        </Card></FadeUp>
      </div>

      {/* Journey + insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Card title="Onboarding Journey" sub="Providers mid-onboarding right now">
          {d.journey.length === 0 ? <div className="text-[13px] text-slate-500 py-8 text-center">No providers in progress — all activated. 🎉</div> :
            <div className="overflow-x-auto -mx-1"><table className="w-full text-[12px]">
              <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Provider</th><th className="font-medium px-2">Current Stage</th><th className="font-medium px-2">Progress</th><th className="font-medium px-2">In Stage</th><th className="font-medium px-2">Next Step</th><th className="font-medium px-2 text-right">Action</th></tr></thead>
              <tbody>{d.journey.map((j) => (<tr key={j.id} className="border-b border-ink-800/60 hover:bg-ink-800/30"><td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={j.logoUrl} name={j.name} /><span className="font-semibold text-white truncate">{j.name}</span></div></td><td className="px-2 text-slate-300">{j.stage}</td><td className="px-2"><div className="flex items-center gap-1.5 w-[80px]"><div className="flex-1"><Bar pct={j.progress} color={j.progress >= 60 ? "#34d399" : "#fbbf24"} /></div><span className="text-[10px] text-slate-400 w-6">{j.progress}%</span></div></td><td className="px-2 text-slate-400 whitespace-nowrap">{j.timeInStage}d</td><td className="px-2 text-slate-400 truncate max-w-[140px]">{j.nextStep}</td><td className="px-2 text-right"><button onClick={() => remind(j.id, j.name)} disabled={busy === j.id} title="Send reminder" className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-brand-500/15 text-brand-300 text-[11px] font-semibold hover:bg-brand-500/25 disabled:opacity-50 ml-auto">{busy === j.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Nudge</button></td></tr>))}</tbody>
            </table></div>}
        </Card></div>
        <FadeUp><Card title="Insights & Actions">
          {d.insights.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">Funnel is healthy. ✓</div> :
            <div className="space-y-2.5">{d.insights.map((ins, i) => { const Ic = ins.icon === "alert" ? AlertTriangle : ins.icon === "bell" ? Bell : Info; return (<div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-ink-800/40"><Ic className={`w-4 h-4 mt-0.5 shrink-0 ${ins.icon === "alert" ? "text-rose-400" : ins.icon === "bell" ? "text-amber-400" : "text-brand-400"}`} /><span className="text-[12px] text-slate-300">{ins.text}</span></div>); })}</div>}
        </Card></FadeUp>
      </div>
    </div>
  );
}
function pct100(n: number, d: number) { return d > 0 ? Math.round((n / d) * 1000) / 10 : 0; }

/* ============================== VERIFICATION BADGE CENTER (full view) ============================== */
const BADGE_TONE: Record<string, string> = { "Verified Partner": "bg-emerald-500/15 text-emerald-300", "Premium Partner": "bg-violet-500/15 text-violet-300", "Top Rated": "bg-amber-500/15 text-amber-300", "Trusted Provider": "bg-sky-500/15 text-sky-300", "Other Badges": "bg-slate-500/15 text-slate-300" };
const VSTAT_TONE: Record<string, string> = { Verified: "bg-emerald-500/15 text-emerald-300", Pending: "bg-amber-500/15 text-amber-300", "Revision Required": "bg-violet-500/15 text-violet-300", Rejected: "bg-rose-500/15 text-rose-300" };
const PRIO_TONE: Record<string, string> = { High: "bg-rose-500/15 text-rose-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-slate-500/15 text-slate-300" };

function BadgeCenterView({ flash }: { flash: (m: string) => void }) {
  const [d, setD] = useState<BadgeCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [badgeType, setBadgeType] = useState(""); const [status, setStatus] = useState(""); const [category, setCategory] = useState("");
  const [page, setPage] = useState(1); const [busy, setBusy] = useState("");
  const fetchData = useCallback(async () => { setLoading(true); try { setD(await getBadgeCenter({ q, badgeType, status, category, page, perPage: 8 })); } finally { setLoading(false); } }, [q, badgeType, status, category, page]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [q, badgeType, status, category]);
  const verify = async (r: BadgeRow) => { setBusy(r.id); try { const res = await onbVerify(r.id); flash(res.ok ? `✓ ${r.name} verified — badge granted` : (res.message || "Failed")); await fetchData(); } finally { setBusy(""); } };

  if (loading && !d) return <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!d) return null;
  const k = d.kpis, from = (d.table.page - 1) * d.table.perPage;
  const STAT_C: Record<string, string> = { Verified: "#34d399", Pending: "#fbbf24", "Revision Required": "#8b5cf6", Rejected: "#fb7185" };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-400">Verification badge requests and the trust badges providers have earned (Verified / Premium / Top Rated / Trusted). Review a request and click <span className="text-slate-200">Grant Badge</span> to verify the provider and award the badge.</p>
      </div>

      <Stagger><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard icon={ShieldCheck} label="Total Requests" kpi={k.totalRequests} color="bg-brand-500/15 text-brand-300" />
        <KpiCard icon={Clock} label="Pending Verification" kpi={k.pendingVerification} color="bg-amber-500/15 text-amber-300" />
        <KpiCard icon={BadgeCheck} label="Verified (7d)" kpi={k.verifiedThisWeek} color="bg-emerald-500/15 text-emerald-300" />
        <KpiCard icon={XCircle} label="Rejected (7d)" kpi={k.rejectedThisWeek} color="bg-rose-500/15 text-rose-300" />
        <KpiCard icon={PieChart} label="Verification Rate" kpi={k.verificationRate} color="bg-sky-500/15 text-sky-300" />
      </div></Stagger>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <div className="relative flex-1 min-w-[150px]"><Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search providers or request ID…" className="w-full bg-ink-950 border border-ink-800 rounded-lg pl-8 pr-3 h-9 text-[13px] text-slate-200 outline-none focus:border-brand-500/40" /></div>
              <select value={badgeType} onChange={(e) => setBadgeType(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Badge Types</option>{d.badgeTypes.map((b) => <option key={b} value={b}>{b}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Statuses</option>{d.statuses.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-lg px-2 h-9 text-[11px] text-slate-300 outline-none"><option value="">All Categories</option>{d.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead><tr className="text-slate-500 text-left border-b border-ink-800"><th className="font-medium py-2 px-2">Provider</th><th className="font-medium px-2">Badge</th><th className="font-medium px-2">Request ID</th><th className="font-medium px-2">Requested</th><th className="font-medium px-2">Status</th><th className="font-medium px-2">Priority</th><th className="font-medium px-2 text-right">Action</th></tr></thead>
                <tbody>
                  {d.table.rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-600 py-10">No requests match.</td></tr> :
                    d.table.rows.map((r) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-ink-800/60 hover:bg-ink-800/30">
                        <td className="py-2 px-2"><div className="flex items-center gap-2.5"><Logo url={r.logoUrl} name={r.name} /><div className="min-w-0"><div className="font-semibold text-white truncate">{r.name}</div><div className="text-[10px] text-slate-500 truncate">{r.category} · {r.location}</div></div></div></td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${BADGE_TONE[r.badge]}`}>{r.badge}</span></td>
                        <td className="px-2 text-slate-500 font-mono text-[11px]">{r.requestId}</td>
                        <td className="px-2 text-slate-400 whitespace-nowrap">{ago(r.requestedOn)}</td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${VSTAT_TONE[r.status]}`}>{r.status}</span></td>
                        <td className="px-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${PRIO_TONE[r.priority]}`}>{r.priority}</span></td>
                        <td className="px-2 text-right">{r.verified ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><BadgeCheck className="w-3.5 h-3.5" /> Granted</span> : <button onClick={() => verify(r)} disabled={busy === r.id} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/25 disabled:opacity-50 ml-auto">{busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />} Grant Badge</button>}</td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
              <span>Showing {d.table.total === 0 ? 0 : from + 1} to {Math.min(from + d.table.perPage, d.table.total)} of {d.table.total} requests</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                {Array.from({ length: d.table.pages }).slice(0, 6).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`w-7 h-7 rounded-lg text-[11px] ${page === i + 1 ? "bg-brand-600 text-white" : "border border-ink-800 text-slate-400"}`}>{i + 1}</button>)}
                <button onClick={() => setPage(Math.min(d.table.pages, page + 1))} disabled={page >= d.table.pages} className="w-7 h-7 grid place-items-center rounded-lg border border-ink-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FadeUp><Card title="Verification Overview"><div className="flex items-center gap-3"><Donut segments={d.overview.segments} total={d.overview.total} label="Requests" /><div className="space-y-1 flex-1">{d.overview.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div></Card></FadeUp>
          <FadeUp><Card title="Verification Rate Trend" sub="Last 8 days"><LineChart series={d.rateTrend.map((t) => t.value)} color="#818cf8" height={70} /></Card></FadeUp>
          <FadeUp><Card title="Top Rejected Reasons">
            {d.topRejected.length === 0 ? <div className="text-[12px] text-emerald-400/80 py-2">No rejections. ✓</div> :
              <div className="space-y-1.5">{d.topRejected.map((r) => (<div key={r.reason} className="flex items-center gap-2 text-[11.5px]"><span className="text-slate-300 flex-1 truncate">{r.reason}</span><span className="font-bold text-white">{r.count}</span><span className="text-slate-600 text-[10px]">{r.pct}%</span></div>))}</div>}
          </Card></FadeUp>
          <FadeUp><Card title="Recent Activity">
            {d.activity.length === 0 ? <div className="text-[12px] text-slate-500 py-2">No activity.</div> :
              <div className="space-y-2">{d.activity.map((a, i) => (<div key={i} className="flex items-start gap-2"><span className={`w-5 h-5 rounded-md grid place-items-center shrink-0 mt-0.5 ${a.status === "failure" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>{a.status === "failure" ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}</span><div className="min-w-0 flex-1"><div className="text-[11.5px] text-white truncate">{a.title}</div><div className="text-[10px] text-slate-500 truncate">{a.detail} · {ago(a.at)}</div></div></div>))}</div>}
          </Card></FadeUp>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FadeUp><Card title="Badge Types Distribution" sub="Earned trust badges">
          <div className="flex items-center gap-3"><Donut segments={d.badgeDistribution.segments} total={d.badgeDistribution.total} label="Total" /><div className="space-y-1 flex-1">{d.badgeDistribution.segments.map((s) => (<div key={s.label} className="flex items-center gap-1.5 text-[11px]"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-slate-400 flex-1 truncate">{s.label}</span><span className="font-bold text-white">{s.count}</span><span className="text-slate-600 text-[9px]">{s.pct}%</span></div>))}</div></div>
        </Card></FadeUp>
        <FadeUp><Card title="Verification by Category" sub="Status mix per category">
          <div className="flex items-center gap-3 mb-2 text-[9px]">{["Verified", "Pending", "Revision Required", "Rejected"].map((l) => <span key={l} className="inline-flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ background: STAT_C[l] }} />{l}</span>)}</div>
          <div className="space-y-2.5">{d.byCategory.map((c) => (<div key={c.category}><div className="flex items-center justify-between text-[11.5px] mb-1"><span className="text-slate-300">{c.category}</span><span className="text-slate-500">{c.total}</span></div><div className="flex h-2 rounded-full overflow-hidden bg-ink-800">{(["Verified", "Pending", "Revision Required", "Rejected"] as const).map((s) => c[s] > 0 && <div key={s} style={{ width: `${(c[s] / c.total) * 100}%`, background: STAT_C[s] }} />)}</div></div>))}</div>
        </Card></FadeUp>
        <FadeUp><Card title="Average Verification Time" sub="Per day"><div className="text-3xl font-extrabold text-white mb-1"><AnimatedNumber value={d.avgTime} suffix=" days" /></div><LineChart series={d.timeTrend.map((t) => t.value)} color="#34d399" height={80} /></Card></FadeUp>
      </div>
    </div>
  );
}
