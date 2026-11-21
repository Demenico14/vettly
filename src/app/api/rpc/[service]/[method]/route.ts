import { NextResponse, type NextRequest } from "next/server";
import { AuthError } from "@/types";
import { registry, BROWSER_ONLY, permissionsFor } from "@/server/registry";
import { requirePermission } from "@/server/services/settings";
import { actorFrom, readSession } from "@/server/session";
import { withOrg } from "@/server/store";
import { PLATFORM } from "@/server/services/platform";
import { db, ready, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { clientAddress, fromOwnSite, rateLimited } from "@/server/http";

/**
 * The one API endpoint the screens use: POST /api/rpc/<service>/<method> with `{ "args": [...] }`.
 * It checks who is asking, runs the method with that organisation's records, and returns JSON.
 */
export const dynamic = "force-dynamic";

// Responses carry personal data, so no browser, proxy or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store", Vary: "Cookie" };
const fail = (status: number, error: string, code?: string, headers: Record<string, string> = {}) =>
  NextResponse.json({ ok: false, error, ...(code ? { code } : {}) }, { status, headers: { ...NO_STORE, ...headers } });

export async function POST(req: NextRequest, { params }: { params: Promise<{ service: string; method: string }> }) {
  const { service, method } = await params;
  // Only a service's own methods can be called, never inherited ones such as "constructor".
  const entry = Object.hasOwn(registry, service) ? registry[service] : undefined;
  const fn = entry && Object.hasOwn(entry.impl, method) ? entry.impl[method] : undefined;
  if (!entry || typeof fn !== "function" || BROWSER_ONLY.has(`${service}.${method}`) || method.startsWith("_")) return fail(404, "Unknown operation.");

  // Cross-site requests are refused (CSRF), and the body must be JSON, which a plain HTML form can't send.
  if (!fromOwnSite(req)) return fail(403, "This request came from another site and was refused.");
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "Send the request as JSON.");
  const wait = rateLimited(`${service}.${method}`, clientAddress(req));
  if (wait) return fail(429, `Too many attempts. Try again in ${Math.ceil(wait / 60)} ${wait > 60 ? "minutes" : "minute"}.`, "rate_limited", { "Retry-After": String(wait) });

  let args: unknown[] = [];
  try {
    const body = (await req.json()) as { args?: unknown };
    if (Array.isArray(body.args)) args = body.args.map((a) => (a === null ? undefined : a));
  } catch {
    return fail(400, "The request couldn't be read.");
  }

  try {
    await ready();
    const access = entry.methods?.[method] ?? entry.access;
    const call = () => (fn as (...a: unknown[]) => unknown).apply(entry.impl, args);
    let data: unknown;
    if (access === "public" || access === "candidate") {
      data = await call();
    } else {
      const s = await readSession();
      if (!s) return fail(401, "Your session has ended. Sign in again.", "unauthenticated");
      if (access === "session") data = await call();
      else if (access === "platform") {
        if (!s.user.isSuperAdmin) return fail(403, "Only Vettly platform administrators can do this.");
        data = await withOrg(PLATFORM, { ...actorFrom(s), role: "super_admin" }, call);
      } else {
        if (!s.organisationId || !s.membership) return fail(403, "Choose or create an organisation first.", "no_organisation");
        const [org] = await db.select({ status: schema.organisations.status }).from(schema.organisations).where(eq(schema.organisations.id, s.organisationId));
        if (org?.status === "suspended") return fail(403, "This organisation is suspended. Contact Vettly support.", "suspended");
        const needs = permissionsFor(service, method);
        data = await withOrg(s.organisationId, actorFrom(s), () => {
          for (const n of needs) requirePermission(n.permission, n.what);
          return call();
        });
      }
    }
    return NextResponse.json({ ok: true, data: data ?? null }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof AuthError) return fail(400, e.message, e.code);
    const message = e instanceof Error ? e.message : "Something went wrong.";
    // Validation messages are written for people; anything unexpected is logged and kept generic.
    if (e instanceof Error && (e.constructor === Error || e.name === "Error")) return fail(400, message);
    console.error(`[rpc] ${service}.${method}`, e);
    return fail(500, "Something went wrong on our side. Try again.");
  }
}
