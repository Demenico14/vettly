import type { Metadata } from "next";
import { CandidateAccess } from "@/features/candidate-access/candidate-access";

export const metadata: Metadata = { title: "Your assessments", robots: { index: false, follow: false } };

export default async function CandidateTestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CandidateAccess key={token} token={token} />;
}
