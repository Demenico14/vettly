import type { Metadata } from "next";
import { ScorecardForm } from "@/features/interviews/scorecard-form";

export const metadata: Metadata = { title: "Scorecard" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScorecardForm key={id} id={id} />;
}
