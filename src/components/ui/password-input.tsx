"use client";

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

export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (p: string) => p.length >= 10 },
  { id: "case", label: "Upper and lower case letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "number", label: "At least one number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "At least one symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordScore(p: string) {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

export function isStrongPassword(p: string) {
  return passwordScore(p) === PASSWORD_RULES.length;
}

const LEVELS = [
  { label: "Too weak", bar: "bg-danger-500", text: "text-danger-700" },
  { label: "Too weak", bar: "bg-danger-500", text: "text-danger-700" },
  { label: "Weak", bar: "bg-warning-500", text: "text-warning-700" },
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
