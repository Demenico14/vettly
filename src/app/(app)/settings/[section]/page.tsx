import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettingsPage } from "@/features/settings/settings-page";
import { SECTIONS, type SectionId } from "@/features/settings/sections";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: `${SECTIONS.find((s) => s.id === section)?.label ?? "Settings"} · Settings` };
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.some((s) => s.id === section)) notFound();
  return <SettingsPage section={section as SectionId} />;
}
