import type { Metadata } from "next";
import { VacancyEditor } from "@/features/vacancies/vacancy-editor";

export const metadata: Metadata = { title: "New vacancy" };

export default function NewVacancyPage() {
  return <VacancyEditor />;
}
