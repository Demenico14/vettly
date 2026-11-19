"use client";

import * as React from "react";
import { CircleAlert } from "@/components/icons";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  id: string;
  hintId: string;
  errorId: string;
  invalid: boolean;
  describedBy?: string;
}
const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useField() {
  return React.useContext(FieldContext);
}

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  /** The control. Receives id / aria-describedby / aria-invalid automatically when it is a single element. */
  children: React.ReactElement<Record<string, unknown>>;
  /** Extra content at the right of the label row, such as a "Forgot password?" link. */
  action?: React.ReactNode;
}

export function Field({ label, hint, error, required, optional, className, children, action }: FieldProps) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const control = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  });
  return (
    <FieldContext.Provider value={{ id, hintId, errorId, invalid: !!error, describedBy }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm font-semibold text-fg">
            {label}
            {required && (
              <span className="ml-0.5 text-danger-600" aria-hidden>
                *
              </span>
            )}
            {optional && <span className="ml-1.5 text-xs font-medium text-fg-subtle">Optional</span>}
          </label>
          {action}
        </div>
        {control}
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-danger-700" role="alert">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
