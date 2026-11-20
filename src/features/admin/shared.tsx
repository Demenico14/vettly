"use client";

import * as React from "react";
import { Badge, Button, Field, Modal, ModalClose, ModalContent, Textarea } from "@/components/ui";
import type { ServiceStatus, TenantStatus } from "@/types/platform";
import { MOCK_NOW } from "@/services";

export const NOW = new Date(MOCK_NOW).getTime();
export const usd = (n: number) => `US$${n.toLocaleString("en-GB")}`;
export const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" });
export const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - NOW) / 86400000);

const TENANT: Record<TenantStatus, { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-success-500" },
  trial: { label: "Trial", dot: "bg-secondary-500" },
  past_due: { label: "Payment overdue", dot: "bg-warning-500" },
  suspended: { label: "Suspended", dot: "bg-danger-500" },
};
export function TenantBadge({ status }: { status: TenantStatus }) {
  return (
    <Badge tone="status" size="sm" dot dotClassName={TENANT[status].dot}>
      {TENANT[status].label}
    </Badge>
  );
}

export const SERVICE: Record<ServiceStatus, { label: string; dot: string; bar: string }> = {
  operational: { label: "Operational", dot: "bg-success-500", bar: "bg-success-500" },
  degraded: { label: "Degraded", dot: "bg-warning-500", bar: "bg-warning-500" },
  outage: { label: "Outage", dot: "bg-danger-500", bar: "bg-danger-500" },
  maintenance: { label: "Maintenance", dot: "bg-secondary-500", bar: "bg-secondary-300" },
};

/** Every platform change asks why, and the answer goes in the audit log. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "primary",
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  children?: React.ReactNode;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal open={open} onOpenChange={(o) => (onOpenChange(o), !o && (setReason(""), setError(null)))}>
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
              variant={tone === "danger" ? "danger" : "primary"}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onConfirm(reason);
                  setReason("");
                  onOpenChange(false);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {children}
          <Field label="Reason" hint="Recorded in the platform audit log with your name." error={error ?? undefined}>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer asked by email, ticket 4512" autoFocus />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}
