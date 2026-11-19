import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileStack,
  FileSignature,
  KanbanSquare,
  LayoutDashboard,
  Palette,
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
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Recruit",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: 3, description: "Recruitment overview, key statistics, funnel and upcoming interviews." },
      { label: "Vacancies", href: "/vacancies", icon: Briefcase, module: 4, description: "Create, edit, publish and manage vacancies, requirements and screening weights.", badge: "6" },
      { label: "Candidates", href: "/candidates", icon: Users, module: 5, description: "Candidate directory, search, filters and full candidate profiles." },
      { label: "CV processing", href: "/cv-processing", icon: FileStack, module: 6, description: "Bulk CV upload, processing queue, extraction preview and manual correction.", badge: "2" },
      { label: "Matching", href: "/matching", icon: Sparkles, module: 7, description: "Requirement-by-requirement assessment, evidence, ranking and comparison." },
      { label: "Pipeline", href: "/pipeline", icon: KanbanSquare, module: 8, description: "Kanban pipeline with stage transitions, bulk actions and decision records." },
      { label: "Assessments", href: "/assessments", icon: ClipboardList, module: 9, description: "Psychometric test library, sending tests to candidates, invitation tracking, reminders and result reports." },
      { label: "Interviews", href: "/interviews", icon: CalendarDays, module: 10, description: "Interview calendar, scheduling, panels, questions and scorecards." },
      { label: "Offers", href: "/offers", icon: FileSignature, module: 11, description: "Offer creation, status tracking and the hiring workflow." },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Talent pool", href: "/talent", icon: UsersRound, module: 12, description: "Skills-based discovery, saved searches and talent collections." },
      { label: "Analytics", href: "/analytics", icon: BarChart3, module: 13, description: "Application trends, time-to-hire, funnel and source reporting." },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, module: 14, description: "Organisation profile, users, roles, configuration, privacy and audit log." },
      { label: "Platform admin", href: "/admin", icon: ShieldCheck, module: 15, description: "Super administrator: tenants, subscriptions, system health and AI configuration.", roles: ["super_admin"] },
      { label: "Design system", href: "/design-system", icon: Palette, module: 1, description: "Vettly brand, tokens and component library." },
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
