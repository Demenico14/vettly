import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/auth-layout";
import { VerifyEmail } from "@/features/auth/verify-email";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <VerifyEmail />
    </AuthLayout>
  );
}
