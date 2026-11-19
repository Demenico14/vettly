import type { Metadata } from "next";
import { CandidateProfileView } from "@/features/candidates/candidate-profile";

export const metadata: Metadata = { title: "Candidate" };

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CandidateProfileView key={id} id={id} />;
}
