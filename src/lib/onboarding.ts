/** Onboarding and organisation vocabulary shared by the browser and the server. */
import { batteryOptions } from "@/mocks/psychometrics";

export const INDUSTRIES = [
  "Banking & financial services",
  "Insurance",
  "Mining & quarrying",
  "Agriculture & agro-processing",
  "Manufacturing",
  "Retail & wholesale",
  "Telecommunications",
  "Transport & logistics",
  "Healthcare",
  "Education",
  "Government & parastatals",
  "NGO & development",
  "Professional services",
  "Technology",
  "Hospitality & tourism",
  "Energy & utilities",
];

export const COUNTRIES = ["Zimbabwe", "South Africa", "Zambia", "Botswana", "Mozambique", "Namibia", "Malawi"];

export const TIMEZONES = [
  { value: "Africa/Harare", label: "Central Africa Time (CAT, UTC+2)" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (SAST, UTC+2)" },
  { value: "Africa/Nairobi", label: "East Africa Time (EAT, UTC+3)" },
];

export const DEFAULT_STAGES = ["Applied", "Screening", "Shortlisted", "Tests", "Interview", "Offer", "Hired"];

/** Battery picker options, from the psychometric database. */
export const TEST_BATTERIES = batteryOptions;

export const BRAND_COLOURS = ["#16624F", "#1F3F5E", "#7A2E1F", "#3B4A1E", "#1B2420"];
