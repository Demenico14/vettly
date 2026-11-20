import type { Metadata } from "next";
import { InvitationTracker } from "@/features/assessments/invitation-tracker";

export const metadata: Metadata = { title: "Assessments" };

export default function AssessmentsPage() {
  return <InvitationTracker />;
}
