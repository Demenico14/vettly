/**
 * Fixed product vocabulary shared by the browser and the server. No customer data lives here.
 */
import type { ScreeningWeights, Vacancy } from "@/types";

export const DEFAULT_WEIGHTS: ScreeningWeights = { skills: 35, experience: 30, education: 10, certifications: 10, assessments: 15 };

export const DEPARTMENTS = ["Finance", "Information Technology", "Human Resources", "Marketing", "Operations", "Sales", "Legal & Compliance", "Executive"];
export const LOCATIONS = ["Harare", "Bulawayo", "Gweru", "Mutare", "Masvingo", "Victoria Falls", "Johannesburg", "Cape Town", "Lusaka", "Gaborone", "Remote"];

export const CHANNELS: { id: Vacancy["channels"][number]; label: string; description: string }[] = [
  { id: "careers", label: "Careers page", description: "Your careers page, powered by Vettly" },
  { id: "linkedin", label: "LinkedIn", description: "Posted as a job on your company page" },
  { id: "indeed", label: "Indeed", description: "Free listing, Zimbabwe and South Africa" },
  { id: "vacancymail", label: "VacancyMail", description: "Zimbabwe's job board, paid listing" },
  { id: "internal", label: "Internal only", description: "Visible to current staff only" },
];

export const AVAILABILITY = ["Immediately", "2 weeks' notice", "1 month's notice", "3 months' notice"] as const;
