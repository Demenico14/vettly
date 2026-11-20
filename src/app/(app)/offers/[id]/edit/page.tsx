import type { Metadata } from "next";
import { OfferEditor } from "@/features/offers/offer-editor";

export const metadata: Metadata = { title: "Edit offer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferEditor key={id} mode="edit" offerId={id} />;
}
