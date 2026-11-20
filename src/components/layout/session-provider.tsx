"use client";

import * as React from "react";
import { services } from "@/services";
import { setCurrentUserId } from "@/lib/current-user";
import type { Organisation, User } from "@/types";

interface SessionContextValue {
  user: User | null;
  organisation: Organisation | null;
  organisations: Organisation[];
  switching: boolean;
  switchOrganisation: (id: string) => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [organisation, setOrganisation] = React.useState<Organisation | null>(null);
  const [organisations, setOrganisations] = React.useState<Organisation[]>([]);
  const [switching, setSwitching] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    Promise.all([
      services.session.getCurrentUser(),
      services.session.getActiveOrganisation(),
      services.session.getOrganisations(),
    ]).then(([u, o, os]) => {
      if (!alive) return;
      setCurrentUserId(u.id);
      setUser(u);
      setOrganisation(o);
      setOrganisations(os);
    });
    return () => {
      alive = false;
    };
  }, []);

  const switchOrganisation = React.useCallback(async (id: string) => {
    setSwitching(true);
    try {
      setOrganisation(await services.session.switchOrganisation(id));
    } finally {
      setSwitching(false);
    }
  }, []);


  const value = React.useMemo(
    () => ({ user, organisation, organisations, switching, switchOrganisation }),
    [user, organisation, organisations, switching, switchOrganisation],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export const ROLE_LABEL: Record<User["role"], string> = {
  super_admin: "Super administrator",
  org_admin: "Organisation admin",
  hr_manager: "HR manager",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
};
