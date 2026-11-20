"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "@/components/icons";
import { Alert, Button, CheckboxField, Field, Input, toast } from "@/components/ui";
import { PasswordInput, PasswordStrength, isStrongPassword } from "@/components/ui/password-input";
import { services } from "@/services";
import { AuthError } from "@/types";
import { AuthHeading } from "./auth-layout";
import { writeFlow } from "./session-store";

const FREE_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name."),
    email: z
      .string()
      .trim()
      .min(1, "Enter your work email.")
      .email("Enter a valid email, for example name@company.co.zw."),
    password: z.string().refine(isStrongPassword, "Choose a password that meets all four rules below."),
    confirm: z.string().min(1, "Re-enter your password."),
    terms: z.boolean().refine((v) => v, "Accept the terms and privacy notice to continue."),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match." });
type Values = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "", terms: false },
  });
  const password = useWatch({ control, name: "password" });
  const email = useWatch({ control, name: "email" });
  const personal = FREE_DOMAINS.some((d) => email.trim().toLowerCase().endsWith(`@${d}`));

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await services.auth.register({ name: v.name, email: v.email, password: v.password });
      writeFlow({ pendingEmail: v.email, pendingName: v.name });
      toast.success("Account created", "Check your email for a 6-digit code.");
      router.push("/verify-email");
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "We couldn't create your account. Try again in a moment.");
    }
  };

  return (
    <>
      <AuthHeading
        title="Create your Vettly account"
        description="Set up recruitment for your organisation. You can invite your team afterwards."
      />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {error && (
          <Alert tone="danger" title="Account not created">
            {error}{" "}
            <Link href="/login" className="font-semibold underline">
              Sign in instead
            </Link>
          </Alert>
        )}
        <Field label="Full name" required error={errors.name?.message}>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field
          label="Work email"
          required
          error={errors.email?.message}
          hint={personal ? "This looks like a personal address. A work email helps your team find you." : undefined}
        >
          <Input type="email" autoComplete="email" leading={<Mail />} placeholder="name@company.co.zw" {...register("email")} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <PasswordStrength password={password} />
        <Field label="Confirm password" required error={errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Controller
          control={control}
          name="terms"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <CheckboxField
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
                aria-invalid={errors.terms ? true : undefined}
                label={
                  <>
                    I accept the{" "}
                    <a href="#terms" className="text-primary-700 underline">
                      terms of service
                    </a>{" "}
                    and{" "}
                    <a href="#privacy" className="text-primary-700 underline">
                      privacy notice
                    </a>
                  </>
                }
              />
              {errors.terms && (
                <p className="pl-6.5 text-xs font-medium text-danger-700" role="alert">
                  {errors.terms.message}
                </p>
              )}
            </div>
          )}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary-700 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
