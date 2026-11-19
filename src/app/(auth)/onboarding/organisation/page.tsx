import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/auth-layout";
import { CreateOrganisation } from "@/features/onboarding/create-organisation";

export const metadata: Metadata = { title: "Create organisation" };

export default function CreateOrganisationPage() {
  return (
    <AuthLayout>
      <CreateOrganisation />
    </AuthLayout>
  );
}
