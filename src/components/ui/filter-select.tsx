"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./menu";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filter button with a checkable list (Notion-style). Shows the chosen values on the button;
 * long lists get a search box.
 */
export function FilterSelect({
  label,
  options,
  value,
  onChange,
  searchable,
}: {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const shown = options.filter((o) => !query || o.label.toLowerCase().includes(query.toLowerCase()));
  const active = value.length > 0;
  const summary = active
    ? value.length === 1
      ? options.find((o) => o.value === value[0])?.label
      : `${value.length} selected`
    : null;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover onOpenChange={(o) => !o && setQuery("")}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "pressable inline-flex h-8 max-w-full shrink-0 pointer-coarse:h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            active ? "border-primary-500/40 bg-primary-50 text-primary-800" : "border-line-strong bg-surface text-fg-muted hover:border-ink-400 hover:text-fg",
          )}
        >
          <span className="max-w-44 truncate">
            {label}
            {summary && <span className="font-semibold">: {summary}</span>}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {searchable && (
          <div className="flex items-center gap-2 border-b border-line px-2.5 pb-1.5">
            <Search className="size-3.5 text-ink-500" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              aria-label={`Search ${label.toLowerCase()}`}
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
            />
          </div>
        )}
        <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-64 overflow-y-auto py-1">
          {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-subtle">No matches</li>}
          {shown.map((o) => {
            const on = value.includes(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className="flex h-8 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-sm text-fg hover:bg-ink-100"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-xs border",
                      on ? "border-primary-600 bg-primary-600 text-white" : "border-ink-400",
                    )}
                  >
                    {on && <Check className="size-3" weight="bold" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs text-fg-subtle tabular">{o.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {active && (
          <div className="border-t border-line p-1">
            <button type="button" onClick={() => onChange([])} className="h-8 w-full rounded-sm px-2.5 text-left text-xs font-semibold text-fg-muted hover:bg-ink-100 hover:text-fg">
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
