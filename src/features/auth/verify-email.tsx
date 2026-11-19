"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "@/components/icons";
import { Button, toast } from "@/components/ui";
import { OtpInput, isCompleteCode } from "@/components/ui/otp-input";
import { services } from "@/services";
import { AuthError } from "@/types";
import { AuthHeading, PrototypeHint } from "./auth-layout";
import { readFlow } from "./session-store";

const RESEND_SECONDS = 45;

export function useCountdown(seconds: number) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(seconds)] as const;
}

export function VerifyEmail() {
  const router = useRouter();
  const [email, setEmail] = React.useState("your work email");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [left, restart] = useCountdown(RESEND_SECONDS);

  React.useEffect(() => {
    const e = readFlow().pendingEmail;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the pending email from the flow store after mount
    if (e) setEmail(e);
  }, []);

  const submit = async (value = code) => {
    if (!isCompleteCode(value)) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await services.auth.verifyEmail(email, value);
      toast.success("Email verified");
      router.push("/onboarding/organisation");
    } catch (e) {
      setError(e instanceof AuthError ? `${e.message} Check the latest email, or request a new code.` : "Verification failed.");
      setCode("");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 grid size-11 place-items-center rounded-md border border-line bg-surface-muted text-primary-700">
        <Mail className="size-5" />
      </div>
      <AuthHeading
        title="Check your email"
        description={
          <>
            We sent a 6-digit code to <span className="font-semibold text-fg">{email}</span>. It expires in 10 minutes.
          </>
        }
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <OtpInput value={code} onChange={setCode} invalid={!!error} disabled={busy} autoFocus onComplete={submit} />
          {error && (
            <p className="text-xs font-medium text-danger-700" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {busy ? "Verifying…" : "Verify email"}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-fg-muted">
        <p>
          Didn&apos;t get it? Check spam, or{" "}
          {left > 0 ? (
            <span className="text-fg-subtle tabular">resend in {left}s</span>
          ) : (
            <button
              type="button"
              disabled={resending}
              onClick={async () => {
                setResending(true);
                await services.auth.resendCode(email);
                setResending(false);
                restart();
                toast.info("New code sent", email);
              }}
              className="font-semibold text-primary-700 hover:underline disabled:opacity-50"
            >
              {resending ? "sending…" : "send a new code"}
            </button>
          )}
          .
        </p>
        <p>
          Wrong address?{" "}
          <Link href="/register" className="font-semibold text-primary-700 hover:underline">
            Change email
          </Link>
        </p>
      </div>
      <PrototypeHint>
        <p>
          The correct code is <code>246810</code>. Any other code shows the error state.
        </p>
      </PrototypeHint>
    </>
  );
}
