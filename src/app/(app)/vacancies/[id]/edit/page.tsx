import type { Metadata } from "next";
import { VacancyEditor } from "@/features/vacancies/vacancy-editor";

export const metadata: Metadata = { title: "Edit vacancy" };

export default async function EditVacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VacancyEditor key={id} id={id} />;
}
