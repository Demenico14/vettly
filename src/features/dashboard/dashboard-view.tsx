"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Briefcase, CalendarPlus, ChevronDown, ClipboardList, FileUp, RefreshCw } from "@/components/icons";
import {
  Alert,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Segmented,
} from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/layout/session-provider";
import { MOCK_NOW, services } from "@/services";
import { PERIOD_LABEL } from "@/lib/dashboard";
import type { DashboardPeriod, DashboardSnapshot, FunnelStep } from "@/types";
import { Funnel, KpiStrip } from "./kpi-funnel";
import { ActivityPanel, ApplicationsPanel, AttentionPanel, InterviewsPanel, TestsPanel, VacanciesPanel } from "./panels";


function greeting(iso: string) {
  const h = new Date(iso).getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useSession();

  const periodParam = params.get("period") as DashboardPeriod | null;
  const period: DashboardPeriod = periodParam && periodParam in PERIOD_LABEL ? periodParam : "30d";

  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reload, setReload] = React.useState(0);

  const [vacancyId, setVacancyId] = React.useState("all");
  const [funnel, setFunnel] = React.useState<FunnelStep[] | null>(null);
  const [funnelError, setFunnelError] = React.useState<string | null>(null);
  const [funnelLoading, setFunnelLoading] = React.useState(true);
  const [funnelReload, setFunnelReload] = React.useState(0);

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while the new period is fetched
    setLoading(true);
    setError(null);
    services.dashboard
      .getSnapshot(period)
      .then((s) => alive && setSnapshot(s))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period, reload]);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while the funnel refetches
    setFunnelLoading(true);
    setFunnelError(null);
    services.dashboard
      .getFunnel(period, vacancyId)
      .then((f) => alive && setFunnel(f))
      .catch((e: Error) => alive && setFunnelError(e.message))
      .finally(() => alive && setFunnelLoading(false));
    return () => {
      alive = false;
    };
  }, [period, vacancyId, funnelReload]);

  const first = user?.name.split(" ")[0];
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(MOCK_NOW));
  const show = error ? null : snapshot;
  const busy = loading && !error;

  const actions = {
    vacancy: () => router.push("/vacancies/new"),
    upload: () => router.push("/cv-processing"),
    tests: () => router.push("/assessments"),
    interview: () => router.push("/interviews"),
  };

  return (
    <PageContainer
      header={
        <PageHeader
          title={first ? `${greeting(MOCK_NOW)}, ${first}` : "Dashboard"}
          description={`${today}. Your recruitment at a glance.`}
          meta={
            <>
              <Segmented
                label="Period"
                value={period}
                onChange={(v) => setParam("period", v, "30d")}
                options={(Object.keys(PERIOD_LABEL) as DashboardPeriod[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
              />
            </>
          }
          actions={
            <>
              <div className="hidden items-center gap-1 xl:flex">
                <Button variant="ghost" onClick={actions.upload}>
                  <FileUp />
                  Upload CVs
                </Button>
                <Button variant="ghost" onClick={actions.tests}>
                  <ClipboardList />
                  Send tests
                </Button>
                <Button variant="ghost" onClick={actions.interview}>
                  <CalendarPlus />
                  Schedule interview
                </Button>
              </div>
              <Button onClick={actions.vacancy}>
                <Briefcase />
                New vacancy
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="xl:hidden">
                    More actions
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={actions.upload}>
                    <FileUp />
                    Upload CVs
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={actions.tests}>
                    <ClipboardList />
                    Send psychometric tests
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={actions.interview}>
                    <CalendarPlus />
                    Schedule interview
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        {error && (
          <Alert
            tone="danger"
            title="The dashboard could not be loaded"
            action={
              <Button size="sm" variant="secondary" onClick={() => setReload((r) => r + 1)}>
                <RefreshCw />
                Try again
              </Button>
            }
          >
            {error} Check your connection, then try again. Nothing has been changed.
          </Alert>
        )}

        {!error && (
          <>
            <KpiStrip kpis={show?.kpis} period={period} loading={busy} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <Funnel
                steps={funnel ?? undefined}
                loading={funnelLoading}
                error={funnelError ?? undefined}
                onRetry={() => setFunnelReload((r) => r + 1)}
                vacancyId={vacancyId}
                onVacancyChange={setVacancyId}
                vacancies={show?.vacancies ?? []}
              />
              <AttentionPanel items={show?.attention} loading={busy} />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <VacanciesPanel vacancies={show?.vacancies} loading={busy} />
              <InterviewsPanel interviews={show?.interviews} loading={busy} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              <TestsPanel tests={show?.tests} loading={busy} />
              <ApplicationsPanel applications={show?.applications} loading={busy} />
              <div className="lg:col-span-2 2xl:col-span-1">
                <ActivityPanel events={show?.activity} loading={busy} />
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
