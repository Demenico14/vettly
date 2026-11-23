/**
 * Roles, permissions and the starting settings for a new organisation. Shared by the browser and the server.
 */
import type { OrgSettings, Permission, RolePermissions } from "@/types/settings";

export const PERMISSIONS: { id: Permission; label: string; description: string; group: "Recruiting" | "Assessments" | "Insight" | "Administration" }[] = [
  { id: "view_candidates", label: "See candidates", description: "Profiles, CVs and applications for their vacancies", group: "Recruiting" },
  { id: "manage_vacancies", label: "Create and publish vacancies", description: "Draft, edit, publish, pause and close", group: "Recruiting" },
  { id: "move_candidates", label: "Move candidates through stages", description: "Including rejections, which always need a reason", group: "Recruiting" },
  { id: "interview", label: "Interview and score", description: "Join panels and submit scorecards", group: "Recruiting" },
  { id: "make_offers", label: "Draft offers", description: "Prepare terms and send for approval", group: "Recruiting" },
  { id: "approve_offers", label: "Approve offers", description: "When named in the approval chain", group: "Recruiting" },
  { id: "send_tests", label: "Send psychometric tests", description: "Invite candidates to tests and batteries", group: "Assessments" },
  { id: "view_test_reports", label: "See test reports", description: "Scores, percentiles and full reports", group: "Assessments" },
  { id: "view_analytics", label: "See analytics", description: "Volumes, speed, sources and team reports", group: "Insight" },
  { id: "view_fairness", label: "See fairness reports", description: "Group selection rates from equal-opportunity data", group: "Insight" },
  { id: "export_data", label: "Export data", description: "CSV downloads of candidates and reports", group: "Insight" },
  { id: "manage_users", label: "Manage users", description: "Invite people, change roles, deactivate", group: "Administration" },
  { id: "manage_settings", label: "Change settings", description: "Everything on these pages except billing", group: "Administration" },
  { id: "manage_billing", label: "Manage plan and billing", description: "Change plan, seats and payment method", group: "Administration" },
];

export const ROLE_LABEL = { org_admin: "Organisation admin", hr_manager: "HR manager", recruiter: "Recruiter", hiring_manager: "Hiring manager" } as const;
export const ROLE_DESCRIPTION = {
  org_admin: "Full control, including billing. Keep at least one.",
  hr_manager: "Runs recruitment and settings. Can't change billing.",
  recruiter: "Runs vacancies day to day.",
  hiring_manager: "Sees candidates for their vacancies, interviews and approves.",
} as const;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  org_admin: PERMISSIONS.map((p) => p.id),
  hr_manager: PERMISSIONS.map((p) => p.id).filter((p) => p !== "manage_billing"),
  recruiter: ["view_candidates", "manage_vacancies", "move_candidates", "interview", "make_offers", "send_tests", "view_test_reports", "view_analytics", "export_data"],
  hiring_manager: ["view_candidates", "interview", "approve_offers", "view_test_reports"],
};

/** Reference prefix from the organisation name: "Acme Freight Services" → "AFS". */
export function prefixFor(name: string) {
  const words = name.replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(and|of|the|&)$/i.test(w));
  const p = words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 4);
  return p.length >= 2 ? p : name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "VAC";
}

export function defaultSettings(org: { name: string; city: string; country: string; industry: string; size: string }): OrgSettings {
  const short = org.name.replace(/\s+(Group|Holdings|Limited|Ltd|\(Private\) Limited)$/i, "");
  return {
    profile: {
      legalName: org.name,
      tradingName: short,
      registrationNumber: "",
      industry: org.industry,
      size: org.size,
      website: "",
      phone: "",
      address: "",
      city: org.city,
      country: org.country,
      currency: "USD",
      timezone: "Africa/Harare",
      dateFormat: "D MMM YYYY",
    },
    branding: {
      colour: "#16624F",
      logoFileName: null,
      logoFileId: null,
      letterContact: true,
      letterFooter: "",
      careersHeadline: `Build a career with ${short}`,
      careersIntro: "",
      emailSignOff: `Kind regards,\nThe ${short} recruitment team`,
      showLogoOnTests: true,
    },
    recruitment: {
      referencePrefix: prefixFor(org.name),
      defaultClosingDays: 21,
      rejectionReasons: [
        "Doesn't meet an essential requirement",
        "Less relevant experience than other candidates",
        "Test results below the level the role needs",
        "Interview performance",
        "Salary expectations outside the band",
        "Not available within the required notice period",
        "Position filled",
      ],
      cfoAboveBand: true,
      hrApprovesAll: true,
      offerValidityDays: 7,
      independentScorecards: true,
      notifyUnsuccessful: true,
      defaultWeights: { skills: 40, experience: 30, education: 10, tests: 20 },
    },
    assessments: {
      batteries: {
        Finance: "finance",
        "Information Technology": "software",
        Marketing: "sales",
        Sales: "sales",
        Operations: "operations",
        "Human Resources": "professional",
        Executive: "leadership",
      },
      sendOnShortlist: true,
      deadlineDays: 5,
      reminders: [48, 24],
      inviteEmailSubject: "Next step for the {{vacancy}} role: online tests",
      inviteEmailBody:
        "Dear {{first_name}},\n\nThank you for applying for {{vacancy}}. The next step is a set of short online tests, about {{minutes}} minutes in all. Please complete them by {{deadline}}.\n\nStart here: {{link}}\n\nIf you need more time or another format because of a disability or other circumstance, reply to this email before you start.\n\n{{sign_off}}",
      inviteSms: "{{org}}: your tests for {{vacancy}} are ready. Finish by {{deadline}}: {{link}}",
      consentWording: `${short} will use your results only to assess your application for this role. They are kept for 12 months, then deleted. You can ask to see your results or have them deleted at any time.`,
      retentionMonths: 12,
      candidateFeedback: true,
      adjustmentsContact: "",
    },
    notifications: {
      personal: {
        new_application: { app: true, email: false },
        cv_processed: { app: true, email: false },
        test_completed: { app: true, email: true },
        interview_scheduled: { app: true, email: true },
        scorecard_due: { app: true, email: true },
        offer_approval: { app: true, email: true },
        offer_response: { app: true, email: true },
        mention: { app: true, email: true },
        weekly_digest: { app: false, email: true },
      },
      digestDay: "Monday",
      quietHours: true,
    },
    privacy: {
      unsuccessfulMonths: 12,
      talentConsentMonths: 12,
      collectEqualOpportunity: true,
      equalOpportunityWording:
        "You can tell us your gender and age group. It's optional and doesn't affect your application: recruiters never see it. We use it only in anonymous totals, to check our process treats everyone fairly.",
      privacyNoticeUrl: "",
      dpoName: "",
      dpoEmail: "",
      frameworks: org.country === "South Africa" ? ["South Africa POPIA"] : ["Zimbabwe Cyber and Data Protection Act"],
    },
  };
}
