"use client";

import * as React from "react";
import { X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

/**
 * The one bulk-action bar: dark, floating at the bottom of the screen while anything is selected,
 * so its actions stay in reach however far down a long list or board you are.
 */
export function BulkBar({ label, onClear, clearLabel = "Clear selection", children, className }: { label: React.ReactNode; onClear: () => void; clearLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pointer-events-none sticky bottom-4 z-30 mt-4 flex justify-center", className)}>
      <div role="region" aria-label="Bulk actions" className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl bg-ink-900 py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg animate-pop-in">
        <span className="mr-1 font-semibold tabular">{label}</span>
        <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
        {children}
        <Button size="sm" variant="ghost" className="text-ink-300 hover:bg-ink-800 hover:text-white" onClick={onClear} aria-label={clearLabel}>
          <X />
        </Button>
      </div>
    </div>
  );
}

/** A button inside BulkBar. `primary` marks the main action; `danger` marks a destructive one. */
export function BulkAction({ primary, danger, className, ...props }: ButtonProps & { primary?: boolean; danger?: boolean }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn(
        "text-white hover:bg-ink-800 hover:text-white",
        primary && "bg-white text-ink-900 hover:bg-ink-100 hover:text-ink-900",
        danger && "text-danger-100 hover:bg-danger-700/40 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
