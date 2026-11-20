import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPage } from "@/features/admin/admin-page";

export const metadata: Metadata = { title: "Platform admin" };

export default function Page() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
