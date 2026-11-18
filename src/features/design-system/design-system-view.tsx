"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { BrandSection, ColourSection, SpacingSection, TypographySection } from "./foundations";
import { AvatarsCardsSection, BadgesSection, ButtonsSection } from "./components-demo";
import { FormsSection } from "./form-demo";
import { TableSection } from "./table-demo";
import { FeedbackSection, OverlaysSection } from "./overlays-demo";

const TOC = [
  { id: "brand", label: "Brand" },
  { id: "colour", label: "Colour" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing & elevation" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Form controls" },
  { id: "badges", label: "Badges & assessment" },
  { id: "cards", label: "Avatars & panels" },
  { id: "tables", label: "Tables" },
  { id: "overlays", label: "Overlays" },
  { id: "feedback", label: "Feedback & states" },
];

function useActiveSection() {
  const [active, setActive] = React.useState(TOC[0]!.id);
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        let current = TOC[0]!.id;
        for (const t of TOC) {
          const el = document.getElementById(t.id);
          if (el && el.getBoundingClientRect().top <= 140) current = t.id;
        }
        setActive(atBottom ? TOC[TOC.length - 1]!.id : current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, []);
  return active;
}

export function DesignSystemView() {
  const active = useActiveSection();
  return (
    <PageContainer>
      <PageHeader
        title="Design system"
        description="Brand, tokens and the component library every Vettly module is built from. Everything on this page is interactive and uses illustrative mock data."
        meta={
          <>
            <Badge tone="primary">v1.0 · Module 1</Badge>
            <Badge tone="outline">Plus Jakarta Sans</Badge>
            <Badge tone="outline">WCAG 2.2 AA</Badge>
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <a href="/brand/vettly-logo-horizontal-light.svg" download>
              <Download />
              Download logo
            </a>
          </Button>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Design system sections" className="hidden xl:block">
          <ul className="sticky top-24 flex flex-col border-l border-line">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  aria-current={active === t.id ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-fg-subtle transition-colors hover:text-fg",
                    active === t.id && "border-primary-600 font-semibold text-fg",
                  )}
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <BrandSection />
          <ColourSection />
          <TypographySection />
          <SpacingSection />
          <ButtonsSection />
          <FormsSection />
          <BadgesSection />
          <AvatarsCardsSection />
          <TableSection />
          <OverlaysSection />
          <FeedbackSection />
        </div>
      </div>
    </PageContainer>
  );
}
