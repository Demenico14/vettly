import Link from "next/link";
import { ArrowRight, Check } from "@/components/icons";
import { INCLUDED, PLANS, TRIAL_DAYS, TRIAL_PLAN } from "@/lib/plans";
import { DISPLAY, Footer, INK, PILL, SiteHeader } from "./site-chrome";

/**
 * The public pricing page. Plans, prices and limits come from src/lib/plans.ts, the same catalogue Settings → Plan
 * and billing shows, so the two never disagree. Plans differ by size; every plan includes everything.
 */

const TONE: Record<(typeof PLANS)[number]["id"], { card: string; muted: string; tick: string; button: string }> = {
  starter: {
    card: "bg-[#ECE9E1] text-ink-900",
    muted: "text-ink-600",
    tick: "text-primary-600",
    button: "bg-ink-900 text-white hover:bg-ink-800 focus-visible:outline-ink-900",
  },
  growth: { card: "bg-primary-600 text-white", muted: "text-white/75", tick: "text-white", button: "bg-white text-ink-900 hover:bg-ink-100 focus-visible:outline-white" },
  enterprise: {
    card: "bg-[#1B2420] text-white ring-1 ring-white/10",
    muted: "text-white/65",
    tick: "text-[#5FB08D]",
    button: "bg-white text-ink-900 hover:bg-ink-100 focus-visible:outline-white",
  },
};

const QUESTIONS = [
  {
    q: "How does the free trial work?",
    a: `Your organisation starts on the ${PLANS.find((p) => p.id === TRIAL_PLAN)?.name} plan for ${TRIAL_DAYS} days, with everything included. No card is needed to start.`,
  },
  {
    q: "How do we pay?",
    a: "Paid plans are invoiced in US dollars and paid by bank transfer. Starter is billed monthly; Growth and Enterprise are billed yearly.",
  },
  {
    q: "What counts as a seat?",
    a: "Each active person in your organisation, and each invitation that hasn't been accepted yet. Candidates never need an account, so they don't use seats.",
  },
  {
    q: "What is a test credit?",
    a: "One credit is one candidate taking one psychometric test. Credits are counted over your plan year.",
  },
  {
    q: "Can we change plan later?",
    a: "Yes. Your organisation admin can see your usage against your plan at any time in Settings, under Plan and billing, and Vettly moves you to another plan at their request.",
  },
];

export function Pricing() {
  return (
    <div className="bg-canvas text-fg">
      <main id="main">
        <section className="relative overflow-hidden pb-24 text-white lg:pb-32" style={{ background: INK }}>
          <SiteHeader />
          <div className="px-5 pt-16 text-center sm:px-8 lg:pt-24">
            <h1 className={`${DISPLAY} text-[clamp(3rem,8vw,7rem)] leading-[0.98]`}>
              Plans that grow <span className="text-white/45">with your hiring.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[56ch] text-lg text-white/70">
              Every plan includes everything Vettly does. Plans differ by seats, test credits and CVs read. Start with {TRIAL_DAYS} days free, no card needed.
            </p>
          </div>

          <ul className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-3 px-4 sm:px-8 lg:mt-20 lg:grid-cols-3">
            {PLANS.map((p) => {
              const t = TONE[p.id];
              const trial = p.id === TRIAL_PLAN;
              return (
                <li
                  key={p.id}
                  className={`relative flex flex-col rounded-[1.75rem] p-7 sm:p-9 ${t.card} ${trial ? "lg:-translate-y-4 lg:shadow-[0_30px_60px_rgba(0,0,0,0.35)]" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-[-0.02em]">{p.name}</h2>
                    {trial && <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold">Your free trial</span>}
                  </div>
                  <p className={`mt-2 max-w-[34ch] text-sm leading-relaxed ${t.muted}`}>{p.forWho}</p>
                  <p className={`${DISPLAY} mt-10 text-[clamp(2.25rem,3.6vw,3rem)] leading-none`}>{p.price}</p>
                  <p className={`mt-2 text-sm ${t.muted}`}>{p.billing}</p>
                  <ul className="mt-8 flex flex-col gap-3 border-t border-current/15 pt-6">
                    {p.points.map((x) => (
                      <li key={x} className="flex items-start gap-2.5 text-base">
                        <Check className={`mt-1 size-4 shrink-0 ${t.tick}`} aria-hidden />
                        {x}
                      </li>
                    ))}
                    <li className="flex items-start gap-2.5 text-base">
                      <Check className={`mt-1 size-4 shrink-0 ${t.tick}`} aria-hidden />
                      Everything Vettly does
                    </li>
                  </ul>
                  <Link href="/register" className={`${PILL} mt-10 self-start ${t.button}`}>
                    Start free trial
                    <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mx-auto mt-8 max-w-7xl px-5 text-sm text-white/55 sm:px-8">
            Prices in US dollars. Every organisation starts on the free trial and chooses a plan after.
          </p>
        </section>

        {/* Everything, in every plan: ruled like the front page's light sections. */}
        <section className="overflow-hidden rounded-t-[2rem] bg-canvas sm:rounded-t-[2.75rem] -mt-8 relative">
          <div className="relative mx-auto w-[calc(100%-1.5rem)] max-w-7xl border-x border-line sm:w-[calc(100%-3rem)]">
            <div className="grid grid-cols-1 gap-10 px-5 pt-24 pb-14 sm:px-10 lg:grid-cols-2 lg:px-16 lg:pt-32">
              <h2 className={`${DISPLAY} text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] text-ink-900`}>
                Everything, <span className="text-ink-500">in every plan.</span>
              </h2>
              <p className="max-w-[46ch] self-end text-lg leading-relaxed text-ink-700">
                No features held back for bigger plans. A five-seat team screens, tests, interviews and hires with the same tools as a group with fifty.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-px border-t border-line bg-line md:grid-cols-2">
              {INCLUDED.map((x) => (
                <li key={x} className="flex items-start gap-3 bg-canvas px-5 py-5 text-base text-ink-900 sm:px-10 lg:px-16">
                  <Check className="mt-1 size-4 shrink-0 text-primary-600" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 gap-10 px-5 pt-24 pb-28 sm:px-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-16 lg:pt-32">
              <h2 className={`${DISPLAY} text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] text-ink-900`}>Questions</h2>
              <div className="divide-y divide-line border-y border-line">
                {QUESTIONS.map(({ q, a }) => (
                  <details key={q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                      {q}
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700 transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-ink-700">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
