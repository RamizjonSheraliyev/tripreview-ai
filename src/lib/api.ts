// API client for the Executive Dashboard. Talks to the SAME backend as the
// admin panel. Auth is the HttpOnly `auth_token` cookie set by /auth/login —
// localhost ports share it (same-site), so credentials:"include" is enough.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const USER_KEY = "exec_user";

export type AdminUser = { id: string; name: string; email: string; role: string };

export function setStoredUser(u: AdminUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data?.message || `Request failed (${res.status})`, res.status);
  return data as T;
}

// ---- Auth ----
export function login(email: string, password: string) {
  return request<{ token: string; user: AdminUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe() {
  return request<{ user: AdminUser }>("/auth/me");
}

export function logout() {
  setStoredUser(null);
  return fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}

// ---- Metrics (real backend) ----
export type Stats = {
  users: number;
  providers: number;
  videos: number;
  reviewsTotal: number;
  reviewsPending: number;
  activeListings: number;
  bookings: number;
  revenue: number;
  avgRating: number;
  phoneLeads: number;
  whatsappLeads: number;
  siteViews: number;
  usersGrowth: number;
  bookingsGrowth: number;
  activeListingsGrowth: number;
  verifiedProviders: number;
};

export function getStats() {
  return request<Stats>("/admin/stats");
}

export type SeriesPoint = { date: string; users: number; bookings: number; revenue: number };
export function getSeries(days = 30) {
  return request<{ series: SeriesPoint[] }>(`/admin/dashboard/series?days=${days}`);
}

export type Category = { name: string; listings: number; bookings: number };
export function getTopCategories() {
  return request<{ categories: Category[] }>("/admin/dashboard/top-categories");
}

export type Activity = {
  id?: string;
  action?: string;
  entity?: string;
  entityLabel?: string;
  actorName?: string;
  createdAt?: string;
};
export function getActivity(limit = 10, action?: string) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (action) q.set("action", action);
  return request<{ activities: Activity[] }>(`/admin/activity?${q.toString()}`);
}

// ---- AI agents ----
export type AgentStatus = {
  llmConfigured: boolean;
  blog: { status: "active" | "pending"; draftCount: number; lastRunAt: string | null; lastRunCreated: number | null };
  voice: { status: string };
  analytics: { status: string };
};
export function getAgentStatus() {
  return request<AgentStatus>("/admin/agents/status");
}

export function runBlogAgent(count = 5) {
  return request<{ ok: true; created: { id: string; title: string; slug: string }[]; errors: number }>(
    "/admin/agents/blog/run",
    { method: "POST", body: JSON.stringify({ count }) }
  );
}

export function askAnalytics(question: string) {
  return request<{ answer: string; metrics: Record<string, unknown> }>("/admin/agents/analytics", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

// ---- Brain (orchestrator) ----
export type BrainIssue = {
  kind: string; tier: "safe" | "approval"; action: string;
  severity: "info" | "warn" | "high"; count: number; title: string; description: string; link?: string;
};
export type BrainTask = BrainIssue & { _id: string; status: string; result?: string; createdAt?: string };

export function scanBrain() {
  return request<{ issues: BrainIssue[] }>("/admin/agents/brain/scan");
}
export function tickBrain() {
  return request<{ issues: BrainIssue[]; autoActions: { kind: string; did: string }[]; queued: number }>(
    "/admin/agents/brain/tick", { method: "POST" }
  );
}
export function getBrainTasks() {
  return request<{ tasks: BrainTask[] }>("/admin/agents/brain/tasks");
}
export function approveBrainTask(id: string) {
  return request<{ ok: true; task: BrainTask }>(`/admin/agents/brain/tasks/${id}/approve`, { method: "POST" });
}
export function dismissBrainTask(id: string) {
  return request<{ ok: true; task: BrainTask }>(`/admin/agents/brain/tasks/${id}/dismiss`, { method: "POST" });
}

// ---- AI CEO / Orchestrator (Claude-powered brain) ----
export type CeoPriority = { title: string; detail: string; impact: "High" | "Medium" | "Low"; confidence: number };
export type CeoOpportunity = CeoPriority;
export type CeoCtx = {
  providers: number;
  providersVerified: number;
  providersUnverified: number;
  listings: number;
  listingsActive: number;
  reviews: number;
  blogPublished: number;
  blogDrafts: number;
  pendingApprovalTasks: number;
  tasksDone: number;
  bookings: number;
  scamReportsPending: number;
  listingsMissingWeeklyPrice: number;
  recentActivity: { action: string; label: string; at: string }[];
};
export type CeoOverview = {
  healthScore: number;
  healthLabel: string;
  growthMomentum: string;
  priorities: CeoPriority[];
  strategicOpportunities?: CeoOpportunity[];
  insights: string[];
  dailySummary: { topAchievements: number; keyProgress: string; focusAreas: number; risks: number; nextReview: string };
  _ai: boolean;
  _ctx?: Partial<CeoCtx>;
};
export function getCeoOverview() {
  return request<{ overview: CeoOverview; llm: boolean }>("/admin/agents/ceo/overview");
}
// Conversational Ask-the-CEO (multi-turn + screenshot analysis + chat-approve).
export type CeoChatTurn = { role: "you" | "ceo"; text: string };
export type CeoAction = { id: string; title: string; detail: string; fixType: string; page: string; severity: string };
export type CeoSource = { url: string; title: string };
export function ceoAsk(question: string, opts: { history?: CeoChatTurn[]; imageBase64?: string; imageType?: string } = {}) {
  return request<{ answer: string; provider?: string; actions?: CeoAction[]; sources?: CeoSource[] }>("/admin/agents/ceo/ask", {
    method: "POST",
    body: JSON.stringify({
      question,
      history: (opts.history || []).map((m) => ({ role: m.role, text: m.text })),
      imageBase64: opts.imageBase64 || "",
      imageType: opts.imageType || "image/png",
    }),
  });
}

// ---- 24/7 Site Audit ----
export type CeoIssue = { kind: string; severity: "info" | "warn" | "high"; title: string; detail: string; fixType: string };
export type CeoPageAudit = { path: string; title: string; score: number; issues: CeoIssue[] };
export type CeoAuditSnapshot = {
  _id: string;
  overallScore: number;
  pages: CeoPageAudit[];
  issueCount: number;
  proposalCount: number;
  report: string;
  _ai: boolean;
  createdAt: string;
};
export type CeoProposalItem = {
  _id: string;
  page: string;
  path: string;
  kind: string;
  severity: "info" | "warn" | "high";
  title: string;
  detail: string;
  fixType: string;
  link: string;
  status: "proposed" | "applied" | "rejected" | "failed";
  result: string;
  createdAt: string;
};
export function getCeoAudit() {
  return request<{ audit: CeoAuditSnapshot; proposals: CeoProposalItem[]; llm: boolean }>("/admin/agents/ceo/audit");
}
export function runCeoAudit() {
  return request<{ audit: CeoAuditSnapshot; proposals: CeoProposalItem[]; llm: boolean }>("/admin/agents/ceo/audit/run", { method: "POST" });
}
export function approveCeoProposal(id: string) {
  return request<{ ok: boolean; proposal: CeoProposalItem }>(`/admin/agents/ceo/proposals/${id}/approve`, { method: "POST" });
}
export function rejectCeoProposal(id: string) {
  return request<{ ok: boolean; proposal: CeoProposalItem }>(`/admin/agents/ceo/proposals/${id}/reject`, { method: "POST" });
}

// ---- Per-route on-page SEO audit (crawls every public route) ----
export type SeoSignals = {
  ok: boolean; status?: number; error?: string;
  title?: string; description?: string; canonical?: string; robots?: string;
  ogTitle?: string; ogDescription?: string; ogImage?: string; twitterCard?: string;
  jsonLd?: number; h1Count?: number; h1?: string;
};
export type SeoIssue = CeoIssue & { recommend?: string };
export type SeoPageAudit = { path: string; title: string; score: number; issues: SeoIssue[]; signals: SeoSignals };
export type SeoAuditSnapshot = {
  _id: string; overallScore: number; baseUrl: string; pages: SeoPageAudit[];
  issueCount: number; proposalCount: number; crawled: number; unreachable: number;
  report: string; _ai: boolean; createdAt: string;
};
// ---- Workforce analytics (REAL data for the command-center tabs) ----
export type WfAgent = {
  id: string; dept: string; live: boolean; status: string; currentTask: string;
  tasksCompleted: number; successRate: number; lastActive: string; lastActiveAt: string | null;
  name?: string; state?: string; workload?: number; perf7d?: number[];
  tasksToday?: { done: number; total: number }; pendingCount?: number; totalTasks?: number;
  activeSince?: string | null; nextTasks?: string[]; capabilities?: string[]; priority?: string; paused?: boolean;
};
export type AgentStateSummary = {
  total: number; online: number; busy: number; idle: number; waiting: number; error: number; paused: number;
  high: number; medium: number; low: number; idleLoad: number;
};
export type WfApproval = {
  id: string; item: string; sub: string; type: string; source: string; agent: string;
  priority: string; submitted: string; impact: string; fixType: string; page: string; auto: boolean;
};
export type Workforce = {
  kpis: {
    revenue: number; leads: number; views: number; providers: number; providersVerified: number; providersUnverified: number;
    listingsActive: number; listings: number; reviews: number; pendingReviews: number; contentPublished: number; contentDrafts: number;
    bookings: number; scamPending: number; healthScore: number | null; seoScore: number | null; pendingApprovals: number;
  };
  agents: WfAgent[];
  summary: { total: number; active: number; idle: number; live: number; scaffolded: number };
  agentStateSummary?: AgentStateSummary;
  timeline: { day: string; actions: number; success: number; failed: number }[];
  topAgents: WfAgent[];
  approvals: WfApproval[];
  approvalSummary: { pending: number; highPriority: number; autoExecutable: number; seo: number; site: number };
  _ai: boolean;
};
export function getWorkforce() {
  return request<Workforce>("/admin/agents/ceo/workforce");
}
// ---- Performance & ROI — estimated impact from real signals ----
export type RoiAgent = { id: string; name: string; dept: string; cost: number; revenue: number; roi: number; trend7d: number[]; trendPct: number };
export type RoiData = {
  range: { from: string; to: string };
  kpis: {
    revenueImpact: number; revenueTrend: number; revenueSpark: number[];
    cost: number; costTrend: number; costSpark: number[];
    netRoi: number; roiTrend: number; roiSpark: number[];
    tasksDone: number; tasksTotal: number; tasksTrend: number; tasksSpark: number[];
    growthScore: number; growthTrend: number; growthSpark: number[];
    costEfficiency: number; costEffTrend: number; costEffSpark: number[];
  };
  agents: RoiAgent[];
  totals: { cost: number; revenue: number; roi: number };
  timeline: { day: string; impact: number }[];
  summary: { total: number; avgDaily: number; highest: { day: string; value: number }; growth: number };
  departments: { name: string; value: number; pct: number; trend: number }[];
  taskImpact: { type: string; completed: number; revenue: number }[];
  projections: { label: string; value: number; roi: number }[];
  insights: { title: string; tone: string }[];
  assumptions: { costPerAction: number; leadValue: number; viewValue: number };
};
export function getRoi() {
  return request<RoiData>("/admin/agents/ceo/roi");
}

// ---- Strategy & Opportunities — real opportunities + AI recommendations ----
export type StrategyData = {
  kpis: { totalOpportunities: number; newThisWeek: number; highImpact: number; potentialRevenue: number; revenueTrend: number; trafficPotential: number; trafficTrend: number; implementationScore: number; avgConfidence: number };
  focusAreas: { title: string; desc: string; priority: string; progress: number; icon: string }[];
  topOpportunities: { impact: string; title: string; trafficPotential: number; revenueImpact: number; confidence: number; effort: string }[];
  funnel: { stages: { stage: string; count: number }[]; conversionRate: number };
  contentOpps: { topic: string; keyword: string; searchVolume: number; potentialTraffic: number; priority: string; assignedTo: string; status: string; revenueImpact: number }[];
  marketplaceOpps: { opportunity: string; potentialProviders: number; revenueImpact: number; priority: string; assignedTo: string; status: string }[];
  competitiveOpps: { opportunity: string; competitorGap: string; impact: string; action: string }[];
  recommendations: { title: string; body: string; impact: string; icon: string }[];
  planSummary: { totalInitiatives: number; highPriority: number; expectedRevenue: number; expectedTraffic: number };
  _ai: boolean;
  assumptions: { providerValue: number; visitValue: number };
};
export function getStrategy() {
  return request<StrategyData>("/admin/agents/ceo/strategy");
}
export function generateStrategy() {
  return request<StrategyData>("/admin/agents/ceo/strategy/generate", { method: "POST" });
}
export function assignAgentTask(agentId: string, title: string) {
  return request<{ ok: boolean; id: string; agent: string }>(`/admin/agents/ceo/agents/${agentId}/assign`, { method: "POST", body: JSON.stringify({ title }) });
}
export function toggleAgentPause(agentId: string, paused?: boolean) {
  return request<{ ok: boolean; agentId: string; paused: boolean }>(`/admin/agents/ceo/agents/${agentId}/pause`, { method: "POST", body: JSON.stringify(paused === undefined ? {} : { paused }) });
}

// ---- Workflow Updates — real automated-workflow tracking ----
export type WorkflowRow = {
  id: string; source: string; title: string; type: string;
  status: "Started" | "In Progress" | "Completed" | "Blocked" | "Failed" | "Scheduled";
  progress: number; owner: string; ownerId: string;
  lastUpdate: string; lastUpdateAt: string; nextStep: string; priority: "High" | "Medium" | "Low";
  createdAt: string; resolvedAt: string | null;
};
export type Workflows = {
  kpis: {
    active: number; activeTrend: number; completedToday: number; completedTrend: number;
    inProgress: number; blocked: number; avgCompletion: string;
    counts: { total: number; started: number; inProgress: number; completed: number; blocked: number; failed: number };
  };
  workflows: WorkflowRow[];
  health: { total: number; healthy: number; atRisk: number; blocked: number; failed: number };
  topOwners: { name: string; id: string; count: number }[];
  activity: { id: number; title: string; sub: string; time: string; status: string }[];
  automations: { active: number; activeTrend: number; successRate: number; successTrend: number };
};
export function getWorkflows() {
  return request<Workflows>("/admin/agents/ceo/workflows");
}

// ---- System Alerts — real alerting engine ----
export type AlertMetric = { label: string; value: string; unit: string; trend: number };
export type AlertActivity = { state: string; at: string; note: string };
export type SystemAlertItem = {
  id: string; key: string; title: string; message: string; system: string;
  type: string; severity: "Critical" | "High" | "Medium" | "Low";
  status: "Active" | "Acknowledged" | "Resolved"; owner: string;
  triggeredAt: string; lastUpdated: string; durationMin: number;
  metrics: AlertMetric[]; incidentId: string;
  sparkline?: number[]; activity?: AlertActivity[];
};
export type AlertStats = {
  total: number; critical: number; high: number; medium: number; low: number; resolved: number;
  trendTotal: number; systems: string[]; owners: string[]; types: string[];
};
export function getAlertStats() {
  return request<AlertStats>("/admin/agents/ceo/alerts/stats");
}
export function listAlerts(params: { tab?: string; type?: string; status?: string; system?: string; owner?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: SystemAlertItem[]; total: number; page: number; pages: number }>(`/admin/agents/ceo/alerts${s ? `?${s}` : ""}`);
}
export function getAlertById(id: string) {
  return request<{ alert: SystemAlertItem }>(`/admin/agents/ceo/alerts/${id}`);
}
export function alertAction(id: string, action: "acknowledge" | "escalate" | "resolve" | "incident") {
  return request<{ ok: boolean; alert: SystemAlertItem }>(`/admin/agents/ceo/alerts/${id}/${action}`, { method: "POST" });
}

// ---- Message Templates — real reusable templates with usage tracking ----
export type TemplateItem = {
  id: string; name: string; description: string; channel: string; category: string;
  status: "Active" | "Draft" | "Paused"; createdByAgent: string; usageCount: number;
  lastUsedAt: string | null; createdAt: string; updatedAt: string; variableCount: number;
  subject?: string; body?: string; variables?: string[];
  usageChart?: { series: { date: string; count: number }[]; last30: number; prev30: number; trend: number };
  usageTrend?: number;
};
export type TemplateStats = {
  total: number; email: number; inApp: number; alert: number; sms: number; trendTotal: number;
  channels: string[]; categories: string[]; creators: string[];
};
export type TemplateInput = {
  name?: string; description?: string; channel?: string; category?: string;
  subject?: string; body?: string; status?: string; createdByAgent?: string;
};
export function getTemplateStats() {
  return request<TemplateStats>("/admin/agents/ceo/templates/stats");
}
export function listTemplates(params: { channel?: string; category?: string; status?: string; createdBy?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: TemplateItem[]; total: number; page: number; pages: number }>(`/admin/agents/ceo/templates${s ? `?${s}` : ""}`);
}
export function getTemplate(id: string) {
  return request<{ template: TemplateItem }>(`/admin/agents/ceo/templates/${id}`);
}
export function createTemplate(input: TemplateInput) {
  return request<{ ok: boolean; template: TemplateItem }>("/admin/agents/ceo/templates", { method: "POST", body: JSON.stringify(input) });
}
export function updateTemplate(id: string, patch: TemplateInput) {
  return request<{ ok: boolean; template: TemplateItem }>(`/admin/agents/ceo/templates/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export function deleteTemplate(id: string) {
  return request<{ ok: boolean }>(`/admin/agents/ceo/templates/${id}`, { method: "DELETE" });
}
export function duplicateTemplate(id: string) {
  return request<{ ok: boolean; template: TemplateItem }>(`/admin/agents/ceo/templates/${id}/duplicate`, { method: "POST" });
}
export function useTemplate(id: string) {
  return request<{ ok: boolean; template: TemplateItem }>(`/admin/agents/ceo/templates/${id}/use`, { method: "POST" });
}

// ---- Communication Center — real multi-agent group chat ----
export type TeamMember = { id: string; name: string };
export type AgentChatTurn = { role: "founder" | "agent"; agentId?: string; name?: string; text: string };
export function getTeam() {
  return request<{ team: TeamMember[]; llm: boolean }>("/admin/agents/ceo/team");
}
export function agentChat(message: string, opts: { history?: AgentChatTurn[]; mentionId?: string; imageBase64?: string; imageType?: string } = {}) {
  return request<{ agentId: string; agentName: string; text: string }>("/admin/agents/ceo/agent-chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      history: (opts.history || []).map((h) => ({ role: h.role, name: h.name, text: h.text })),
      mentionId: opts.mentionId || "",
      imageBase64: opts.imageBase64 || "",
      imageType: opts.imageType || "image/png",
    }),
  });
}

// ---- Announcements — real broadcasts to the AI workforce ----
export type AnnouncementItem = {
  id: string; title: string; sub: string; body: string;
  type: string; priority: "High" | "Medium" | "Low"; audienceKey: string; audience: string;
  channels: string[]; status: "Draft" | "Scheduled" | "Published" | "Archived";
  createdByAgent: string; scheduledAt: string | null; publishedAt: string | null;
  createdAt: string; updatedAt: string;
  recipients: number; reads: number; replies: number; readRate: number;
  breakdown?: { label: string; count: number; color: string; pct: number }[];
  history?: { state: string; at: string; by: string }[];
};
export type AnnouncementStats = {
  total: number; published: number; scheduled: number; draft: number; archived: number;
  avgReadRate: number; avgReadTracked: boolean; trendTotal: number;
  audiences: { key: string; label: string; count: number }[];
  channels: string[]; types: string[];
};
export type AnnouncementInput = {
  title?: string; sub?: string; body?: string; type?: string; priority?: string;
  audienceKey?: string; channels?: string[]; status?: string; scheduledAt?: string;
  ai?: boolean; hint?: string;
};
export function listAnnouncements(params: { status?: string; type?: string; priority?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: AnnouncementItem[]; total: number; page: number; pages: number }>(`/admin/agents/announcements${s ? `?${s}` : ""}`);
}
export function getAnnouncementStats() {
  return request<AnnouncementStats>("/admin/agents/announcements/stats");
}
export function getAnnouncement(id: string) {
  return request<{ announcement: AnnouncementItem }>(`/admin/agents/announcements/${id}`);
}
export function createAnnouncement(input: AnnouncementInput) {
  return request<{ ok: boolean; announcement: AnnouncementItem }>("/admin/agents/announcements", { method: "POST", body: JSON.stringify(input) });
}
export function updateAnnouncement(id: string, patch: AnnouncementInput) {
  return request<{ ok: boolean; announcement: AnnouncementItem }>(`/admin/agents/announcements/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
export function deleteAnnouncement(id: string) {
  return request<{ ok: boolean }>(`/admin/agents/announcements/${id}`, { method: "DELETE" });
}

export function getCeoSeo() {
  return request<{ audit: SeoAuditSnapshot | null; proposals: CeoProposalItem[]; base: string; llm: boolean }>("/admin/agents/ceo/seo");
}
export function runCeoSeo() {
  return request<{ audit: SeoAuditSnapshot; proposals: CeoProposalItem[]; base: string; llm: boolean }>("/admin/agents/ceo/seo/run", { method: "POST" });
}
export type LandingSection = { heading: string; body: string };
export type LandingFaq = { q: string; a: string };
export type GeneratedPage = { _id: string; slug: string; locale: string; category: string; keyword: string; heroTitle: string; status: string; updatedAt?: string };
export type LandingPageFull = GeneratedPage & {
  heroSubtitle: string; heroIntro: string; sections: LandingSection[]; faq: LandingFaq[];
  metaTitle: string; metaDescription: string; publishedAt?: string;
};
export function generateLandingPage(keyword: string) {
  return request<{ ok: boolean; page: LandingPageFull; ai: boolean }>("/admin/agents/ceo/pages/generate", { method: "POST", body: JSON.stringify({ keyword }) });
}
export function listLandingPages() {
  return request<{ pages: GeneratedPage[] }>("/admin/agents/ceo/pages");
}
export function getLandingPageById(id: string) {
  return request<{ page: LandingPageFull }>(`/admin/agents/ceo/pages/${id}`);
}
export function editLandingPageAI(id: string, instruction: string) {
  return request<{ ok: boolean; page: LandingPageFull }>(`/admin/agents/ceo/pages/${id}/edit`, { method: "POST", body: JSON.stringify({ instruction }) });
}
export function publishLandingPage(id: string) {
  return request<{ ok: boolean; page: LandingPageFull }>(`/admin/agents/ceo/pages/${id}/publish`, { method: "POST" });
}

// ---- Task Orchestration ----
export type OrchSubtask = { label: string; done: boolean };
export type OrchStatus = "Completed" | "In Progress" | "Waiting Approval" | "Failed/Blocked" | "Pending";
export type OrchTask = {
  id: string;
  task: string;
  description: string;
  agent: string;
  department: string;
  priority: "High" | "Medium" | "Low";
  status: OrchStatus;
  dueDate: string;
  impact: "High" | "Medium" | "Low";
  confidence: number;
  progress: number;
  subtasks: OrchSubtask[];
  action: string;
  tier: string;
  link: string;
  output: string;
};
export type OrchStats = {
  total: number; completed: number; completedPct: number;
  inProgress: number; inProgressPct: number;
  waiting: number; waitingPct: number; failed: number; avgCompletion: string;
};
export type OrchFlowStage = { agent: string; step: string; output: string; status: OrchStatus };
export type Orchestration = {
  stats: OrchStats;
  tasks: OrchTask[];
  flow: OrchFlowStage[];
  automationRules: { rule: string; on: boolean }[];
  triggers: { label: string; count: number }[];
  recommendations: string[];
  _ai: boolean;
};
export function getCeoOrchestration() {
  return request<Orchestration>("/admin/agents/ceo/orchestration");
}
export function executeCeoTask(id: string) {
  return request<{ ok: boolean; autoFixed?: boolean; queued?: boolean; alreadyClear?: boolean; result?: string; link?: string; error?: string }>(
    "/admin/agents/ceo/orchestration/execute",
    { method: "POST", body: JSON.stringify({ id }) }
  );
}
// Focused chat about ONE task/issue — the assigned agent explains + recommends.
export type TaskChatTurn = { role: "founder" | "agent"; text: string };
export function taskChat(task: Partial<OrchTask>, message: string, history: TaskChatTurn[] = []) {
  return request<{ agent: string; text: string }>("/admin/agents/ceo/task-chat", {
    method: "POST",
    body: JSON.stringify({
      task: {
        task: task.task, description: task.description, agent: task.agent, department: task.department,
        priority: task.priority, status: task.status, impact: task.impact, confidence: task.confidence,
        subtasks: task.subtasks, action: task.action, link: task.link, output: task.output,
      },
      message, history,
    }),
  });
}

// ---- Task Center — real task management ----
export type TaskProgress = { done: number; total: number; pct: number };
export type TaskRow = {
  id: string; taskId: string; title: string; status: string; priority: "High" | "Medium" | "Low";
  category: string; taskType?: string; impact?: string; assignee: string; createdByAgent: string; dueDate: string | null; overdue: boolean;
  progress: TaskProgress; checklistDone: number; checklistTotal: number; commentsCount: number;
  attachmentsCount: number; tags: string[]; createdAt: string; updatedAt: string;
};
export type TaskChecklistItem = { id: string; label: string; done: boolean };
export type TaskComment = { id: string; author: string; text: string; at: string; attachment?: { name: string; size: string } };
export type TaskAttachment = { id: string; name: string; size: string; type: string };
export type TaskActivity = { type: string; at: string; by: string; note: string };
export type TaskFull = TaskRow & {
  description: string; objective: string[]; deliverables: string[]; acceptanceCriteria: string[];
  collaborators: string[]; estimatedTime: string; timeTrackedMin: number;
  checklist: TaskChecklistItem[]; comments: TaskComment[]; attachments: TaskAttachment[];
  relatedTasks: { title: string; status: string }[]; dependency: string; notes: string; activity: TaskActivity[];
};
export type TaskStats = {
  total: number; todo: number; inProgress: number; inReview: number; completed: number; overdue: number;
  mine: number; assignedToMe: number; createdByMe: number; dueThisWeek: number;
  statusDonut: { label: string; count: number; pct: number }[];
  priorityBars: { label: string; count: number }[];
  upcoming: { id: string; title: string; priority: string; dueDate: string }[];
  assignees: string[]; categories: string[];
};
export type TaskInput = {
  title?: string; description?: string; status?: string; priority?: string; category?: string;
  assignee?: string; dueDate?: string; estimatedTime?: string; tags?: string[];
  checklist?: { label: string; done?: boolean }[]; objective?: string[]; deliverables?: string[]; acceptanceCriteria?: string[];
};
export function getTaskStats() { return request<TaskStats>("/admin/tasks/stats"); }
export function listTasks(params: { tab?: string; status?: string; priority?: string; assignee?: string; category?: string; taskType?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: TaskRow[]; total: number; page: number; pages: number }>(`/admin/tasks${s ? `?${s}` : ""}`);
}
export function getTask(id: string) { return request<{ task: TaskFull }>(`/admin/tasks/${id}`); }
export function createTask(input: TaskInput) { return request<{ ok: boolean; task: TaskFull }>("/admin/tasks", { method: "POST", body: JSON.stringify(input) }); }
export function updateTask(id: string, patch: TaskInput) { return request<{ ok: boolean; task: TaskFull }>(`/admin/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }
export function deleteTask(id: string) { return request<{ ok: boolean }>(`/admin/tasks/${id}`, { method: "DELETE" }); }
export function completeTask(id: string) { return request<{ ok: boolean; task: TaskFull }>(`/admin/tasks/${id}/complete`, { method: "POST" }); }
export function toggleChecklistItem(id: string, itemId: string) { return request<{ ok: boolean; task: TaskFull }>(`/admin/tasks/${id}/checklist/${itemId}/toggle`, { method: "POST" }); }
export function addChecklistItem(id: string, label: string) { return request<{ ok: boolean; task: TaskFull }>(`/admin/tasks/${id}/checklist`, { method: "POST", body: JSON.stringify({ label }) }); }
export function addTaskComment(id: string, text: string, author?: string) { return request<{ ok: boolean; task: TaskFull }>(`/admin/tasks/${id}/comment`, { method: "POST", body: JSON.stringify({ text, author }) }); }

// ---- Marketing Director Agent — real CMO dashboard ----
export type MarketingData = {
  profile: { name: string; title: string; bio: string };
  responsibilities: string[];
  mustDo: { title: string; cadence: string; status: string }[];
  keyActions: string[];
  kpis: {
    sessions: number; sessionsTrend: number; sessionsSpark: number[];
    newUsers: number; newUsersTrend: number; newUsersSpark: number[];
    conversions: number; conversionsTrend: number; conversionsSpark: number[];
    conversionRate: number; conversionRateTrend: number; conversionRateSpark: number[];
    revenue: number; revenueTrend: number; revenueSpark: number[];
    roi: number; roiTrend: number; roiSpark: number[];
  };
  traffic: { label: string; value: number; pct: number; color: string }[];
  trafficTotal: number;
  topPages: { path: string; views: number; listings: number }[];
  channels: { label: string; value: number; pct: number; color: string }[];
  campaigns: { campaign: string; sessions: number; conversions: number; rate: number; revenue: number; roi: number }[];
  categories: { category: string; sessions: number; bookings: number; revenue: number; growth: number }[];
  opportunities: { title: string; detail: string; impact: string }[];
  contentIdeas: { title: string; potential: string }[];
  weeklyPlan: { day: string; block: string; color: string }[];
  collaboration: { agent: string; note: string; at: string; status: string }[];
  insights?: {
    trafficTrend: { label: string; sessions: number; conversions: number; users: number }[];
    topChannels: { channel: string; sessions: number; share: number; change: number }[];
    seo: { organicSessions: number; seoScore: number | null; routesCrawled: number; seoIssues: number; avgPosition: number | null; topKeywords: { keyword: string; position: number; clicks: number; change: number }[]; movement: { improved: number; noChange: number; declined: number } };
    contentInsights: { title: string; pageViews: number; status: string; at: string }[];
    categoryInsights: { category: string; sessions: number; growth: number; opportunity: string }[];
    summary: string[];
  };
  _ai: boolean;
};
export function getMarketingDirector() { return request<MarketingData>("/admin/agents/ceo/marketing"); }

// ---- Marketing Director task board (real task analytics) ----
export type MarketingTasks = {
  kpis: { total: number; completed: number; inProgress: number; pending: number; overdue: number; completionRate: number; trend: number };
  byStatus: { label: string; count: number; color: string; pct: number }[];
  byType: { type: string; count: number; pct: number }[];
  upcoming: { id: string; title: string; dueDate: string; daysLeft: number; overdue: boolean }[];
  priorities: { highImpact: number; timeSensitive: number; strategic: number };
  automation: { name: string; desc: string; status: string }[];
  insights: { avgCompletionDays: number; mostProductiveDay: string; focusHrs: number };
  types: string[];
};
export function getMarketingTasks() { return request<MarketingTasks>("/admin/tasks/marketing"); }

// ---- Marketing Plans (real plan management) ----
export type PlanInitiative = { id: string; title: string; status: string; progress: number; dueDate: string | null };
export type MarketingPlanRow = {
  id: string; planId: string; name: string; objective: string; startDate: string | null; endDate: string | null;
  status: string; progress: number; owner: string; type: string; archived: boolean; upcoming: boolean;
  initiatives: PlanInitiative[]; objectives: string[]; alignment: { goal: string; pct: number }[];
  forecast: { trafficPct?: number; revenueAed?: number; newUsersPct?: number }; initiativeCount: number; updatedAt: string;
};
export type MarketingPlansBoard = {
  kpis: { activePlans: number; completedPlans: number; totalInitiatives: number; onTrack: number; onTrackPct: number; atRisk: number; atRiskPct: number; overdue: number; overduePct: number; activeTrend: number; completedTrend: number; initiativesTrend: number };
  plansByStatus: { label: string; count: number; pct: number; color: string }[];
  timeline: { name: string; startPct: number; widthPct: number; color: string; status: string }[];
  objectivesOverview: { label: string; count: number }[];
  initiativesUnderPlans: { total: number; completed: number; completedPct: number; inProgress: number; inProgressPct: number; notStarted: number; notStartedPct: number; topInitiatives: { plan: string; title: string; status: string; progress: number; dueDate: string | null }[] };
  upcomingPlans: { id: string; name: string; startDate: string | null }[];
  forecast: { trafficPct: number; revenueAed: number; newUsersPct: number };
  alignment: { goal: string; pct: number }[];
};
export function getMarketingPlansBoard() { return request<MarketingPlansBoard>("/admin/tasks/plans/board"); }
export function listMarketingPlans(params: { tab?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: MarketingPlanRow[]; total: number; page: number; pages: number }>(`/admin/tasks/plans${s ? `?${s}` : ""}`);
}
export function createMarketingPlan(input: Partial<MarketingPlanRow> & { name?: string }) { return request<{ ok: boolean; plan: MarketingPlanRow }>("/admin/tasks/plans", { method: "POST", body: JSON.stringify(input) }); }
export function updateMarketingPlan(id: string, patch: Record<string, unknown>) { return request<{ ok: boolean; plan: MarketingPlanRow }>(`/admin/tasks/plans/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }
export function deleteMarketingPlan(id: string) { return request<{ ok: boolean }>(`/admin/tasks/plans/${id}`, { method: "DELETE" }); }
export function completeMarketingPlan(id: string) { return request<{ ok: boolean; plan: MarketingPlanRow }>(`/admin/tasks/plans/${id}/complete`, { method: "POST" }); }

// ---- Copywriter Agent — real content analytics ----
export type CopywriterData = {
  profile: { name: string; title: string; tagline: string };
  responsibilities: string[];
  kpis: {
    contentCreated: number; contentCreatedTrend: number; wordsWritten: number; wordsWrittenTrend: number;
    avgScore: number; avgScoreTrend: number; pagesPublished: number; pagesPublishedTrend: number;
    trafficImpact: number; trafficImpactTrend: number; engagementRate: number; engagementTrend: number;
  };
  outputOverTime: { label: string; pages: number; words: number }[];
  scoreDistribution: { label: string; count: number; pct: number; color: string }[];
  topPerforming: { page: string; traffic: number; change: number; score: number; topKeyword: string }[];
  contentTypes: { label: string; count: number; color: string; pct: number }[];
  seoRadar: { score: number; dims: { label: string; value: number }[] };
  topKeywords: { keyword: string; position: number; change: number; volume: number }[];
  aiWriting: { aiGenerated: number; aiGeneratedPct: number; humanEdited: number; humanEditedPct: number; avgAiScore: number; plagiarismFree: number };
  recentPublished: { title: string; slug: string; publishedAt: string; score: number }[];
  calendar: { title: string; type: string; date: string }[];
  blogRuns: number; _ai: boolean;
};
export function getCopywriter() { return request<CopywriterData>("/admin/agents/ceo/copywriter"); }

// ---- Copywriter — Content Performance tab ----
export type CopywriterPerf = {
  kpis: { pages: number; pagesTrend: number; impressions: number; impressionsTrend: number; clicks: number; clicksTrend: number; ctr: number; ctrTrend: number; avgPosition: number; avgPositionTrend: number; conversions: number; conversionsTrend: number };
  overTime: { label: string; impressions: number; clicks: number; conversions: number }[];
  topByTraffic: { page: string; sessions: number; change: number; avgPosition: number; ctr: number }[];
  byType: { label: string; count: number; color: string; pct: number }[];
  engagement: { avgTime: string; bounceRate: number; pagesPerSession: number; scrollDepth: number; overTime: { label: string; value: number }[] };
  seoOverview: { top3: number; top10: number; top20: number; ranking: number; distribution: { bucket: string; thisPeriod: number; lastPeriod: number }[] };
  scoreRadar: { score: number; dims: { label: string; value: number }[] };
  topPerforming: { page: string; type: string; sessions: number; change: number; avgPosition: number; ctr: number; conversions: number; convRate: number; score: number }[];
  insights: { title: string; body: string; tone: string; icon: string }[];
  _ai: boolean;
};
export function getCopywriterPerformance() { return request<CopywriterPerf>("/admin/agents/ceo/copywriter/performance"); }

// ---- Content Briefs (SEO briefs for the Copywriter) ----
export type BriefRow = {
  id: string; briefId: string; title: string; description: string; primaryKeyword: string;
  keywordDifficulty: number; searchVolume: number; contentType: string; priority: string; status: string;
  assignee: string; targetWordCount: number; dueDate: string | null; tags: string[]; category: string;
  qualityScore: number; createdByAgent: string; createdAt: string; updatedAt: string; overdue: boolean;
};
export type BriefBoard = {
  kpis: { total: number; inProgress: number; awaitingReview: number; approved: number; published: number; draft: number; totalTrend: number; inProgressTrend: number; awaitingTrend: number; approvedTrend: number; publishedTrend: number };
  progress: { label: string; count: number; color: string; pct: number }[];
  typeDist: { label: string; count: number; color: string; pct: number }[];
  topPerforming: { title: string; score: number; publishedAt: string; status: string }[];
  avgQuality: number;
  upcoming: { id: string; title: string; assignee: string; priority: string; dueDate: string; daysLeft: number; overdue: boolean }[];
  suggestions: { title: string; body: string; icon: string }[];
  authors: string[]; categories: string[];
};
export type BriefInput = { title?: string; description?: string; primaryKeyword?: string; keywordDifficulty?: number; searchVolume?: number; contentType?: string; priority?: string; status?: string; assignee?: string; targetWordCount?: number; dueDate?: string; tags?: string[]; category?: string };
export function getBriefBoard() { return request<BriefBoard>("/admin/agents/ceo/briefs/board"); }
export function listBriefs(params: { status?: string; type?: string; category?: string; author?: string; priority?: string; q?: string; page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const s = qs.toString();
  return request<{ items: BriefRow[]; total: number; page: number; pages: number }>(`/admin/agents/ceo/briefs${s ? `?${s}` : ""}`);
}
export function createBrief(input: BriefInput) { return request<{ ok: boolean; brief: BriefRow }>("/admin/agents/ceo/briefs", { method: "POST", body: JSON.stringify(input) }); }
export function updateBrief(id: string, patch: BriefInput) { return request<{ ok: boolean; brief: BriefRow }>(`/admin/agents/ceo/briefs/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }
export function deleteBrief(id: string) { return request<{ ok: boolean }>(`/admin/agents/ceo/briefs/${id}`, { method: "DELETE" }); }
export function advanceBrief(id: string) { return request<{ ok: boolean; brief: BriefRow }>(`/admin/agents/ceo/briefs/${id}/advance`, { method: "POST" }); }

// ---- Content Calendar ----
export type CalendarItem = { id: string; title: string; type: string; status: string; color: string; time: string; assignee: string; date: string };
export type ContentCalendar = {
  month: number; year: number; items: CalendarItem[];
  byType: { label: string; count: number; pct: number; color: string }[];
  totalContent: number;
  statusBar: { total: number; scheduled: number; inProgress: number; drafts: number; published: number; needsReview: number; onHold: number };
  streak: number; streakDays: { label: string; published: boolean; today: boolean }[];
  upcoming: { id: string; title: string; type: string; status: string; date: string }[];
  legend: { label: string; color: string }[];
};
export function getContentCalendar(year?: number, month?: number) {
  const qs = new URLSearchParams();
  if (year) qs.set("year", String(year)); if (month) qs.set("month", String(month));
  const s = qs.toString();
  return request<ContentCalendar>(`/admin/agents/ceo/calendar${s ? `?${s}` : ""}`);
}

// ---- Topic Research ----
export type TopicResearch = {
  kpis: { topicsAnalyzed: number; topicsTrend: number; highOpportunity: number; highTrend: number; estMonthlyTraffic: number; trafficTrend: number; avgDifficulty: number; difficultyTrend: number; ideasGenerated: number; ideasTrend: number };
  opportunityMap: { topic: string; traffic: number; difficulty: number; volume: number; opportunity: string }[];
  trending: { topic: string; change: number; spark: number[] }[];
  byIntent: { label: string; count: number; pct: number; color: string }[];
  topOpportunities: { id: string; theme: string; keyword: string; intent: string; volume: number; kd: number; opportunityScore: number; trend: number[] }[];
  clusters: { name: string; topics: number; progress: number }[];
  contentIdeas: { title: string; type: string }[];
  intents: string[]; categories: string[];
};
export function getTopicResearch() { return request<TopicResearch>("/admin/agents/ceo/topics"); }
export function discoverTopics() { return request<{ ok: boolean; created: number; topics: string[] }>("/admin/agents/ceo/topics/discover", { method: "POST" }); }

// ---- Content Gaps ----
export type ContentGaps = {
  kpis: { totalGaps: number; totalTrend: number; highImpact: number; highTrend: number; estMonthlyTraffic: number; trafficTrend: number; avgKd: number; kdTrend: number; potentialValue: number; valueTrend: number };
  gapOverview: { yourContent: number; competitors: number; common: number; gapKeywords: number };
  gapByIntent: { label: string; count: number; pct: number; color: string }[];
  gapByType: { label: string; count: number; pct: number; color: string }[];
  topGaps: { keyword: string; intent: string; volume: number; kd: number; yourRank: string; competitor: string; estTraffic: number; trafficValue: number; priority: string }[];
  competitorsMissing: { domain: string; missingKeywords: number; estTraffic: number }[];
  recommendedActions: { title: string; detail: string }[];
  intents: string[]; competitors: string[];
};
export function getContentGaps() { return request<ContentGaps>("/admin/agents/ceo/gaps"); }

// ---- SERP Insights ----
export type SerpInsights = {
  keyword: string; category: string; location: string;
  kpis: { keywordDifficulty: number; searchVolume: number; clicks: number; cpc: number; globalVolume: number; serpFeatures: number };
  serpOverview: { rank: number; title: string; url: string; domain: string; domainRating: number; backlinks: number; estTraffic: number; features: string[] }[];
  serpFeatures: { label: string; count: number; pct: number; color: string }[];
  peopleAlsoAsk: { q: string; a: string }[];
  contentInsights: { metric: string; top: number; your: number; opportunity: number }[];
  rankingFactors: { factor: string; correlation: number; impact: string; score: number }[];
  competitorComparison: { domain: string; estTraffic: number; backlinks: number; dr: number; keywordCoverage: number }[];
  recommendations: { title: string; detail: string; impact: string }[];
  recoSummary: string; live: boolean; sources: { url: string; title: string }[];
};
export function getSerpInsights(keyword = "yacht rental dubai") { return request<SerpInsights>(`/admin/agents/ceo/serp?keyword=${encodeURIComponent(keyword)}`); }
export function analyzeSerp(keyword: string) { return request<SerpInsights>("/admin/agents/ceo/serp/analyze", { method: "POST", body: JSON.stringify({ keyword }) }); }

// ---- AI Writing ----
export type ContentScore = { overall: number; seo: number; readability: number; structure: number; engagement: number; originality: number; words: number };
export type WritingDraft = { id: string; title: string; slug: string; body: string; excerpt: string; category: string; tags: string[]; status: string; coverImageUrl: string; audience: string; tone: string; words: number; score: ContentScore; updatedAt: string; publishedAt: string | null; url: string | null };
export type WritingDashboard = {
  kpis: { contentGenerated: number; contentTrend: number; wordsGenerated: number; wordsTrend: number; avgScore: number; scoreTrend: number; contentPublished: number; publishedTrend: number; timeSaved: number; timeTrend: number };
  recentDrafts: { id: string; title: string; words: number; status: string; score: number; date: string }[];
  templates: { id: string; name: string; desc: string; type: string; skeleton: string }[];
  assistant: { key: string; label: string; desc: string }[];
  contentTypes: string[];
  insights: { keyword: string; traffic: string; competition: string }[];
  suggestions: string[]; opportunities: string[];
  optimizationTips: { tip: string; recommended: boolean }[];
  credits: { used: number; total: number; resetLabel: string };
  briefOptions: { id: string; title: string }[]; llm: boolean;
  autoWriter: {
    enabled: boolean; count: number; schedule: string;
    lastRunAt: string | null; lastRunCreated: number | null; nextRunAt: string | null;
    pendingDrafts: number; totalWritten: number;
    runHistory: { at: string; created: number; requested: number; errors: number }[];
    feed: { id: string; title: string; status: string; score: number; date: string }[];
  };
};
export function getWriting() { return request<WritingDashboard>("/admin/agents/ceo/writing"); }
export function generateContent(input: Record<string, string>) { return request<{ ok: boolean; draft?: WritingDraft; message?: string }>("/admin/agents/ceo/writing/generate", { method: "POST", body: JSON.stringify(input) }); }
export function getWritingDraft(id: string) { return request<{ ok: boolean; draft?: WritingDraft; message?: string }>(`/admin/agents/ceo/writing/draft/${id}`); }
export function saveWritingDraft(id: string, input: Record<string, unknown>) { return request<{ ok: boolean; draft?: WritingDraft; message?: string }>(`/admin/agents/ceo/writing/draft/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function publishWritingDraft(id: string) { return request<{ ok: boolean; draft?: WritingDraft; url?: string; message?: string }>(`/admin/agents/ceo/writing/draft/${id}/publish`, { method: "POST" }); }
export function deleteWritingDraft(id: string) { return request<{ ok: boolean }>(`/admin/agents/ceo/writing/draft/${id}`, { method: "DELETE" }); }
export function writingAssist(input: { action: string; text?: string; topic?: string; title?: string; body?: string }) { return request<{ ok: boolean; action?: string; label?: string; result?: string; options?: string[]; message?: string }>("/admin/agents/ceo/writing/assist", { method: "POST", body: JSON.stringify(input) }); }

// ---- Image upload (multipart → backend /uploads/image, same as admin) ----
export async function uploadImage(file: File, folder = "blog"): Promise<{ url: string; provider: string }> {
  const form = new FormData();
  form.append("image", file);
  form.append("folder", folder);
  const res = await fetch(`${API_URL}/uploads/image`, { method: "POST", body: form, credentials: "include" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data?.message || `Upload failed (${res.status})`, res.status);
  return data as { url: string; provider: string };
}

// ---- Optimization ----
export type Optimization = {
  kpis: { avgScore: number; scoreTrend: number; pagesOptimized: number; pagesTrend: number; top3Improvements: number; top3Trend: number; organicTrafficImpact: number; trafficTrend: number; impressionsGained: number; impressionsTrend: number };
  overview: { label: string; count: number; pct: number; color: string }[];
  trend: { label: string; value: number }[];
  opportunities: { key: string; label: string; count: number; unit: string; severity: string; dim: string }[];
  audit: { id: string; title: string; url: string; score: number; status: string; issues: number; impressions: number; clicks: number; trafficImpact: number; lastAnalyzed: string }[];
  impact: { organicTraffic: number; organicTrend: number; avgRanking: number; rankingTrend: number; top3Rankings: number; top3Trend: number; top10Rankings: number; top10Trend: number; impressions: number; impressionsTrend: number; clicks: number; clicksTrend: number };
  recommendations: { key: string; title: string; detail: string; impact: string; action: string }[];
  totals: { total: number; analyzed: number }; subTabs: string[];
};
export function getOptimization() { return request<Optimization>("/admin/agents/ceo/optimization"); }
export function applyOptimization(key: string) { return request<{ ok: boolean; key: string; fixed: number; affected?: number; message: string }>("/admin/agents/ceo/optimization/apply", { method: "POST", body: JSON.stringify({ key }) }); }

// ---- Publisher Agent ----
export type SocialPost = {
  id: string; title: string; content: string; platform: string; status: string;
  link: string; mediaUrl: string; externalUrl: string; error: string;
  scheduledAt: string | null; publishedAt: string | null;
  impressions: number; engagements: number; clicks: number; estimated: boolean; priority: string; owner: string; contentType: string;
  blogPostId: string | null; createdAt: string; updatedAt: string;
};
export type PublisherChannel = {
  platform: string; icon: string; connected: boolean; hint: string; enabled: boolean; autoPublish: boolean;
  lastPublishedAt: string | null; published: number; impressions: number; engagements: number; clicks: number; engagementRate: number;
};
export type PublisherOverview = {
  kpis: { publishedThisPeriod: number; publishedTrend: number; scheduled: number; scheduledTrend: number; totalImpressions: number; impressionsTrend: number; totalEngagements: number; engagementsTrend: number; clicksGenerated: number; clicksTrend: number; engagementRate: number; rateTrend: number };
  perf: { label: string; published: number; impressions: number; engagements: number; clicks: number }[];
  funnel: { stages: { stage: string; count: number; color: string }[]; conversionRate: number; approvalRate: number; avgTimeToPublish: number };
  topChannels: PublisherChannel[];
  recent: SocialPost[]; scheduled: SocialPost[]; topPerforming: SocialPost[];
  recommendations: { key: string; title: string; detail: string; cta: string }[];
  blogs: { id: string; title: string; slug: string; views: number }[];
  platforms: string[]; connectedCount: number; llm: boolean;
};
export function getPublisherOverview() { return request<PublisherOverview>("/admin/agents/publisher/overview"); }
export function getPublisherQueue() { return request<{ posts: SocialPost[] }>("/admin/agents/publisher/queue"); }
export function getPublisherPublished() { return request<{ posts: SocialPost[] }>("/admin/agents/publisher/published"); }
export function getPublisherChannels() { return request<{ channels: PublisherChannel[] }>("/admin/agents/publisher/channels"); }
export function setPublisherChannel(platform: string, body: { enabled?: boolean; autoPublish?: boolean }) { return request<{ ok: boolean }>(`/admin/agents/publisher/channels/${platform}`, { method: "POST", body: JSON.stringify(body) }); }
export function publisherGenerate(body: { blogId: string; platforms: string[]; schedule?: string | null }) { return request<{ ok: boolean; created?: SocialPost[]; message?: string }>("/admin/agents/publisher/generate", { method: "POST", body: JSON.stringify(body) }); }
export function publisherCustom(body: { title: string; content: string; platforms: string[]; link?: string; mediaUrl?: string; schedule?: string | null }) { return request<{ ok: boolean; created?: SocialPost[] }>("/admin/agents/publisher/custom", { method: "POST", body: JSON.stringify(body) }); }
export function publisherPublish(id: string) { return request<{ ok: boolean; post?: SocialPost; message?: string; needsConnection?: boolean }>(`/admin/agents/publisher/${id}/publish`, { method: "POST" }); }
export function publisherSetStatus(id: string, status: string) { return request<{ ok: boolean; post?: SocialPost }>(`/admin/agents/publisher/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function publisherSchedule(id: string, when: string) { return request<{ ok: boolean; post?: SocialPost }>(`/admin/agents/publisher/${id}/schedule`, { method: "POST", body: JSON.stringify({ when }) }); }
export function publisherDelete(id: string) { return request<{ ok: boolean }>(`/admin/agents/publisher/${id}`, { method: "DELETE" }); }

// ---- Publisher Content Queue board ----
export type QueueBoard = {
  kpis: { totalInQueue: number; totalTrend: number; draft: number; draftPct: number; inReview: number; inReviewPct: number; approved: number; approvedPct: number; scheduled: number; scheduledPct: number; avgTimeInQueue: number; avgTrend: number };
  rows: (SocialPost & { addedOn: string; eta: string | null })[];
  byStatus: { label: string; count: number; pct: number; color: string }[];
  upcoming: SocialPost[];
  byChannel: { platform: string; icon: string; inQueue: number; scheduled: number; avgTime: number }[];
  priorityBreakdown: { label: string; count: number; pct: number; color: string }[];
  topOwners: { owner: string; items: number }[];
  insights: { addedToQueue: number; movedToReview: number; approved: number; published: number; series: { label: string; added: number; approved: number; published: number }[] };
};
export function getPublisherQueueBoard() { return request<QueueBoard>("/admin/agents/publisher/queue-board"); }

// ---- Sales Agent ----
export type SalesLead = {
  id: string; company: string; category: string; website: string; contactName: string;
  email: string; phone: string; whatsapp: string; location: string; source: string;
  leadScore: number; stage: string; owner: string; research: string; notes: string;
  nextAction: string; nextActionAt: string | null; revenuePotential: number;
  whatsappSent: number; emailSent: number; replied: boolean; lastChannel: string; intent: string; optOut: boolean;
  activities: { type: string; channel: string; summary: string; at: string }[];
  sources: { url: string; title: string }[]; lastActivityAt: string; createdAt: string; updatedAt: string;
};
export type SalesOverview = {
  kpis: { leadsReceived: number; leadsTrend: number; providersContacted: number; contactedTrend: number; openRate: number; openTrend: number; replyRate: number; replyTrend: number; qualifiedLeads: number; qualifiedTrend: number; partnersClosed: number; closedTrend: number; revenuePotential: number; revenueTrend: number };
  pipeline: { stage: string; count: number; color: string }[];
  leads: SalesLead[];
  dailyActivity: { label: string; count: number; color: string }[]; totalActivities: number;
  channelPerf: { channel: string; sent: number; delivered: number; read: number; replied: number; replyRate: number; connected: boolean }[];
  funnel: { stage: string; count: number; pct: number }[]; overallConversion: number;
  hotLeads: SalesLead[]; followUps: SalesLead[]; recentConversations: SalesLead[];
  topCategories: { category: string; leads: number; meetings: number; closed: number; conversion: number }[];
  tasks: { dueToday: number; dueThisWeek: number; overdue: number; completed: number };
  recommendations: { title: string; detail: string }[];
  revenueForecast: number; wkAdded: number;
  categories: string[]; whatsappConnected: boolean; whatsappLive?: boolean; whatsappError?: string; emailConnected: boolean; whatsappHint: string; llm: boolean; onPlatform: number;
};
export function getSalesOverview() { return request<SalesOverview>("/admin/agents/sales/overview"); }
export function getSalesLeads(params: { stage?: string; q?: string; category?: string } = {}) { const qs = new URLSearchParams(params as Record<string, string>).toString(); return request<{ leads: SalesLead[] }>(`/admin/agents/sales/leads${qs ? `?${qs}` : ""}`); }
export function salesFind(body: { category: string; count?: number }) { return request<{ ok: boolean; created?: SalesLead[]; message?: string }>("/admin/agents/sales/find", { method: "POST", body: JSON.stringify(body) }); }
export function salesAddLead(body: Record<string, unknown>) { return request<{ ok: boolean; lead?: SalesLead; message?: string }>("/admin/agents/sales/leads", { method: "POST", body: JSON.stringify(body) }); }
export function salesResearch(id: string) { return request<{ ok: boolean; lead?: SalesLead; message?: string }>(`/admin/agents/sales/leads/${id}/research`, { method: "POST" }); }
export function salesDraft(id: string, channel: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/sales/leads/${id}/draft`, { method: "POST", body: JSON.stringify({ channel }) }); }
export function salesOutreach(id: string, body: { channel: string; message?: string }) { return request<{ ok: boolean; lead?: SalesLead; sentMessage?: string; message?: string; needsConnection?: boolean }>(`/admin/agents/sales/leads/${id}/outreach`, { method: "POST", body: JSON.stringify(body) }); }
export function salesMoveStage(id: string, stage: string) { return request<{ ok: boolean; lead?: SalesLead }>(`/admin/agents/sales/leads/${id}/stage`, { method: "POST", body: JSON.stringify({ stage }) }); }
export function salesUpdateLead(id: string, body: Record<string, unknown>) { return request<{ ok: boolean; lead?: SalesLead }>(`/admin/agents/sales/leads/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
export function salesDeleteLead(id: string) { return request<{ ok: boolean }>(`/admin/agents/sales/leads/${id}`, { method: "DELETE" }); }

// ---- Sales pipeline board ----
export type PipelineBoard = {
  kpis: { totalLeads: number; totalTrend: number; leadsThisWeek: number; weekTrend: number; movingForward: number; forwardTrend: number; stuck: number; stuckTrend: number; convertedThisWeek: number; convertedTrend: number; conversionRate: number; conversionTrend: number };
  columns: { stage: string; color: string; count: number; potential: number; cards: SalesLead[] }[];
  owners: string[];
};
export function getSalesPipeline(params: { owner?: string; q?: string } = {}) { const qs = new URLSearchParams(params as Record<string, string>).toString(); return request<PipelineBoard>(`/admin/agents/sales/pipeline${qs ? `?${qs}` : ""}`); }

// ---- Sales Campaigns ----
export type SalesCampaign = {
  id: string; name: string; description: string; type: string; targetCategory: string;
  channels: string[]; status: string; recipients: number; sent: number; delivered: number;
  opened: number; replied: number; openRate: number; replyRate: number; meetings: number; revenue: number;
  lastRunAt: string | null; createdAt: string;
};
export type CampaignsOverview = {
  kpis: { campaigns: number; activeCampaigns: number; campaignsTrend: number; messagesSent: number; messagesTrend: number; openRate: number; openTrend: number; replyRate: number; replyTrend: number; meetingsBooked: number; meetingsTrend: number; partnersClosed: number; closedTrend: number; revenueGenerated: number; revenueTrend: number };
  campaigns: SalesCampaign[];
  channelPerformance: { channel: string; sent: number; delivered: number; openRate: number; replyRate: number; meetings: number; color: string }[];
  channelDonut: { label: string; count: number; color: string }[]; messagesSent: number;
  topPerforming: SalesCampaign[];
  recentActivity: { label: string; meta: Record<string, unknown>; at: string }[];
  goals: { label: string; current: number; target: number; pct: number }[];
  insights: string[]; categories: string[]; types: string[]; whatsappConnected: boolean; emailConnected: boolean;
};
export function getCampaignsOverview() { return request<CampaignsOverview>("/admin/agents/sales/campaigns"); }
export function createCampaign(body: Record<string, unknown>) { return request<{ ok: boolean; campaign?: SalesCampaign; message?: string }>("/admin/agents/sales/campaigns", { method: "POST", body: JSON.stringify(body) }); }
export function runCampaign(id: string) { return request<{ ok: boolean; campaign?: SalesCampaign; sent?: number; failed?: number; message?: string }>(`/admin/agents/sales/campaigns/${id}/run`, { method: "POST" }); }
export function setCampaignStatus(id: string, status: string) { return request<{ ok: boolean; campaign?: SalesCampaign }>(`/admin/agents/sales/campaigns/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function deleteCampaign(id: string) { return request<{ ok: boolean }>(`/admin/agents/sales/campaigns/${id}`, { method: "DELETE" }); }

// ---- WhatsApp Outreach inbox ----
export type WaMessage = { direction: "out" | "in"; channel: string; text: string; status: string; error?: string; at: string };
export type WaConversation = { id: string; company: string; category: string; leadScore: number; lastMessage: string; lastAt: string; unread: number; status: string; intent: string; optOut: boolean; hasWhatsapp: boolean };
export type WhatsAppInbox = {
  kpis: { messagesSent: number; sentTrend: number; delivered: number; deliveredTrend: number; read: number; readTrend: number; replied: number; repliedTrend: number; meetingsBooked: number; meetingsTrend: number; replyRate: number; replyTrend: number; optOuts: number; optOutsTrend: number };
  conversations: WaConversation[];
  overview: { total: number; segments: { label: string; count: number; color: string }[] };
  compliance: { dailyLimit: number; sentToday: number; qualityRating: string; optOutRate: number };
  whatsappConnected: boolean; whatsappLive?: boolean; whatsappError?: string; whatsappHint: string; llm: boolean;
};
export function getWhatsAppInbox() { return request<WhatsAppInbox>("/admin/agents/sales/whatsapp/inbox"); }
export function getWaThread(id: string) { return request<{ ok: boolean; lead?: SalesLead; messages?: WaMessage[]; withinWindow?: boolean; message?: string }>(`/admin/agents/sales/whatsapp/thread/${id}`); }
export function sendWaMessage(id: string, text: string) { return request<{ ok: boolean; lead?: SalesLead; messages?: WaMessage[]; queued?: boolean; message?: string }>(`/admin/agents/sales/whatsapp/thread/${id}/send`, { method: "POST", body: JSON.stringify({ text }) }); }
export function aiWaDraft(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/sales/whatsapp/thread/${id}/ai`, { method: "POST" }); }
export function markWaRead(id: string) { return request<{ ok: boolean }>(`/admin/agents/sales/whatsapp/thread/${id}/read`, { method: "POST" }); }
export function setWaOptOut(id: string, optOut: boolean) { return request<{ ok: boolean; lead?: SalesLead }>(`/admin/agents/sales/whatsapp/thread/${id}/optout`, { method: "POST", body: JSON.stringify({ optOut }) }); }

// ---- Sales Agent autonomous actions ----
export function salesDailyRun(count = 10) { return request<{ ok: boolean; found?: number; outreached?: number; category?: string; message?: string }>("/admin/agents/sales/daily", { method: "POST", body: JSON.stringify({ count }) }); }
export function salesOnboard(id: string) { return request<{ ok: boolean; email?: string; loginUrl?: string; created?: boolean; lead?: SalesLead; message?: string }>(`/admin/agents/sales/leads/${id}/onboard`, { method: "POST" }); }
export function salesAutoReply(id: string) { return request<{ ok: boolean; intent?: string; reply?: string; onboarded?: boolean; email?: string; message?: string }>(`/admin/agents/sales/leads/${id}/autoreply`, { method: "POST" }); }

// ---- Email Outreach ----
export type EmailOutreach = {
  kpis: { emailsSent: number; sentTrend: number; openRate: number; openTrend: number; clickRate: number; clickTrend: number; replyRate: number; replyTrend: number; meetingsBooked: number; meetingsTrend: number; bounced: number; bounceTrend: number };
  campaigns: SalesCampaign[];
  performanceOverview: { total: number; segments: { label: string; count: number; pct: number; color: string }[] };
  topPerforming: { name: string; openRate: number; replyRate: number }[];
  recentActivity: { label: string; at: string }[];
  templates: { name: string; type: string; desc: string }[];
  analytics: { label: string; sent: number; opened: number; clicked: number; replied: number }[];
  health: { label: string; value: number; unit: string; rating: string }[];
  categories: string[]; types: string[]; emailConnected: boolean;
};
export function getEmailOutreach() { return request<EmailOutreach>("/admin/agents/sales/email"); }

// ---- Follow-Up Automation ----
export type SeqStep = { order: number; day: number; type: string; title: string; description: string };
export type SeqStepRow = SeqStep & { sent: number; opened: number; repliedRate: number; openedRate: number };
export type FollowUpSequence = { id: string; name: string; description: string; status: string; isDefault: boolean; stepCount: number; steps: SeqStep[]; totalLeads: number; replyRate: number; meetings: number };
export type FollowUpData = {
  kpis: { activeSequences: number; activeTrend: number; dueToday: number; dueTrend: number; completedThisWeek: number; completedTrend: number; repliedThisWeek: number; repliedTrend: number; meetingsBooked: number; meetingsTrend: number; convertedToPartners: number; convertedTrend: number };
  sequences: FollowUpSequence[];
  detail: (FollowUpSequence & { stepRows: SeqStepRow[] }) | null;
  performance: { replyRate: number; segments: { label: string; count: number; pct: number; color: string }[] };
  upcoming: { id: string; company: string; stepType: string; stepTitle: string; stepNo: number; at: string }[];
  rules: { label: string; value: string }[]; selectedId: string;
};
export function getFollowUpData(seq = "") { return request<FollowUpData>(`/admin/agents/sales/followup${seq ? `?seq=${seq}` : ""}`); }
export function createSequence(body: Record<string, unknown>) { return request<{ ok: boolean; sequence?: FollowUpSequence; message?: string }>("/admin/agents/sales/sequences", { method: "POST", body: JSON.stringify(body) }); }
export function runSequences() { return request<{ ok: boolean; executed: number; completed: number; due: number }>("/admin/agents/sales/sequences/run", { method: "POST" }); }
export function toggleSequence(id: string, status: string) { return request<{ ok: boolean }>(`/admin/agents/sales/sequences/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function addSequenceStep(id: string, step: Record<string, unknown>) { return request<{ ok: boolean }>(`/admin/agents/sales/sequences/${id}/step`, { method: "POST", body: JSON.stringify(step) }); }
export function deleteSequence(id: string) { return request<{ ok: boolean }>(`/admin/agents/sales/sequences/${id}`, { method: "DELETE" }); }
export function enrollLead(id: string, sequenceId?: string) { return request<{ ok: boolean; sequence?: string }>(`/admin/agents/sales/leads/${id}/enroll`, { method: "POST", body: JSON.stringify({ sequenceId }) }); }

// ---- Hot Leads ----
export type HotLead = { id: string; company: string; category: string; location: string; leadScore: number; intent: string; group: string; stage: string; source: string; lastActivityAt: string; contactName: string; email: string; phone: string; revenuePotential: number };
export type HotLeadsData = {
  kpis: { totalHot: number; totalTrend: number; highIntent: number; highTrend: number; immediate: number; immediateTrend: number; convertedThisWeek: number; convertedTrend: number; revenuePotential: number; revenueTrend: number; avgResponse: number; responseTrend: number };
  list: HotLead[]; tabs: Record<string, number>;
  detail: (HotLead & { signals: { text: string; real: boolean }[]; info: { contactPerson: string; designation: string; email: string; phone: string; companySize: string; dealValue: string; source: string; addedOn: string }; actions: { title: string; priority: string; action: string; channel: string }[]; website: string }) | null;
  performance: { total: number; segments: { label: string; count: number; pct: number; color: string }[] };
  topSources: { source: string; count: number; pct: number }[];
  recentActivities: { company: string; contact: string; summary: string; type: string; at: string }[];
  scoreDistribution: { total: number; segments: { label: string; count: number; color: string }[] };
  potentialRevenue: { total: number; bands: { label: string; value: number }[] };
  aiInsight: string; selectedId: string;
};
export function getHotLeads(lead = "") { return request<HotLeadsData>(`/admin/agents/sales/hotleads${lead ? `?lead=${lead}` : ""}`); }

// ---- CRM ----
export type CrmContact = { id: string; name: string; role: string; company: string; email: string; phone: string; leadScore: number; status: string; lastActivityAt: string; owner: string; tags: string[]; source: string; location: string; revenuePotential: number; stage: string; website: string };
export type CrmData = {
  kpis: { totalContacts: number; contactsTrend: number; companies: number; companiesTrend: number; deals: number; dealsTrend: number; openDealsValue: number; openTrend: number; wonDealsValue: number; wonTrend: number; conversionRate: number; conversionTrend: number };
  contacts: CrmContact[];
  companies: { company: string; category: string; contacts: number; value: number; topScore: number }[];
  deals: { id: string; name: string; company: string; value: number; stage: string; score: number }[];
  activities: { company: string; contact: string; summary: string; type: string; channel: string; at: string }[];
  tasks: { id: string; company: string; task: string; due: string | null; owner: string }[];
  detail: (CrmContact & { timeline: { type: string; title: string; detail: string; at: string }[]; deals: { name: string; value: number; stage: string }[] }) | null;
  contactsByStatus: { total: number; segments: { label: string; count: number; pct: number; color: string }[] };
  leadsBySource: { total: number; segments: { label: string; count: number; pct: number; color: string }[] };
  scoreDistribution: { label: string; count: number; color: string }[];
  conversionFunnel: { stage: string; count: number; pct: number }[];
  selectedId: string;
};
export function getCRM(contact = "") { return request<CrmData>(`/admin/agents/sales/crm${contact ? `?contact=${contact}` : ""}`); }
