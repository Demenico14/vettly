"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

/* ---------- Dropdown menu ---------- */

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuSub = Menu.Sub;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

const panel =
  "z-50 min-w-48 overflow-hidden rounded-lg border border-line bg-surface p-1 text-sm shadow-lg data-[state=open]:animate-pop-in";
const item =
  "relative flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-fg outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-ink-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-500";

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content sideOffset={sideOffset} align={align} className={cn(panel, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  shortcut,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Item> & { tone?: "danger"; shortcut?: string }) {
  return (
    <Menu.Item
      className={cn(item, tone === "danger" && "text-danger-700 data-highlighted:bg-danger-50 [&_svg]:text-danger-600", className)}
      {...props}
    >
      {children}
      {shortcut && <span className="ml-auto pl-4 text-xs text-fg-subtle">{shortcut}</span>}
    </Menu.Item>
  );
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(item, "pr-8", className)} {...props}>
      {children}
      <Menu.ItemIndicator className="absolute right-2.5">
        <Check className="text-primary-600!" />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof Menu.SubTrigger>) {
  return (
    <Menu.SubTrigger className={cn(item, "data-[state=open]:bg-ink-100", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </Menu.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.SubContent>) {
  return (
    <Menu.Portal>
      <Menu.SubContent sideOffset={6} className={cn(panel, className)} {...props} />
    </Menu.Portal>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Label>) {
  return <Menu.Label className={cn("px-2.5 pt-2 pb-1 text-xs font-semibold text-fg-subtle", className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="-mx-1 my-1 h-px bg-line" />;
}

/* ---------- Popover ---------- */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={12}
        className={cn("z-50 rounded-lg border border-line bg-surface shadow-lg focus:outline-none data-[state=open]:animate-pop-in", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/* ---------- Tooltip ---------- */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-64 rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
