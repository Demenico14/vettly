import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignSystemView } from "@/features/design-system/design-system-view";

export const metadata: Metadata = { title: "Design system" };

/** A developer reference built on sample content, so it is only served in development. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystemView />;
}
