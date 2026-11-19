import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { ResetPasswordForm } from "@/features/auth/password-reset";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
