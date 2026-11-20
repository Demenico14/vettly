import type { Metadata } from "next";
import { CollectionDetail } from "@/features/talent/collection-detail";

export const metadata: Metadata = { title: "Collection" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionDetail id={id} />;
}
