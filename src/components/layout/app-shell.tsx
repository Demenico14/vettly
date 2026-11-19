"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, FileUp, Menu as MenuIcon, Plus, Search, UserPlus, ClipboardList } from "@/components/icons";
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
    <header className="material-bar sticky top-0 z-30 flex h-12 items-center gap-2 px-3 shadow-[0_1px_0_0_rgb(27_36_32/0.06)] sm:px-5">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenNav} aria-label="Open navigation">
        <MenuIcon className="size-5!" />
      </Button>

      <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center gap-1.5 text-sm", switching && "animate-pulse")}>
        <span className="hidden truncate text-fg-subtle sm:inline">{organisation?.shortName ?? "\u00a0"}</span>
        <span className="hidden text-ink-300 sm:inline" aria-hidden>
          /
        </span>
        <span className="truncate font-medium text-fg">{current?.label ?? "Vettly"}</span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onOpenSearch} aria-label="Search">
          <Search className="size-[1.05rem]!" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="hidden text-fg sm:inline-flex">
              <Plus />
              New
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
            <DropdownMenuItem onSelect={() => router.push("/assessments")}>
              <ClipboardList />
              Send psychometric test
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toast.info("Add candidate", "Manual candidate entry is built in Module 5.")}>
              <UserPlus />
              Add candidate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationsMenu />
        
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
    <div className="flex min-h-dvh" style={{ ["--sidebar-w" as string]: collapsed ? "3.5rem" : "15rem" }}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} onOpenSearch={() => setSearchOpen(true)} />
      <Drawer open={navOpen} onOpenChange={setNavOpen} side="left" title="Navigation" hideHeader className="w-[min(17rem,85vw)] bg-shell">
        <MobileSidebarContent onNavigate={() => setNavOpen(false)} onOpenSearch={() => setSearchOpen(true)} />
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
