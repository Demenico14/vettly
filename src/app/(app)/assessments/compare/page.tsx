import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsCompare } from "@/features/assessments/results-compare";

export const metadata: Metadata = { title: "Compare results" };

export default function CompareResultsPage() {
  return (
    <Suspense>
      <ResultsCompare />
    </Suspense>
  );
}
