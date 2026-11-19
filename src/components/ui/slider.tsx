"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { label: string }
>(({ className, label, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-ink-200">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary-500" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={label}
      className="block size-5 rounded-full border border-line-strong bg-surface shadow-md transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-primary-500/30 focus-visible:outline-none active:scale-95"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
