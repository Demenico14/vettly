import { NextResponse } from "next/server";

/** Liveness check for Docker and, later, Platform admin's System health screen. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", service: "vettly-web", time: new Date().toISOString() });
}
