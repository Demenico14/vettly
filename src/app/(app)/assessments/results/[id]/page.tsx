import type { Metadata } from "next";
import { ResultsReport } from "@/features/assessments/results-report";

export const metadata: Metadata = { title: "Assessment results" };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsReport key={id} id={id} />;
}
