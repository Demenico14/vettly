import * as React from "react";
import { cn } from "@/lib/utils";

export const controlBase =
  "w-full rounded-md border border-line-strong bg-surface text-sm text-fg shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-ink-500 hover:border-ink-400 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-fg-subtle aria-invalid:border-danger-500 aria-invalid:focus-visible:ring-danger-500/20";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered inside the leading edge. */
  leading?: React.ReactNode;
  /** Content rendered inside the trailing edge (icon, unit, button). */
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leading, trailing, type = "text", ...props }, ref) => {
    if (!leading && !trailing) {
      return <input ref={ref} type={type} className={cn(controlBase, "h-9 px-3", className)} {...props} />;
    }
    return (
      <div className="relative flex items-center">
        {leading && (
          <span className="pointer-events-none absolute left-3 flex text-ink-500 [&_svg]:size-4">{leading}</span>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(controlBase, "h-9 px-3", leading && "pl-9", trailing && "pr-10", className)}
          {...props}
        />
        {trailing && <span className="absolute right-2 flex items-center text-ink-500 [&_svg]:size-4">{trailing}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(controlBase, "min-h-20 resize-y px-3 py-2 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";
