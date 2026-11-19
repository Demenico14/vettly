import * as React from "react";
import { FileDoc, FileImage, FilePdf } from "@/components/icons";
import { Badge, type BadgeProps } from "@/components/ui";
import type { CvExtraction, CvFile, CvFileStatus, CvFormat } from "@/types";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["tone"]>;

/** Copper (accent) marks what Vettly read but no one has checked yet; green means a person added it. */
export const CV_STATUS: Record<CvFileStatus, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "neutral" },
  uploading: { label: "Uploading", tone: "secondary" },
  extracting: { label: "Reading", tone: "secondary" },
  ready: { label: "Ready to add", tone: "primary" },
  needs_review: { label: "Needs review", tone: "accent" },
  failed: { label: "Couldn't read", tone: "danger" },
  added: { label: "Added", tone: "success" },
  discarded: { label: "Discarded", tone: "neutral" },
};

export const IN_PROGRESS: CvFileStatus[] = ["queued", "uploading", "extracting"];

export function CvStatusBadge({ status, size = "sm" }: { status: CvFileStatus; size?: BadgeProps["size"] }) {
  const m = CV_STATUS[status];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}

const FORMAT_STYLE: Record<CvFormat, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  PDF: { icon: FilePdf, className: "bg-danger-50 text-danger-600" },
  Word: { icon: FileDoc, className: "bg-secondary-50 text-secondary-600" },
  Image: { icon: FileImage, className: "bg-ink-100 text-ink-600" },
};

export function FileIcon({ format, className }: { format: CvFormat; className?: string }) {
  const s = FORMAT_STYLE[format];
  const Icon = s.icon;
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", s.className, className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  );
}

/** Every value Vettly marked as unsure, with a label for each. */
export function flagsOf(x: CvExtraction | undefined) {
  if (!x) return [];
  const scalar = (["name", "email", "phone", "location", "headline", "currentEmployer", "availability"] as const)
    .filter((k) => x[k].flag)
    .map((k) => ({ key: k, label: FIELD_LABEL[k], flag: x[k].flag! }));
  const exp = x.experience.filter((e) => e.flag).map((e) => ({ key: e.id, label: `${e.title} at ${e.company}`, flag: e.flag! }));
  const edu = x.education.filter((e) => e.flag).map((e) => ({ key: e.id, label: `${e.qualification} ${e.field}`, flag: e.flag! }));
  return [...scalar, ...exp, ...edu];
}

export const FIELD_LABEL = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  headline: "Headline",
  currentEmployer: "Current employer",
  availability: "Availability",
} as const;

export const sizeLabel = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

export function personLine(f: CvFile) {
  return f.extraction?.name.value || f.name;
}
