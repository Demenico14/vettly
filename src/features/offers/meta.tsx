import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui";
import type { Band } from "@/services";
import type { Offer, OfferStatus, OfferTerms } from "@/types/offers";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["tone"]>;

export const OFFER_STATUS: Record<OfferStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_approval: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Approved", tone: "primary" },
  sent: { label: "Sent", tone: "secondary" },
  viewed: { label: "Opened", tone: "secondary" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  countered: { label: "Counter-offer", tone: "accent" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
};

export function OfferBadge({ offer, size = "sm" }: { offer: Pick<Offer, "status" | "hiredAt">; size?: BadgeProps["size"] }) {
  if (offer.hiredAt)
    return (
      <Badge tone="success" size={size} dot>
        Hired
      </Badge>
    );
  const m = OFFER_STATUS[offer.status];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}

export const money = (currency: string, n: number) => `${currency} ${Math.round(n).toLocaleString("en-ZA").replace(/ /g, " ")}`;
export const totalPay = (t: Pick<OfferTerms, "baseSalary" | "allowances">) => t.baseSalary + t.allowances.reduce((s, a) => s + (a.amount || 0), 0);
export const shortDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00+02:00` : iso));

/** Where base pay sits in the vacancy's salary band. */
export function BandBar({ band, value, className }: { band: Band; value: number; className?: string }) {
  if (band.min === null || band.max === null) return <p className={cn("text-xs text-fg-subtle", className)}>No salary band set for this vacancy.</p>;
  const lo = band.min * 0.8;
  const hi = band.max * 1.2;
  const pos = (x: number) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className={className}>
      <div className="relative h-2 rounded-full bg-ink-100" role="img" aria-label={`${money(band.currency, value)}: ${band.position} the band of ${money(band.currency, band.min)} to ${money(band.currency, band.max)}`}>
        <span className="absolute inset-y-0 rounded-full bg-primary-100" style={{ left: pos(band.min), right: `calc(100% - ${pos(band.max)})` }} />
        <span className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow-sm", band.position === "within" ? "bg-primary-600" : band.position === "above" ? "bg-warning-500" : "bg-secondary-500")} style={{ left: pos(value) }} />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-fg-subtle tabular">
        <span>{money(band.currency, band.min)}</span>
        <span>{band.compaRatio !== null ? `${band.compaRatio}% of midpoint` : ""}</span>
        <span>{money(band.currency, band.max)}</span>
      </div>
    </div>
  );
}
