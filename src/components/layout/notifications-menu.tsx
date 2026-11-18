"use client";

import * as React from "react";
import { Bell, BellOff, CalendarCheck, FileStack, FileSignature, AtSign, Inbox, Info } from "lucide-react";
import { services, MOCK_NOW } from "@/services";
import type { AppNotification, NotificationKind } from "@/types";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/tabs";

const KIND_ICON: Record<NotificationKind, { Icon: typeof Bell; cls: string }> = {
  application: { Icon: Inbox, cls: "bg-primary-50 text-primary-600" },
  processing: { Icon: FileStack, cls: "bg-secondary-50 text-secondary-700" },
  interview: { Icon: CalendarCheck, cls: "bg-accent-50 text-accent-600" },
  offer: { Icon: FileSignature, cls: "bg-success-50 text-success-600" },
  mention: { Icon: AtSign, cls: "bg-warning-50 text-warning-700" },
  system: { Icon: Info, cls: "bg-ink-100 text-ink-600" },
};

export function NotificationsMenu() {
  const [items, setItems] = React.useState<AppNotification[] | null>(null);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  React.useEffect(() => {
    services.notifications.list().then(setItems);
  }, []);

  const unread = items?.filter((n) => !n.read).length ?? 0;
  const shown = items?.filter((n) => filter === "all" || !n.read) ?? [];

  const markRead = (id: string) => {
    services.notifications.markRead(id);
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null);
  };
  const markAll = () => {
    services.notifications.markAllRead();
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative">
          <Bell className="size-[1.125rem]!" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[0.625rem] leading-4 font-bold text-white ring-2 ring-surface tabular">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold">Notifications</h2>
          <Segmented
            label="Filter notifications"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: `Unread${unread ? ` (${unread})` : ""}` },
            ]}
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!items ? (
            <div className="flex flex-col gap-4 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState icon={<BellOff />} title="You're all caught up" description="New applications, interviews and processing updates appear here." />
          ) : (
            <ul>
              {shown.map((n) => {
                const { Icon, cls } = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className={cn(
                        "flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-ink-50",
                        !n.read && "bg-primary-50/40",
                      )}
                    >
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", cls)}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("text-sm text-fg", !n.read ? "font-bold" : "font-medium")}>{n.title}</span>
                          <span className="shrink-0 text-2xs text-fg-subtle">{timeAgo(n.createdAt, new Date(MOCK_NOW))}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-fg-muted">{n.body}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-500" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
          <Button variant="link" size="sm" disabled={!unread} onClick={markAll}>
            Mark all as read
          </Button>
          <span className="text-2xs text-fg-subtle">Illustrative notifications</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
