"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "@/components/icons";

/** Mount once in the root layout. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      offset={64}
      gap={8}
      visibleToasts={4}
      icons={{
        success: <CircleCheck className="size-4.5 text-success-600" />,
        error: <CircleAlert className="size-4.5 text-danger-600" />,
        warning: <TriangleAlert className="size-4.5 text-warning-600" />,
        info: <Info className="size-4.5 text-primary-600" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-line bg-surface p-3.5 pr-4 text-sm shadow-lg",
          title: "font-semibold text-fg",
          description: "mt-0.5 text-xs text-fg-muted",
          icon: "mt-0.5",
          actionButton:
            "ml-auto shrink-0 self-center rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100",
          cancelButton: "shrink-0 self-center text-xs font-semibold text-fg-subtle hover:text-fg",
        },
      }}
    />
  );
}

/** App-wide toast API. Wraps sonner so the implementation can change without touching call sites. */
export const toast = {
  success: (title: string, description?: string) => sonnerToast.success(title, { description }),
  error: (title: string, description?: string) => sonnerToast.error(title, { description }),
  warning: (title: string, description?: string) => sonnerToast.warning(title, { description }),
  info: (title: string, description?: string) => sonnerToast.info(title, { description }),
  withUndo: (title: string, onUndo: () => void, description?: string) =>
    sonnerToast.success(title, { description, action: { label: "Undo", onClick: onUndo } }),
  promise: sonnerToast.promise,
};
