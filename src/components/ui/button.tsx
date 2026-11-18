import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white shadow-xs hover:bg-primary-700 active:bg-primary-800",
        secondary:
          "border border-line-strong bg-surface text-fg shadow-xs hover:border-ink-400 hover:bg-ink-50 active:bg-ink-100",
        soft: "bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200",
        ghost: "text-fg-muted hover:bg-ink-100 hover:text-fg active:bg-ink-200",
        success: "bg-success-600 text-white shadow-xs hover:bg-success-700",
        warning: "bg-warning-500 text-ink-900 shadow-xs hover:bg-warning-600",
        danger: "bg-danger-600 text-white shadow-xs hover:bg-danger-700",
        "danger-ghost": "text-danger-600 hover:bg-danger-50 hover:text-danger-700",
        link: "h-auto px-0 text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Spinner className="size-4" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
