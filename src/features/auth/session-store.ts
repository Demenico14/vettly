import type { Session } from "@/types";

/**
 * Carries small bits of state between auth screens (e.g. the email awaiting verification).
 * Kept in sessionStorage for this tab only; the real session is the server's cookie.
 */
const KEY = "vettly:auth-flow";

interface FlowState {
  pendingEmail?: string;
  pendingName?: string;
  organisationId?: string;
  organisationName?: string;
}

export function readFlow(): FlowState {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as FlowState;
  } catch {
    return {};
  }
}

export function writeFlow(patch: FlowState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readFlow(), ...patch }));
  } catch {
    /* storage unavailable: screens fall back to defaults */
  }
}

export function routeAfterSignIn(session: Session) {
  if (session.needsOnboarding) return "/onboarding/organisation";
  return "/dashboard";
}
