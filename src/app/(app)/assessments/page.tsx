import type { Metadata } from "next";
import { InvitationTracker } from "@/features/assessments/invitation-tracker";

export const metadata: Metadata = { title: "Tests" };

export default function AssessmentsPage() {
  return <InvitationTracker />;
}
