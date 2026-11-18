"use client";

import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";
import { ALL_NAV_ITEMS } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";

/** Shown for routes whose module has not been built yet, so navigation works end to end. */
export function ModulePlaceholder({ href }: { href: string }) {
  const item = ALL_NAV_ITEMS.find((i) => i.href === href)!;
  return (
    <PageContainer>
      <PageHeader title={item.label} description={item.description} meta={<Badge tone="outline">Module {item.module}</Badge>} />
      <div className="grid min-h-[22rem] place-items-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <div className="flex max-w-md flex-col items-center">
          <div className="mb-4 grid size-11 place-items-center rounded-lg bg-primary-50 text-primary-600">
            <Hammer className="size-5" aria-hidden />
          </div>
          <h2 className="text-base font-bold">Not built yet</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {item.label} is scheduled for Module {item.module}. The shell, navigation and components it will use are
            ready in the design system.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/design-system">
              Open design system
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
