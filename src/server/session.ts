import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, ready, schema } from "./db";
import { randomToken, sha256 } from "./crypto";
import type { Actor } from "./context";

export const SESSION_COOKIE = "vettly_session";
const DAY = 86_400_000;

export interface ResolvedSession {
  sessionId: string;
  user: typeof schema.users.$inferSelect;
  organisationId: string | null;
  membership: typeof schema.memberships.$inferSelect | null;
}

/** Starts a session and sets the cookie. "Remember me" keeps it for 30 days; otherwise until the browser closes (and 12 hours at most). */
export async function createSession(userId: string, organisationId: string | null, remember: boolean) {
  await ready();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (remember ? 30 * DAY : DAY / 2));
  await db.insert(schema.sessions).values({ id: sha256(token), userId, organisationId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https:"),
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function readSession(): Promise<ResolvedSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ready();
  const id = sha256(token);
  const [row] = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())));
  if (!row || row.user.locked) return null;
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
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
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
