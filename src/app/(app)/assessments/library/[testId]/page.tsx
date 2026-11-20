import type { Metadata } from "next";
import { TestDetail } from "@/features/assessments/test-detail";

export const metadata: Metadata = { title: "Test" };

export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <TestDetail key={testId} id={testId} />;
}
