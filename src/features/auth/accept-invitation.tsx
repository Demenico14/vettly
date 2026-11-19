"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, CircleAlert, Clock } from "@/components/icons";
import { Alert, Avatar, Button, Field, Input, Skeleton, toast } from "@/components/ui";
import { PasswordInput, PasswordStrength, isStrongPassword } from "@/components/ui/password-input";
import { ROLE_LABEL } from "@/components/layout/session-provider";
import { services } from "@/services";
import { AuthError, type TeamInvitation } from "@/types";
import { formatDate } from "@/lib/utils";
import { AuthHeading, PrototypeHint } from "./auth-layout";

const ROLE_SUMMARY: Record<TeamInvitation["role"], string> = {
  super_admin: "Full platform access.",
  org_admin: "Full access to your organisation, including users and billing.",
  hr_manager: "Manage vacancies, candidates, assessments and decisions.",
  recruiter: "Manage vacancies and candidates, send tests and schedule interviews.",
  hiring_manager: "Review shortlists, test results and interview scorecards for your vacancies.",
};

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    password: z.string().refine(isStrongPassword, "Choose a password that meets all four rules below."),
    confirm: z.string().min(1, "Re-enter your password."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

type State = { kind: "loading" } | { kind: "ok"; inv: TeamInvitation } | { kind: "error"; error: AuthError; inv?: TeamInvitation };

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", password: "", confirm: "" } });
  const password = useWatch({ control, name: "password" });

  React.useEffect(() => {
    let alive = true;
    services.auth
      .getInvitation(token)
      .then((inv) => {
        if (!alive) return;
        if (inv.status === "expired") setState({ kind: "error", error: new AuthError("token_expired", "This invitation has expired."), inv });
        else setState({ kind: "ok", inv });
      })
      .catch((e: AuthError) => alive && setState({ kind: "error", error: e }));
    return () => {
      alive = false;
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading invitation">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (state.kind === "error") {
    const expired = state.error.code === "token_expired";
    return (
      <>
        <div className="mb-6 grid size-11 place-items-center rounded-md border border-danger-100 bg-danger-50 text-danger-700">
          {expired ? <Clock className="size-5" /> : <CircleAlert className="size-5" />}
        </div>
        <AuthHeading
          title={expired ? "This invitation has expired" : "This invitation link isn't valid"}
          description={
            expired && state.inv ? (
              <>
                {state.inv.invitedBy} invited you to {state.inv.organisationName}, but the invitation closed on{" "}
                {formatDate(state.inv.expiresAt)}. Ask {state.inv.invitedBy.split(" ")[0]} to send a new one.
              </>
            ) : (
              "The link may be incomplete or already used. Ask the person who invited you to send it again."
            )
          }
        />
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
        <InviteHint />
      </>
    );
  }

  const { inv } = state;
  return (
    <>
      <div className="mb-7 flex items-start gap-3 rounded-lg border border-line bg-surface-muted p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-600 text-white">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-fg">{inv.organisationName}</p>
          <p className="text-xs text-fg-subtle">{inv.organisationCity}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-fg-muted">
            <Avatar name={inv.invitedBy} size="xs" />
            {inv.invitedBy}, {inv.invitedByTitle}, invited you
          </p>
        </div>
      </div>
      <AuthHeading
        title={`Join ${inv.organisationName}`}
        description={
          <>
            You&apos;ll join as <span className="font-semibold text-fg">{ROLE_LABEL[inv.role]}</span>. {ROLE_SUMMARY[inv.role]}
          </>
        }
      />
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setSubmitError(null);
          try {
            await services.auth.acceptInvitation(token, v);
            toast.success(`Welcome to ${inv.organisationName}`, "Your account is ready.");
            router.push("/welcome");
          } catch (e) {
            setSubmitError(e instanceof AuthError ? e.message : "We couldn't accept the invitation. Try again.");
          }
        })}
        className="flex flex-col gap-5"
      >
        {submitError && <Alert tone="danger" title="Invitation not accepted">{submitError}</Alert>}
        <Field label="Email" hint="Invitations are tied to this address.">
          <Input value={inv.email} readOnly disabled />
        </Field>
        <Field label="Full name" required error={errors.name?.message}>
          <Input autoComplete="name" autoFocus placeholder="As colleagues know you" {...register("name")} />
        </Field>
        <Field label="Create password" required error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordStrength password={password} />
        <Field label="Confirm password" required error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Joining…" : "Accept and join"}
        </Button>
        <p className="text-xs text-fg-subtle">
          By joining you accept the{" "}
          <a href="#terms" className="underline">
            terms
          </a>{" "}
          and{" "}
          <a href="#privacy" className="underline">
            privacy notice
          </a>
          . Invitation valid until {formatDate(inv.expiresAt)}.
        </p>
      </form>
      <InviteHint />
    </>
  );
}

function InviteHint() {
  return (
    <PrototypeHint>
      <p>
        <Link href="/invite/msasa-kudzai" className="underline">
          /invite/msasa-kudzai
        </Link>{" "}
        is a valid invitation.
      </p>
      <p>
        <Link href="/invite/matobo-expired" className="underline">
          /invite/matobo-expired
        </Link>{" "}
        has expired; any other token is invalid.
      </p>
    </PrototypeHint>
  );
}
