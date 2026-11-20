import type { Metadata } from "next";
import { TestLibrary } from "@/features/assessments/test-library";

export const metadata: Metadata = { title: "Test library" };

export default function TestLibraryPage() {
  return <TestLibrary />;
}
