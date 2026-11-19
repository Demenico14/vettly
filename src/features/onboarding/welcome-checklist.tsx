"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Check, ClipboardList, FileUp, Paintbrush, Sparkles, UserPlus, X } from "@/components/icons";
import { Button, Card, Progress, toast, Tooltip } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/layout/session-provider";
import { cn } from "@/lib/utils";
import { readFlow } from "@/features/auth/session-store";

interface Task {
  id: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  action: string;
  href?: string;
  module?: number;
}

const TASKS: Task[] = [
  {
    id: "brand",
    title: "Set up your workspace",
    body: "Branding, currency, pipeline stages and test defaults.",
    icon: <Paintbrush />,
    action: "Review settings",
    href: "/settings",
  },
  {
    id: "vacancy",
    title: "Create your first vacancy",
    body: "Write the job description and set essential and desirable requirements. Vettly scores every CV against them.",
    icon: <Briefcase />,
    action: "Create vacancy",
    module: 4,
  },
  {
    id: "cvs",
    title: "Upload CVs",
    body: "Drop in CVs you already have, PDF or Word. Vettly extracts each one into a structured profile.",
    icon: <FileUp />,
    action: "Upload CVs",
    href: "/cv-processing",
  },
  {
    id: "tests",
    title: "Choose psychometric tests",
    body: "Pick the tests shortlisted candidates should take, or keep the battery you chose during setup.",
    icon: <ClipboardList />,
    action: "Open assessments",
    href: "/assessments",
  },
  {
    id: "team",
    title: "Invite your team",
    body: "Add recruiters and hiring managers so they can review shortlists and score interviews.",
    icon: <UserPlus />,
    action: "Invite people",
    href: "/settings",
  },
];

const FLOW = [
  { label: "Vacancy", note: "Requirements and weights" },
  { label: "CVs", note: "Extracted to profiles" },
  { label: "Evidence", note: "AI suggests, HR confirms", ai: true },
  { label: "Tests", note: "Psychometric results" },
  { label: "Interview", note: "Panel scorecards" },
  { label: "Offer", note: "Hire recorded" },
];

const KEY = "vettly:onboarding-done";

export function WelcomeChecklist() {
  const router = useRouter();
  const { user, organisation } = useSession();
  const [done, setDone] = React.useState<Set<string>>(new Set(["brand"]));
  const [hidden, setHidden] = React.useState(false);
  const [flow, setFlow] = React.useState<{ org?: string; name?: string }>({});

  React.useEffect(() => {
    const f = readFlow();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a just-created organisation comes from the onboarding flow store
    setFlow({ org: f.organisationName, name: f.pendingName });
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as string[] | null;
       
      if (saved) setDone(new Set(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: Set<string>) => {
    setDone(s);
    try {
      localStorage.setItem(KEY, JSON.stringify([...s]));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    const s = new Set(done);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    persist(s);
  };

  const firstName = (flow.name ?? user?.name)?.split(" ")[0];
  const orgName = flow.org ?? organisation?.name;
  const complete = done.size;
  const pct = (complete / TASKS.length) * 100;

  return (
    <PageContainer
      header={
        <PageHeader
          title={firstName ? `Welcome to Vettly, ${firstName}` : "Welcome to Vettly"}
          description={
            orgName
              ? `${orgName} is ready. These steps get your first shortlist moving; do them in any order.`
              : "These steps get your first shortlist moving; do them in any order."
          }
          actions={
            <Button variant="secondary" onClick={() => router.push("/dashboard")}>
              Go to dashboard
              <ArrowRight />
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {hidden ? (
          <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted">Checklist hidden. You can bring it back at any time.</p>
            <Button variant="secondary" size="sm" onClick={() => setHidden(false)}>
              Show checklist
            </Button>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-48 flex-1">
                <h2 className="text-sm font-semibold text-fg">Getting started</h2>
                <p className="mt-0.5 text-xs text-fg-subtle tabular">
                  {complete} of {TASKS.length} done
                </p>
              </div>
              <div className="w-40">
                <Progress value={pct} label="Getting started progress" tone={complete === TASKS.length ? "success" : "primary"} />
              </div>
              <Tooltip content="Hide checklist">
                <Button variant="ghost" size="icon-sm" aria-label="Hide checklist" onClick={() => setHidden(true)}>
                  <X />
                </Button>
              </Tooltip>
            </div>
            <ul>
              {TASKS.map((t) => {
                const isDone = done.has(t.id);
                return (
                  <li key={t.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={`Mark “${t.title}” as ${isDone ? "not done" : "done"}`}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition-colors",
                        isDone ? "border-success-600 bg-success-600 text-white" : "border-line-strong text-transparent hover:border-primary-500",
                      )}
                    >
                      <Check className="size-3.5" weight="bold" />
                    </button>
                    <span className="hidden size-9 shrink-0 place-items-center rounded-md bg-surface-muted text-ink-600 sm:grid [&_svg]:size-4.5">
                      {t.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-semibold", isDone ? "text-fg-subtle line-through" : "text-fg")}>{t.title}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">{t.body}</p>
                    </div>
                    <Button
                      variant={isDone ? "ghost" : "secondary"}
                      size="sm"
                      className="self-start sm:self-center"
                      onClick={() => {
                        if (t.module) toast.info(t.action, `This arrives in Module ${t.module}.`);
                        else if (t.href) router.push(t.href);
                      }}
                    >
                      {isDone ? "Revisit" : t.action}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {complete === TASKS.length && (
              <div className="flex items-center justify-between gap-3 border-t border-line bg-success-50 px-5 py-3 text-sm text-success-700">
                <span className="font-semibold">All set. Your workspace is ready for its first shortlist.</span>
                <Button size="sm" variant="ghost" onClick={() => persist(new Set())}>
                  Reset
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card className="self-start">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-fg">How a vacancy moves through Vettly</h2>
          </div>
          <ol className="px-5 py-4">
            {FLOW.map((f, i) => (
              <li key={f.label} className="relative flex gap-3 pb-4 last:pb-0">
                {i < FLOW.length - 1 && <span className="absolute top-5 left-[0.4375rem] h-full w-px bg-line" aria-hidden />}
                <span
                  className={cn(
                    "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 bg-surface",
                    f.ai ? "border-accent-500" : "border-primary-500",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                    {f.label}
                    {f.ai && <Sparkles className="size-3.5 text-accent-600" aria-label="AI-assisted" />}
                  </p>
                  <p className="text-xs text-fg-subtle">{f.note}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-line px-5 py-3">
            <Link href="/design-system#badges" className="text-xs font-semibold text-primary-700 hover:underline">
              What copper and green mean
            </Link>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
