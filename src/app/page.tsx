import { redirect } from "next/navigation";

// Phase 1 has no real session, so the root opens sign-in. Module 3 adds the dashboard behind it.
export default function Home() {
  redirect("/login");
}
