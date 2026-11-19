import type { Metadata } from "next";
import { WelcomeChecklist } from "@/features/onboarding/welcome-checklist";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return <WelcomeChecklist />;
}
