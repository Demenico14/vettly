"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CircleAlert, CircleCheck, Lock, Mail } from "@/components/icons";
import { Button, Field, Input, Skeleton, toast } from "@/components/ui";
import { PasswordInput, PasswordStrength, isStrongPassword } from "@/components/ui/password-input";
import { services } from "@/services";
import { AuthError } from "@/types";
import { AuthHeading, PrototypeHint } from "./auth-layout";

function IconTile({ tone = "neutral", children }: { tone?: "neutral" | "success" | "danger"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "border-success-100 bg-success-50 text-success-700"
      : tone === "danger"
        ? "border-danger-100 bg-danger-50 text-danger-700"
        : "border-line bg-surface-muted text-primary-700";
  return <div className={`mb-6 grid size-11 place-items-center rounded-md border ${cls} [&_svg]:size-5`}>{children}</div>;
}

function BackToSignIn() {
  return (
    <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline">
      <ArrowLeft className="size-4" />
      Back to sign in
    </Link>
  );
}

/* ---------- Forgot password ---------- */

const forgotSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email, for example name@company.co.zw."),
});

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  if (sentTo) {
    return (
      <>
        <IconTile tone="success">
          <CircleCheck />
        </IconTile>
        <AuthHeading
          title="Check your inbox"
          description={
            <>
              If <span className="font-semibold text-fg">{sentTo}</span> has a Vettly account, a reset link is on its way.
              The link works for 30 minutes.
            </>
          }
        />
        <Button variant="secondary" className="w-full" size="lg" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
        <BackToSignIn />
        <PrototypeHint>
          <p>
            Open the reset screen with a working link: <Link href="/reset-password?token=valid-reset" className="underline">valid</Link>{" "}
            or an <Link href="/reset-password?token=expired-reset" className="underline">expired</Link> one.
          </p>
        </PrototypeHint>
      </>
    );
  }

  return (
    <>
      <IconTile>
        <Lock />
      </IconTile>
      <AuthHeading title="Reset your password" description="Enter the email you sign in with and we'll send you a reset link." />
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          await services.auth.requestPasswordReset(v.email);
          setSentTo(v.email);
        })}
        className="flex flex-col gap-5"
      >
        <Field label="Work email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" leading={<Mail />} placeholder="name@company.co.zw" {...register("email")} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
      <BackToSignIn />
    </>
  );
}

/* ---------- Reset password ---------- */

const resetSchema = z
  .object({
    password: z.string().refine(isStrongPassword, "Choose a password that meets all four rules below."),
    confirm: z.string().min(1, "Re-enter your new password."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

type TokenState = { kind: "checking" } | { kind: "ok"; email: string } | { kind: "error"; error: AuthError } | { kind: "done" };

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = React.useState<TokenState>({ kind: "checking" });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const password = useWatch({ control, name: "password" });

  React.useEffect(() => {
    let alive = true;
    services.auth
      .checkResetToken(token)
      .then((r) => alive && setState({ kind: "ok", email: r.email }))
      .catch((e: AuthError) => alive && setState({ kind: "error", error: e }));
    return () => {
      alive = false;
    };
  }, [token]);

  if (state.kind === "checking") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Checking your reset link">
        <Skeleton className="size-11 rounded-md" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-4 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (state.kind === "error") {
    const expired = state.error.code === "token_expired";
    return (
      <>
        <IconTile tone="danger">
          <CircleAlert />
        </IconTile>
        <AuthHeading
          title={expired ? "This reset link has expired" : "This reset link isn't valid"}
          description={
            expired
              ? "Reset links work for 30 minutes and only once. Request a new one and use the most recent email."
              : "The link may be incomplete. Copy the whole link from the email, or request a new one."
          }
        />
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <BackToSignIn />
      </>
    );
  }

  if (state.kind === "done") {
    return (
      <>
        <IconTile tone="success">
          <CircleCheck />
        </IconTile>
        <AuthHeading title="Password updated" description="You're signed out of other devices. Sign in with your new password." />
        <Button size="lg" className="w-full" onClick={() => router.push("/login")}>
          Continue to sign in
        </Button>
      </>
    );
  }

  return (
    <>
      <IconTile>
        <Lock />
      </IconTile>
      <AuthHeading
        title="Choose a new password"
        description={
          <>
            For <span className="font-semibold text-fg">{state.email}</span>.
          </>
        }
      />
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          await services.auth.resetPassword(token, v.password);
          toast.success("Password updated");
          setState({ kind: "done" });
        })}
        className="flex flex-col gap-5"
      >
        <Field label="New password" error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" autoFocus {...register("password")} />
        </Field>
        <PasswordStrength password={password} />
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
      <BackToSignIn />
    </>
  );
}
