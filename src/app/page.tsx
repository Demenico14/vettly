import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSession } from "@/server/session";
import { Landing } from "@/features/marketing/landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Vettly · Shortlists you can defend" },
  description: "Vettly reads every CV against your vacancy's requirements, quotes the line that proves each one, and leaves the decision with your team.",
};

/** Visitors see the front page; signed-in people go straight to their work. */
export default async function Home() {
  const s = await readSession();
  if (!s) return <Landing />;
  if (s.user.isSuperAdmin && !s.organisationId) redirect("/admin");
  redirect(s.organisationId ? "/dashboard" : "/onboarding/organisation");
}
