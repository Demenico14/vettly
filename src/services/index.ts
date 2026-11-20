/**
 * The service layer the screens use. Every call goes to the backend through POST /api/rpc/<service>/<method>;
 * the contracts in ./contracts describe what each service does. A few things run in the browser: the
 * vacancy writing helper (fixed rewriting rules, no AI) and polling for CV processing progress.
 */
import { AuthError, type AuthErrorCode, type CvBatch } from "@/types";
import type {
  AnalyticsService,
  AssessmentsService,
  AuthService,
  CandidateAccessService,
  CandidateProfileService,
  CandidateService,
  CvProcessingService,
  DashboardService,
  InterviewsService,
  MatchingService,
  NotificationService,
  OffersService,
  PipelineService,
  PlatformService,
  SearchService,
  SessionService,
  SettingsService,
  TalentService,
  VacancyService,
} from "./contracts";

export * from "./contracts";
export { PIPELINE_STAGES, CLOSED_STAGES, STATUS_MOVES, emptyDraft, toDraft, harare, partsOf, deadlineIn, IMPACT_THRESHOLD, MIN_GROUP } from "@/lib/workflow";
export { EMPTY_FILTERS, consentValid } from "@/lib/talent";
export { PLAN_LIMITS } from "@/lib/plans";

/** The current time when the page loaded. Screens use it for relative dates ("3 days ago"). */
export const MOCK_NOW = new Date().toISOString();

export class ServiceError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

async function call<T>(service: string, method: string, args: unknown[]): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/rpc/${service}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ args: args.map((a) => (a === undefined ? null : a)) }),
      credentials: "same-origin",
    });
  } catch {
    throw new AuthError("network", "Can't reach Vettly. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { ok: boolean; data?: T; error?: string; code?: string } | null;
  if (!body) throw new ServiceError("Vettly sent an unexpected response. Try again.", res.status);
  if (body.ok) return body.data as T;
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login") && service !== "auth") {
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  }
  if (body.code && (service === "auth" || service === "candidateAccess")) throw new AuthError(body.code as AuthErrorCode, body.error ?? "Something went wrong.");
  throw new ServiceError(body.error ?? "Something went wrong.", res.status, body.code);
}

/** A client for one service: every method becomes a call to the backend. */
function remote<T extends object>(service: string, local: Partial<T> = {}): T {
  return new Proxy(local as T, {
    get(target, method) {
      if (typeof method !== "string" || method === "then") return undefined;
      if (method in target) return (target as Record<string, unknown>)[method];
      return (...args: unknown[]) => call(service, method, args);
    },
  });
}

/* ---------- Browser-side helpers ---------- */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* streamWords(text: string) {
  for (const w of text.split(/(\s+)/)) {
    await wait(w.trim() ? 18 : 0);
    yield w;
  }
}

/** Writing help in the vacancy editor. Fixed rewriting rules and a plain template; no AI model is involved. */
async function* assist(action: Parameters<VacancyService["assist"]>[0], input: Parameters<VacancyService["assist"]>[1]) {
  await wait(300);
  if (action === "draft") {
    const role = input.title || "this role";
    yield* streamWords(
      JSON.stringify({
        summary: `As our ${role}, you will join the ${input.department || "wider"} team. You will own clear outcomes, work closely with colleagues in other teams, and have room to grow.`,
        responsibilities: [
          `Deliver the day-to-day work of the ${role} role to agreed quality and deadlines`,
          "Work with colleagues across teams to solve problems early",
          "Keep accurate records and report progress clearly to your manager",
          "Identify ways to improve how we work, and help put them in place",
        ],
      }),
    );
    return;
  }
  const summary = input.summary.trim();
  let out = summary;
  if (action === "concise") out = summary.split(/(?<=\.)\s+/).slice(0, 2).join(" ").replace(/\b(very|really|highly|extremely)\s+/gi, "");
  else if (action === "inclusive")
    out = summary
      .replace(/\b(rockstar|ninja|guru)\b/gi, "specialist")
      .replace(/\b(he|she)\b/gi, "they")
      .replace(/\bmanpower\b/gi, "staffing")
      .replace(/\byoung and dynamic\b/gi, "motivated")
      .concat(`${summary.endsWith(".") ? "" : "."} We welcome applications from people of all backgrounds, including people with disabilities.`);
  else if (action === "formal") out = summary.replace(/\byou'll\b/gi, "you will").replace(/\bwe're\b/gi, "we are").replace(/\bdon't\b/gi, "do not").replace(/!/g, ".");
  yield* streamWords(JSON.stringify({ summary: out }));
}

/** Polls CV batches while any file is still being processed. */
function subscribeToCv(listener: (batches: CvBatch[]) => void) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    let delay = 6000;
    try {
      const batches = await call<CvBatch[]>("cv", "listBatches", []);
      if (stopped) return;
      listener(batches);
      if (batches.some((b) => b.files.some((f) => ["queued", "uploading", "extracting"].includes(f.status)))) delay = 1200;
    } catch {
      /* try again later */
    }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 1200);
  return () => {
    stopped = true;
  };
}

/** Uploads one file and returns its id, for CV batches and candidate documents. */
export async function uploadFile(file: File): Promise<{ fileId: string; name: string; sizeKb: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/files", { method: "POST", body: form, credentials: "same-origin" });
  const body = (await res.json().catch(() => null)) as { ok: boolean; data?: { fileId: string; name: string; sizeKb: number }; error?: string } | null;
  if (!body?.ok || !body.data) throw new ServiceError(body?.error ?? `${file.name} didn't upload. Try again.`, res.status);
  return body.data;
}

export const fileUrl = (fileId: string, download = false) => `/api/files/${fileId}${download ? "?download=1" : ""}`;

export const services = {
  auth: remote<AuthService>("auth"),
  dashboard: remote<DashboardService>("dashboard"),
  vacancies: remote<VacancyService>("vacancies", { assist }),
  profiles: remote<CandidateProfileService>("profiles"),
  cv: remote<CvProcessingService>("cv", { subscribe: subscribeToCv }),
  matching: remote<MatchingService>("matching"),
  pipeline: remote<PipelineService>("pipeline"),
  assessments: remote<AssessmentsService>("assessments"),
  interviews: remote<InterviewsService>("interviews"),
  offers: remote<OffersService>("offers"),
  talent: remote<TalentService>("talent"),
  analytics: remote<AnalyticsService>("analytics"),
  settings: remote<SettingsService>("settings"),
  platform: remote<PlatformService>("platform"),
  candidateAccess: remote<CandidateAccessService>("candidateAccess"),
  session: remote<SessionService>("session"),
  notifications: remote<NotificationService>("notifications"),
  search: remote<SearchService>("search"),
  candidates: remote<CandidateService>("candidates"),
};
