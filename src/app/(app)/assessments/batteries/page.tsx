import type { Metadata } from "next";
import { BatteriesPage } from "@/features/assessments/batteries-page";

export const metadata: Metadata = { title: "Test batteries" };

export default function Page() {
  return <BatteriesPage />;
}
