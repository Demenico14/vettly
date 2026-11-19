import type { Metadata } from "next";
import { VacancyList } from "@/features/vacancies/vacancy-list";

export const metadata: Metadata = { title: "Vacancies" };

export default function VacanciesPage() {
  return <VacancyList />;
}
