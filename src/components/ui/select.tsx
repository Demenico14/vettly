"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlBase } from "./input";
import { useField } from "./field";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ options, placeholder = "Select…", className, size = "md", onValueChange, ...props }, ref) => {
    const field = useField();
    const { value, defaultValue, disabled, name, ...rest } = props;
    const aria = {
      ...rest,
      id: rest.id ?? field?.id,
      "aria-invalid": rest["aria-invalid"] ?? (field?.invalid || undefined),
      "aria-describedby": rest["aria-describedby"] ?? field?.describedBy,
    };
    return (
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          {...aria}
          className={cn(
            controlBase,
            "flex items-center justify-between gap-2 px-3 text-left data-placeholder:text-ink-500",
            size === "sm" ? "h-8 text-xs" : "h-9",
            className,
          )}
        >
          <span className="truncate">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-ink-500" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-line bg-surface shadow-lg data-[state=open]:animate-pop-in"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  disabled={o.disabled}
                  className="relative flex cursor-pointer select-none items-start gap-2 rounded-sm py-2 pl-8 pr-3 text-sm text-fg outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-primary-50 data-highlighted:text-primary-800"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2.5 top-2.5">
                    <Check className="size-3.5 text-primary-600" aria-hidden />
                  </SelectPrimitive.ItemIndicator>
                  <div className="flex flex-col">
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    {o.description && <span className="text-xs text-fg-subtle">{o.description}</span>}
                  </div>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);
Select.displayName = "Select";
