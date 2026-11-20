/** Settings sections, shared by the server route and the client navigation. */
export const SECTIONS = [
  { id: "organisation", label: "Organisation", group: "Organisation" },
  { id: "branding", label: "Branding", group: "Organisation" },
  { id: "users", label: "Users", group: "People" },
  { id: "roles", label: "Roles and permissions", group: "People" },
  { id: "recruitment", label: "Recruitment", group: "Hiring" },
  { id: "assessments", label: "Assessments", group: "Hiring" },
  { id: "notifications", label: "Notifications", group: "You" },
  { id: "privacy", label: "Privacy and data", group: "Compliance" },
  { id: "audit", label: "Audit log", group: "Compliance" },
  { id: "billing", label: "Plan and billing", group: "Compliance" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];
