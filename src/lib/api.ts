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

// ---- Decision Center (real AI-recommendation cockpit) ----
export type DecisionStatus = "proposed" | "applied" | "rejected" | "failed";
export type DecisionItem = {
  id: string; decId: string; title: string; summary: string; detail: string;
  category: string; requestedBy: string; impact: "High" | "Medium" | "Low";
  confidence: number; priority: "High" | "Medium" | "Low"; status: DecisionStatus;
  source: string; fixType: string; autoExecutable: boolean;
  page: string; path: string; link: string; result: string;
  requestedAt: string; resolvedAt: string | null;
};
export type DecisionKpis = { pending: number; highImpact: number; avgConfidence: number; autoExecuted: number; resolvedThisWeek: number; total: number };
export type DecisionHealth = { overall: number | null; label: string; accuracy: number | null; timeliness: number | null; impact: number | null; adoption: number | null; resolvedTotal: number };
export type DecisionCategory = { name: string; count: number; pct: number };
export type RecentDecision = { id: string; title: string; category: string; decision: "Approved" | "Rejected" | "Failed"; result: string; at: string; impact: string };
export type DecisionTrendPoint = { week: string; created: number; resolved: number };
export type DecisionCenter = {
  kpis: DecisionKpis; health: DecisionHealth; decisions: DecisionItem[];
  byCategory: DecisionCategory[]; recent: RecentDecision[]; trend: DecisionTrendPoint[];
  filters: { categories: string[]; owners: string[] }; _ai: boolean; generatedAt: string;
};
export function getDecisionCenter() {
  return request<DecisionCenter>("/admin/agents/ceo/decision-center");
}

