import type { Metadata } from "next";
import { Suspense } from "react";
import { PipelineBoard } from "@/features/pipeline/pipeline-board";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <Suspense>
      <PipelineBoard />
    </Suspense>
  );
}
