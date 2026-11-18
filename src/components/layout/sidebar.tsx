"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, type NavItem } from "@/lib/navigation";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Tooltip } from "@/components/ui/menu";
import { useSession } from "./session-provider";

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-shell-fg-muted transition-colors hover:bg-shell-raised hover:text-white focus-visible:outline-primary-400",
        active && "bg-primary-600 text-white shadow-sm hover:bg-primary-600",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon className={cn("size-4.5 shrink-0", active ? "text-white" : "text-ink-400 group-hover:text-white")} aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 text-2xs leading-4 font-bold tabular",
            active ? "bg-white/20 text-white" : "bg-shell-raised text-shell-fg",
          )}
        >
          {item.badge}
        </span>
      )}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user } = useSession();
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.roles || (user && i.roles.includes(user.role)));
        if (!items.length) return null;
        return (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-1.5 px-2.5 text-2xs font-semibold tracking-wide text-ink-500 uppercase">{group.label}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-shell-line" aria-hidden />
            )}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function PlanPanel() {
  const { organisation } = useSession();
  if (!organisation) return <div className="h-24 rounded-lg bg-shell-raised/60" />;
  const pct = (organisation.seatsUsed / organisation.seatsTotal) * 100;
  return (
    <div className="rounded-lg border border-shell-line bg-shell-raised/60 p-3.5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-white capitalize">{organisation.plan} plan</p>
        <p className="text-2xs text-shell-fg-muted tabular">
          {organisation.seatsUsed}/{organisation.seatsTotal} seats
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700" aria-hidden>
        <div className="h-full rounded-full bg-secondary-500" style={{ width: `${pct}%` }} />
      </div>
      <Link
        href="/settings"
        className="mt-3 inline-flex text-xs font-semibold text-primary-300 hover:text-white hover:underline"
      >
        Manage subscription
      </Link>
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-shell transition-[width] duration-200 ease-(--ease-out-expo) lg:flex",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "px-5")}>
        <Link href="/dashboard" aria-label="Vettly home" className="rounded-sm">
          {collapsed ? <LogoMark className="h-6" /> : <Logo onDark />}
        </Link>
      </div>
      <div className={cn("scrollbar-shell flex-1 overflow-y-auto pt-2 pb-4", collapsed ? "px-3" : "px-3")}>
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className={cn("flex flex-col gap-3 border-t border-shell-line p-3")}>
        {!collapsed && (
          <div className="[@media(max-height:820px)]:hidden">
            <PlanPanel />
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs font-medium text-shell-fg-muted hover:bg-shell-raised hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebarContent({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col bg-shell">
      <div className="flex h-16 items-center px-5">
        <Logo onDark />
      </div>
      <div className="scrollbar-shell flex-1 overflow-y-auto px-3 pt-2 pb-4">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-shell-line p-3">
        <PlanPanel />
      </div>
    </div>
  );
}
