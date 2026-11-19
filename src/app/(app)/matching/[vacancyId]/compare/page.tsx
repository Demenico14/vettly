import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchCompare } from "@/features/matching/match-compare";

export const metadata: Metadata = { title: "Compare candidates" };

export default async function ComparePage({ params }: { params: Promise<{ vacancyId: string }> }) {
  const { vacancyId } = await params;
  return (
    <Suspense>
      <MatchCompare vacancyId={vacancyId} />
    </Suspense>
  );
}
