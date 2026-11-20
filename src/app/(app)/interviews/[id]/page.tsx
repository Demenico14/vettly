import type { Metadata } from "next";
import { InterviewDetail } from "@/features/interviews/interview-detail";

export const metadata: Metadata = { title: "Interview" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewDetail key={id} id={id} />;
}
