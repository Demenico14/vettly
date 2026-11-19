"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Briefcase, CornerDownLeft, Plus, Search, UserRound } from "@/components/icons";
import { ALL_NAV_ITEMS } from "@/lib/navigation";
import { services, type SearchResult } from "@/services";
import { Kbd, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";

const group =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-fg-subtle";
const item =
  "flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-sm text-fg data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-800 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-500";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) return;
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      services.search.search(query).then((r) => {
        if (!alive) return;
        setResults(r);
        setLoading(false);
      });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const shown = query.trim() ? results : [];

  const go = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-900/50 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed inset-x-3 top-[12vh] z-50 mx-auto max-w-xl overflow-hidden rounded-xl bg-surface shadow-lg focus:outline-none data-[state=open]:animate-pop-in">
          <DialogPrimitive.Title className="sr-only">Search and commands</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search candidates and vacancies, or jump to a page.
          </DialogPrimitive.Description>
          <Command shouldFilter={false} label="Search and commands" className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4">
              {loading ? <Spinner className="size-4 text-ink-500" /> : <Search className="size-4 text-ink-500" aria-hidden />}
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search candidates, vacancies or pages…"
                className="h-13 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
              {query.trim() && !loading && (
                <Command.Empty className="px-4 py-10 text-center text-sm text-fg-muted">
                  No candidates or vacancies match “{query}”.
                </Command.Empty>
              )}
              {shown.length > 0 && (
                <Command.Group heading="Results" className={group}>
                  {shown.map((r) => (
                    <Command.Item key={r.id} value={r.id} onSelect={() => go(r.href)} className={item}>
                      {r.type === "candidate" ? <UserRound /> : <Briefcase />}
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-semibold">{r.title}</span>
                        <span className="ml-2 text-xs text-fg-subtle">{r.subtitle}</span>
                      </span>
                      <span className="text-2xs font-semibold text-fg-subtle capitalize">{r.type}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {!query.trim() && (
                <>
                  <Command.Group heading="Quick actions" className={group}>
                    <Command.Item
                      value="create-vacancy"
                      onSelect={() => {
                        onOpenChange(false);
                        toast.info("Create vacancy", "The vacancy editor is built in Module 4.");
                      }}
                      className={item}
                    >
                      <Plus />
                      Create vacancy
                    </Command.Item>
                    <Command.Item value="send-test" onSelect={() => go("/assessments")} className={item}>
                      <Plus />
                      Send psychometric test
                    </Command.Item>
                    <Command.Item value="upload-cvs" onSelect={() => go("/cv-processing")} className={item}>
                      <Plus />
                      Upload CVs
                    </Command.Item>
                  </Command.Group>
                  <Command.Group heading="Go to" className={group}>
                    {ALL_NAV_ITEMS.filter((i) => !i.roles).map((i) => (
                      <Command.Item key={i.href} value={i.href} onSelect={() => go(i.href)} className={item}>
                        <i.icon />
                        {i.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-line bg-surface-muted px-4 py-2 text-2xs text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                to open
              </span>
              <span className="ml-auto">Searches illustrative mock records</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
