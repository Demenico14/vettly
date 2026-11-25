import "server-only";
/**
 * Request checks shared by the API routes: cross-site request refusal (CSRF), and per-client rate limits for the
 * endpoints people can't be signed in for yet (sign-in, registration, password reset, one-time codes).
 */
import type { NextRequest } from "next/server";

/**
 * True when a state-changing request comes from Vettly's own pages. Browsers send Sec-Fetch-Site on every
 * request; older ones send Origin. Server-to-server clients send neither and can't carry a victim's cookies.
 * (OWASP CSRF Prevention Cheat Sheet: Fetch Metadata first, strict Origin match as the fallback.)
 */
export function fromOwnSite(req: NextRequest) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([req.nextUrl.origin]);
  if (process.env.APP_URL) allowed.add(new URL(process.env.APP_URL).origin);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) allowed.add(`${req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")}://${host}`);
  return allowed.has(origin);
}

/**
 * The client's address, for rate limiting.
 * - Behind a reverse proxy (set TRUST_PROXY=1): the last X-Forwarded-For entry, which that proxy appended and a
 *   client can't forge.
 * - Without one: Next.js puts the connection's address in X-Forwarded-For only when the client sent none, so a
 *   client can claim another address. Per-address limits are then best effort; per-account sign-in throttling
 *   and per-code attempt limits still hold regardless.
 */
export function clientAddress(req: NextRequest) {
  const entries = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (process.env.TRUST_PROXY === "1" ? entries.at(-1) : entries[0]) ?? "unknown";
}

/** Limits per action: how many attempts one client may make in the window. */
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "auth.signIn": { max: 20, windowMs: 10 * 60_000 },
  "auth.register": { max: 10, windowMs: 60 * 60_000 },
  "auth.requestPasswordReset": { max: 5, windowMs: 60 * 60_000 },
  "auth.resendCode": { max: 5, windowMs: 60 * 60_000 },
  "auth.verifyEmail": { max: 20, windowMs: 10 * 60_000 },
  "auth.acceptInvitation": { max: 10, windowMs: 10 * 60_000 },
  "candidateAccess.sendCode": { max: 5, windowMs: 60 * 60_000 },
  "candidateAccess.verify": { max: 20, windowMs: 10 * 60_000 },
  // A recorded test sends a piece every 10 to 20 seconds; this allows several hours of tests an hour, and no flood.
  "candidateAccess.uploadRecording": { max: 1_500, windowMs: 60 * 60_000 },
};

const g = globalThis as unknown as { __vettlyHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__vettlyHits ??= new Map());

/**
 * Counts an attempt and returns the seconds to wait when the client is over its limit, or 0. Kept in memory,
 * which suits the single-instance setup; several instances need a shared store such as Redis or Postgres.
 */
export function rateLimited(action: string, client: string): number {
  const limit = LIMITS[action];
  if (!limit || process.env.VETTLY_RATE_LIMITS === "off") return 0;
  const key = `${action}|${client}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < limit.windowMs);
  if (recent.length >= limit.max) {
    hits.set(key, recent);
    return Math.ceil((limit.windowMs - (now - recent[0]!)) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 50_000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60 * 60_000)) hits.delete(k);
  return 0;
}
