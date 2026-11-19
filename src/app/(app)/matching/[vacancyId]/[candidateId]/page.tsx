import type { Metadata } from "next";
import { MatchDetail } from "@/features/matching/match-detail";

export const metadata: Metadata = { title: "Assessment" };

export default async function AssessmentPage({ params }: { params: Promise<{ vacancyId: string; candidateId: string }> }) {
  const { vacancyId, candidateId } = await params;
  return <MatchDetail key={`${vacancyId}:${candidateId}`} vacancyId={vacancyId} candidateId={candidateId} />;
}
