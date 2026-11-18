import { redirect } from "next/navigation";

// Module 1: the design system is the only finished screen. Module 3 points this at /dashboard.
export default function Home() {
  redirect("/design-system");
}
