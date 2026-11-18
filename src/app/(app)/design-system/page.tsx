import type { Metadata } from "next";
import { DesignSystemView } from "@/features/design-system/design-system-view";

export const metadata: Metadata = { title: "Design system" };

export default function DesignSystemPage() {
  return <DesignSystemView />;
}
