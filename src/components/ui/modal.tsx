"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

export function ModalContent({
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-900/50 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[calc(100dvh-1.5rem)] flex-col rounded-xl bg-surface shadow-lg focus:outline-none data-[state=open]:animate-pop-in sm:inset-x-6 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-bold text-fg">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm text-fg-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mt-1 -mr-2">
              <X />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children && <div className="overflow-y-auto px-6 pb-5">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Confirmation dialog for destructive or irreversible actions. */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              variant={tone}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </Modal>
  );
}

/** Slide-over panel for detail views and secondary forms. Also used for mobile navigation. */
export function Drawer({
  open,
  onOpenChange,
  side = "right",
  title,
  children,
  className,
  hideHeader,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  side?: "left" | "right";
  title: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-900/50 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 z-50 flex h-dvh w-[min(22rem,88vw)] flex-col bg-surface shadow-lg focus:outline-none",
            side === "left" ? "left-0 data-[state=open]:animate-slide-in-left" : "right-0 data-[state=open]:animate-fade-in",
            className,
          )}
        >
          {hideHeader ? (
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          ) : (
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close">
                  <X />
                </Button>
              </DialogPrimitive.Close>
            </div>
          )}
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
