import type { Metadata } from "next";
import { VacancyDetail } from "@/features/vacancies/vacancy-detail";

export const metadata: Metadata = { title: "Vacancy" };

export default async function VacancyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VacancyDetail key={id} id={id} />;
}
