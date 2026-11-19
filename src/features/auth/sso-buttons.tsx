"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GoogleLogo, WindowsLogo } from "@/components/icons";
import { Button, toast } from "@/components/ui";
import { services } from "@/services";
import { routeAfterSignIn } from "./session-store";

/** Single sign-on options. Simulated in Phase 1; real OAuth arrives with backend integration. */
export function SsoButtons({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"google" | "microsoft" | null>(null);

  const go = async (provider: "google" | "microsoft") => {
    setBusy(provider);
    try {
      const session = await services.auth.signInWithProvider(provider);
      toast.success("Signed in (simulated)", `${provider === "google" ? "Google" : "Microsoft"} single sign-on`);
      router.push(routeAfterSignIn(session));
    } catch {
      toast.error("Single sign-on failed", "Try again, or sign in with your email and password.");
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Button variant="secondary" size="lg" loading={busy === "google"} disabled={disabled || !!busy} onClick={() => go("google")}>
        {busy !== "google" && <GoogleLogo weight="bold" />}
        Google
      </Button>
      <Button variant="secondary" size="lg" loading={busy === "microsoft"} disabled={disabled || !!busy} onClick={() => go("microsoft")}>
        {busy !== "microsoft" && <WindowsLogo weight="fill" />}
        Microsoft
      </Button>
    </div>
  );
}
