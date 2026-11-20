import type { Metadata } from "next";
import { OfferEditor } from "@/features/offers/offer-editor";

export const metadata: Metadata = { title: "New offer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ candidate?: string; vacancy?: string }> }) {
  const { candidate = "", vacancy = "" } = await searchParams;
  return <OfferEditor key={`${candidate}:${vacancy}`} mode="new" candidateId={candidate} vacancyId={vacancy} />;
}
