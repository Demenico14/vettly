import type { Metadata } from "next";
import { Suspense } from "react";
import { TalentPage } from "@/features/talent/talent-page";

export const metadata: Metadata = { title: "Talent pool" };

export default function Page() {
  return (
    <Suspense>
      <TalentPage />
    </Suspense>
  );
}
