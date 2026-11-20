import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { readSession } from "@/server/session";

/** Every page in the app needs a signed-in member of an organisation (platform staff may skip the organisation). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await readSession();
  if (!s) redirect("/login");
  if (!s.organisationId && !s.user.isSuperAdmin) redirect("/onboarding/organisation");
  return <AppShell>{children}</AppShell>;
}
