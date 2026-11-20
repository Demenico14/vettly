import type { Metadata } from "next";
import { OfferDetail } from "@/features/offers/offer-detail";

export const metadata: Metadata = { title: "Offer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferDetail key={id} id={id} />;
}
