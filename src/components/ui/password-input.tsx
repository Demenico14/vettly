"use client";

import { MIN_PASSWORD_LENGTH, isGuessable, passwordProblem } from "@/lib/passwords";
import * as React from "react";
import { Eye, EyeOff, Check } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";

/** Password field with a show/hide toggle. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type" | "trailing">>(
  (props, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="grid size-7 place-items-center rounded-sm text-ink-500 hover:bg-ink-100 hover:text-fg"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/** NIST SP 800-63B-4: length and guessability, not character-class rules (see src/lib/passwords.ts). */
export const PASSWORD_RULES = [
  { id: "length", label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (p: string) => p.length >= MIN_PASSWORD_LENGTH },
  { id: "guess", label: "Not a common word or pattern", test: (p: string) => p.length > 0 && !isGuessable(p) },
] as const;

export function passwordScore(p: string) {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

export function isStrongPassword(p: string) {
  return passwordProblem(p) === null;
}

const LEVELS = [
  { label: "Too weak", bar: "bg-danger-500", text: "text-danger-700" },
  { label: "Almost there", bar: "bg-warning-500", text: "text-warning-700" },
  { label: "Strong", bar: "bg-success-500", text: "text-success-700" },
];

/** Strength meter plus the rule checklist. Rules use icon + text, never colour alone. */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score]!;
  return (
    <div id={id} className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {PASSWORD_RULES.map((r, i) => (
            <span
              key={r.id}
              className={cn("h-1 flex-1 rounded-full bg-ink-200 transition-colors", password && i < score && level.bar)}
            />
          ))}
        </div>
        <span className={cn("w-24 text-right text-xs font-semibold", password ? level.text : "text-fg-subtle")}>
          {password ? level.label : "Not set"}
        </span>
      </div>
      <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={cn("flex items-center gap-1.5", ok ? "text-success-700" : "text-fg-subtle")}>
              <span
                className={cn(
                  "grid size-3.5 shrink-0 place-items-center rounded-full border",
                  ok ? "border-success-600 bg-success-600 text-white" : "border-ink-300",
                )}
                aria-hidden
              >
                {ok && <Check className="size-2.5" weight="bold" />}
              </span>
              {r.label}
              <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
