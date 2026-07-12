// The AI workforce — 10 agents across 3 departments (per the spec).
// `live` = backed by a real working implementation; others are scaffolded and
// coordinated by the AI CEO but not yet executing autonomously.

export type Dept = "Executive" | "Growth" | "Marketplace";

export type AgentDef = {
  id: string;
  name: string;
  dept: Dept;
  icon: string;       // lucide icon name (resolved in the component)
  role: string;
  live: boolean;
};

export const AGENTS: AgentDef[] = [
  { id: "ceo", name: "AI CEO / Orchestrator", dept: "Executive", icon: "Crown", role: "Coordinates the workforce, assigns tasks, approves actions.", live: true },

  { id: "marketing", name: "Marketing Director", dept: "Growth", icon: "Megaphone", role: "Marketing strategy, growth opportunities, campaigns.", live: true },
  { id: "seo", name: "SEO Agent", dept: "Growth", icon: "Search", role: "Keyword research, briefs, metadata, internal links.", live: true },
  { id: "copywriter", name: "Copywriter Agent", dept: "Growth", icon: "PenLine", role: "Writes SEO blog, landing & provider content drafts.", live: true },
  { id: "publisher", name: "Publisher Agent", dept: "Growth", icon: "Send", role: "Formats & publishes approved content to the site.", live: true },
  { id: "distribution", name: "Content Distribution", dept: "Growth", icon: "Share2", role: "Turns content into social posts & newsletters.", live: true },
  { id: "intel", name: "Competitive Intelligence", dept: "Growth", icon: "Radar", role: "Monitors competitors, finds content & keyword gaps.", live: true },

  { id: "marketplace", name: "Marketplace Growth", dept: "Marketplace", icon: "Building2", role: "Discovers providers, creates unclaimed profiles.", live: true },
  { id: "sales", name: "Sales Agent", dept: "Marketplace", icon: "Handshake", role: "Outreach to providers via WhatsApp & email.", live: true },
  { id: "onboarding", name: "Provider Onboarding", dept: "Marketplace", icon: "UserCheck", role: "Helps providers claim, verify & complete profiles.", live: true },
];

export const GROWTH_AGENTS = AGENTS.filter((a) => a.dept === "Growth");
export const MARKETPLACE_AGENTS = AGENTS.filter((a) => a.dept === "Marketplace");