// ---- Per-route on-page SEO audit (crawls every public route) ----
export type SeoSignals = {
  ok: boolean; status?: number; error?: string;
  title?: string; description?: string; canonical?: string; robots?: string;
  ogTitle?: string; ogDescription?: string; ogImage?: string; twitterCard?: string;
  jsonLd?: number; h1Count?: number; h1?: string;
};
export type SeoIssue = CeoIssue & {
  recommend?: string;
  // Full English brief + live fix state (enriched by the backend SEO view).
  why?: string;
  plan?: string[];
  proposalId?: string;
  proposalStatus?: "proposed" | "applied" | "failed" | "";
  fix?: { changes: FixChange[]; url: string; fieldLabel: string; result: string; appliedAt: string } | null;
};
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
  topOpportunities: {
    impact: string; title: string; trafficPotential: number; revenueImpact: number; confidence: number; effort: string;
    // Enriched: proposal id + full English brief so the row opens a drawer and
    // "Approve & Auto-fix" really executes.
    id?: string; detail?: string; reason?: string; plan?: string[]; agent?: string; page?: string; path?: string; link?: string;
  }[];
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
// Agent master switches — OFF by default; admin flips them on to activate (token-saving).
export type AgentToggles = { enabled: Record<string, boolean>; labels: Record<string, string> };
export function getAgentToggles() { return request<AgentToggles>("/admin/agents/ceo/agents/toggles"); }
export function setAgentEnabled(agentId: string, enabled: boolean) {
  return request<{ ok: boolean; agentId: string; enabled: boolean }>(`/admin/agents/ceo/agents/${agentId}/enable`, { method: "POST", body: JSON.stringify({ enabled }) });
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

// ---- Task-executing group chat (persisted, approve/reject cards) ----
export type ChatCard = {
  type: "blog" | "seo-fix" | "distribution" | "providers";
  title: string;
  subtitle?: string;
  body?: string;
  image?: string;
  fields?: { label: string; value: string }[];
  links?: { label: string; url: string }[];
  why?: string;
  plan?: string[];
  items?: { id: string; label: string; sub: string }[];
  fix?: { changes: FixChange[]; url: string } | null;
  meta?: Record<string, unknown>;
  approveLabel?: string;
  rejectLabel?: string;
};
export type ChatMsg = {
  id: string; conversation: string; role: "founder" | "agent"; agentId: string; name: string;
  text: string; card: ChatCard | null; actionStatus: "" | "pending" | "approved" | "rejected";
  actionResult: string; createdAt: string;
};
export function chatHistoryApi(conversation = "all") {
  return request<{ messages: ChatMsg[] }>(`/admin/agents/ceo/chat/history?conversation=${encodeURIComponent(conversation)}`);
}
export function chatSendApi(message: string, opts: { history?: AgentChatTurn[]; mentionId?: string; imageBase64?: string; imageType?: string } = {}) {
  return request<{ messages: ChatMsg[] }>("/admin/agents/ceo/chat/send", {
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
export function chatActApi(messageId: string, decision: "approve" | "reject") {
  return request<{ ok: boolean; message?: string; msg?: ChatMsg }>("/admin/agents/ceo/chat/act", {
    method: "POST",
    body: JSON.stringify({ messageId, decision }),
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
  return request<{ audit: SeoAuditSnapshot | null; proposals: CeoProposalItem[]; fixed: CompletedFix[]; base: string; llm: boolean }>("/admin/agents/ceo/seo");
}
export function runCeoSeo() {
  return request<{ audit: SeoAuditSnapshot; proposals: CeoProposalItem[]; fixed: CompletedFix[]; base: string; llm: boolean }>("/admin/agents/ceo/seo/run", { method: "POST" });
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
  // Full English brief (SEO proposals): why the issue matters + the exact
  // steps Auto-fix will take. Older/brain tasks fall back to description.
  reason?: string;
  plan?: string[];
  page?: string;
  path?: string;
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
// Completed fixes — applied/failed proposals with full before → after diffs.
export type FixChange = { field: string; before: string; after: string };
export type CompletedFix = {
  id: string; task: string; detail: string; page: string; path: string; url: string;
  agent: string; department: string; severity: string; status: "Completed" | "Failed";
  result: string; appliedAt: string; check: string; fieldLabel: string; changes: FixChange[];
};
export function getCeoCompletedFixes() {
  return request<{ fixes: CompletedFix[] }>("/admin/agents/ceo/orchestration/completed");
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
export function generateTaskBrief(id: string) { return request<{ ok: boolean; message?: string; task: TaskFull }>(`/admin/tasks/${id}/brief`, { method: "POST" }); }
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

// ---- Paid-ad campaigns (real Google Ads / Meta Ads, or connect state) ----
export type AdCampaignRow = { id: string; platform: string; name: string; channel: string; objective: string; status: string; currency: string; spend: number; impressions: number; clicks: number; conversions: number; revenue: number; roas: number; startDate: string | null; endDate: string | null };
export type AdCampaigns = {
  connected: { google: boolean; meta: boolean };
  campaigns: AdCampaignRow[];
  overview: { totalCampaigns: number; activeCampaigns: number; totalSpend: number; totalConversions: number; totalRevenue: number; avgRoas: number; costPerConversion: number } | null;
  funnel: { impressions: number; clicks: number; ctr: number; conversions: number; cvr: number; revenue: number } | null;
  channelMix: { label: string; spend: number; pct: number }[];
  statusMix: { label: string; count: number }[];
  syncedAt: string | null; currency: string; errors: { meta?: string | null; google?: string | null };
};
export function getMarketingCampaigns() { return request<AdCampaigns>("/admin/agents/ceo/marketing/campaigns"); }
export function syncMarketingCampaigns() { return request<AdCampaigns>("/admin/agents/ceo/marketing/campaigns/sync", { method: "POST" }); }

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

// ---- Provider Onboarding Agent ----
export type Kpi = { value: number; trend: number; suffix?: string; prefix?: string; est?: boolean; isMinutes?: boolean; isSeconds?: boolean };
export type Seg = { label: string; count: number; color: string; pct: number };
export type OnbClaim = { id: string; company: string; contact: string; contactEmail: string; category: string; submittedAt: string; status: string; assignedTo: string; rating: number; ratingCount: number; logoUrl: string; strength: number };
export type OnbChecklist = { key: string; status: string };
export type OnbProgress = { id: string; company: string; logoUrl: string; category: string; strength: number; label: string; checklist: OnbChecklist[] };
export type OnbProvider = {
  id: string; company: string; category: string; contact: string; contactEmail: string; logoUrl: string;
  status: string; verified: boolean; vstate: string; strength: number; health: number; services: number;
  rating: number; ratingCount: number; galleryCount: number; hasLogo: boolean; hasTradeLicense: boolean;
  hasPricing: boolean; hasPhone: boolean; planName: string; claimStatus: string;
  docs: { label: string; status: string }[]; createdAt: string; updatedAt: string; missing: string[];
};
export type OnboardingOverview = {
  kpis: { pendingClaims: Kpi; profilesInProgress: Kpi; verificationRequests: Kpi; activeProviders: Kpi; completionRate: Kpi; avgOnboardingDays: Kpi };
  funnel: { label: string; count: number }[]; conversionRate: number;
  claimRequests: OnbClaim[]; progressProviders: OnbProgress[];
  verification: { total: number; segments: Seg[] };
  missingInfo: { label: string; count: number; severity: string; field: string }[];
  topCategories: { total: number; items: Seg[] };
  activity: { title: string; detail: string; at: string; status: string }[];
  health: { avg: number; label: string; distribution: Seg[] };
  plans: { total: number; items: Seg[]; source: string };
  nextSteps: { text: string; priority: string }[];
  summary: { claimsSubmitted: Kpi; profilesCompleted: Kpi; providersActivated: Kpi; newSubscriptions: Kpi; revenueGenerated: Kpi & { currency: string } };
  pendingReviews: number; meta: { totalProviders: number; llm: boolean };
};
export function getOnboardingOverview() { return request<OnboardingOverview>("/admin/agents/onboarding/overview"); }
export function getOnboardingProviders(params: { filter?: string; q?: string } = {}) { const qs = new URLSearchParams(params as Record<string, string>).toString(); return request<{ providers: OnbProvider[]; total: number; filter: string }>(`/admin/agents/onboarding/providers${qs ? `?${qs}` : ""}`); }
export function onbVerify(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/providers/${id}/verify`, { method: "POST" }); }
export function onbActivate(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/providers/${id}/activate`, { method: "POST" }); }
export function onbReject(id: string, reason = "") { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/providers/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); }
export function onbRequestInfo(id: string, fields: string[] = []) { return request<{ ok: boolean; message?: string; fields?: string[] }>(`/admin/agents/onboarding/providers/${id}/request-info`, { method: "POST", body: JSON.stringify({ fields }) }); }
export function onbDraft(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/providers/${id}/draft`, { method: "POST" }); }

export type ClaimRow = { id: string; company: string; contact: string; contactEmail: string; category: string; location: string; claimedBy: string; claimedEmail: string; phone: string; channel: string; submittedAt: string; status: string; score: number; assignedTo: string; logoUrl: string; rating: number; ratingCount: number; reviewedAt: string | null };
export type ClaimRequestsData = {
  kpis: { total: Kpi; newRequests: Kpi; underReview: Kpi; verified: Kpi; rejected: Kpi; avgReviewDays: Kpi };
  statusDist: { total: number; segments: Seg[] };
  channels: Seg[]; byCategory: { total: number; items: Seg[] };
  claimsOverTime: { label: string; count: number }[]; reviewTimeSeries: { label: string; value: number }[];
  avgReview: { days: number; trend: number };
  scoreOverview: { avg: number; bands: Seg[] };
  activity: { title: string; detail: string; at: string; status: string }[];
  table: { rows: ClaimRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; statuses: string[];
};
export function getClaimRequests(params: { q?: string; status?: string; category?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ClaimRequestsData>(`/admin/agents/onboarding/claims${qs ? `?${qs}` : ""}`);
}

export type VerifRow = { id: string; company: string; contact: string; contactEmail: string; category: string; location: string; type: string; typeMain: string; submittedAt: string; status: string; score: number; hasScore: boolean; assignedTo: string; logoUrl: string; rating: number; ratingCount: number; verified: boolean; rejected: boolean };
export type VerificationData = {
  kpis: { total: Kpi; pending: Kpi; verified: Kpi; rejected: Kpi; rate: Kpi; avgTime: Kpi };
  scoreDist: { total: number; segments: Seg[] }; byType: Seg[];
  fraudAlerts: { company: string; reason: string; risk: string }[];
  funnel: { label: string; count: number }[]; conversion: number;
  trends: { label: string; submitted: number; verified: number; rejected: number }[];
  timeByType: { label: string; days: number }[];
  topCatRate: { label: string; rate: number; verified: number; total: number }[];
  team: { agent: string; verified: number; successRate: number; avgTime: number }[];
  table: { rows: VerifRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; statuses: string[];
};
export function getVerificationCenter(params: { q?: string; status?: string; category?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<VerificationData>(`/admin/agents/onboarding/verification${qs ? `?${qs}` : ""}`);
}

export type CompRow = { rank: number; id: string; company: string; category: string; location: string; logoUrl: string; visibility: number; reviews: number; rating: number; services: number; price: number; pricing: string; you: number; them: number; threat: string; isFocal: boolean; views: number; gallery: number; bookings: number; strength: number; verified: boolean; featured: boolean };
export type CompetitionData = {
  empty?: boolean;
  focal: { id: string; company: string; category: string; rank: number; visibility: number };
  providers: { id: string; company: string }[];
  kpis: { competitorsTracked: Kpi; yourVisibility: Kpi; overallRank: Kpi; categoryRank: Kpi; marketShare: Kpi; threats: Kpi };
  avgVisibility: number; marketShare: number;
  topCompetitors: { rows: CompRow[]; total: number; page: number; perPage: number; pages: number };
  radar: { axes: string[]; you: number[]; them: number[]; youName: string; themName: string };
  threats: { company: string; reason: string; level: string }[];
  categoryRanking: { focalRank: number; focalCatTotal: number; segments: Seg[] };
  reviewComparison: { company: string; rating: number; reviews: number; isFocal: boolean }[];
  seoTraffic: { company: string; visits: number; isFocal: boolean }[];
  servicesComparison: { company: string; services: number; isFocal: boolean }[];
  pricingPositioning: { focalPrice: number; avgPrice: number; maxPrice: number; tier: string };
  marketShareTop: { company: string; share: number; isFocal: boolean }[];
  opportunities: { text: string; pts: number; impact: string }[];
  recommendations: string[]; categories: string[]; locations: string[]; themId: string; avgPrice: number;
};
export function getProfileCompetition(params: { focalId?: string; category?: string; location?: string; themId?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<CompetitionData>(`/admin/agents/onboarding/competition${qs ? `?${qs}` : ""}`);
}

export type CompletionRow = { id: string; company: string; category: string; contact: string; contactEmail: string; logoUrl: string; status: string; verified: boolean; strength: number; services: number; checklist: OnbChecklist[]; missing: string[]; filled: number };
export type CompletionData = {
  kpis: { avgCompletion: Kpi; fullyComplete: Kpi; inProgress: Kpi; needsAttention: Kpi; verified: Kpi; stalled: Kpi };
  fieldCompletion: { label: string; done: number; missing: number; pct: number }[];
  distribution: { total: number; segments: Seg[] }; totalFields: number;
  providers: { rows: CompletionRow[]; total: number; page: number; perPage: number; pages: number };
};
export function getProfileCompletion(params: { q?: string; band?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<CompletionData>(`/admin/agents/onboarding/completion${qs ? `?${qs}` : ""}`);
}

export type ServiceRow = { id: string; name: string; image: string; provider: string; category: string; rawCategory: string; location: string; price: number; mode: string; currency: string; priceLabel: string; status: string; rawStatus: string; published: boolean; features: string[]; amenities: number; hasCover: boolean; hasPricing: boolean; views: number; bookings: number; rating: number; ratingCount: number; createdAt: string };
export type ServiceListingsData = {
  kpis: { total: Kpi; published: Kpi; draft: Kpi; inactive: Kpi; withPricing: Kpi };
  byCategory: { total: number; items: Seg[] }; statusOverview: Seg[];
  topPerforming: { id: string; name: string; provider: string; image: string; views: number; bookings: number; rating: number }[];
  addedOverTime: { label: string; count: number }[];
  priceDistribution: { total: number; items: Seg[] };
  pricingSplit: { withPricing: number; withoutPricing: number; withPct: number; withoutPct: number };
  recommendations: { text: string; impact: string }[];
  table: { rows: ServiceRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[]; providers: string[]; statuses: string[];
};
export function getServiceListings(params: { q?: string; status?: string; category?: string; location?: string; provider?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ServiceListingsData>(`/admin/agents/onboarding/listings${qs ? `?${qs}` : ""}`);
}
export function setListingStatus(id: string, status: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/listings/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }

export type SubPackage = { id: string; name: string; priceMonthly: number; priceYearly: number; currency: string; subscribers: number; mrr: number; featureCount: number; status: string; badge: string; highlighted: boolean; color: string };
export type SubRecent = { id: string; provider: string; logoUrl: string; planName: string; billing: string; amount: number; status: string; startDate: string; nextRenewal: string | null };
export type SubscriptionsData = {
  kpis: { totalSubscribers: Kpi; activeSubscriptions: Kpi; mrr: Kpi & { currency: string }; arr: Kpi & { currency: string }; churnRate: Kpi; conversionRate: Kpi };
  packages: SubPackage[];
  comparison: { plans: string[]; rows: { feature: string; values: string[] }[] };
  recent: SubRecent[];
  statusBreakdown: { total: number; segments: Seg[] };
  revenueByPlan: { total: number; segments: Seg[] };
  mrrTrend: { label: string; value: number }[];
  upcoming: { provider: string; logoUrl: string; planName: string; date: string }[];
  funnel: { label: string; count: number }[];
  plansCount: number; statuses: string[];
};
export function getSubscriptions() { return request<SubscriptionsData>("/admin/agents/onboarding/subscriptions"); }
export function updateSubscriptionPlan(id: string, patch: { priceMonthly?: number; priceYearly?: number; active?: boolean; badge?: string }) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/plans/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }

export type QueueRow = { kind: string; id: string; ref: string; name: string; logoUrl: string; category: string; location: string; approved: boolean; active: boolean; approvedOn: string | null; approvedBy: string; timeInQueue: number; slaStatus: string; ready: boolean; score: number; nextStep: string };
export type ApprovalQueueData = {
  kpis: { totalApproved: Kpi; readyForActivation: Kpi; autoActivated: Kpi; pendingActivation: Kpi; avgTimeInQueue: Kpi; slaBreached: Kpi };
  byType: { total: number; segments: Seg[] }; slaStatus: { total: number; segments: Seg[] }; slaCompliance: number;
  approvalTrend: { label: string; count: number }[];
  queueInsights: { fastest: { name: string; dur: string } | null; slowest: { name: string; dur: string } | null; mostApprovalsBy: { name: string; count: number } | null; autoActivationRate: number };
  activity: { title: string; detail: string; by: string; at: string; status: string }[];
  nextSteps: { label: string; count: number; icon: string }[];
  table: { rows: QueueRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[]; types: string[]; slas: string[];
};
export function getApprovalQueue(params: { q?: string; type?: string; category?: string; location?: string; sla?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ApprovalQueueData>(`/admin/agents/onboarding/queue${qs ? `?${qs}` : ""}`);
}
export function queueAction(body: { kind: string; id: string; action: string }) { return request<{ ok: boolean; message?: string }>(`/admin/agents/onboarding/queue/action`, { method: "POST", body: JSON.stringify(body) }); }

export type MissingRow = { id: string; ref: string; name: string; logoUrl: string; type: string; category: string; location: string; missing: { field: string; category: string }[]; missingFields: string[]; missingCount: number; daysOverdue: number; status: string; lastReminder: string | null; reminders: number; email: string };
export type MissingInfoData = {
  kpis: { providersMissingInfo: Kpi; totalMissingFields: Kpi; avgMissingPerProvider: Kpi; overdueProviders: Kpi; autoRemindersSent: Kpi };
  summary: { total: number; segments: Seg[] };
  byCategory: Seg[];
  topFields: { label: string; count: number; pct: number }[];
  sla: { total: number; segments: Seg[] };
  recentReminders: { provider: string; logoUrl: string; sentTo: string; fields: number; sentOn: string; status: string }[];
  automation: { enabled: boolean; remindersThisWeek: number; mostMissingField: { name: string; count: number } | null; suggestion: string };
  table: { rows: MissingRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[]; fields: string[]; statuses: string[];
};
export function getMissingInformation(params: { q?: string; category?: string; location?: string; field?: string; status?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<MissingInfoData>(`/admin/agents/onboarding/missing${qs ? `?${qs}` : ""}`);
}

export type FunnelStage = { key: number; name: string; desc: string; count: number; pct: number; color: string };
export type FunnelData = {
  kpis: { totalStarted: Kpi; completedOnboarding: Kpi; conversionRate: Kpi; droppedOff: Kpi; avgTimeToActivate: Kpi; inProgress: Kpi };
  funnel: FunnelStage[];
  dropoff: { stage: string; dropStage: string; count: number; pct: number }[];
  overallConversion: number; totalDropoff: number;
  dropAnalysis: { total: number; segments: Seg[] };
  topReasons: { reason: string; count: number; pct: number }[];
  stagePerf: { stage: string; num: number; conversionRate: number; dropRate: number; color: string }[];
  trend: { label: string; value: number }[]; timeTrend: { label: string; value: number }[];
  journey: { id: string; name: string; logoUrl: string; stage: string; progress: number; timeInStage: number; nextStep: string; lastActivity: string }[];
  insights: { text: string; icon: string }[]; avgTimeToActivate: number;
};
export function getOnboardingFunnel() { return request<FunnelData>("/admin/agents/onboarding/funnel"); }

export type BadgeRow = { id: string; ref: string; requestId: string; name: string; logoUrl: string; category: string; location: string; badge: string; status: string; priority: string; verified: boolean; rejected: boolean; requestedOn: string; rating: number; strength: number };
export type BadgeCatRow = { category: string; Verified: number; Pending: number; "Revision Required": number; Rejected: number; total: number };
export type BadgeCenterData = {
  kpis: { totalRequests: Kpi; pendingVerification: Kpi; verifiedThisWeek: Kpi; rejectedThisWeek: Kpi; verificationRate: Kpi };
  overview: { total: number; segments: Seg[] };
  rateTrend: { label: string; value: number }[];
  topRejected: { reason: string; count: number; pct: number }[];
  activity: { title: string; detail: string; at: string; status: string }[];
  badgeDistribution: { total: number; segments: Seg[] };
  byCategory: BadgeCatRow[];
  avgTime: number; timeTrend: { label: string; value: number }[];
  table: { rows: BadgeRow[]; total: number; page: number; perPage: number; pages: number };
  badgeTypes: string[]; statuses: string[]; categories: string[]; locations: string[];
};
export function getBadgeCenter(params: { q?: string; badgeType?: string; status?: string; category?: string; location?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<BadgeCenterData>(`/admin/agents/onboarding/badges${qs ? `?${qs}` : ""}`);
}

// ---- Marketplace Growth Agent ----
export type MktProvider = { id: string; name: string; category: string; location: string; website: string; logoUrl: string; claimed: boolean; unclaimed: boolean; verified: boolean; published: boolean; strength: number; growthScore: number; revenue: number; source: string; createdAt: string };
export type MarketplaceData = {
  kpis: { providersDiscovered: Kpi; unclaimedCreated: Kpi; profilesClaimed: Kpi; highValueProviders: Kpi; coverageScore: Kpi; growthRate: Kpi };
  overview: { label: string; discovered: number; unclaimed: number; claimed: number }[];
  health: { score: number; label: string; metrics: { label: string; value: number; kind: string; good: boolean }[] };
  byCategory: { total: number; items: Seg[] };
  topLocations: { location: string; total: number; newThisWeek: number; coverageScore: number }[];
  highValueProviders: { name: string; category: string; growthScore: number; revenue: number; logoUrl: string }[];
  activities: { title: string; detail: string; at: string; status: string }[];
  pipeline: { label: string; count: number; color: string }[];
  forecast: { label: string; value: number; series: number[] }[];
  categories: string[]; llm: boolean;
};
export function getMarketplaceGrowth() { return request<MarketplaceData>("/admin/agents/marketplace/overview"); }
export function getMarketplaceProviders(params: { filter?: string; q?: string; category?: string } = {}) { const qs = new URLSearchParams(params as Record<string, string>).toString(); return request<{ providers: MktProvider[]; total: number; filter: string }>(`/admin/agents/marketplace/providers${qs ? `?${qs}` : ""}`); }
export function discoverProviders(body: { category: string; count?: number }) { return request<{ ok: boolean; created?: { id: string; name: string; category: string; location: string; growthScore: number; source: string }[]; message?: string }>("/admin/agents/marketplace/discover", { method: "POST", body: JSON.stringify(body) }); }
export function mktPublish(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/marketplace/providers/${id}/publish`, { method: "POST" }); }
export function mktToSales(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/marketplace/providers/${id}/to-sales`, { method: "POST" }); }

export type DiscoveryRow = { id: string; company: string; category: string; location: string; source: string; confidence: number; status: string; phone: string; website: string; addedOn: string; converted: boolean; growthScore: number; revenue: number };
export type DiscoveryData = {
  kpis: { newProvidersFound: Kpi; highConfidence: Kpi; sourcesScanned: Kpi; totalOpportunities: Kpi; convertedToProfiles: Kpi; successRate: Kpi };
  sourcesPerformance: { source: string; found: number; highConfidence: number; successRate: number }[];
  foundTrend: { label: string; totalFound: number; highConfidence: number; converted: number }[];
  byCategory: { total: number; items: Seg[] };
  byLocation: { location: string; count: number; pct: number }[];
  confidenceDist: { total: number; segments: Seg[] };
  table: { rows: DiscoveryRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[]; sources: string[]; statuses: string[]; llm: boolean;
};
export function getProviderDiscovery(params: { q?: string; category?: string; location?: string; source?: string; confidence?: string; status?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<DiscoveryData>(`/admin/agents/marketplace/discovery${qs ? `?${qs}` : ""}`);
}
export function mktBulkPublish(ids: string[]) { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/marketplace/bulk-publish", { method: "POST", body: JSON.stringify({ ids }) }); }

export type UnclaimedRow = { id: string; company: string; website: string; logoUrl: string; category: string; location: string; source: string; confidence: number; quality: number; stars: number; status: string; addedOn: string; isNew: boolean; phone: string; missing: string[] };
export type UnclaimedData = {
  kpis: { totalUnclaimed: Kpi; newThisWeek: Kpi; published: Kpi; claimedThisMonth: Kpi; pendingReview: Kpi; requiringAttention: Kpi };
  statusBreakdown: { total: number; segments: Seg[] };
  avgQuality: number; starDist: { star: number; count: number; pct: number }[];
  topMissing: { label: string; count: number; pct: number }[];
  counts: Record<string, number>;
  table: { rows: UnclaimedRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[]; sources: string[]; statuses: string[]; llm: boolean;
};
export function getUnclaimedProfiles(params: { q?: string; category?: string; location?: string; source?: string; confidence?: string; status?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<UnclaimedData>(`/admin/agents/marketplace/unclaimed${qs ? `?${qs}` : ""}`);
}
export function mktDelete(ids: string[]) { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/marketplace/delete", { method: "POST", body: JSON.stringify({ ids }) }); }
export function mktToOnboarding(ids: string[]) { return request<{ ok: boolean; message?: string }>("/admin/agents/marketplace/to-onboarding", { method: "POST", body: JSON.stringify({ ids }) }); }
export function mktEnrich(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/marketplace/providers/${id}/enrich`, { method: "POST" }); }
// Full web enrichment for many providers at once (logo + description + real web reviews + trust score).
export function mktEnrichAll(limit = 12) { return request<{ ok: boolean; message?: string; results?: { ok: boolean; added?: number }[] }>(`/admin/agents/marketplace/providers/enrich-all`, { method: "POST", body: JSON.stringify({ limit }) }); }

export type FunnelGroupRow = { name: string; created: number; published: number; viewed: number; claimed: number; verified: number; subscriber: number; claimRate: number; color: string };
export type ClaimFunnelData = {
  funnel: { label: string; count: number; color: string; pct: number }[];
  conversions: { from: string; to: string; rate: number; drop: number }[];
  summary: { totalCreated: Kpi; totalClaimed: Kpi; totalVerified: Kpi; totalSubscribers: Kpi; overallClaimRate: Kpi; overallVerificationRate: Kpi; overallSubscriptionRate: Kpi };
  trend: { label: string; created: number; published: number; viewed: number; claimRequested: number; verified: number; subscriber: number }[];
  byCategory: FunnelGroupRow[]; byLocation: FunnelGroupRow[];
  recentClaims: { id: string; company: string; category: string; location: string; requestedOn: string; contact: string; email: string; status: string; logoUrl: string }[];
  claimRateOverTime: { label: string; value: number }[];
  topDrop: { from: string; to: string; rate: number; drop: number };
  insights: { text: string; icon: string }[];
};
export function getClaimFunnel() { return request<ClaimFunnelData>("/admin/agents/marketplace/claim-funnel"); }
export function mktClaimInvite(ids: string[]) { return request<{ ok: boolean; message?: string }>("/admin/agents/marketplace/claim-invite", { method: "POST", body: JSON.stringify({ ids }) }); }

export type LeadRow = { rank: number; id: string; company: string; category: string; location: string; logoUrl: string; score: number; tier: string; trend7d: number; reviews: number; revenue: number; lastActivity: string };
export type LeadScoringData = {
  kpis: { totalScored: Kpi; highValue: Kpi; mediumValue: Kpi; lowValue: Kpi; avgScore: Kpi };
  components: { label: string; weight: number; value: number }[];
  distribution: { total: number; segments: Seg[] };
  breakdown: { label: string; count: number; pct: number }[];
  sources: { source: string; score: number; count: number }[];
  highValueOpps: { notContacted: number; potentialRevenue: number; avgScore: number };
  tips: string[];
  table: { rows: LeadRow[]; total: number; page: number; perPage: number; pages: number };
  categories: string[]; locations: string[];
};
export function getLeadScoring(params: { q?: string; category?: string; location?: string; minScore?: number; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<LeadScoringData>(`/admin/agents/marketplace/lead-scoring${qs ? `?${qs}` : ""}`);
}

export type CoverageCatRow = { category: string; count: number; target: number; coverage: number; newThisWeek: number; quality: number; claimedPct: number; highValueLeads: number; gap: number; potentialRevenue: number; trend: number[]; color: string; vs7d: number };
export type CategoryCoverageData = {
  kpis: { totalCategories: Kpi; totalProviders: Kpi; avgCoverage: Kpi; fullyCovered: Kpi; needsImprovement: Kpi; highValueOpps: Kpi };
  coverageByCategory: CoverageCatRow[];
  distribution: { total: number; segments: Seg[] };
  opportunities: { category: string; coverage: number; target: number; gap: number; potentialRevenue: number; color: string }[];
  heatmap: { category: string; cells: { location: string; count: number; coverage: number }[]; uaeAvg: number }[];
  growthTrend: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  locations: string[];
};
export function getCategoryCoverage() { return request<CategoryCoverageData>("/admin/agents/marketplace/category-coverage"); }

export type CoverageLocRow = { location: string; count: number; target: number; coverage: number; newThisWeek: number; gap: number; potentialProviders: number; potentialRevenue: number; gapPct: number; color: string; trend: number[]; vs7d: number };
export type LocationCoverageData = {
  kpis: { totalLocations: Kpi; totalProviders: Kpi; avgCoverage: Kpi; fullyCovered: Kpi; needsImprovement: Kpi; highValueOpps: Kpi };
  coverageByLocation: CoverageLocRow[];
  mapPoints: { location: string; coverage: number; count: number; x: number; y: number; tier: string }[];
  opportunities: { location: string; gapPct: number; potentialProviders: number; potentialRevenue: number }[];
  insights: { text: string; icon: string }[];
  heatmap: { location: string; cells: { category: string; count: number; coverage: number }[]; score: number }[];
  coverageOverTime: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  categories: string[];
};
export function getLocationCoverage() { return request<LocationCoverageData>("/admin/agents/marketplace/location-coverage"); }

export type DQCatRow = { category: string; total: number; avgScore: number; highQuality: number; needsAttention: number; lowQuality: number; topIssue: string; trend: number[] };
export type DataQualityData = {
  kpis: { totalProfiles: Kpi; avgQuality: Kpi; highQuality: Kpi; needingAttention: Kpi; lowQuality: Kpi; dataIssues: Kpi };
  distribution: { total: number; segments: Seg[] };
  completeness: { label: string; pct: number }[];
  trend: { label: string; value: number }[];
  topIssues: { label: string; count: number }[];
  byCategory: DQCatRow[];
  improvement: { thisWeek: number; autoEnriched: number; manual: number; claimed: number };
  enrichment: { enrichedThisWeek: number; accuracy: number; totalEnriched: number };
  recentImprovements: { profile: string; category: string; fields: string; scoreAfter: number; improvedOn: string; source: string }[];
  needingAttention: { id: string; profile: string; category: string; issueCount: number; criticalIssues: string; score: number }[];
};
export function getDataQuality() { return request<DataQualityData>("/admin/agents/marketplace/data-quality"); }
export function mktEnrichBatch(limit = 5) { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/marketplace/enrich-batch", { method: "POST", body: JSON.stringify({ limit }) }); }
export function mktMergeDuplicates() { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/marketplace/merge-duplicates", { method: "POST" }); }

// ---- Expansion Opportunities ----
export type ExpOpp = { opportunity: string; category: string; location: string; potentialProviders: number; estMonthlyRevenue: number; score: number; priority: string };
export type ExpMatrixRow = { category: string; cells: { location: string; opp: number }[]; uaeAvg: number; potentialProviders: number };
export type ExpansionData = {
  kpis: { totalOpportunities: Kpi; highPriority: Kpi; potentialNewProviders: Kpi; estMonthlyRevenue: Kpi; estAnnualRevenue: Kpi; avgScore: Kpi };
  topOpportunities: ExpOpp[];
  pipeline: { stages: { label: string; value: number; color: string }[]; conversionRate: number; avgTimeToAction: number };
  impact: { potentialNewProviders: number; potentialMonthlyRevenue: number; byCategory: { total: number; segments: Seg[] } };
  matrix: { categories: string[]; rows: ExpMatrixRow[] };
  locationHeatmap: { location: string; score: number; count: number; x: number; y: number; tier: string }[];
  recentDiscoveries: { name: string; location: string; providers: number; estMonthlyRevenue: number; when: string }[];
  sources: { label: string; count: number; pct: number; color: string }[];
  summary: { totalOpportunities: number; highPriority: number; potentialNewProviders: number; estMonthlyRevenue: number; estAnnualRevenue: number; avgScore: number; providers: number };
};
export function getExpansionOpportunities() { return request<ExpansionData>("/admin/agents/marketplace/expansion-opportunities"); }

// ---- Competitive Intelligence ----
export type CompetitorRow = { name: string; category: string; estTraffic: number; share: number; trend: string };
export type CIAlert = { title: string; detail: string; when: string; icon: string };
export type ContentOpp = { opportunity: string; category: string; searchVolume: number; difficulty: number; competitorsRanking: number; ourRanking: number | null; score: number; priority: string };
export type PricingRow = { service: string; ourPrice: number; competitorPrice: number; difference: number; real: boolean };
export type SocialRow = { name: string; followers: number; engagementRate: number; topChannel: string; isUs: boolean };
export type CompetitiveData = {
  kpis: { competitorsMonitored: Kpi; marketShare: Kpi; shareOfVoice: Kpi; contentOpportunities: Kpi; rankingOpportunities: Kpi; newCompetitorsDetected: Kpi };
  marketShare: { ourShare: number; total: number; segments: Seg[]; ranked: { name: string; share: number; isUs: boolean }[] };
  shareOfVoice: { ourSoV: number; labels: string[]; series: { label: string; color: string; points: number[] }[] };
  topCompetitors: CompetitorRow[];
  alerts: CIAlert[];
  topContentOpps: ContentOpp[];
  contentGapSummary: { total: number; segments: Seg[] };
  pricing: PricingRow[];
  backlinks: { newBacklinks7d: number; lostBacklinks7d: number; totalBacklinks: number; topGains: { name: string; gained: number; source: string }[]; trend: number };
  social: SocialRow[];
  recommendations: { title: string; detail: string; priority: number }[];
  summary: { competitors: number; ourShare: number; ourSoV: number; totalGaps: number; contentOpportunities: number };
};
export function getCompetitiveOverview() { return request<CompetitiveData>("/admin/agents/competitive/overview"); }
export function ciScan(category = "Car Rental") { return request<{ ok: boolean; message?: string; count?: number; sources?: { title?: string; url?: string }[] }>("/admin/agents/competitive/scan", { method: "POST", body: JSON.stringify({ category }) }); }
export function getCompetitiveBriefing() { return request<{ ok: boolean; text: string }>("/admin/agents/competitive/briefing"); }

export type CompetitorFull = { id: string; name: string; website: string; category: string; estTraffic: number; marketShare: number; domainRating: number; backlinks: number; reviewCount: number; avgRating: number; competitiveScore: number; threat: string; trend: string; sparkline: number[]; source: string; lastUpdated: string };
export type CompetitorsData = {
  kpis: { totalCompetitors: Kpi; activeCompetitors: Kpi; newCompetitors: Kpi; highThreat: Kpi; marketCoverage: Kpi };
  table: { rows: CompetitorFull[]; total: number; page: number; perPage: number; pages: number };
  byCategory: { total: number; segments: Seg[] };
  scoreDistribution: { label: string; range: number[]; count: number; pct: number; color: string }[];
  threats: { name: string; threat: string; score: number }[];
  quickComparison: { name: string; category: string; estTraffic: number; share: number; score: number; sparkline: number[] }[];
  categories: string[];
};
export function getCompetitors(params: { category?: string; q?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<CompetitorsData>(`/admin/agents/competitive/competitors${qs ? `?${qs}` : ""}`);
}
export function ciAddCompetitor(body: { name: string; website?: string; category?: string; estTraffic?: number; domainRating?: number; socialFollowers?: number }) { return request<{ ok: boolean; message?: string }>("/admin/agents/competitive/competitors", { method: "POST", body: JSON.stringify(body) }); }

export type ContentItem = { id: string; title: string; url: string; competitorName: string; website: string; type: string; category: string; targetKeyword: string; platforms: string[]; engagement: number; trendUp: boolean; publishedAt: string };
export type ContentIntelData = {
  kpis: { totalNewContent: Kpi; newBlogPosts: Kpi; newLandingPages: Kpi; newGuides: Kpi; newComparisonPages: Kpi; updatedPages: Kpi };
  table: { rows: ContentItem[]; total: number; page: number; perPage: number; pages: number };
  typeDistribution: { total: number; segments: Seg[] };
  topTopics: { topic: string; mentions: number; trendUp: boolean }[];
  alerts: { title: string; when: string }[];
  recentHighlights: { competitorName: string; title: string; type: string; category: string; summary: string; publishedAt: string; engagement: number; url: string }[];
  competitors: string[];
  types: string[];
  empty: boolean;
};
export function getContentIntelligence(params: { competitor?: string; category?: string; type?: string; q?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ContentIntelData>(`/admin/agents/competitive/content${qs ? `?${qs}` : ""}`);
}
export function ciScanContent(limit = 6) { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/competitive/content/scan", { method: "POST", body: JSON.stringify({ limit }) }); }

export type PageOpp = { keyword: string; slug: string; category: string; contentType: string; searchVolume: number; kd: number; ranking: string[]; ourRanking: number | null; trafficPotential: number; priority: string };
export type PageOppsData = {
  kpis: { totalPageOpportunities: Kpi; highPriority: Kpi; estTrafficPotential: Kpi; avgKeywordDifficulty: Kpi; pageOppsAdded: Kpi; top3Competitors: string[] };
  table: { rows: PageOpp[]; total: number; page: number; perPage: number; pages: number };
  byPriority: { total: number; segments: Seg[] };
  trafficForecast: { labels: string[]; points: number[]; total: number };
  topCategories: { label: string; count: number; pct: number; color: string }[];
  aiInsight: string;
  counts: { high: number; total: number };
  competitors: string[];
  types: string[];
};
export function getPageOpportunities(params: { category?: string; type?: string; priority?: string; competitor?: string; q?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<PageOppsData>(`/admin/agents/competitive/page-opportunities${qs ? `?${qs}` : ""}`);
}

export type BacklinkRow = { domain: string; dr: number; traffic: string; linkType: string; anchor: string; linkedPage: string; firstSeen: string; competitor: string };
export type BacklinkData = {
  kpis: { totalBacklinks: Kpi; newBacklinks: Kpi; lostBacklinks: Kpi; referringDomains: Kpi; avgDomainRating: Kpi; linksToUs: Kpi };
  growthOverTime: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  byType: { total: number; segments: Seg[] };
  topAnchors: { anchor: string; backlinks: number; pct: number }[];
  newBacklinks: { rows: BacklinkRow[]; total: number; page: number; perPage: number; pages: number };
  topLinkingDomains: { domain: string; dr: number; backlinks: number; trend: number[] }[];
  profileComparison: { name: string; isUs: boolean; backlinks: number; referringDomains: number; dr: number; ur: number; dofollowPct: number; trend: number[] }[];
  sourcesDistribution: { total: number; segments: Seg[] };
  opportunities: { domain: string; dr: number; type: string; reason: string; action: string }[];
  competitors: string[];
  linkTypes: string[];
};
export function getBacklinkIntel(params: { competitor?: string; type?: string; q?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<BacklinkData>(`/admin/agents/competitive/backlinks${qs ? `?${qs}` : ""}`);
}

export type ReportRow = { key: string; name: string; desc: string; type: string; period: string; competitors: string; insights: string[]; generatedOn: string };
export type ScheduledRow = { id: string; name: string; frequency: string; recipients: string[]; nextRun: string; status: string };
export type ReportsData = {
  kpis: { totalReportsGenerated: Kpi; thisWeekChanges: Kpi; opportunitiesIdentified: Kpi; potentialTraffic: Kpi; potentialValue: Kpi; avgConfidence: Kpi };
  recentReports: { rows: ReportRow[]; total: number; shown: number };
  reportsOverview: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  topOpportunityAreas: { label: string; traffic: number; value: number; pct: number; color: string }[];
  scheduledReports: ScheduledRow[];
  reportInsights: { icon: string; text: string; sub: string }[];
  reportTypes: { key: string; name: string }[];
  periods: string[];
};
export function getReports(params: { period?: string } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ReportsData>(`/admin/agents/competitive/reports${qs ? `?${qs}` : ""}`);
}
export function ciGenerateReport(body: { key: string; name?: string }) { return request<{ ok: boolean; filename: string; content: string; message?: string }>("/admin/agents/competitive/reports/generate", { method: "POST", body: JSON.stringify(body) }); }
export function ciScheduleReport(body: { name: string; frequency?: string; recipients?: string[]; reportType?: string }) { return request<{ ok: boolean; message?: string }>("/admin/agents/competitive/reports/schedule", { method: "POST", body: JSON.stringify(body) }); }
export function ciToggleSchedule(id: string) { return request<{ ok: boolean; message?: string; status?: string }>(`/admin/agents/competitive/reports/schedule/${id}/toggle`, { method: "POST" }); }
export function ciDeleteSchedule(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/competitive/reports/schedule/${id}`, { method: "DELETE" }); }

// ---- Content Distribution ----
export type DistRow = { id: string; title: string; channels: string[]; distributedOn: string; reach: number; clicks: number; engagements: number; leads: number; status: string; scheduledAt: string | null };
export type DistChannel = { key: string; label: string; color: string; connected: boolean; posts: number; hint: string };
export type DistributionData = {
  kpis: { totalContentDistributed: Kpi; totalReach: Kpi; totalClicks: Kpi; totalEngagements: Kpi; leadsGenerated: Kpi; avgDistributionTime: Kpi };
  byChannel: { total: number; segments: { label: string; key: string; count: number; pct: number; color: string }[] };
  performanceTrend: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  topChannels: { rank: number; key: string; label: string; color: string; leads: number; pct: number }[];
  recentDistributions: DistRow[];
  upcoming: { title: string; channel: string; channelLabel: string; scheduledAt: string; status: string }[];
  funnel: { label: string; value: number; pct: number }[];
  bestContent: { title: string; leads: number; reach: number }[];
  insights: { text: string }[];
  distributionRules: { id: string; name: string; trigger: string; channel: string; active: boolean }[];
  repurposing: { from: string; to: string; count: number; icon: string }[];
  channels: DistChannel[];
  connectedCount: number;
  contentLibrary: { id: string; title: string }[];
};
export function getDistributionOverview() { return request<DistributionData>("/admin/agents/distribution/overview"); }
export function distDistribute(body: { blogId?: string; title?: string; content?: string; channels: string[]; schedule?: string | null }) { return request<{ ok: boolean; message?: string; created?: number }>("/admin/agents/distribution/distribute", { method: "POST", body: JSON.stringify(body) }); }
export function distRun(id: string) { return request<{ ok: boolean; message?: string; published?: number; skipped?: number }>("/admin/agents/distribution/run", { method: "POST", body: JSON.stringify({ id }) }); }
export function distToggleRule(id: string) { return request<{ ok: boolean; message?: string; active?: boolean }>(`/admin/agents/distribution/rules/${id}/toggle`, { method: "POST" }); }
export function distCreateRule(body: { name: string; channel?: string; trigger?: string; action?: string }) { return request<{ ok: boolean; message?: string }>("/admin/agents/distribution/rules", { method: "POST", body: JSON.stringify(body) }); }

export type ChannelRow = { key: string; label: string; color: string; type: string; reach: number; clicks: number; engagements: number; leads: number; ctr: number; status: string; connected: boolean; posts: number; trend: number[]; hint: string };
export type ChannelsData = {
  kpis: { totalChannels: Kpi; totalReach: Kpi; totalClicks: Kpi; totalEngagements: Kpi; leadsGenerated: Kpi; avgDistributionTime: Kpi };
  channels: ChannelRow[];
  typeDistribution: { total: number; segments: Seg[] };
  health: { active: { count: number; pct: number }; underperforming: { count: number; pct: number }; inactive: { count: number; pct: number } };
  details: { key: string; label: string; color: string; reach: number; clicks: number; leads: number; ctr: number; status: string; trend: number[] }[];
  types: string[];
  connectedCount: number;
};
export function getDistributionChannels(params: { q?: string; type?: string; status?: string } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<ChannelsData>(`/admin/agents/distribution/channels${qs ? `?${qs}` : ""}`);
}

export type SchedPost = { id: string; title: string; channel: string; channelLabel: string; color: string; type: string; status: string; time: string; timeLabel: string; reach: number; engagement: number };
export type SchedDay = { date: string; dayName: string; dayNum: number; isToday: boolean; posts: SchedPost[] };
export type ScheduledData = {
  kpis: { scheduledPosts: Kpi; toBePublished: Kpi; published: Kpi; failedSkipped: Kpi; totalReach: Kpi; engagement: Kpi };
  calendar: { weekStart: string; days: SchedDay[] };
  upcoming: { id: string; title: string; channel: string; channelLabel: string; color: string; type: string; timeLabel: string; rel: string }[];
  summary: { total: number; segments: Seg[] };
  bestTimes: { key: string; label: string; color: string; window: string }[];
  queue: { id: string; title: string; channel: string; channelLabel: string; color: string; scheduledOn: string; timeLabel: string; status: string; reach: number; engagement: number }[];
  automation: { id: string; name: string; trigger: string; active: boolean }[];
  channels: { key: string; label: string }[];
  contentLibrary: number;
};
export function getScheduledDistribution() { return request<ScheduledData>("/admin/agents/distribution/scheduled"); }
export function distReschedule(id: string, scheduledAt: string) { return request<{ ok: boolean; message?: string }>("/admin/agents/distribution/reschedule", { method: "POST", body: JSON.stringify({ id, scheduledAt }) }); }
export function distDuplicate(id: string) { return request<{ ok: boolean; message?: string }>("/admin/agents/distribution/duplicate", { method: "POST", body: JSON.stringify({ id }) }); }
export function distDeletePost(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/post/${id}`, { method: "DELETE" }); }

export type DistRule = { id: string; name: string; description: string; trigger: string; triggerType: string; channels: string[]; conditions: string[]; status: string; executions: number; reach: number; engagement: number; successRate: number; lastExecuted: string | null };
export type RulesData = {
  kpis: { totalRules: Kpi; activeRules: Kpi; autoPublished7d: Kpi; channelsCovered: Kpi; successRate: Kpi; avgExecutionTime: Kpi };
  rules: { rows: DistRule[]; total: number; page: number; perPage: number; pages: number };
  triggerLibrary: { type: string; icon: string; count: number }[];
  executionLog: { rule: string; when: string; status: string }[];
  performance: { total: number; segments: Seg[] };
  topRules: { name: string; executions: number; reach: number; engagement: number; successRate: number }[];
  channelMeta: Record<string, { label: string; color: string }>;
  triggerTypes: string[];
  allChannels: string[];
  steps: string[];
};
export function getDistributionRules(params: { status?: string; trigger?: string; channel?: string; q?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<RulesData>(`/admin/agents/distribution/rules${qs ? `?${qs}` : ""}`);
}
export function distCreateRuleFull(body: { name: string; description?: string; channels?: string[]; trigger?: string; triggerType?: string; conditions?: string[]; action?: string; status?: string }) { return request<{ ok: boolean; message?: string }>("/admin/agents/distribution/rules", { method: "POST", body: JSON.stringify(body) }); }
export function distRuleStatus(id: string, status: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/rules/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function distRunRule(id: string) { return request<{ ok: boolean; message?: string; created?: number }>(`/admin/agents/distribution/rules/${id}/run`, { method: "POST" }); }
export function distDuplicateRule(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/rules/${id}/duplicate`, { method: "POST" }); }
export function distDeleteRule(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/rules/${id}`, { method: "DELETE" }); }

export type RepurposeRow = { id: string; title: string; type: string; publishedOn: string; channels: string[]; assets: number; status: string; lastRepurposed: string | null };
export type RepurposingData = {
  kpis: { totalRepurposed: Kpi; assetsGenerated: Kpi; contentPieces: Kpi; engagement: Kpi; traffic: Kpi; avgRepurposingTime: Kpi };
  content: { rows: RepurposeRow[]; total: number; page: number; perPage: number; pages: number };
  formats: { total: number; segments: Seg[] };
  efficiency: { timeSaved: number; costSaved: number; aiAccuracy: number };
  insights: { text: string }[];
  channelMeta: Record<string, { label: string; color: string }>;
  assetTypes: string[];
  repurposeChannels: string[];
  types: string[];
  contentLibrary: { id: string; title: string; type: string; publishedOn: string }[];
};
export function getContentRepurposing(params: { q?: string; type?: string; status?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<RepurposingData>(`/admin/agents/distribution/repurposing${qs ? `?${qs}` : ""}`);
}
export function distRepurpose(body: { blogId: string; channels: string[]; assetTypes: string[] }) { return request<{ ok: boolean; message?: string; count?: number }>("/admin/agents/distribution/repurpose", { method: "POST", body: JSON.stringify(body) }); }

export type CommunityRow = { id: string; name: string; platform: string; color: string; niche: string; members: number; engagementLevel: string; status: string; lastActivity: string; engagements: number; clicks: number; engRate: number; url: string; postsShared: number };
export type OutreachData = {
  kpis: { communitiesMonitored: Kpi; activeCommunities: Kpi; postsShared: Kpi; engagements: Kpi; clicksGenerated: Kpi; newCommunitiesFound: Kpi };
  communities: { rows: CommunityRow[]; total: number; page: number; perPage: number; pages: number };
  overview: { labels: string[]; series: { label: string; color: string; points: number[] }[] };
  topPerforming: { name: string; color: string; engagements: number; clicks: number; engRate: number }[];
  discovery: CommunityRow[];
  contentOpportunities: { idea: string; community: string; communityColor: string }[];
  outreachActivity: { text: string; when: string }[];
  outreachTips: string[];
  platforms: string[];
  niches: string[];
};
export function getCommunityOutreach(params: { q?: string; platform?: string; niche?: string; status?: string; engagement?: string; page?: number; perPage?: number } = {}) {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, String(v)]))).toString();
  return request<OutreachData>(`/admin/agents/distribution/communities${qs ? `?${qs}` : ""}`);
}
export function distAddCommunity(id: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/communities/${id}/add`, { method: "POST" }); }
export function distShareCommunity(id: string, contentTitle?: string) { return request<{ ok: boolean; message?: string }>(`/admin/agents/distribution/communities/${id}/share`, { method: "POST", body: JSON.stringify({ contentTitle }) }); }

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

// ---- Authority Growth Agent (backlinks MVP) ----
export type BlRow = {
  id: string; sourceDomain: string; sourceUrl: string; targetPath: string; anchor: string;
  type: "dofollow" | "nofollow" | "unknown"; status: "Opportunity" | "Submitted" | "Live" | "Rejected" | "Lost";
  method: string; category: string; da: number; relevance: number;
  organicTraffic: number; country: string; language: string; spamScore: number; priorityScore: number; saved: boolean;
  guestGuidelines: string; guestFreePaid: string; articleIdeas: string[]; guestDraft: string; guestPublishedAt: string | null;
  contactPerson: string; contactEmail: string;
  outreachDraft: string; outreachStatus: "" | "Draft" | "Sent" | "Opened" | "Replied" | "Successful" | "Failed";
  lastContactAt: string | null; followUpAt: string | null;
  outreachLog: { at: string; event: string; note: string }[];
  anchorFound: string; liveStatus: "" | "Live" | "Lost" | "Redirected" | "Removed";
  firstIndexedAt: string | null; competitorSource: string;
  notes: string; discoveredVia: string;
  submittedAt: string | null; verifiedAt: string | null; lastCheckedAt: string | null; createdAt: string; updatedAt: string;
};
export type BlOverview = {
  kpis: {
    drEstimate: number; referringDomains: number; total: number; live: number; qualified: number; new30d: number;
    dofollow: number; pending: number; opportunities: number; outreachSent: number; outreachSuccessRate: number;
    guestPostsPublished: number; avgDomainAuthority: number; minDr: number;
  };
  byStatus: { label: string; count: number }[];
  byMethod: { label: string; count: number }[];
  byCategory: { label: string; count: number }[];
  recent: { id: string; sourceDomain: string; targetPath: string; status: string; type: string; method: string; da: number; at: string }[];
  channels: { key: string; label: string; connected: boolean; hint: string }[];
  ai: boolean;
};
export type BlList = { rows: BlRow[]; total: number; page: number; perPage: number; pages: number; statuses: string[]; methods: string[]; countries: string[]; minDrFloor: number };
type BlAct = { ok: boolean; message?: string; backlink?: BlRow };

export function getBacklinkOverview() { return request<BlOverview>("/admin/agents/backlink/overview"); }
export function getBacklinks(params: { status?: string; type?: string; method?: string; category?: string; country?: string; language?: string; minDr?: number; q?: string; saved?: string; page?: number } = {}) { const s = new URLSearchParams(params as unknown as Record<string, string>).toString(); return request<BlList>(`/admin/agents/backlink/list${s ? `?${s}` : ""}`); }
export function backlinkDiscover(body: { category?: string; count?: number }) { return request<{ ok: boolean; message?: string; rejected?: number; created?: { id: string; domain: string }[] }>("/admin/agents/backlink/discover", { method: "POST", body: JSON.stringify(body) }); }
export function backlinkAdd(body: Record<string, unknown>) { return request<BlAct>("/admin/agents/backlink", { method: "POST", body: JSON.stringify(body) }); }
export function backlinkVerify(id: string) { return request<BlAct & { found?: boolean }>(`/admin/agents/backlink/${id}/verify`, { method: "POST" }); }
export function backlinkVerifyAll() { return request<{ ok: boolean; message?: string; checked?: number; live?: number; lost?: number }>("/admin/agents/backlink/verify-all", { method: "POST" }); }
export function backlinkOutreach(id: string) { return request<BlAct & { draft?: string }>(`/admin/agents/backlink/${id}/outreach`, { method: "POST" }); }
export function backlinkSubmit(id: string) { return request<BlAct>(`/admin/agents/backlink/${id}/submit`, { method: "POST" }); }
export function backlinkUpdate(id: string, patch: Record<string, unknown>) { return request<BlAct>(`/admin/agents/backlink/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); }
export function backlinkDelete(id: string) { return request<{ ok: boolean }>(`/admin/agents/backlink/${id}`, { method: "DELETE" }); }
// Guest posting
export function blGuestDiscover(body: { count?: number } = {}) { return request<{ ok: boolean; message?: string; created?: { id: string; domain: string }[] }>("/admin/agents/backlink/guest/discover", { method: "POST", body: JSON.stringify(body) }); }
export function blArticleIdeas(id: string) { return request<BlAct & { ideas?: string[] }>(`/admin/agents/backlink/${id}/ideas`, { method: "POST" }); }
export function blGuestDraft(id: string, idea?: string) { return request<BlAct>(`/admin/agents/backlink/${id}/guest-draft`, { method: "POST", body: JSON.stringify({ idea }) }); }
export function blGuestPublished(id: string, url?: string) { return request<BlAct>(`/admin/agents/backlink/${id}/guest-published`, { method: "POST", body: JSON.stringify({ url }) }); }
// Outreach manager
export function blListOutreach(params: { page?: number } = {}) { const s = new URLSearchParams(params as unknown as Record<string, string>).toString(); return request<{ rows: BlRow[]; total: number; page: number; pages: number }>(`/admin/agents/backlink/outreach${s ? `?${s}` : ""}`); }
export function blSendOutreach(id: string) { return request<BlAct>(`/admin/agents/backlink/${id}/send`, { method: "POST" }); }
export function blScheduleFollowUp(id: string, days = 4) { return request<BlAct>(`/admin/agents/backlink/${id}/follow-up`, { method: "POST", body: JSON.stringify({ days }) }); }
export function blSetOutreachStatus(id: string, status: string) { return request<BlAct>(`/admin/agents/backlink/${id}/outreach-status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function blRunFollowUps() { return request<{ ok: boolean; sent: number; due: number }>("/admin/agents/backlink/followups/run", { method: "POST" }); }
// Competitor backlinks
export function blCompetitorFinds() { return request<{ rows: BlRow[]; competitors: { name: string; website: string; dr: number; total: number; new7d: number; lost7d: number; topSource: string }[] }>("/admin/agents/backlink/competitors"); }
export function blScanCompetitor(competitor?: string) { return request<{ ok: boolean; message?: string; competitor?: string; created?: { id: string; domain: string }[] }>("/admin/agents/backlink/competitors/scan", { method: "POST", body: JSON.stringify({ competitor }) }); }
// Monitoring + reports
export function blListMonitored() { return request<{ rows: BlRow[] }>("/admin/agents/backlink/monitor"); }
export function blGenerateReport(period: "weekly" | "monthly") { return request<{ ok: boolean; period: string; content: string; filename: string; stats: { newLive: number; lost: number; newOpps: number; outreachSent: number; guest: number } }>("/admin/agents/backlink/report", { method: "POST", body: JSON.stringify({ period }) }); }
