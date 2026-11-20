"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useField } from "./field";
import { controlBase } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./menu";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  /** Options with the same group are listed together, in the order groups first appear. */
  group?: string;
}

/**
 * A single-choice picker you can type into. Use it instead of Select when the list can run to dozens
 * or hundreds of options, such as candidates or vacancies.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Choose…",
  searchPlaceholder = "Type to search",
  empty = "Nothing matches",
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  empty?: string;
  disabled?: boolean;
  className?: string;
}) {
  const field = useField();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  const groups = [...new Set(options.map((o) => o.group ?? ""))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={field?.id}
          aria-describedby={field?.describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(controlBase, "flex h-9 items-center justify-between gap-2 px-3 text-left", !selected && "text-ink-500", className)}
        >
          <span className="min-w-0 truncate">
            {selected ? selected.label : placeholder}
            {selected?.description && <span className="ml-1.5 text-xs text-fg-subtle">{selected.description}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-ink-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <Command loop>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 shrink-0 text-ink-500" aria-hidden />
            <Command.Input placeholder={searchPlaceholder} className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-ink-500 sm:text-sm" />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-fg-subtle">{empty}</Command.Empty>
            {groups.map((g) => (
              <Command.Group key={g || "all"} heading={g || undefined} className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-fg-subtle">
                {options
                  .filter((o) => (o.group ?? "") === g)
                  .map((o) => (
                    <Command.Item
                      key={o.value}
                      value={`${o.label} ${o.description ?? ""} ${o.value}`}
                      onSelect={() => {
                        onValueChange(o.value);
                        setOpen(false);
                      }}
                      className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-fg data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-900"
                    >
                      <Check className={cn("size-4 shrink-0 text-primary-600", o.value !== value && "invisible")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{o.label}</span>
                        {o.description && <span className="block truncate text-xs text-fg-subtle">{o.description}</span>}
                      </span>
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
