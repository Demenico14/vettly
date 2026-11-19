import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/auth-layout";
import { SetupWizard } from "@/features/onboarding/setup-wizard";

export const metadata: Metadata = { title: "Set up your workspace" };

export default function SetupPage() {
  return (
    <AuthLayout aside="none" wide>
      <SetupWizard />
    </AuthLayout>
  );
}
