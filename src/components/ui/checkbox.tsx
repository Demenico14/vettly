"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as RadioPrimitive from "@radix-ui/react-radio-group";
import { Check, Minus } from "@/components/icons";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer grid size-4 shrink-0 place-items-center rounded-xs border border-ink-400 bg-surface shadow-xs transition-colors hover:border-primary-500 aria-invalid:border-danger-500 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 data-[state=indeterminate]:border-primary-600 data-[state=indeterminate]:bg-primary-600 text-white",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      {props.checked === "indeterminate" ? (
        <Minus className="size-3" weight="bold" aria-hidden />
      ) : (
        <Check className="size-3" weight="bold" aria-hidden />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export function CheckboxField({
  label,
  description,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = React.useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="flex cursor-pointer flex-col text-sm text-fg">
        <span className="font-medium">{label}</span>
        {description && <span className="text-xs text-fg-subtle">{description}</span>}
      </label>
    </div>
  );
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent bg-ink-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-600",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-(--ease-out-expo) data-[state=checked]:translate-x-4" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export function SwitchField({
  label,
  description,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = React.useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className="flex cursor-pointer flex-col text-sm text-fg">
        <span className="font-medium">{label}</span>
        {description && <span className="text-xs text-fg-subtle">{description}</span>}
      </label>
      <Switch id={id} {...props} />
    </div>
  );
}

export function RadioGroup({
  options,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioPrimitive.Root> & {
  options: { value: string; label: string; description?: string }[];
}) {
  const base = React.useId();
  return (
    <RadioPrimitive.Root className={cn("flex flex-col gap-2.5", className)} {...props}>
      {options.map((o) => {
        const id = `${base}-${o.value}`;
        return (
          <div key={o.value} className="flex items-start gap-2.5">
            <RadioPrimitive.Item
              id={id}
              value={o.value}
              className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-ink-400 bg-surface shadow-xs hover:border-primary-500 data-[state=checked]:border-primary-600"
            >
              <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary-600" />
            </RadioPrimitive.Item>
            <label htmlFor={id} className="flex cursor-pointer flex-col text-sm">
              <span className="font-medium text-fg">{o.label}</span>
              {o.description && <span className="text-xs text-fg-subtle">{o.description}</span>}
            </label>
          </div>
        );
      })}
    </RadioPrimitive.Root>
  );
}
