"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate, Loader2, Sparkles, Globe, ExternalLink, Send, X, CheckCircle2,
  AlertTriangle, Wand2, Users, ArrowRight, Search, PenLine, Megaphone, Bot,
  Database, Lock, HelpCircle, Rocket, ChevronRight, Wrench,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AgentGate from "@/components/AgentGate";
import { FadeUp, Stagger, Item, motion } from "@/components/motion";
import {
  fetchMe, getStoredUser, listLandingPages, getLandingPageById, generateLandingPage,
  editLandingPageAI, publishLandingPage, getPageTemplate, reviewLandingPage, applyLandingAdvice,
  type GeneratedPage, type LandingPageFull, type TemplateBlock, type LandingTeamMember,
  type LandingReview, type LandingFinding, type LandingChange,
} from "@/lib/api";

const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tripreview.ae").replace(/\/+$/, "");
const CATEGORIES = ["auto", "Cars", "Yachts", "AirportTransfer", "Activities", "General"] as const;
const TABS = ["Live Template", "Agent Copy", "Team Review"] as const;
type Tab = (typeof TABS)[number];

const AGENT_ICON: Record<string, React.ElementType> = { seo: Search, marketing: Megaphone, copywriter: PenLine, publisher: Send };
// What fills each block on the live page. This is the honest split — the admin
// needs to know what the agents can and cannot touch.
const SOURCE_META: Record<string, { label: string; hint: string; cls: string; Icon: React.ElementType }> = {
  ai: { label: "Agent copy", hint: "Written by the agents — editable here", cls: "bg-brand-500/10 text-brand-300 border-brand-500/25", Icon: Sparkles },
  live: { label: "Live data", hint: "Pulled from the marketplace when the page loads", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25", Icon: Database },
  static: { label: "Fixed", hint: "Same house block on every landing page", cls: "bg-ink-800 text-slate-400 border-ink-700", Icon: Lock },
};

const words = (s: string) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>{children}</span>;
}
function Panel({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-ink-800 bg-ink-900/60 p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
// Length meter for the meta fields — green inside the range Google renders.
function Meter({ len, min, max }: { len: number; min: number; max: number }) {
  const ok = len >= min && len <= max;
  const pct = Math.min(100, (len / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-ink-800 overflow-hidden">
        <div className={`h-full rounded-full ${ok ? "bg-emerald-500" : len > max ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[9px] font-bold tabular-nums ${ok ? "text-emerald-400" : len > max ? "text-rose-400" : "text-amber-400"}`}>{len}/{max}</span>
    </div>
  );
}

type Sel =
  | { t: "block"; d: TemplateBlock }
  | { t: "finding"; d: LandingFinding; agent: string }
  | { t: "section"; d: { heading: string; body: string }; i: number }
  | { t: "faq"; d: { q: string; a: string }; i: number };

export default function PageBuilderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = getStoredUser();

  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [page, setPage] = useState<LandingPageFull | null>(null);
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [team, setTeam] = useState<LandingTeamMember[]>([]);
  const [tab, setTab] = useState<Tab>("Live Template");
  const [sel, setSel] = useState<Sel | null>(null);

  const [kw, setKw] = useState("");
  const [cat, setCat] = useState<string>("auto");
  const [building, setBuilding] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [reviews, setReviews] = useState<LandingReview[] | null>(null);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [changes, setChanges] = useState<LandingChange[]>([]);
  const [manual, setManual] = useState<string[]>([]);
  const [flash, setFlash] = useState("");

  const note = (m: string) => { setFlash(m); setTimeout(() => setFlash(""), 4500); };

  useEffect(() => {
    let off = false;
    fetchMe().then((r) => { if (off) return; if (r.user?.role !== "Admin") { router.replace("/"); return; } setReady(true); }).catch(() => router.replace("/"));
    return () => { off = true; };
  }, [router]);

  const loadList = useCallback(async () => {
    const r = await listLandingPages().catch(() => null);
    if (r) setPages(r.pages);
    return r?.pages || [];
  }, []);

  useEffect(() => {
    if (!ready) return;
    getPageTemplate().then((r) => { setBlocks(r.blocks); setTeam(r.team); }).catch(() => {});
    loadList().then((list) => { if (list[0]) void open(list[0]._id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loadList]);

  // Selecting a page resets the review — findings belong to one page only.
  const open = async (id: string) => {
    setLoadingPage(true);
    setReviews(null); setChanges([]); setManual([]); setSel(null);
    try { const r = await getLandingPageById(id); setPage(r.page); }
    catch { note("Could not open that page."); }
    finally { setLoadingPage(false); }
  };

  const build = async () => {
    const k = kw.trim();
    if (!k) return;
    setBuilding(true);
    try {
      const r = await generateLandingPage(k, cat);
      setKw("");
      await loadList();
      setPage(r.page); setReviews(null); setChanges([]); setManual([]);
      setTab("Live Template");
      note(r.ai ? `✓ “${r.page.heroTitle}” written by the SEO Agent — saved as a draft.` : `✓ Page created from the house template — add an LLM key for agent-written copy.`);
    } catch (e) { note(e instanceof Error ? e.message : "Could not build the page."); }
    finally { setBuilding(false); }
  };

  const runReview = async () => {
    if (!page) return;
    setReviewing(true);
    try {
      const r = await reviewLandingPage(page._id);
      setReviews(r.reviews); setReviewTotal(r.total); setChanges([]); setManual([]);
      note(r.total ? `The team found ${r.total} thing${r.total === 1 ? "" : "s"} to change.` : "The team signed off — nothing to change.");
    } catch (e) { note(e instanceof Error ? e.message : "Review failed."); }
    finally { setReviewing(false); }
  };

  const applyAdvice = async () => {
    if (!page) return;
    setApplying(true);
    try {
      const r = await applyLandingAdvice(page._id);
      setPage(r.page); setChanges(r.changes); setManual(r.manual);
      const after = await reviewLandingPage(page._id).catch(() => null);
      if (after) { setReviews(after.reviews); setReviewTotal(after.total); }
      await loadList();
      note(r.changes.length ? `✓ Applied ${r.changes.length} change${r.changes.length === 1 ? "" : "s"}.` : "Nothing needed changing.");
    } catch (e) { note(e instanceof Error ? e.message : "Could not apply the team's notes."); }
    finally { setApplying(false); }
  };

  const edit = async () => {
    if (!page || !instruction.trim()) return;
    setEditing(true);
    try {
      const r = await editLandingPageAI(page._id, instruction.trim());
      setPage(r.page); setInstruction(""); setReviews(null);
      await loadList();
      note("✓ The agent applied your edit.");
    } catch (e) { note(e instanceof Error ? e.message : "Edit failed."); }
    finally { setEditing(false); }
  };

  const publish = async () => {
    if (!page) return;
    setPublishing(true);
    try { const r = await publishLandingPage(page._id); setPage(r.page); await loadList(); note(`✓ Live at /${r.page.locale}/${r.page.slug}`); }
    catch (e) { note(e instanceof Error ? e.message : "Publish failed."); }
    finally { setPublishing(false); }
  };

  const liveUrl = page ? `${PUBLIC_SITE}/${page.locale}/${page.slug}` : "";
  const findingsFor = (id: string) => reviews?.find((r) => r.agentId === id)?.findings || [];
  const aiBlocks = useMemo(() => blocks.filter((b) => b.source === "ai").length, [blocks]);

  if (!ready) return <div className="min-h-screen grid place-items-center bg-ink-950 text-slate-500"><Loader2 className="w-7 h-7 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex bg-ink-950">
      <Sidebar />
      <AgentGate agentId="seo" label="SEO Agent" accent="from-emerald-500 to-teal-600" />
      <main className="flex-1 min-w-0">
        {/* Header */}
        <div className="h-16 px-5 border-b border-ink-800 flex items-center gap-3 sticky top-0 z-20 bg-ink-950/90 backdrop-blur">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shrink-0"><LayoutTemplate className="w-5 h-5 text-white" /></div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white leading-tight">Page Builder</h1>
            <p className="text-[11px] text-slate-500 truncate">Type a keyword → the SEO Agent writes a real landing page. The team reviews it, you publish it.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={`${PUBLIC_SITE}/en`} target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-ink-900 transition-colors"><Globe className="w-3.5 h-3.5" /> Live site</a>
            {user?.name && <div className="w-8 h-8 rounded-lg bg-ink-800 grid place-items-center text-[11px] font-bold text-slate-300">{user.name.slice(0, 1).toUpperCase()}</div>}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Build bar */}
          <FadeUp>
            <div className="rounded-2xl border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-bold text-white">Build a page</h2>
                <span className="text-[10px] text-slate-500">— saved as a draft, nothing goes live until you publish</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void build(); }}
                    placeholder="e.g. luxury yacht rental dubai marina"
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-ink-950 border border-ink-800 rounded-xl px-3 py-2.5 text-[12px] text-slate-300 focus:outline-none focus:border-brand-500/50">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c === "auto" ? "Category: auto-detect" : c === "AirportTransfer" ? "Airport Transfer" : c}</option>)}
                </select>
                <button onClick={build} disabled={building || !kw.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-colors">
                  {building ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing…</> : <><Sparkles className="w-3.5 h-3.5" /> Build Page</>}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">The category decides which cards, providers and deals the live page shows. Auto-detect reads it from the keyword.</p>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Pages list */}
            <FadeUp className="xl:col-span-3">
              <Panel title="Pages" sub={`${pages.length} built · ${pages.filter((p) => p.status === "Published").length} live`}>
                <Stagger className="space-y-1.5 max-h-[560px] overflow-y-auto scrollbar-thin">
                  {pages.map((p) => (
                    <Item key={p._id}>
                      <button onClick={() => open(p._id)} className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${page?._id === p._id ? "border-brand-500/40 bg-brand-500/10" : "border-ink-800 bg-ink-950/40 hover:bg-ink-900/60"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12px] font-semibold text-white leading-snug line-clamp-2">{p.heroTitle}</span>
                          <Pill cls={p.status === "Published" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-amber-500/15 text-amber-300 border-amber-500/25"}>{p.status}</Pill>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate">/{p.locale}/{p.slug}</div>
                      </button>
                    </Item>
                  ))}
                  {!pages.length && <li className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-[11px] text-slate-500">No pages yet — build one above.</li>}
                </Stagger>
              </Panel>
            </FadeUp>

            {/* Selected page */}
            <div className="xl:col-span-9 space-y-5">
              {loadingPage ? (
                <div className="grid place-items-center py-32 text-slate-600"><Loader2 className="w-7 h-7 animate-spin" /></div>
              ) : !page ? (
                <Panel><div className="py-24 text-center text-[12px] text-slate-500">Build a page or pick one to review it.</div></Panel>
              ) : (
                <>
                  {/* Page header + actions */}
                  <FadeUp>
                    <Panel>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Pill cls={page.status === "Published" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-amber-500/15 text-amber-300 border-amber-500/25"}>{page.status}</Pill>
                            <Pill cls="bg-ink-800 text-slate-400 border-ink-700">{page.category}</Pill>
                            {page.keyword && <Pill cls="bg-sky-500/10 text-sky-300 border-sky-500/25">{page.keyword}</Pill>}
                          </div>
                          <h2 className="text-lg font-bold text-white leading-snug">{page.heroTitle}</h2>
                          <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:underline mt-1">
                            /{page.locale}/{page.slug} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-300 border border-ink-700 hover:bg-ink-800 transition-colors"><ExternalLink className="w-3.5 h-3.5" /> {page.status === "Published" ? "View live" : "Preview"}</a>
                          {page.status !== "Published" && (
                            <button onClick={publish} disabled={publishing} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Publish live
                            </button>
                          )}
                        </div>
                      </div>
                    </Panel>
                  </FadeUp>

                  {/* Tabs */}
                  <div className="flex gap-1 border-b border-ink-800">
                    {TABS.map((t) => (
                      <button key={t} onClick={() => setTab(t)} className={`relative px-3.5 py-2 text-[12px] font-semibold transition-colors ${tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {t}
                        {t === "Team Review" && reviewTotal > 0 && reviews && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">{reviewTotal}</span>}
                        {tab === t && <motion.div layoutId="pb-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-500" />}
                      </button>
                    ))}
                  </div>

                  {/* ---- Live Template ---- */}
                  {tab === "Live Template" && (
                    <FadeUp>
                      <Panel
                        title="What this page renders, top to bottom"
                        sub={`The real template every landing page uses. ${aiBlocks} of ${blocks.length} blocks are agent-written — the rest are live marketplace data or fixed house blocks.`}
                        right={
                          <div className="flex items-center gap-1.5">
                            {(["ai", "live", "static"] as const).map((s) => (
                              <Pill key={s} cls={SOURCE_META[s].cls}>{SOURCE_META[s].label}</Pill>
                            ))}
                          </div>
                        }
                      >
                        <Stagger className="space-y-1.5">
                          {blocks.map((b, i) => {
                            const m = SOURCE_META[b.source];
                            const filled =
                              b.key === "sections" ? `${page.sections.length} section${page.sections.length === 1 ? "" : "s"}` :
                              b.key === "faq" ? `${page.faq.length} question${page.faq.length === 1 ? "" : "s"}` :
                              b.key === "hero" ? page.heroTitle :
                              b.key === "meta" ? (page.metaTitle || "(not set)") :
                              b.key === "cards" ? page.category :
                              b.key === "cta" ? (page.keyword || "(no keyword)") : "";
                            return (
                              <Item key={b.key}>
                                <button onClick={() => setSel({ t: "block", d: b })} className="w-full text-left flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-950/40 px-3 py-2.5 hover:bg-ink-900/60 transition-colors group">
                                  <span className="w-6 text-[10px] font-bold text-slate-600 tabular-nums shrink-0">{String(i + 1).padStart(2, "0")}</span>
                                  <m.Icon className={`w-3.5 h-3.5 shrink-0 ${b.source === "ai" ? "text-brand-400" : b.source === "live" ? "text-emerald-400" : "text-slate-600"}`} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-semibold text-slate-200 group-hover:text-white transition-colors">{b.name}</span>
                                    {filled && <span className="block text-[10px] text-slate-500 truncate">{filled}</span>}
                                  </span>
                                  <Pill cls={m.cls}>{m.label}</Pill>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-brand-400 transition-colors shrink-0" />
                                </button>
                              </Item>
                            );
                          })}
                          {!blocks.length && <li className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-[11px] text-slate-500">Template not loaded.</li>}
                        </Stagger>
                      </Panel>
                    </FadeUp>
                  )}

                  {/* ---- Agent Copy ---- */}
                  {tab === "Agent Copy" && (
                    <div className="space-y-5">
                      <FadeUp>
                        <Panel title="Search result" sub="What Google shows. Click a field to see the exact limits.">
                          <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 space-y-2">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Meta title</div>
                              <p className="text-[13px] text-sky-300 leading-snug">{page.metaTitle || <span className="text-slate-600">(not set)</span>}</p>
                              <div className="mt-1.5"><Meter len={page.metaTitle.length} min={30} max={60} /></div>
                            </div>
                            <div className="border-t border-ink-800 pt-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Meta description</div>
                              <p className="text-[12px] text-slate-400 leading-relaxed">{page.metaDescription || <span className="text-slate-600">(not set)</span>}</p>
                              <div className="mt-1.5"><Meter len={page.metaDescription.length} min={120} max={160} /></div>
                            </div>
                          </div>
                        </Panel>
                      </FadeUp>

                      <FadeUp delay={0.04}>
                        <Panel title="Hero" sub="The first thing a visitor reads.">
                          <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3 space-y-2">
                            <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">H1</div><p className="text-[15px] font-bold text-white leading-snug">{page.heroTitle}</p></div>
                            <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Subtitle</div><p className="text-[12px] text-slate-300">{page.heroSubtitle || <span className="text-slate-600">(empty)</span>}</p></div>
                            <div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Intro · {words(page.heroIntro)} words</div><p className="text-[12px] text-slate-400 leading-relaxed">{page.heroIntro || <span className="text-slate-600">(empty)</span>}</p></div>
                          </div>
                        </Panel>
                      </FadeUp>

                      <FadeUp delay={0.08}>
                        <Panel title="Content sections" sub={`${page.sections.length} of max 8 — the main ranking copy. Click one for the full text.`}>
                          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {page.sections.map((s, i) => (
                              <Item key={i}>
                                <button onClick={() => setSel({ t: "section", d: s, i })} className="w-full h-full text-left rounded-xl border border-ink-800 bg-ink-950/40 p-3 hover:bg-ink-900/60 transition-colors group">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-[12px] font-bold text-slate-200 group-hover:text-white transition-colors leading-snug">{s.heading || <span className="text-rose-400">(no heading)</span>}</span>
                                    <Pill cls={words(s.body) < 55 ? "bg-amber-500/15 text-amber-300 border-amber-500/25" : words(s.body) > 130 ? "bg-rose-500/15 text-rose-300 border-rose-500/25" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"}>{words(s.body)}w</Pill>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-3">{s.body}</p>
                                </button>
                              </Item>
                            ))}
                            {!page.sections.length && <li className="md:col-span-2 rounded-xl border border-dashed border-ink-800 p-6 text-center text-[11px] text-slate-500">No sections — this page has nothing to rank.</li>}
                          </Stagger>
                        </Panel>
                      </FadeUp>

                      <FadeUp delay={0.12}>
                        <Panel title="FAQ" sub={`${page.faq.length} of max 10 — the FAQ rich result depends on these.`}>
                          <Stagger className="space-y-1.5">
                            {page.faq.map((f, i) => (
                              <Item key={i}>
                                <button onClick={() => setSel({ t: "faq", d: f, i })} className="w-full text-left flex items-start gap-2 rounded-xl border border-ink-800 bg-ink-950/40 px-3 py-2 hover:bg-ink-900/60 transition-colors group">
                                  <HelpCircle className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-semibold text-slate-200 group-hover:text-white transition-colors">{f.q}</span>
                                    <span className="block text-[10px] text-slate-500 truncate mt-0.5">{f.a}</span>
                                  </span>
                                  <Pill cls={words(f.a) < 15 ? "bg-amber-500/15 text-amber-300 border-amber-500/25" : "bg-ink-800 text-slate-500 border-ink-700"}>{words(f.a)}w</Pill>
                                </button>
                              </Item>
                            ))}
                            {!page.faq.length && <li className="rounded-xl border border-dashed border-ink-800 p-6 text-center text-[11px] text-slate-500">No FAQ yet.</li>}
                          </Stagger>
                        </Panel>
                      </FadeUp>

                      <FadeUp delay={0.16}>
                        <Panel title="Tell the agent what to change" sub="Plain English. It rewrites only what you ask and saves the page.">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void edit(); }}
                              placeholder="e.g. lead the hero with the AED price range, and add a section on deposits"
                              className="flex-1 bg-ink-950 border border-ink-800 rounded-xl px-3 py-2.5 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50"
                            />
                            <button onClick={edit} disabled={editing || !instruction.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold bg-ink-800 text-white border border-ink-700 hover:bg-ink-700 disabled:opacity-40 transition-colors">
                              {editing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting…</> : <><Wand2 className="w-3.5 h-3.5" /> Apply edit</>}
                            </button>
                          </div>
                        </Panel>
                      </FadeUp>
                    </div>
                  )}

                  {/* ---- Team Review ---- */}
                  {tab === "Team Review" && (
                    <div className="space-y-5">
                      <FadeUp>
                        <Panel
                          title="Ask the team"
                          sub="Four agents read the real page and report what's measurably wrong. Costs nothing — no AI call is made to review."
                          right={<Pill cls="bg-emerald-500/10 text-emerald-300 border-emerald-500/25">0 tokens</Pill>}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={runReview} disabled={reviewing} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-colors">
                              {reviewing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading the page…</> : <><Users className="w-3.5 h-3.5" /> {reviews ? "Re-run review" : "Get the team's advice"}</>}
                            </button>
                            {reviews && reviewTotal > 0 && (
                              <button onClick={applyAdvice} disabled={applying} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                                {applying ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting…</> : <><Wrench className="w-3.5 h-3.5" /> Apply the team&apos;s notes ({reviewTotal})</>}
                              </button>
                            )}
                            {reviews && reviewTotal === 0 && <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400"><CheckCircle2 className="w-4 h-4" /> The whole team signed off.</span>}
                          </div>
                          {reviews && reviewTotal > 0 && <p className="text-[10px] text-slate-600 mt-2">Applying runs one AI rewrite pass over the notes that need judgement. The measurable ones (meta lengths) are fixed without any AI call.</p>}
                        </Panel>
                      </FadeUp>

                      {!reviews && (
                        <Panel><div className="py-16 text-center"><Bot className="w-8 h-8 text-slate-700 mx-auto mb-2" /><p className="text-[12px] text-slate-500">The team hasn&apos;t looked at this page yet.</p></div></Panel>
                      )}

                      {reviews && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {team.map((a, i) => {
                            const f = findingsFor(a.id);
                            const Ico = AGENT_ICON[a.id] || Bot;
                            return (
                              <FadeUp key={a.id} delay={i * 0.04}>
                                <Panel className="h-full">
                                  <div className="flex items-center gap-2 mb-2.5">
                                    <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${f.length ? "bg-amber-500/15" : "bg-emerald-500/15"}`}><Ico className={`w-3.5 h-3.5 ${f.length ? "text-amber-300" : "text-emerald-300"}`} /></div>
                                    <span className="text-[12px] font-bold text-white">{a.name}</span>
                                    <Pill cls={f.length ? "bg-amber-500/15 text-amber-300 border-amber-500/25" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"}>{f.length ? `${f.length} note${f.length === 1 ? "" : "s"}` : "signed off"}</Pill>
                                  </div>
                                  {f.length ? (
                                    <ul className="space-y-1.5">
                                      {f.map((x, j) => (
                                        <li key={j}>
                                          <button onClick={() => setSel({ t: "finding", d: x, agent: a.name })} className="w-full text-left rounded-lg border border-ink-800 bg-ink-950/40 px-2.5 py-2 hover:bg-ink-900/60 transition-colors group">
                                            <div className="flex items-center gap-1.5">
                                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                              <span className="text-[11px] font-bold text-slate-200 group-hover:text-white transition-colors">{x.where}</span>
                                              {x.auto && <Pill cls="bg-emerald-500/10 text-emerald-300 border-emerald-500/25">auto</Pill>}
                                              <ChevronRight className="w-3 h-3 text-slate-700 group-hover:text-brand-400 ml-auto shrink-0" />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{x.problem}</p>
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-[11px] text-emerald-400/80 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {a.line}</p>
                                  )}
                                </Panel>
                              </FadeUp>
                            );
                          })}
                        </div>
                      )}

                      {changes.length > 0 && (
                        <FadeUp>
                          <Panel title="What changed" sub="Exactly what the team rewrote, before → after.">
                            <ul className="space-y-2">
                              {changes.map((c, i) => (
                                <li key={i} className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                                  <div className="text-[11px] font-bold text-brand-300 mb-1.5">{c.field}</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-rose-500/5 border border-rose-500/15 p-2"><div className="text-[9px] font-bold text-rose-400 uppercase mb-0.5">Before</div><p className="text-[11px] text-slate-400 leading-relaxed">{c.before}</p></div>
                                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2"><div className="text-[9px] font-bold text-emerald-400 uppercase mb-0.5">After</div><p className="text-[11px] text-slate-300 leading-relaxed">{c.after}</p></div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {manual.length > 0 && (
                              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wide mb-1.5">Still open — needs an AI rewrite pass</div>
                                <ul className="space-y-1">{manual.map((m, i) => <li key={i} className="text-[11px] text-slate-400">• {m}</li>)}</ul>
                                <p className="text-[10px] text-slate-500 mt-1.5">Add an LLM key (or check credits) and apply again to close these.</p>
                              </div>
                            )}
                          </Panel>
                        </FadeUp>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {flash && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-ink-800 border border-ink-700 px-4 py-2.5 text-[12px] font-semibold text-white shadow-2xl max-w-[90vw]">
            {flash}
          </motion.div>
        )}

        {/* Details drawer */}
        {sel && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSel(null)}>
            <motion.div initial={{ x: 460 }} animate={{ x: 0 }} transition={{ type: "spring", damping: 26, stiffness: 240 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full bg-ink-900 border-l border-ink-800 flex flex-col">
              <div className="h-16 px-4 flex items-center gap-2 border-b border-ink-800 shrink-0">
                <span className="text-sm font-bold text-white">
                  {sel.t === "block" ? "Template block" : sel.t === "finding" ? sel.agent : sel.t === "section" ? `Section ${sel.i + 1}` : `Question ${sel.i + 1}`}
                </span>
                <button onClick={() => setSel(null)} className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-ink-800"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {sel.t === "block" && (() => {
                  const m = SOURCE_META[sel.d.source];
                  return (
                    <>
                      <div>
                        <h3 className="text-base font-bold text-white">{sel.d.name}</h3>
                        <div className="mt-2"><Pill cls={m.cls}>{m.label}</Pill></div>
                        <p className="text-[11px] text-slate-500 mt-1.5">{m.hint}</p>
                      </div>
                      <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">What it is</div>
                        <p className="text-[12px] text-slate-300 leading-relaxed">{sel.d.detail}</p>
                      </div>
                      {sel.d.field !== "—" && (
                        <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fed by</div>
                          <code className="text-[11px] text-brand-400">{sel.d.field}</code>
                        </div>
                      )}
                      {sel.d.source === "ai" && (
                        <button onClick={() => { setTab("Agent Copy"); setSel(null); }} className="w-full rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 inline-flex items-center justify-center gap-1.5">
                          <PenLine className="w-3.5 h-3.5" /> Edit this copy <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {sel.d.source === "live" && <p className="text-[11px] text-slate-500 leading-relaxed">Nothing to write here — the block fills itself from real providers, listings and deals. Change the page category to change what it shows.</p>}
                      {sel.d.source === "static" && <p className="text-[11px] text-slate-500 leading-relaxed">Fixed in the site template. Changing it means changing the code, not the page.</p>}
                    </>
                  );
                })()}

                {sel.t === "finding" && (
                  <>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{sel.d.where}</h3>
                        {sel.d.auto && <Pill cls="bg-emerald-500/10 text-emerald-300 border-emerald-500/25">auto-fixable</Pill>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Reported by {sel.agent}</p>
                    </div>
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                      <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wide mb-1">Problem</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{sel.d.problem}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide mb-1">Fix</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{sel.d.fix}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {sel.d.auto
                        ? "This one is applied deterministically — no AI call, no tokens."
                        : "This one needs judgement, so it goes into the single AI rewrite pass when you apply the team's notes."}
                    </p>
                  </>
                )}

                {sel.t === "section" && (
                  <>
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">{sel.d.heading || "(no heading)"}</h3>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Pill cls="bg-ink-800 text-slate-400 border-ink-700">{words(sel.d.body)} words</Pill>
                        <Pill cls={words(sel.d.body) >= 55 && words(sel.d.body) <= 130 ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-amber-500/15 text-amber-300 border-amber-500/25"}>target 60–90</Pill>
                      </div>
                    </div>
                    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Body — renders as an H2 + paragraph</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-line">{sel.d.body}</p>
                    </div>
                    <button onClick={() => { setInstruction(`Rewrite the section “${sel.d.heading}” — `); setTab("Agent Copy"); setSel(null); }} className="w-full rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 inline-flex items-center justify-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" /> Ask the agent to rewrite it
                    </button>
                  </>
                )}

                {sel.t === "faq" && (
                  <>
                    <h3 className="text-base font-bold text-white leading-snug">{sel.d.q}</h3>
                    <div className="rounded-xl border border-ink-800 bg-ink-950/40 p-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Answer · {words(sel.d.a)} words</div>
                      <p className="text-[12px] text-slate-300 leading-relaxed">{sel.d.a}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Questions and answers here feed the FAQ rich result in Google.</p>
                    <button onClick={() => { setInstruction(`Rewrite the FAQ answer for “${sel.d.q}” — `); setTab("Agent Copy"); setSel(null); }} className="w-full rounded-xl px-4 py-2.5 text-[12px] font-bold bg-brand-600 text-white hover:bg-brand-500 inline-flex items-center justify-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5" /> Ask the agent to rewrite it
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
