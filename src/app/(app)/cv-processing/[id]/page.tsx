import type { Metadata } from "next";
import { CvReview } from "@/features/cv/cv-review";

export const metadata: Metadata = { title: "Review CV" };

export default async function CvReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CvReview key={id} id={id} />;
}
