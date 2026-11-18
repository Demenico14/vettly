"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, FileUp, Menu as MenuIcon, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/feedback";
import { Drawer, Modal, ModalContent } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TooltipProvider,
} from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { findNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { NotificationsMenu } from "./notifications-menu";
import { SessionProvider, useSession } from "./session-provider";
import { MobileSidebarContent, Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

const COLLAPSE_KEY = "vettly:sidebar-collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate a per-viewer preference after mount
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage unavailable: default to expanded */
    }
  }, []);
  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }, []);
  return [collapsed, toggle] as const;
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Search and commands" },
  { keys: ["/"], label: "Focus search" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
  { keys: ["["], label: "Collapse or expand sidebar" },
  { keys: ["Esc"], label: "Close dialog or menu" },
];

function Header({
  onOpenNav,
  onOpenSearch,
  onShowShortcuts,
}: {
  onOpenNav: () => void;
  onOpenSearch: () => void;
  onShowShortcuts: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current = findNavItem(pathname);
  const { organisation, switching } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-surface/85 sm:px-6">
      <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <MenuIcon className="size-5!" />
      </Button>

      <div className="hidden min-w-32 shrink-0 flex-col leading-tight sm:flex">
        <span className={cn("truncate text-2xs font-medium text-fg-subtle", switching && "animate-pulse")}>
          {organisation?.name ?? " "}
        </span>
        <span className="truncate text-sm font-bold text-fg">{current?.label ?? "Vettly"}</span>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-9 w-full min-w-0 max-w-sm items-center gap-2.5 rounded-md border border-line bg-surface-muted px-3 text-left text-sm text-ink-500 transition-colors hover:border-line-strong hover:bg-surface sm:ml-6 md:max-w-md"
        aria-label="Search candidates, vacancies and pages"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">Search candidates, vacancies…</span>
        <span className="hidden items-center gap-0.5 md:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="md" className="hidden sm:inline-flex">
              <Plus />
              Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem onSelect={() => toast.info("Create vacancy", "The vacancy editor is built in Module 4.")}>
              <Briefcase />
              New vacancy
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/cv-processing")}>
              <FileUp />
              Upload CVs
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast.info("Add candidate", "Manual candidate entry is built in Module 5.")}>
              <UserPlus />
              Add candidate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationsMenu />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <UserMenu onShowShortcuts={onShowShortcuts} />
      </div>
    </header>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, toggleCollapsed] = useCollapsed();
  const [navOpen, setNavOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "?") {
        setShortcutsOpen(true);
      } else if (e.key === "[") {
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <Drawer open={navOpen} onOpenChange={setNavOpen} side="left" title="Navigation" hideHeader className="w-[min(17rem,85vw)] bg-shell">
        <MobileSidebarContent onNavigate={() => setNavOpen(false)} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenNav={() => setNavOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Modal open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <ModalContent size="sm" title="Keyboard shortcuts" description="Available anywhere in Vettly, except while typing in a field.">
          <ul className="divide-y divide-line">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-fg-muted">{s.label}</span>
                <span className="flex gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </ModalContent>
      </Modal>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={300}>
        <Shell>{children}</Shell>
      </TooltipProvider>
    </SessionProvider>
  );
}
