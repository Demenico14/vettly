import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchingOverview } from "@/features/matching/matching-overview";

export const metadata: Metadata = { title: "Matching" };

export default function MatchingPage() {
  return (
    <Suspense>
      <MatchingOverview />
    </Suspense>
  );
}
