import type { Metadata } from "next";
import { Pricing } from "@/features/marketing/pricing";
import { TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "Vettly · Pricing" },
  description: `Vettly plans differ by seats, test credits and CVs read; every plan includes everything. Start with ${TRIAL_DAYS} days free, no card needed.`,
};

/** Public pricing, for visitors and signed-in people alike. */
export default function PricingPage() {
  return <Pricing />;
}
