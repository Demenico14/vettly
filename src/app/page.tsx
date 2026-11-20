import { redirect } from "next/navigation";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.user.isSuperAdmin && !s.organisationId) redirect("/admin");
  redirect(s.organisationId ? "/dashboard" : "/onboarding/organisation");
}
