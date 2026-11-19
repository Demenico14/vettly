import type { Metadata } from "next";
import { CvQueue } from "@/features/cv/cv-queue";

export const metadata: Metadata = { title: "CV processing" };

export default function CvProcessingPage() {
  return <CvQueue />;
}
