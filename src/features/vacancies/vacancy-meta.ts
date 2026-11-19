import { BadgeCheck, Briefcase, FileText, Sparkles, Users, type IconComponent } from "@/components/icons";
import type { RequirementKind, ScreeningWeights } from "@/types";

export const REQUIREMENT_KIND: Record<RequirementKind, { label: string; Icon: IconComponent; placeholder: string }> = {
  skill: { label: "Skill", Icon: Sparkles, placeholder: "e.g. IFRS group reporting" },
  experience: { label: "Experience", Icon: Briefcase, placeholder: "e.g. Finance, including managing a team" },
  education: { label: "Education", Icon: FileText, placeholder: "e.g. Bachelor's degree in Accounting" },
  certification: { label: "Certification", Icon: BadgeCheck, placeholder: "e.g. ICAZ membership" },
  language: { label: "Language", Icon: Users, placeholder: "e.g. Fluent Shona or Ndebele" },
};

export const WEIGHT_LABELS: Record<keyof ScreeningWeights, string> = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  assessments: "Psychometric tests",
};
