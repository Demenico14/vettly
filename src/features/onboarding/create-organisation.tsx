"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, CircleAlert } from "@/components/icons";
import { Alert, Button, Field, Input, Select, Spinner, toast } from "@/components/ui";
import { services } from "@/services";
import { COUNTRIES, INDUSTRIES } from "@/mocks/auth";
import type { OrganisationSize } from "@/types";
import { cn } from "@/lib/utils";
import { AuthHeading } from "@/features/auth/auth-layout";
import { writeFlow } from "@/features/auth/session-store";

const SIZES: { value: OrganisationSize; label: string; hint: string }[] = [
  { value: "1-50", label: "1–50", hint: "employees" },
  { value: "51-200", label: "51–200", hint: "employees" },
  { value: "201-1000", label: "201–1000", hint: "employees" },
  { value: "1000+", label: "1000+", hint: "employees" },
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your organisation's name."),
  slug: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(30, "Use 30 characters or fewer.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens."),
  industry: z.string().min(1, "Choose an industry."),
  size: z.enum(["1-50", "51-200", "201-1000", "1000+"], { message: "Choose your organisation's size." }),
  country: z.string().min(1, "Choose a country."),
  city: z.string().trim().min(2, "Enter the city of your head office."),
});
type Values = z.infer<typeof schema>;

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

type SlugState = "idle" | "checking" | "available" | "taken";

export function CreateOrganisation() {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [slugState, setSlugState] = React.useState<SlugState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", industry: "", size: undefined, country: "Zimbabwe", city: "" },
  });
  const name = useWatch({ control, name: "name" });
  const slug = useWatch({ control, name: "slug" });

  React.useEffect(() => {
    if (!slugTouched) setValue("slug", toSlug(name), { shouldValidate: false });
  }, [name, slugTouched, setValue]);

  React.useEffect(() => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset availability when the slug is not checkable
      setSlugState("idle");
      return;
    }
    setSlugState("checking");
    let alive = true;
    const t = setTimeout(() => {
      services.auth.checkSlug(slug).then((ok) => alive && setSlugState(ok ? "available" : "taken"));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [slug]);

  const onSubmit = async (v: Values) => {
    if (slugState === "taken") return;
    setError(null);
    try {
      const { id } = await services.auth.createOrganisation(v);
      writeFlow({ organisationId: id, organisationName: v.name });
      toast.success("Organisation created", v.name);
      router.push("/onboarding/setup");
    } catch {
      setError("We couldn't create the organisation. Check your connection and try again.");
    }
  };

  return (
    <>
      <p className="mb-2 text-xs font-semibold text-fg-subtle">Step 1 of 2 · Your organisation</p>
      <AuthHeading
        title="Create your organisation"
        description="This is the workspace your HR team shares. Candidates will see the organisation name on job adverts and test invitations."
      />
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {error && <Alert tone="danger" title="Organisation not created">{error}</Alert>}
        <Field label="Organisation name" required error={errors.name?.message}>
          <Input autoComplete="organization" autoFocus placeholder="e.g. Msasa Financial Group" {...register("name")} />
        </Field>
        <Field
          label="Workspace address"
          required
          error={errors.slug?.message ?? (slugState === "taken" ? "That address is taken. Try adding your city, e.g. msasa-harare." : undefined)}
          hint={
            slugState === "available" ? (
              <span className="inline-flex items-center gap-1 font-medium text-success-700">
                <Check className="size-3.5" weight="bold" /> Available
              </span>
            ) : (
              "Your team signs in here. Lowercase letters, numbers and hyphens."
            )
          }
        >
          <Input
            leading={<span className="text-xs font-medium">vettly.app/</span>}
            className="pl-[5.25rem]"
            {...register("slug", { onChange: () => setSlugTouched(true) })}
            trailing={
              slugState === "checking" ? (
                <Spinner className="size-4" label="Checking availability" />
              ) : slugState === "taken" ? (
                <CircleAlert className="size-4 text-danger-600" />
              ) : slugState === "available" ? (
                <Check className="size-4 text-success-600" weight="bold" />
              ) : undefined
            }
          />
        </Field>
        <Field label="Industry" required error={errors.industry?.message}>
          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Choose industry"
                options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
              />
            )}
          />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-fg">
            Organisation size<span className="ml-0.5 text-danger-600" aria-hidden>*</span>
          </legend>
          <Controller
            control={control}
            name="size"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Organisation size" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SIZES.map((s) => {
                  const on = field.value === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => field.onChange(s.value)}
                      className={cn(
                        "flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition-colors",
                        on ? "border-primary-600 bg-primary-50 ring-1 ring-primary-600" : "border-line-strong bg-surface hover:border-ink-400",
                        errors.size && !on && "border-danger-500",
                      )}
                    >
                      <span className="text-sm font-semibold whitespace-nowrap text-fg tabular">{s.label}</span>
                      <span className="text-2xs text-fg-subtle">{s.hint}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />
          {errors.size && (
            <p className="mt-1.5 text-xs font-medium text-danger-700" role="alert">
              {errors.size.message}
            </p>
          )}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Country" required error={errors.country?.message}>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
              )}
            />
          </Field>
          <Field label="Head office city" required error={errors.city?.message}>
            <Input autoComplete="address-level2" placeholder="e.g. Harare" {...register("city")} />
          </Field>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} disabled={slugState === "checking"} className="mt-1 w-full">
          {isSubmitting ? "Creating organisation…" : "Create organisation"}
        </Button>
        <p className="text-xs text-fg-subtle">
          Prototype: the addresses <code className="font-mono">msasa</code>, <code className="font-mono">matobo</code> and{" "}
          <code className="font-mono">vettly</code> are taken.
        </p>
      </form>
    </>
  );
}
