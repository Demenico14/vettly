import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/auth-layout";
import { AcceptInvitation } from "@/features/auth/accept-invitation";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthLayout>
      <AcceptInvitation token={token} />
    </AuthLayout>
  );
}
