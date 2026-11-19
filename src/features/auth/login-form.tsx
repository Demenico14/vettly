"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "@/components/icons";
import { Alert, Button, CheckboxField, Field, Input, toast } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { services } from "@/services";
import { AuthError } from "@/types";
import { AuthHeading, Divider, PrototypeHint } from "./auth-layout";
import { SsoButtons } from "./sso-buttons";
import { routeAfterSignIn, writeFlow } from "./session-store";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your work email.").email("Enter a valid email, for example name@company.co.zw."),
  password: z.string().min(1, "Enter your password.").min(8, "Passwords are at least 8 characters."),
  remember: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<AuthError | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", remember: true } });
  const remember = useWatch({ control, name: "remember" });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      const session = await services.auth.signIn(v.email, v.password, v.remember);
      writeFlow({ pendingEmail: v.email });
      toast.success(`Welcome back, ${session.user.name.split(" ")[0]}`);
      router.push(routeAfterSignIn(session));
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError("network", "We couldn't reach Vettly. Check your connection and try again.");
      setError(err);
      if (err.code === "invalid_credentials") setFocus("password");
    }
  };

  return (
    <>
      <AuthHeading title="Sign in to Vettly" description="Use your work email, or your organisation's single sign-on." />
      <SsoButtons disabled={isSubmitting} />
      <Divider label="or with email" />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {error && (
          <Alert tone="danger" title={error.code === "account_locked" ? "Account locked" : "Sign-in failed"}>
            {error.code === "account_locked" ? (
              <>
                {error.message} Reset your password to unlock it, or ask your organisation admin.{" "}
                <Link href="/forgot-password" className="font-semibold underline">
                  Reset password
                </Link>
              </>
            ) : error.code === "invalid_credentials" ? (
              <>{error.message} Check for typos, or reset your password.</>
            ) : (
              error.message
            )}
          </Alert>
        )}
        <Field label="Work email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" leading={<Mail />} placeholder="name@company.co.zw" {...register("email")} />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          action={
            <Link href="/forgot-password" className="text-xs font-semibold text-primary-700 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...register("password")} />
        </Field>
        <CheckboxField
          checked={remember}
          onCheckedChange={(c) => setValue("remember", c === true)}
          label="Keep me signed in"
          description="Not recommended on shared computers."
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        New to Vettly?{" "}
        <Link href="/register" className="font-semibold text-primary-700 hover:underline">
          Create an account
        </Link>
      </p>
      <PrototypeHint>
        <p>Any email and a password of 8+ characters signs in.</p>
        <p>
          Include <code>wrong</code> in the password to see a failed sign-in.
        </p>
        <p>
          Use <code>locked@msasafinancial.example</code> to see a locked account.
        </p>
        <p>
          <code>tendai.moyo@msasafinancial.example</code> goes to the app; any other email starts organisation setup.
        </p>
      </PrototypeHint>
    </>
  );
}
