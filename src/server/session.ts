import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, ready, schema } from "./db";
import { randomToken, sha256 } from "./crypto";
import type { Actor } from "./context";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Cookies are Secure (and so can use the __Host- prefix: this host only, path /) whenever the app is served over HTTPS. */
const secure = () => process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https:");
/** The session cookie. Over HTTPS it carries the __Host- prefix, which browsers only accept from this exact host. */
export const sessionCookieName = () => (secure() ? "__Host-vettly_session" : "vettly_session");

/**
 * Session lifetimes, enforced on the server (the cookie's own expiry is only a hint to the browser).
 * Without "remember me": 12 hours at most, ending after 2 hours idle. With it: 30 days, ending after 7 days idle.
 */
const ABSOLUTE = { normal: DAY / 2, remembered: 30 * DAY };
const IDLE = { normal: 2 * HOUR, remembered: 7 * DAY };

export interface ResolvedSession {
  sessionId: string;
  user: typeof schema.users.$inferSelect;
  organisationId: string | null;
  membership: typeof schema.memberships.$inferSelect | null;
}

/** Starts a session and sets the cookie. "Remember me" keeps it for 30 days; otherwise until the browser closes (and 12 hours at most). */
export async function createSession(userId: string, organisationId: string | null, remember: boolean) {
  await ready();
  const jar = await cookies();
  // A new token at every sign-in, and the previous session on this browser ends (no session fixation).
  const previous = jar.get(sessionCookieName())?.value;
  if (previous) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(previous)));
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (remember ? ABSOLUTE.remembered : ABSOLUTE.normal));
  await db.insert(schema.sessions).values({ id: sha256(token), userId, organisationId, expiresAt, remember });
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function readSession(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token) return null;
  await ready();
  const id = sha256(token);
  const [row] = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())));
  if (!row || row.user.locked) return null;
  const idleLimit = row.session.remember ? IDLE.remembered : IDLE.normal;
  const idle = Date.now() - row.session.lastSeenAt.getTime();
  if (idle > idleLimit) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return null;
  }
  // Record activity at most once a minute, to keep the idle clock without a write on every request.
  if (idle > 60_000) await db.update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, id));
  let membership: typeof schema.memberships.$inferSelect | null = null;
  if (row.session.organisationId) {
    [membership = null] = await db
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, row.user.id), eq(schema.memberships.organisationId, row.session.organisationId), eq(schema.memberships.status, "active")));
  }
  return { sessionId: id, user: row.user, organisationId: membership ? row.session.organisationId : null, membership };
}

export async function setSessionOrganisation(sessionId: string, organisationId: string) {
  await db.update(schema.sessions).set({ organisationId }).where(eq(schema.sessions.id, sessionId));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(sessionCookieName());
}

export function actorFrom(s: ResolvedSession): Actor {
  return {
    userId: s.user.id,
    name: s.user.name,
    email: s.user.email,
    title: s.user.title,
    role: (s.membership?.role as Actor["role"]) ?? (s.user.isSuperAdmin ? "super_admin" : "recruiter"),
    isSuperAdmin: s.user.isSuperAdmin,
  };
}
