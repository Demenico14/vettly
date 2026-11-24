"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";
import { NAV, type NavItem } from "@/lib/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/menu";
import { useSession } from "./session-provider";

const row =
  "group relative flex h-8 w-full items-center gap-2.5 rounded-sm px-2 text-sm text-shell-fg-muted transition-colors hover:bg-shell-raised hover:text-shell-fg focus-visible:outline-primary-500";

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        row,
        active &&
          "bg-shell-raised font-medium text-shell-fg before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-[#5FB08D]",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon
        weight={active ? "fill" : "regular"}
        className={cn("size-[1.05rem] shrink-0", active ? "text-[#5FB08D]" : "text-shell-fg-muted group-hover:text-shell-fg")}
        aria-hidden
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && <span className="ml-auto text-xs text-shell-fg-muted tabular">{item.badge}</span>}
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

function Utilities({ collapsed, onOpenSearch, onNavigate }: { collapsed: boolean; onOpenSearch: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = (
    <button type="button" onClick={onOpenSearch} className={cn(row, collapsed && "justify-center px-0")}>
      <Search className="size-[1.05rem] shrink-0 text-shell-fg-muted group-hover:text-shell-fg" aria-hidden />
      {!collapsed && (
        <>
          <span>Search</span>
          <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </>
      )}
      {collapsed && <span className="sr-only">Search</span>}
    </button>
  );
  const welcome = (
    <Link
      href="/welcome"
      onClick={onNavigate}
      aria-current={pathname === "/welcome" ? "page" : undefined}
      className={cn(row, pathname === "/welcome" && "bg-shell-raised font-medium text-shell-fg", collapsed && "justify-center px-0")}
    >
      <Sparkles className="size-[1.05rem] shrink-0 text-shell-fg-muted group-hover:text-shell-fg" aria-hidden />
      {collapsed ? <span className="sr-only">Getting started</span> : <span>Getting started</span>}
    </Link>
  );
  return (
    <div className="flex flex-col gap-px">
      {collapsed ? (
        <>
          <Tooltip content="Search" side="right">
            {search}
          </Tooltip>
          <Tooltip content="Getting started" side="right">
            {welcome}
          </Tooltip>
        </>
      ) : (
        <>
          {search}
          {welcome}
        </>
      )}
    </div>
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
              <p className="mb-1 px-2 text-xs font-medium text-shell-fg-muted">{group.label}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-5 bg-shell-line" aria-hidden />
            )}
            <ul className="flex flex-col gap-px">
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

function Workspace({ collapsed }: { collapsed: boolean }) {
  const { organisation } = useSession();
  return (
    <Link
      href="/dashboard"
      aria-label={`${organisation?.name ?? "Vettly"} home`}
      className={cn("flex h-9 items-center gap-2 rounded-sm px-2 hover:bg-shell-raised", collapsed && "justify-center px-0")}
    >
      <LogoMark onDark className="h-5" />
      {!collapsed && <span className="min-w-0 truncate text-sm font-semibold text-shell-fg">{organisation?.shortName ?? "Vettly"}</span>}
    </Link>
  );
}

function PlanLine() {
  const { organisation } = useSession();
  if (!organisation) return null;
  return (
    <Link href="/settings" className="flex items-center justify-between rounded-sm px-2 py-1.5 text-xs text-shell-fg-muted hover:bg-shell-raised">
      <span className="capitalize">{organisation.plan} plan</span>
      <span className="tabular">
        {organisation.seatsUsed} of {organisation.seatsTotal} seats
      </span>
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, onOpenSearch }: { collapsed: boolean; onToggle: () => void; onOpenSearch: () => void }) {
  return (
    <aside
      className={cn(
        "material-sidebar shell-ink sticky top-0 hidden h-dvh shrink-0 flex-col transition-[width] duration-200 ease-(--ease-out-expo) lg:flex",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div className="flex flex-col gap-3 px-2 pt-3">
        <Workspace collapsed={collapsed} />
        <Utilities collapsed={collapsed} onOpenSearch={onOpenSearch} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pt-5 pb-4">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="flex flex-col gap-px px-2 pb-3">
        {!collapsed && <PlanLine />}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(row, "text-xs", collapsed && "justify-center px-0")}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Collapse sidebar"}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebarContent({ onNavigate, onOpenSearch }: { onNavigate: () => void; onOpenSearch: () => void }) {
  return (
    <div className="shell-ink flex h-full flex-col bg-shell">
      <div className="flex flex-col gap-3 px-2 pt-3">
        <Workspace collapsed={false} />
        <Utilities
          collapsed={false}
          onNavigate={onNavigate}
          onOpenSearch={() => {
            onNavigate();
            onOpenSearch();
          }}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pt-5 pb-4">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <div className="px-2 pb-3">
        <PlanLine />
      </div>
    </div>
  );
}
