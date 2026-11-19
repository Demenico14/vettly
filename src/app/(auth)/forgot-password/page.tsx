import type { Metadata } from "next";
import { AuthLayout } from "@/features/auth/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/password-reset";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
