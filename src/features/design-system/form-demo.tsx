"use client";

import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtSign, Search } from "lucide-react";
import {
  Alert,
  Button,
  CheckboxField,
  Field,
  Input,
  RadioGroup,
  Select,
  SwitchField,
  Textarea,
  toast,
} from "@/components/ui";
import { DSSection, Specimen } from "./specimen";

const ROLES = [
  { value: "recruiter", label: "Recruiter", description: "Manage vacancies and candidates" },
  { value: "hiring_manager", label: "Hiring manager", description: "Review shortlists and score interviews" },
  { value: "org_admin", label: "Organisation admin", description: "Full access including billing" },
];

const DEPARTMENTS = [
  { value: "finance", label: "Finance" },
  { value: "it", label: "Information Technology" },
  { value: "hr", label: "Human Resources" },
  { value: "ops", label: "Operations" },
  { value: "marketing", label: "Marketing" },
];

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter the person's full name."),
  email: z
    .string()
    .trim()
    .min(1, "Enter a work email address.")
    .email("Enter a valid email, for example name@company.co.zw."),
  phone: z
    .string()
    .trim()
    .regex(/^(\+263|0)7\d{8}$/, "Use a Zimbabwean mobile number, for example +263 77 123 4567.")
    .or(z.literal("")),
  role: z.string().min(1, "Choose a role."),
  department: z.string().min(1, "Choose a department."),
  note: z.string().max(280, "Keep the note under 280 characters."),
  sendWelcome: z.boolean(),
});

type InviteValues = z.infer<typeof inviteSchema>;

export function FormsSection() {
  const [result, setResult] = React.useState<"idle" | "error">("idle");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", phone: "", role: "", department: "", note: "", sendWelcome: true },
  });
  const note = useWatch({ control, name: "note" });

  const onSubmit = async (values: InviteValues) => {
    await new Promise((r) => setTimeout(r, 900));
    // Simulated server rule so the error state can be exercised.
    if (values.email.toLowerCase().endsWith("@msasafinancial.example") && values.name.toLowerCase().includes("tendai")) {
      setResult("error");
      return;
    }
    setResult("idle");
    toast.success("Invitation sent", `${values.name} will receive an email at ${values.email}.`);
    reset();
  };

  const [density, setDensity] = React.useState("comfortable");

  return (
    <DSSection
      id="forms"
      title="Form controls"
      description="Labels sit above controls, hints below, errors replace hints and name the fix. Validation runs on submit, then live as the user corrects."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Specimen label="Invite a team member" note="Working form · react-hook-form + zod">
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {result === "error" && (
              <Alert tone="danger" title="Invitation not sent">
                Tendai Moyo already has an account in Msasa Financial Group. Choose a different person or resend their
                original invite from Settings.
              </Alert>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name?.message}>
                <Input autoComplete="name" placeholder="e.g. Chipo Makoni" {...register("name")} />
              </Field>
              <Field label="Work email" required error={errors.email?.message}>
                <Input type="email" autoComplete="email" leading={<AtSign />} placeholder="name@company.co.zw" {...register("email")} />
              </Field>
              <Field label="Mobile number" optional hint="Used for interview reminders by SMS." error={errors.phone?.message}>
                <Input type="tel" autoComplete="tel" placeholder="+263 77 123 4567" {...register("phone", { setValueAs: (v: string) => v.replace(/\s/g, "") })} />
              </Field>
              <Field label="Department" required error={errors.department?.message}>
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} options={DEPARTMENTS} placeholder="Choose department" />
                  )}
                />
              </Field>
            </div>
            <Field label="Role" required error={errors.role?.message}>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} options={ROLES} placeholder="Choose role" />
                )}
              />
            </Field>
            <Field
              label="Personal note"
              optional
              error={errors.note?.message}
              hint={`${note.length}/280 characters`}
            >
              <Textarea rows={3} placeholder="Welcome aboard. You'll be reviewing the Finance Manager shortlist first." {...register("note")} />
            </Field>
            <Controller
              control={control}
              name="sendWelcome"
              render={({ field }) => (
                <CheckboxField
                  checked={field.value}
                  onCheckedChange={(c) => field.onChange(c === true)}
                  label="Send welcome email"
                  description="Includes a link to set a password. Expires after 7 days."
                />
              )}
            />
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => { reset(); setResult("idle"); }}>
                Clear
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send invitation"}
              </Button>
            </div>
            <p className="text-2xs text-fg-subtle">
              Tip: submit empty to see validation, or use “Tendai Moyo” with tendai.moyo@msasafinancial.example to see a
              server error.
            </p>
          </form>
        </Specimen>
        <div className="flex flex-col gap-6">
          <Specimen label="Input states">
            <div className="flex flex-col gap-4">
              <Field label="Search">
                <Input leading={<Search />} placeholder="Search by name or skill" />
              </Field>
              <Field label="Expected salary" hint="Monthly, before tax.">
                <Input inputMode="numeric" defaultValue="2 400" trailing={<span className="pr-1 text-xs font-semibold">USD</span>} />
              </Field>
              <Field label="Vacancy reference" error="This reference is already used by Data Analyst (Harare).">
                <Input defaultValue="MFG-2026-014" />
              </Field>
              <Field label="Organisation ID">
                <Input disabled value="org_msasa" readOnly />
              </Field>
            </div>
          </Specimen>
          <Specimen label="Choice controls">
            <div className="flex flex-col gap-5">
              <SwitchField label="Email me when CV processing finishes" description="Batches over 20 CVs only." defaultChecked />
              <SwitchField label="Anonymise candidate names during screening" description="Reduces bias in the first review." />
              <div>
                <p className="mb-2.5 text-sm font-semibold">Table density</p>
                <RadioGroup
                  value={density}
                  onValueChange={setDensity}
                  options={[
                    { value: "comfortable", label: "Comfortable", description: "Best for reviewing profiles" },
                    { value: "compact", label: "Compact", description: "Fits more rows when screening" },
                  ]}
                />
              </div>
            </div>
          </Specimen>
        </div>
      </div>
    </DSSection>
  );
}
