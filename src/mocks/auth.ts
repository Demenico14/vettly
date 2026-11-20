/**
 * MOCK DATA — Phase 1 only. Fictional invitations and test links for the auth and onboarding screens.
 *
 * Prototype rules (also shown on the screens as a prototype hint):
 * - Sign in: any email and a password of 8+ characters works. A password containing "wrong" fails;
 *   the email locked@msasafinancial.example shows the locked-account state.
 * - Register: the email taken@msasafinancial.example is already registered.
 * - Verification code: 246810 is correct; any other 6 digits fails.
 * - Reset links: token "valid-reset" works, "expired-reset" is expired.
 * - Team invitations: see `invitations` below.
 * - Candidate test links: tokens come from the psychometric invitations (src/mocks/psychometrics/invitations.ts).
 */
import { batteryOptions } from "./psychometrics";
import type { TeamInvitation } from "@/types";

export const MOCK_OTP = "246810";

export const invitations: TeamInvitation[] = [
  {
    token: "msasa-kudzai",
    organisationName: "Msasa Financial Group",
    organisationCity: "Harare",
    invitedBy: "Tendai Moyo",
    invitedByTitle: "HR Manager",
    email: "kudzai.chirwa@msasafinancial.example",
    role: "recruiter",
    expiresAt: "2026-11-25T23:59:00+02:00",
    status: "pending",
  },
  {
    token: "matobo-expired",
    organisationName: "Matobo Logistics",
    organisationCity: "Bulawayo",
    invitedBy: "Sipho Dlamini",
    invitedByTitle: "Operations Director",
    email: "rumbi.moyo@matobologistics.example",
    role: "hiring_manager",
    expiresAt: "2026-11-02T23:59:00+02:00",
    status: "expired",
  },
];


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

export const DEFAULT_STAGES = ["Applied", "Screening", "Shortlisted", "Assessment", "Interview", "Offer", "Hired"];

/** Battery picker options, from the psychometric database. */
export const TEST_BATTERIES = batteryOptions;

export const BRAND_COLOURS = ["#16624F", "#1F3F5E", "#7A2E1F", "#3B4A1E", "#1B2420"];
