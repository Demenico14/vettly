"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, CircleHelp, Eye, Keyboard, LogOut, Settings, UserRound, Sparkles } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/feedback";
import { ConfirmModal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { services } from "@/services";
import { ROLE_LABEL, useSession } from "./session-provider";

export function UserMenu({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { user, organisation, organisations, switchOrganisation, previewAs, previewUsers } = useSession();
  const router = useRouter();
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

  if (!user || !organisation) {
    return (
      <div className="flex items-center gap-2.5 px-1">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="hidden h-3 w-24 md:block" />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-md py-1 pr-1.5 pl-1 text-left hover:bg-ink-100 data-[state=open]:bg-ink-100"
            aria-label={`Account menu for ${user.name}`}
          >
            <Avatar name={user.name} size="sm" status="online" />
            <span className="hidden flex-col leading-tight md:flex">
              <span className="text-sm font-semibold text-fg">{user.name}</span>
              <span className="text-2xs text-fg-subtle">{user.title}</span>
            </span>
            <ChevronDown className="hidden size-4 text-ink-500 md:block" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-(--radix-dropdown-menu-content-available-height) w-72 overflow-y-auto">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-xs text-fg-subtle">{user.email}</p>
              <p className="mt-0.5 text-2xs font-semibold text-primary-700">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden />
            Organisation
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={organisation.id}
            onValueChange={async (id) => {
              if (id === organisation.id) return;
              const next = organisations.find((o) => o.id === id);
              await switchOrganisation(id);
              toast.success("Organisation switched", `You are now working in ${next?.name}.`);
            }}
          >
            {organisations.map((o) => (
              <DropdownMenuRadioItem key={o.id} value={o.id}>
                <span className="flex flex-col">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-2xs text-fg-subtle">
                    {o.city} · {o.industry}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <UserRound />
            My profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <Settings />
            Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/welcome")}>
            <Sparkles />
            Getting started
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShowShortcuts} shortcut="?">
            <Keyboard />
            Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast.info("Help centre", "The help centre arrives with backend integration.")}>
            <CircleHelp />
            Help & support
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden />
            Preview as · prototype only
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={user.id}
            onValueChange={(id) => {
              previewAs(id);
              const u = previewUsers.find((x) => x.id === id);
              toast.info(`Previewing as ${u?.name}`, u ? ROLE_LABEL[u.role] : undefined);
            }}
          >
            {previewUsers.map((u) => (
              <DropdownMenuRadioItem key={u.id} value={u.id}>
                <span className="flex flex-col">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-2xs text-fg-subtle">{ROLE_LABEL[u.role]}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger" onSelect={() => setConfirmSignOut(true)}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmModal
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out of Vettly?"
        description="Unsaved changes on this page will be lost."
        confirmLabel="Sign out"
        onConfirm={async () => {
          await services.session.signOut();
          toast.success("Signed out");
          router.push("/login");
        }}
      />
    </>
  );
}
