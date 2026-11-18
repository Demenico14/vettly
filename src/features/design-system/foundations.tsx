"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { DSSection, Specimen } from "./specimen";

const LOGOS = [
  { file: "vettly-logo-horizontal-light.svg", label: "Horizontal · light", bg: "bg-surface", w: "w-44" },
  { file: "vettly-logo-horizontal-dark.svg", label: "Horizontal · dark", bg: "bg-ink-900", w: "w-44" },
  { file: "vettly-logo-stacked-light.svg", label: "Stacked · light", bg: "bg-surface", w: "w-24" },
  { file: "vettly-logo-stacked-dark.svg", label: "Stacked · dark", bg: "bg-ink-900", w: "w-24" },
  { file: "vettly-symbol.svg", label: "Symbol", bg: "bg-surface", w: "w-14" },
  { file: "vettly-app-icon.svg", label: "App icon", bg: "bg-ink-100", w: "w-14" },
  { file: "vettly-logo-horizontal-mono-dark.svg", label: "Mono · ink", bg: "bg-surface", w: "w-44" },
  { file: "vettly-logo-horizontal-mono-white.svg", label: "Mono · white", bg: "bg-primary-600", w: "w-44" },
];

export function BrandSection() {
  return (
    <DSSection
      id="brand"
      title="Brand"
      description="The two-stroke V carries the brand: a wide indigo-to-violet stroke for the evidence, a slim blue-to-cyan stroke rising past it for the decision. Every lockup below is outlined vector artwork generated from one source script."
    >
      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {LOGOS.map((l) => (
          <figure key={l.file} className="flex flex-col bg-surface">
            <div className={cn("grid h-36 place-items-center", l.bg)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/brand/${l.file}`} alt={`Vettly ${l.label} logo`} className={cn("h-auto", l.w)} />
            </div>
            <figcaption className="flex items-center justify-between border-t border-line px-3.5 py-2.5">
              <span className="text-xs font-semibold text-fg">{l.label}</span>
              <a
                href={`/brand/${l.file}`}
                download
                className="inline-flex items-center gap-1 rounded-xs text-2xs font-semibold text-primary-700 hover:underline"
              >
                <Download className="size-3" aria-hidden />
                SVG
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Clear space" note="Keep a margin equal to the height of the wordmark's “V” on all sides.">
          <div className="grid place-items-center py-4">
            <div className="relative rounded-xs outline-2 outline-dashed outline-primary-300 outline-offset-[18px]">
              <Logo />
            </div>
          </div>
        </Specimen>
        <Specimen label="Minimum size" note="Horizontal 96px wide on screen. Below 24px use the app icon, never the symbol alone.">
          <div className="flex items-end justify-center gap-8 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/vettly-logo-horizontal-light.svg" alt="" className="w-24" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/favicon-32.png" alt="" className="size-8" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/favicon-16.png" alt="" className="size-4" />
          </div>
        </Specimen>
      </div>
    </DSSection>
  );
}

type Swatch = { name: string; hex: string; token: string; role: string; dark?: boolean };

const BRAND_SWATCHES: Swatch[] = [
  { name: "Primary", hex: "#6366F1", token: "primary-500", role: "Brand, selection, focus", dark: true },
  { name: "Primary 600", hex: "#4F46E5", token: "primary-600", role: "Buttons and text on white (AA)", dark: true },
  { name: "Secondary", hex: "#06B6D4", token: "secondary-500", role: "Progress, data series", dark: true },
  { name: "Accent", hex: "#8B5CF6", token: "accent-500", role: "AI suggestions only", dark: true },
  { name: "Success", hex: "#10B981", token: "success-500", role: "Hired, confirmed, complete", dark: true },
  { name: "Warning", hex: "#F59E0B", token: "warning-500", role: "Needs attention, offers" },
  { name: "Error", hex: "#EF4444", token: "danger-500", role: "Failed, rejected, destructive", dark: true },
];

const NEUTRALS: Swatch[] = [
  { name: "Neutral 900", hex: "#0F172A", token: "ink-900", role: "Text, navy shell", dark: true },
  { name: "Neutral 700", hex: "#334155", token: "ink-700", role: "Strong secondary text", dark: true },
  { name: "Neutral 500", hex: "#64748B", token: "ink-500", role: "Subtle text, icons", dark: true },
  { name: "Neutral 300", hex: "#CBD5E1", token: "ink-300", role: "Control borders" },
  { name: "Neutral 100", hex: "#F8FAFC", token: "ink-50", role: "Muted surfaces" },
];

function SwatchRow({ swatches }: { swatches: Swatch[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
      {swatches.map((s) => (
        <li key={s.token} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex h-20 items-end p-2.5" style={{ background: s.hex }}>
            <span className={cn("text-2xs font-bold", s.dark ? "text-white" : "text-ink-900")}>Aa</span>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-xs font-bold text-fg">{s.name}</p>
            <p className="mt-0.5 font-mono text-2xs text-fg-subtle">
              {s.hex} · {s.token}
            </p>
            <p className="mt-1 text-2xs text-fg-muted">{s.role}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColourSection() {
  return (
    <DSSection
      id="colour"
      title="Colour"
      description="Six brand hues and five neutrals, pinned from the brand board. Each hue has a full scale in globals.css; text-bearing fills step to 600 so white labels pass WCAG AA. Accent violet is reserved for AI-generated content so the eye learns what the machine produced."
    >
      <SwatchRow swatches={BRAND_SWATCHES} />
      <SwatchRow swatches={NEUTRALS} />
      <Specimen label="Status pairs" note="Soft background + 700 text. Status always pairs colour with an icon, dot or label.">
        <div className="flex flex-wrap gap-2">
          {(["primary", "secondary", "accent", "success", "warning", "danger"] as const).map((t) => (
            <span
              key={t}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold capitalize",
                t === "primary" && "bg-primary-50 text-primary-700",
                t === "secondary" && "bg-secondary-50 text-secondary-700",
                t === "accent" && "bg-accent-50 text-accent-700",
                t === "success" && "bg-success-50 text-success-700",
                t === "warning" && "bg-warning-50 text-warning-700",
                t === "danger" && "bg-danger-50 text-danger-700",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </Specimen>
    </DSSection>
  );
}

const TYPE_SCALE = [
  { cls: "text-3xl font-extrabold tracking-[-0.025em]", name: "Display", spec: "36 / 44 · ExtraBold", sample: "Smarter hiring, faster." },
  { cls: "text-2xl font-extrabold tracking-[-0.02em]", name: "Page title", spec: "28 / 36 · ExtraBold", sample: "Finance Manager · Bulawayo" },
  { cls: "text-xl font-extrabold tracking-[-0.015em]", name: "Section", spec: "22 / 30 · ExtraBold", sample: "Requirement assessment" },
  { cls: "text-base font-bold", name: "Panel title", spec: "16 / 24 · Bold", sample: "Upcoming interviews" },
  { cls: "text-sm", name: "Body", spec: "14 / 22 · Regular", sample: "Six years building payment systems for regional banks, most recently leading a team of four at a Harare fintech." },
  { cls: "text-sm font-semibold", name: "Label", spec: "14 / 22 · SemiBold", sample: "Essential requirements" },
  { cls: "text-xs text-fg-muted", name: "Caption", spec: "12 / 18 · Regular", sample: "Applied 3 days ago via LinkedIn" },
  { cls: "text-2xs font-semibold text-fg-subtle", name: "Micro", spec: "11 / 16 · SemiBold", sample: "Illustrative data" },
];

export function TypographySection() {
  return (
    <DSSection
      id="typography"
      title="Typography"
      description="Plus Jakarta Sans for everything: ExtraBold for titles, Bold for panel headings, Regular for reading. Numbers in tables and metrics use tabular figures so columns align."
    >
      <Specimen bodyClassName="p-0">
        <ul className="divide-y divide-line">
          {TYPE_SCALE.map((t) => (
            <li key={t.name} className="grid gap-1 px-5 py-4 md:grid-cols-[10rem_1fr] md:items-baseline md:gap-6">
              <div>
                <p className="text-xs font-bold text-fg">{t.name}</p>
                <p className="text-2xs text-fg-subtle">{t.spec}</p>
              </div>
              <p className={cn("max-w-[68ch] text-fg", t.cls)}>{t.sample}</p>
            </li>
          ))}
        </ul>
      </Specimen>
      <Specimen label="Tabular figures" note="Applied by default inside tables and metrics.">
        <div className="grid max-w-md grid-cols-2 gap-x-8 text-sm">
          <p className="text-fg-subtle">Proportional</p>
          <p className="text-fg-subtle">Tabular</p>
          <p className="[font-variant-numeric:proportional-nums]">
            111 applicants
            <br />
            480 applicants
          </p>
          <p className="tabular">
            111 applicants
            <br />
            480 applicants
          </p>
        </div>
      </Specimen>
    </DSSection>
  );
}

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
const RADII = [
  { name: "xs", px: 4, use: "Checkboxes, tags" },
  { name: "sm", px: 6, use: "Menu items" },
  { name: "md", px: 8, use: "Buttons, inputs" },
  { name: "lg", px: 12, use: "Panels, tables" },
  { name: "xl", px: 16, use: "Modals" },
  { name: "full", px: 999, use: "Badges, avatars" },
];
const SHADOWS = [
  { name: "xs", cls: "shadow-xs", use: "Controls" },
  { name: "sm", cls: "shadow-sm", use: "Raised rows" },
  { name: "md", cls: "shadow-md", use: "Hover lift" },
  { name: "lg", cls: "shadow-lg", use: "Menus, modals" },
];

export function SpacingSection() {
  return (
    <DSSection
      id="spacing"
      title="Spacing, radius & elevation"
      description="A 4px base grid. Related items sit 8–12px apart, groups 24px, sections 40px. Shadows are soft and offset; borders do most of the separating."
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <Specimen label="Spacing scale">
          <ul className="flex flex-col gap-2">
            {SPACING.map((s) => (
              <li key={s} className="flex items-center gap-3 text-xs">
                <span className="w-16 font-mono text-fg-subtle tabular">
                  {s}px · {s / 4}
                </span>
                <span className="h-2.5 rounded-xs bg-primary-400" style={{ width: s * 2 }} />
              </li>
            ))}
          </ul>
        </Specimen>
        <Specimen label="Radius">
          <ul className="grid grid-cols-3 gap-4">
            {RADII.map((r) => (
              <li key={r.name} className="flex flex-col items-center gap-2 text-center">
                <span className="size-12 border-2 border-primary-500 bg-primary-50" style={{ borderRadius: r.px }} />
                <span className="text-xs font-bold">{r.name}</span>
                <span className="text-2xs text-fg-subtle">{r.use}</span>
              </li>
            ))}
          </ul>
        </Specimen>
        <Specimen label="Elevation" bodyClassName="bg-canvas">
          <ul className="grid grid-cols-2 gap-4">
            {SHADOWS.map((s) => (
              <li key={s.name} className={cn("rounded-lg bg-surface px-3 py-4 text-center", s.cls)}>
                <p className="text-xs font-bold">shadow-{s.name}</p>
                <p className="text-2xs text-fg-subtle">{s.use}</p>
              </li>
            ))}
          </ul>
        </Specimen>
      </div>
    </DSSection>
  );
}
