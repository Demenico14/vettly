import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileStack,
  FileSignature,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  type IconComponent,
} from "@/components/icons";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  /** Roadmap module that delivers this screen. */
  module: number;
  description: string;
  badge?: string;
  roles?: Role[];
  /** The screen exists; otherwise the route shows a "coming in Module N" placeholder. */
  built?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Recruit",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: 3, built: true, description: "Recruitment overview, key statistics, funnel and upcoming interviews." },
      { label: "Vacancies", href: "/vacancies", icon: Briefcase, module: 4, built: true, description: "Create, edit, publish and manage vacancies, requirements and screening weights." },
      { label: "Candidates", href: "/candidates", icon: Users, module: 5, built: true, description: "Candidate directory, search, filters and full candidate profiles." },
      { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, module: 8, built: true, description: "Every candidate on one board, by hiring step, with bulk moves and decision records." },
    ],
  },
  {
    // The hiring steps, in the order they happen (the same steps as the hiring path on vacancies and profiles).
    label: "Hiring steps",
    items: [
      { label: "CV processing", href: "/cv-processing", icon: FileStack, module: 6, built: true, description: "Step 1. Upload CVs and check what Vettly read before candidates are created." },
      { label: "Screening", href: "/matching", icon: Sparkles, module: 7, built: true, description: "Step 2. Check each candidate against the requirements, with evidence, then shortlist or reject." },
      { label: "Tests", href: "/assessments", icon: ClipboardList, module: 9, built: true, description: "Step 3. Psychometric tests for shortlisted candidates: sending, tracking and results." },
      { label: "Interviews", href: "/interviews", icon: CalendarDays, module: 10, built: true, description: "Step 4. Schedule panels, ask the structured questions, collect scorecards." },
      { label: "Offers", href: "/offers", icon: FileSignature, module: 11, built: true, description: "Step 5. Make the offer, get approval, send it and record the answer." },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Talent pool", href: "/talent", icon: UsersRound, module: 12, built: true, description: "Skills-based discovery, saved searches and talent collections." },
      { label: "Analytics", href: "/analytics", icon: BarChart3, module: 13, built: true, description: "Application trends, time-to-hire, funnel and source reporting." },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, module: 14, built: true, description: "Organisation profile, users, roles, configuration, privacy and audit log." },
      { label: "Platform admin", href: "/admin", icon: ShieldCheck, module: 15, built: true, description: "Super administrator: tenants, subscriptions, system health and AI configuration.", roles: ["super_admin"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

const EXTRA_TITLES: Record<string, string> = { "/welcome": "Getting started" };

export function findNavItem(pathname: string): Pick<NavItem, "label"> | undefined {
  const item = ALL_NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  if (item) return item;
  const extra = EXTRA_TITLES[pathname];
  return extra ? { label: extra } : undefined;
}
