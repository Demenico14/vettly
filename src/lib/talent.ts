/** Talent search vocabulary shared by the browser and the server. */
import type { TalentFilters } from "@/types/talent";

export const RELATED_SKILLS: Record<string, string[]> = {
  IFRS: ["Group consolidations", "Audit", "Month-end close"],
  "Group consolidations": ["IFRS", "Team leadership"],
  Treasury: ["Cash-flow management", "Forex"],
  React: ["TypeScript", "React Native", "CSS"],
  TypeScript: ["React", "Node.js"],
  "Node.js": ["TypeScript", "PostgreSQL", "AWS"],
  Payments: ["Mobile money", "Node.js"],
  "Power BI": ["DAX", "SQL", "Tableau"],
  SQL: ["Power BI", "Python", "Data modelling"],
  Python: ["SQL", "Machine learning", "Statistics"],
  "Campaign planning": ["Paid social", "Google Ads", "Copywriting"],
  "Fleet management": ["Operations management", "Inventory control"],
  "Employee relations": ["Labour Act", "Recruitment"],
  "Customer service": ["Complaints handling", "CRM"],
};

export const EMPTY_FILTERS: TalentFilters = {
  query: "",
  skills: [],
  minLevel: null,
  minYears: 0,
  countries: [],
  availability: [],
  sources: [],
  test: null,
  relocation: false,
  consentValidOnly: true,
  includeApplicants: true,
};

/** Consent to keep someone's details is valid until the date given (or indefinitely when there is none). */
export const consentValid = (iso: string | null) => !iso || new Date(iso).getTime() > Date.now();
