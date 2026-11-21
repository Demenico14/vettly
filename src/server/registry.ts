import "server-only";
import type { Permission } from "@/types/settings";
import { analyticsService } from "./services/analytics";
import { assessmentsService } from "./services/assessments";
import { authService } from "./services/auth";
import { candidateAccessService } from "./services/candidate-access";
import { candidateProfileService } from "./services/candidates";
import { cvService } from "./services/cv";
import { dashboardService } from "./services/dashboard";
import { interviewsService } from "./services/interviews";
import { matchingService } from "./services/matching";
import { offersService } from "./services/offers";
import { pipelineService } from "./services/pipeline";
import { platformService } from "./services/platform";
import { settingsService } from "./services/settings";
import { talentService } from "./services/talent";
import { vacancyService } from "./services/vacancies";
import { candidateSummaryService, notificationService, searchService, sessionService } from "./services/workspace";

/** How a service is reached. */
export type Access =
  /** Signed-in member of an organisation; runs with that organisation's records. */
  | "org"
  /** No session needed (sign-in, registration, invitations). */
  | "public"
  /** Token-based candidate access; the service resolves the organisation itself. */
  | "candidate"
  /** Signed-in session, outside any organisation's records. */
  | "session"
  /** Vettly platform staff only; runs with platform records. */
  | "platform";

type AnyService = Record<string, (...args: never[]) => unknown>;

export const registry: Record<string, { access: Access; impl: AnyService; methods?: Record<string, Access> }> = {
  auth: { access: "public", impl: authService as unknown as AnyService },
  candidateAccess: { access: "candidate", impl: candidateAccessService as unknown as AnyService },
  session: { access: "session", impl: sessionService as unknown as AnyService },
  platform: { access: "platform", impl: platformService as unknown as AnyService },
  dashboard: { access: "org", impl: dashboardService as unknown as AnyService },
  vacancies: { access: "org", impl: vacancyService as unknown as AnyService },
  profiles: { access: "org", impl: candidateProfileService as unknown as AnyService },
  cv: { access: "org", impl: cvService as unknown as AnyService },
  matching: { access: "org", impl: matchingService as unknown as AnyService },
  pipeline: { access: "org", impl: pipelineService as unknown as AnyService },
  assessments: { access: "org", impl: assessmentsService as unknown as AnyService },
  interviews: { access: "org", impl: interviewsService as unknown as AnyService },
  offers: { access: "org", impl: offersService as unknown as AnyService },
  talent: { access: "org", impl: talentService as unknown as AnyService },
  analytics: { access: "org", impl: analyticsService as unknown as AnyService },
  settings: { access: "org", impl: settingsService as unknown as AnyService },
  notifications: { access: "org", impl: notificationService as unknown as AnyService },
  search: { access: "org", impl: searchService as unknown as AnyService },
  candidates: { access: "org", impl: candidateSummaryService as unknown as AnyService },
};

/** Methods that run only in the browser and must never be called remotely. */
export const BROWSER_ONLY = new Set(["vacancies.assist", "cv.subscribe"]);

/**
 * The permission each organisation action needs, checked by the API for the signed-in member's role. Roles
 * and their permissions are set in Settings → Roles. Reads and actions not listed are open to every member;
 * a few checks that depend on the record (scoring your own interview, approving your own step) live in the
 * services themselves.
 */
const NEEDS: Record<Permission, string[]> = {
  view_candidates: [
    "profiles.*", "candidates.*", "talent.*", "search.search", "matching.*", "cv.listBatches", "cv.getFile",
  ],
  manage_vacancies: ["vacancies.create", "vacancies.update", "vacancies.setStatus", "vacancies.duplicate", "vacancies.remove", "cv.upload", "cv.retry", "cv.saveDraft", "cv.confirm", "cv.confirmReady", "cv.discard", "cv.remove"],
  move_candidates: ["pipeline.move", "profiles.moveStage", "candidates.moveStage", "talent.addToVacancy"],
  interview: ["interviews.schedule", "interviews.reschedule", "interviews.cancel", "interviews.markNoShow", "interviews.markCompleted", "interviews.addQuestion", "interviews.removeQuestion", "interviews.decide"],
  make_offers: ["offers.importLetter", "offers.create", "offers.update", "offers.send", "offers.withdraw", "offers.extend", "offers.respond", "offers.setChecklist", "offers.hire", "offers.notifyOthers", "offers.markViewed"],
  approve_offers: ["offers.approve", "offers.reject"],
  send_tests: ["pipeline.sendTests", "assessments.send", "assessments.remind", "assessments.extend", "assessments.cancel", "assessments.resend", "assessments.restore", "assessments.saveBattery", "assessments.deleteBattery"],
  view_test_reports: ["assessments.invitations", "assessments.invitation", "assessments.setReviewed", "assessments.addNote", "assessments.setConcern", "profiles.tests", "candidates.tests"],
  view_analytics: ["analytics.*"],
  view_fairness: [],
  export_data: [],
  manage_users: [],
  manage_settings: [],
  manage_billing: [],
};

const WHAT: Record<Permission, string> = {
  view_candidates: "see candidates",
  manage_vacancies: "manage vacancies",
  move_candidates: "move candidates",
  interview: "manage interviews",
  make_offers: "manage offers",
  approve_offers: "approve offers",
  send_tests: "send tests",
  view_test_reports: "see test results",
  view_analytics: "see analytics",
  view_fairness: "see fairness reports",
  export_data: "export data",
  manage_users: "manage people",
  manage_settings: "change settings",
  manage_billing: "manage billing",
};

/** The permissions an action needs (exact entries first, then the service's "*"), with the words for refusals. */
export function permissionsFor(service: string, method: string): { permission: Permission; what: string }[] {
  const key = `${service}.${method}`;
  const out: { permission: Permission; what: string }[] = [];
  for (const [permission, actions] of Object.entries(NEEDS) as [Permission, string[]][]) {
    if (actions.includes(key) || actions.includes(`${service}.*`)) out.push({ permission, what: WHAT[permission] });
  }
  return out;
}
