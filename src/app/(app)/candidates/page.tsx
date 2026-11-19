import type { Metadata } from "next";
import { CandidateDirectory } from "@/features/candidates/candidate-directory";

export const metadata: Metadata = { title: "Candidates" };

export default function CandidatesPage() {
  return <CandidateDirectory />;
}
