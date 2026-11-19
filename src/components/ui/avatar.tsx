import * as React from "react";
import { cn, hashString, initials } from "@/lib/utils";

const TINTS = [
  "bg-primary-100 text-primary-800",
  "bg-secondary-100 text-secondary-700",
  "bg-primary-50 text-primary-700",
  "bg-success-100 text-success-700",
  "bg-warning-100 text-warning-700",
  "bg-ink-200 text-ink-800",
];

const SIZES = {
  xs: "size-6 text-2xs",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const;

export interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
  /** Online / availability indicator. */
  status?: "online" | "away" | "offline";
}

export function Avatar({ name, src, size = "md", className, status }: AvatarProps) {
  const tint = TINTS[hashString(name) % TINTS.length];
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={cn("rounded-full object-cover", SIZES[size])} />
      ) : (
        <span
          className={cn("grid place-items-center rounded-full font-bold tracking-tight select-none", SIZES[size], tint)}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      <span className="sr-only">{name}</span>
      {status && (
        <span
          className={cn(
            "absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-surface",
            status === "online" && "bg-success-500",
            status === "away" && "bg-warning-500",
            status === "offline" && "bg-ink-400",
          )}
          aria-label={status}
        />
      )}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = "sm" }: { names: string[]; max?: number; size?: AvatarProps["size"] }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} size={size} className="rounded-full ring-2 ring-surface" />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "grid place-items-center rounded-full bg-ink-100 font-semibold text-ink-700 ring-2 ring-surface",
            SIZES[size ?? "sm"],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
