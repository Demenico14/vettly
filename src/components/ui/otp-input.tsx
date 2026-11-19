"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Six separate digit boxes that behave like one field: typing advances, Backspace goes back,
 * pasting a full code fills every box, and arrow keys move between boxes.
 * The value is position-preserving: an empty box is a space, so "12 4" keeps 4 in the fourth box.
 * Use `isCompleteCode()` to check for a full code.
 */
export const isCompleteCode = (v: string, length = 6) => new RegExp(`^\\d{${length}}$`).test(v);

export function OtpInput({
  value,
  onChange,
  length = 6,
  invalid,
  disabled,
  autoFocus,
  label = "Verification code",
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  onComplete?: (v: string) => void;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  // Latest value, updated synchronously in handlers so fast typing never reads a stale render.
  const current = React.useRef(value);
  React.useEffect(() => {
    current.current = value;
  }, [value]);
  const digits = Array.from({ length }, (_, i) => (value[i] ?? "").trim());

  const commit = (next: string) => {
    const v = next.replace(/\s+$/, "");
    current.current = v;
    onChange(v);
    if (isCompleteCode(v, length)) onComplete?.(v);
  };

  const setAt = (i: number, d: string) => {
    if (i < 0 || i >= length) return;
    const arr = current.current.padEnd(length, " ").split("");
    arr[i] = d || " ";
    commit(arr.join(""));
  };

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  // When the parent clears a rejected code and re-enables the field, put the caret back in the first box.
  const wasDisabled = React.useRef(disabled);
  React.useEffect(() => {
    if (wasDisabled.current && !disabled && !value) refs.current[0]?.focus();
    wasDisabled.current = disabled;
  }, [disabled, value]);

  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (!v) return;
            // Typing over a filled box: keep only the new digit.
            if (d && v.length === 2) {
              setAt(i, v.startsWith(d) ? v[1]! : v[0]!);
              focus(i + 1);
              return;
            }
            // SMS autofill or paste lands the whole code in one box.
            if (v.length > 1) {
              const pasted = v.slice(0, length);
              commit(pasted);
              focus(pasted.length);
              return;
            }
            setAt(i, v);
            focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (d) setAt(i, "");
              else {
                setAt(i - 1, "");
                focus(i - 1);
              }
            } else if (e.key === "ArrowLeft") focus(i - 1);
            else if (e.key === "ArrowRight") focus(i + 1);
          }}
          onPaste={(e) => {
            const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (!v) return;
            e.preventDefault();
            commit(v);
            focus(v.length);
          }}
          className={cn(
            "h-12 w-11 rounded-md border border-line-strong bg-surface text-center text-xl font-semibold text-fg tabular shadow-xs transition-[border-color,box-shadow] focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-500/20 disabled:bg-ink-50 sm:w-12",
            invalid && "border-danger-500 focus-visible:ring-danger-500/20",
          )}
        />
      ))}
    </div>
  );
}
