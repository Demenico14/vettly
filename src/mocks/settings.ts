/**
 * MOCK DATA — organisation settings for the fictional Msasa Financial Group (Module 14).
 * Fourteen seats are taken (active and invited members), matching the plan shown in the sidebar.
 */
import type { AuditEvent, DataRequest, Member, OrgSettings, Permission, RolePermissions, Subscription } from "@/types/settings";

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

export const rolePermissions: RolePermissions = {
  org_admin: PERMISSIONS.map((p) => p.id),
  hr_manager: PERMISSIONS.map((p) => p.id).filter((p) => p !== "manage_billing"),
  recruiter: ["view_candidates", "manage_vacancies", "move_candidates", "interview", "make_offers", "send_tests", "view_test_reports", "view_analytics", "export_data"],
  hiring_manager: ["view_candidates", "interview", "approve_offers", "view_test_reports"],
};

export const members: Member[] = [
  { id: "usr_tendai", name: "Tendai Moyo", email: "tendai.moyo@msasafinancial.example", title: "HR Manager", department: "Human Resources", role: "hr_manager", status: "active", lastActiveAt: "2026-11-18T09:28:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_chenai", name: "Chenai Mutizwa", email: "chenai.mutizwa@msasafinancial.example", title: "Head of IT Systems", department: "Information Technology", role: "org_admin", status: "active", lastActiveAt: "2026-11-16T15:10:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_kuda", name: "Kudzai Chirwa", email: "kudzai.chirwa@msasafinancial.example", title: "Talent Acquisition Officer", department: "Human Resources", role: "recruiter", status: "active", lastActiveAt: "2026-11-18T08:51:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_tafara", name: "Tafara Nyoni", email: "tafara.nyoni@msasafinancial.example", title: "HR Officer", department: "Human Resources", role: "recruiter", status: "active", lastActiveAt: "2026-11-17T16:40:00+02:00", invitedAt: null, twoFactor: false },
  { id: "usr_sipho", name: "Sipho Ndlovu", email: "sipho.ndlovu@msasafinancial.example", title: "Group Financial Controller", department: "Finance", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-17T11:05:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_ruth", name: "Ruth Chinamasa", email: "ruth.chinamasa@msasafinancial.example", title: "Chief Financial Officer", department: "Executive", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-12T19:22:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_tatenda", name: "Tatenda Mutasa", email: "tatenda.mutasa@msasafinancial.example", title: "Head of Engineering", department: "Information Technology", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-18T07:45:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_lovemore", name: "Lovemore Sithole", email: "lovemore.sithole@msasafinancial.example", title: "Senior Data Analyst", department: "Information Technology", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-13T10:30:00+02:00", invitedAt: null, twoFactor: false },
  { id: "usr_nokuthula", name: "Nokuthula Banda", email: "nokuthula.banda@msasafinancial.example", title: "Marketing Manager", department: "Marketing", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-16T09:15:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_farai", name: "Farai Gumbo", email: "farai.gumbo@msasafinancial.example", title: "Operations Director", department: "Operations", role: "hiring_manager", status: "active", lastActiveAt: "2026-11-14T13:00:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_blessing", name: "Blessing Chari", email: "blessing.chari@msasafinancial.example", title: "Payroll Manager", department: "Finance", role: "hiring_manager", status: "active", lastActiveAt: "2026-10-28T12:00:00+02:00", invitedAt: null, twoFactor: false },
  { id: "usr_rumbi", name: "Rumbidzai Gora", email: "rumbidzai.gora@msasafinancial.example", title: "Recruitment Coordinator", department: "Human Resources", role: "recruiter", status: "active", lastActiveAt: "2026-11-18T09:02:00+02:00", invitedAt: null, twoFactor: true },
  { id: "usr_munya", name: "Munyaradzi Hove", email: "munyaradzi.hove@msasafinancial.example", title: "Branch Manager, Gweru", department: "Operations", role: "hiring_manager", status: "invited", lastActiveAt: null, invitedAt: "2026-11-16T10:00:00+02:00", twoFactor: false },
  { id: "usr_thembi", name: "Thembi Dube", email: "thembi.dube@msasafinancial.example", title: "Risk Manager", department: "Finance", role: "hiring_manager", status: "invited", lastActiveAt: null, invitedAt: "2026-11-09T14:30:00+02:00", twoFactor: false },
  { id: "usr_fadzai", name: "Fadzai Mapuranga", email: "fadzai.mapuranga@msasafinancial.example", title: "Former HR Officer", department: "Human Resources", role: "recruiter", status: "deactivated", lastActiveAt: "2026-07-31T17:00:00+02:00", invitedAt: null, twoFactor: true },
];

export const settingsSeed: OrgSettings = {
  profile: {
    legalName: "Msasa Financial Group (Private) Limited",
    tradingName: "Msasa Financial",
    registrationNumber: "2847/2009",
    industry: "Financial services",
    size: "201–500 employees",
    website: "https://msasafinancial.example",
    phone: "+263 242 700 400",
    address: "14 Samora Machel Avenue",
    city: "Harare",
    country: "Zimbabwe",
    currency: "USD",
    timezone: "Africa/Harare",
    dateFormat: "D MMM YYYY",
  },
  branding: {
    colour: "#16624F",
    logoFileName: "msasa-logo.svg",
    careersHeadline: "Build a career with Msasa Financial",
    careersIntro: "We look after the savings, loans and insurance of 400,000 families across Zimbabwe. Join a team that takes that seriously.",
    emailSignOff: "Kind regards,\nThe Msasa Financial recruitment team",
    showLogoOnTests: true,
  },
  recruitment: {
    referencePrefix: "MFG",
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
    consentWording:
      "Msasa Financial will use your results only to assess your application for this role. They are kept for 12 months, then deleted. You can ask to see your results or have them deleted at any time by emailing privacy@msasafinancial.example.",
    retentionMonths: 12,
    candidateFeedback: true,
    adjustmentsContact: "recruitment@msasafinancial.example",
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
    privacyNoticeUrl: "https://msasafinancial.example/privacy/recruitment",
    dpoName: "Chenai Mutizwa",
    dpoEmail: "privacy@msasafinancial.example",
    frameworks: ["Zimbabwe Cyber and Data Protection Act", "South Africa POPIA"],
  },
};

export const dataRequests: DataRequest[] = [
  { id: "dsr_1", person: "Rudo Mavhunga", kind: "access", receivedAt: "2026-11-11T10:20:00+02:00", dueAt: "2026-12-11T10:20:00+02:00", status: "open" },
  { id: "dsr_2", person: "Kelvin Banda", kind: "deletion", receivedAt: "2026-11-04T08:05:00+02:00", dueAt: "2026-12-04T08:05:00+02:00", status: "open" },
  { id: "dsr_3", person: "Grace Phiri", kind: "correction", receivedAt: "2026-10-02T14:40:00+02:00", dueAt: "2026-11-01T14:40:00+02:00", status: "completed" },
];

export const subscriptionSeed: Subscription = {
  plan: "growth",
  billing: "annual",
  priceUsd: 4800,
  renewsAt: "2027-03-01T00:00:00+02:00",
  seatsUsed: 14,
  seatsTotal: 20,
  testCreditsUsed: 312,
  testCreditsTotal: 500,
  cvCreditsUsed: 1864,
  cvCreditsTotal: 3000,
  invoices: [
    { id: "INV-2026-0311", date: "2026-03-01", amountUsd: 4800, status: "paid" },
    { id: "INV-2026-0718", date: "2026-07-18", amountUsd: 300, status: "paid" },
    { id: "INV-2025-0301", date: "2025-03-01", amountUsd: 4200, status: "paid" },
  ],
  paymentMethod: "Bank transfer, CABS account ending 4471",
};

const e = (id: number, at: string, actor: string, category: AuditEvent["category"], action: string, detail: string, ip = "196.27.112.18"): AuditEvent => ({ id: `aud_${id}`, at, actor, category, action, detail, ip });

export const auditSeed: AuditEvent[] = [
  e(40, "2026-11-18T09:12:00+02:00", "Tendai Moyo", "security", "Signed in", "Chrome on Windows, two-step verification"),
  e(39, "2026-11-18T08:40:00+02:00", "Kudzai Chirwa", "candidates", "Moved candidate", "Simba Mutandwa to Rejected, Data Analyst: Doesn't meet an essential requirement"),
  e(38, "2026-11-17T16:02:00+02:00", "Tendai Moyo", "assessments", "Sent tests", "Professional battery to Chipo Makoni, Finance Manager"),
  e(37, "2026-11-17T11:30:00+02:00", "Sipho Ndlovu", "offers", "Approved offer", "Tinashe Mhlanga, Software Developer, step 1 (hiring manager)", "41.190.32.7"),
  e(36, "2026-11-16T15:10:00+02:00", "Chenai Mutizwa", "security", "Required two-step verification", "For organisation admins and HR managers"),
  e(35, "2026-11-16T10:00:00+02:00", "Tendai Moyo", "users", "Invited user", "Munyaradzi Hove as Hiring manager"),
  e(34, "2026-11-15T14:02:00+02:00", "Tendai Moyo", "offers", "Marked as hired", "Farai Mutasa, Human Resources Officer"),
  e(33, "2026-11-13T09:15:00+02:00", "Tendai Moyo", "settings", "Paused vacancy", "Operations Manager: Budget review until December"),
  e(32, "2026-11-12T10:44:00+02:00", "Kudzai Chirwa", "data", "Exported data", "Candidates, Software Developer (124 rows)"),
  e(31, "2026-11-11T10:20:00+02:00", "Vettly", "data", "Data request received", "Access request from Rudo Mavhunga, due 11 Dec"),
  e(30, "2026-11-09T14:30:00+02:00", "Tendai Moyo", "users", "Invited user", "Thembi Dube as Hiring manager"),
  e(29, "2026-11-05T12:00:00+02:00", "Tendai Moyo", "settings", "Changed assessment settings", "Default deadline 7 → 5 days"),
  e(28, "2026-11-04T08:05:00+02:00", "Vettly", "data", "Data request received", "Deletion request from Kelvin Banda, due 4 Dec"),
  e(27, "2026-11-02T08:00:00+02:00", "Tendai Moyo", "settings", "Published vacancy", "Data Analyst (MFG-2026-034)"),
  e(26, "2026-10-30T17:48:00+02:00", "Unknown", "security", "Failed sign-in", "3 attempts for tafara.nyoni@msasafinancial.example, account locked for 15 minutes", "102.177.3.90"),
  e(25, "2026-10-28T09:00:00+02:00", "Chenai Mutizwa", "settings", "Changed role permissions", "Hiring managers can now see test reports"),
  e(24, "2026-10-02T14:40:00+02:00", "Tendai Moyo", "data", "Completed data request", "Correction for Grace Phiri: phone number updated"),
  e(23, "2026-08-01T08:00:00+02:00", "Chenai Mutizwa", "users", "Deactivated user", "Fadzai Mapuranga (left the organisation). Her vacancies moved to Kudzai Chirwa."),
];
