import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfferEditor } from "@/features/offers/offer-editor";

export const metadata: Metadata = { title: "New offer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ candidate?: string; vacancy?: string }> }) {
  const { candidate = "", vacancy = "" } = await searchParams;
  // An offer is for one candidate and vacancy; without them, choose them first.
  if (!candidate || !vacancy) redirect("/offers?new=1");
  return <OfferEditor key={`${candidate}:${vacancy}`} mode="new" candidateId={candidate} vacancyId={vacancy} />;
}
