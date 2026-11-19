import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_NAV_ITEMS } from "@/lib/navigation";
import { ModulePlaceholder } from "@/features/shell/module-placeholder";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_NAV_ITEMS.filter((i) => !i.built).map((i) => ({ section: i.href.slice(1) }));
}

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: ALL_NAV_ITEMS.find((i) => i.href === `/${section}`)?.label };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  const item = ALL_NAV_ITEMS.find((i) => i.href === `/${section}` && !i.built);
  if (!item) notFound();
  return <ModulePlaceholder href={item.href} />;
}
