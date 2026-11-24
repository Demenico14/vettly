import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "@/components/icons";
import { Logo } from "@/components/brand/logo";
import { IntroLoader } from "./intro-loader";
import { ScrollMotion } from "./scroll-motion";

/**
 * The public front page. Every claim here is something Vettly does today; the requirement check is labelled as a
 * sample. Granite & Msasa: Public Sans, bush green for actions, msasa copper only where AI hasn't been reviewed.
 */

const STEPS = [
  {
    name: "CVs in",
    line: "Upload PDFs and Word files in bulk. Vettly reads each one into a profile you check before it counts.",
  },
  {
    name: "Screening",
    line: "Every candidate is checked against your requirements, with the CV line behind each answer.",
  },
  {
    name: "Shortlisted",
    line: "Move people on with a reason that's kept. Tests can go out the moment you shortlist.",
  },
  {
    name: "Tests",
    line: "Psychometric tests candidates take on their phone, with consent and adjustments built in.",
  },
  {
    name: "Interviews",
    line: "Structured questions per requirement, and scorecards panellists fill in on their own.",
  },
  {
    name: "Offer",
    line: "Offer letters on your letterhead, approved in order, sent as a PDF.",
  },
  {
    name: "Hired",
    line: "One record from first CV to signed offer, ready for an audit.",
  },
];

const SAMPLE = [
  {
    requirement: "Chartered Accountant (ICAZ or ACCA)",
    outcome: "Met",
    quote: "ACCA, Association of Chartered Certified Accountants, 2018",
    state: "confirmed" as const,
  },
  {
    requirement: "IFRS group reporting",
    outcome: "Partly",
    quote: "Prepared monthly IFRS management accounts for three business units",
    state: "suggested" as const,
  },
  {
    requirement: "Sage Evolution or a similar ERP",
    outcome: "No evidence",
    quote: null,
    state: "suggested" as const,
  },
];

const PRIVACY = [
  ["AI on your own server", "Vettly's AI can run on your own server, so CVs never go to an outside AI service."],
  ["Consent first", "People join your talent pool only when they say yes, and they're asked to renew."],
  ["Deleted on schedule", "Unsuccessful applicants are archived, then deleted when your retention period ends."],
  ["Requests in hand", "Record access, correction and deletion requests, and answer them within 30 days."],
];

/** What Vettly recognises on a CV, as listed in "Made for hiring in Southern Africa". */
const READS = ["University of Zimbabwe", "NUST", "Midlands State University", "Wits", "UCT", "ICAZ", "CIPS", "IPMZ", "USD", "ZiG", "+263"];

/** The page's ruled frame: two hairlines down the content edges, inset from the screen on small widths. */
const FRAME = "relative mx-auto w-[calc(100%-1.5rem)] max-w-7xl border-x sm:w-[calc(100%-3rem)]";
const H2 = "text-[clamp(2rem,3.8vw,3.25rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance";

export function Landing() {
  return (
    <div className="bg-canvas text-fg">
      <IntroLoader />
      <ScrollMotion />
      {/* The header and hero pin once fully seen; "How it works" then slides up over them as a sheet. */}
      <main id="main">
        <div data-pin className="relative origin-top bg-canvas md:sticky">
          <header role="banner" className="border-b border-line">
            <div className={`${FRAME} flex h-16 items-center justify-between border-line px-4 sm:px-6`}>
              <Link href="/" aria-label="Vettly home" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
                <Logo />
              </Link>
              <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
                <a href="#how" className="hidden rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:inline-block">
                  How it works
                </a>
                <a href="#privacy" className="hidden rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg md:inline-block">
                  Privacy
                </a>
                <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-fg hover:bg-ink-100">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="pressable hidden rounded-md bg-primary-600 px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-primary-700 sm:inline-block"
                >
                  Start free trial
                </Link>
              </nav>
            </div>
          </header>

          {/* Hero: the promise on the left, the brand on its black canvas on the right. */}
          <section className={`${FRAME} border-line`}>
            <Crosses />
            <div className="grid grid-cols-1 items-stretch gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-12 lg:pt-14 lg:pb-16">
              <div className="flex flex-col justify-center lg:pl-4">
                <h1 className="max-w-[12ch] text-[clamp(2.75rem,6vw,4.75rem)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-ink-900">
                  Shortlists you can defend.
                </h1>
                <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-fg-muted">
                  Vettly reads every CV against your vacancy&apos;s requirements, quotes the line that proves each one, and leaves the decision with your team.
                </p>
                <p className="mt-7 max-w-[52ch] rounded-lg border border-line bg-surface px-4 py-3.5 text-md leading-relaxed text-fg">
                  <span className="font-bold">Real talk:</span> a match score on its own can&apos;t tell you why someone made the shortlist. Vettly shows you the line on
                  the CV behind every requirement, and flags what&apos;s missing so you can ask.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/register"
                    className="pressable group inline-flex h-12 items-center gap-2 rounded-md bg-primary-600 px-5 text-base font-semibold text-white shadow-xs hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                  >
                    Start free trial
                    <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <Link href="/login" className="inline-flex h-12 items-center rounded-md px-4 text-base font-semibold text-primary-700 hover:bg-primary-50">
                    Sign in
                  </Link>
                </div>
                <p className="mt-4 text-sm text-fg-subtle">30 days free. No card needed to start.</p>
              </div>

              <BrandCanvas />
            </div>
          </section>
          <div data-dim aria-hidden className="pointer-events-none absolute inset-0 bg-ink-900 opacity-0" />
        </div>

        <div className="relative z-10">
          {/* How it works: the same seven steps the app shows on every vacancy, in ruled cells. */}
          <section id="how" data-sheet className="overflow-hidden rounded-t-[2rem] bg-surface shadow-[0_-20px_48px_rgba(16,24,20,0.12)] sm:rounded-t-[2.5rem]">
            <div className={`${FRAME} border-line`}>
              <div className="px-5 pt-20 pb-14 sm:px-8 lg:pt-28 lg:pb-16">
                <h2 className={`${H2} max-w-[18ch]`}>
                  <span className="text-ink-900">From a pile of CVs</span> <span className="text-ink-500">to a signed offer.</span>
                </h2>
                <p className="mt-5 max-w-[56ch] text-lg text-fg-muted">
                  One path, the same on every vacancy and every candidate, so everyone knows where things stand and what comes next.
                </p>
              </div>
              <div className="relative border-t border-line">
                <Crosses />
                <ol className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-7">
                  {STEPS.map((s, i) => (
                    <li key={s.name} className="flex flex-col bg-surface p-5 sm:last:col-span-2 lg:min-h-64 lg:p-6 lg:last:col-span-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-fg-subtle tabular-nums">
                        <span aria-hidden className={`size-1.5 rounded-full ${i === 0 ? "bg-primary-600" : "bg-ink-300"}`} />
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-6 text-lg font-bold tracking-[-0.01em] text-ink-900 lg:mt-auto">{s.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.line}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <div className="bg-canvas">
            {/* Evidence, not verdicts: what a requirement check looks like. */}
            <section className="border-t border-line">
              <div className={`${FRAME} border-line`}>
                <Crosses />
                <div className="grid grid-cols-1 gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-28">
                  <div>
                    <h2 data-fill className={`${H2} max-w-[14ch] text-ink-900`}>
                      {"Every match shows its working.".split(" ").map((w, i) => (
                        <Fragment key={i}>
                          <span data-word className="inline-block">
                            {w}
                          </span>{" "}
                        </Fragment>
                      ))}
                    </h2>
                    <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-fg-muted">
                      Vettly checks each requirement on its own and quotes the CV. What it suggests stays copper until someone on your team confirms it; then it turns
                      green. Nothing is decided for you.
                    </p>
                    <dl className="mt-8 flex flex-col gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 items-center rounded-full border border-dashed border-accent-500 px-2.5 text-xs font-semibold text-accent-700">
                          Suggested by Vettly
                        </span>
                        <dd className="text-fg-muted">AI output nobody has checked yet</dd>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-50 px-2.5 text-xs font-semibold text-success-700">
                          <CircleCheck weight="fill" className="size-3.5" aria-hidden />
                          Confirmed by HR
                        </span>
                        <dd className="text-fg-muted">A person reviewed it and agreed</dd>
                      </div>
                    </dl>
                  </div>
                  <SampleCheck />
                </div>
              </div>
            </section>

            {/* Privacy: only what Vettly does, in ruled cells. */}
            <section id="privacy" className="border-t border-line bg-surface">
              <div className={`${FRAME} border-line`}>
                <Crosses />
                <div className="px-5 pt-20 pb-14 sm:px-8 lg:pt-28 lg:pb-16">
                  <h2 className={`${H2} max-w-[16ch]`}>
                    <span className="text-ink-900">Your candidates&apos; data</span> <span className="text-ink-500">stays yours.</span>
                  </h2>
                </div>
                <div className="relative border-t border-line">
                  <Crosses />
                  <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-2 lg:grid-cols-4">
                    {PRIVACY.map(([title, body]) => (
                      <div key={title} className="bg-surface p-5 sm:p-8 lg:min-h-56">
                        <h3 className="text-lg font-bold tracking-[-0.01em] text-ink-900">{title}</h3>
                        <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-fg-muted">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Local by default, with the names Vettly reads running underneath. */}
            <section className="border-t border-line">
              <div className={`${FRAME} border-line`}>
                <Crosses />
                <div className="grid grid-cols-1 gap-6 px-5 pt-20 pb-14 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:pt-28 lg:pb-16">
                  <h2 className={`${H2} max-w-[14ch]`}>
                    <span className="text-ink-900">Made for hiring</span> <span className="text-ink-500">in Southern Africa.</span>
                  </h2>
                  <p className="max-w-[56ch] self-end text-lg leading-relaxed text-fg-muted">
                    Salaries in US dollars and ZiG. Phone numbers in +263 and the region&apos;s formats. Qualifications from UZ, NUST, MSU, Wits and UCT, and
                    registrations with ICAZ, CIPS and IPMZ read as they appear on a CV. Retention and consent rules for Zimbabwe&apos;s Cyber and Data Protection Act and
                    South Africa&apos;s POPIA.
                  </p>
                </div>
                <div data-marquee aria-hidden className="ticker relative overflow-hidden border-t border-line py-8 lg:py-10">
                  <Crosses />
                  <div className="ticker-track">
                    {[0, 1].map((copy) => (
                      <ul key={copy} className="flex shrink-0 items-center">
                        {READS.map((r) => (
                          <li key={r} className="flex items-center text-[clamp(2rem,5vw,4rem)] leading-none font-bold tracking-[-0.035em] whitespace-nowrap text-ink-900">
                            {r}
                            <span className="mx-[0.45em] inline-block size-[0.16em] bg-ink-300" />
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Closing call to action, a black sheet over the canvas. */}
            <section className="overflow-hidden rounded-t-[2rem] bg-[#0B0C0B] text-white sm:rounded-t-[2.5rem]">
              <div className={`${FRAME} border-white/10`}>
                <div className="flex flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-28">
                  <div>
                    <h2 className={`${H2} max-w-[16ch]`}>
                      Hire on evidence, <span className="text-white/55">starting this week.</span>
                    </h2>
                    <p className="mt-5 max-w-[48ch] text-lg text-white/70">Set up your organisation, add a vacancy and upload your first CVs in an afternoon.</p>
                  </div>
                  <Link
                    href="/register"
                    className="pressable group inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-white px-5 text-base font-semibold text-ink-900 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Start free trial
                    <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#0B0C0B] text-white/60">
        <div className={`${FRAME} flex flex-wrap items-center justify-between gap-4 border-white/10 px-5 py-8 text-sm sm:px-8`}>
          <Crosses dark />
          <Logo onDark tone="mono" />
          <p>© 2026 Vettly · Smarter Hiring. Faster.</p>
          <Link href="/login" className="font-semibold text-white hover:underline">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Crosshairs where a horizontal rule meets the frame's two hairlines. Place inside a relative, framed box. */
function Crosses({ dark }: { dark?: boolean }) {
  const tone = dark ? "text-white/35" : "text-ink-400";
  return (
    <>
      <Cross className={`-top-[5px] -left-[5px] ${tone}`} />
      <Cross className={`-top-[5px] -right-[5px] ${tone}`} />
    </>
  );
}

function Cross({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 9 9" aria-hidden className={`pointer-events-none absolute z-10 size-[9px] ${className}`}>
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** A sample requirement check, labelled as such. */
function SampleCheck() {
  return (
    <figure data-grow className="origin-top self-start rounded-xl bg-surface p-2 shadow-platter">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-ink-900">Finance Manager · Tatenda Moyo</p>
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-2xs font-semibold text-fg-muted">Sample</span>
      </div>
      <ul className="divide-y divide-line">
        {SAMPLE.map((r) => (
          <li key={r.requirement} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-4">
            <p className="text-sm font-semibold text-fg">{r.requirement}</p>
            <span
              className={
                r.outcome === "Met"
                  ? "self-start text-xs font-bold text-success-700"
                  : r.outcome === "Partly"
                    ? "self-start text-xs font-bold text-warning-700"
                    : "self-start text-xs font-bold text-danger-700"
              }
            >
              {r.outcome}
            </span>
            <p className="col-span-2 text-sm text-fg-muted">{r.quote ? <q className="text-fg">{r.quote}</q> : "Nothing on the CV shows this. Ask at screening."}</p>
            <span className="col-span-2">
              {r.state === "confirmed" ? (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-50 px-2.5 text-xs font-semibold text-success-700">
                  <CircleCheck weight="fill" className="size-3.5" aria-hidden />
                  Confirmed by HR
                </span>
              ) : (
                <span className="inline-flex h-6 items-center rounded-full border border-dashed border-accent-500 px-2.5 text-xs font-semibold text-accent-700">
                  Suggested by Vettly
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="px-4 pt-1 pb-3 text-xs text-fg-subtle">A sample check. Names and CV lines are made up.</figcaption>
    </figure>
  );
}

/** The right of the hero: the wordmark on a black canvas, two hiring photos, and the pixel leaves in the corner. */
function BrandCanvas() {
  return (
    <div className="landing-rise relative isolate min-h-[30rem] overflow-hidden rounded-2xl bg-[#0B0C0B] p-6 text-white sm:min-h-[36rem] sm:p-8 lg:min-h-[40rem]">
      <p aria-hidden className="relative z-10 text-[clamp(4.5rem,11vw,9.5rem)] leading-[0.82] font-bold tracking-[-0.06em] select-none">
        Vettly
      </p>
      <p className="relative z-10 mt-3 max-w-[28ch] text-sm text-white/60">Smarter Hiring. Faster. For HR teams across Southern Africa.</p>

      <div
        data-parallax="0.05"
        className="absolute top-[38%] right-6 left-[30%] aspect-[4/3] overflow-hidden rounded-xl shadow-[0_24px_48px_rgba(0,0,0,0.45)] sm:right-8"
      >
        <Image
          src="/images/auth/panel-interview.webp"
          alt="Three colleagues around a table in a panel interview"
          fill
          sizes="(min-width: 1024px) 36vw, 70vw"
          className="object-cover"
          priority
        />
      </div>
      <div
        data-parallax="0.12"
        className="absolute bottom-8 left-6 w-[44%] overflow-hidden rounded-xl ring-4 ring-[#0B0C0B] shadow-[0_18px_36px_rgba(0,0,0,0.5)] sm:left-8"
      >
        <div className="relative aspect-[4/3]">
          <Image
            src="/images/auth/hr-team-boardroom.webp"
            alt="An HR team meeting around a long boardroom table"
            fill
            sizes="(min-width: 1024px) 18vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* One requirement, as Vettly shows it: the claim, and the CV line that proves it. */}
      <div
        data-parallax="0.09"
        className="absolute right-6 bottom-[30%] z-10 w-[min(17rem,62%)] rounded-lg bg-white/95 p-3.5 text-ink-900 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur sm:right-8"
      >
        <p className="text-xs font-semibold text-fg-subtle">Requirement</p>
        <p className="mt-0.5 text-sm font-bold">ICAZ or ACCA registration</p>
        <p className="mt-1.5 text-xs leading-snug text-fg-muted">
          <q>ACCA, Association of Chartered Certified Accountants, 2018</q>
        </p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-2xs font-semibold text-success-700">
          <CircleCheck weight="fill" className="size-3" aria-hidden />
          Confirmed by HR
        </span>
      </div>

      <PixelLeaves className="absolute right-5 bottom-5 z-10 w-16 sm:right-6 sm:bottom-6 sm:w-20" />
    </div>
  );
}

/** The two msasa leaves of the Vettly mark, drawn in pixels: copper (unreviewed) and green (confirmed). */
function PixelLeaves({ className }: { className?: string }) {
  const MAP = [
    "CC............GG",
    "CCC..........GGG",
    "cCCC........GGGg",
    ".cCCC......GGGg.",
    ".ccCCC....GGGgg.",
    "..cCCC....GGGg..",
    "..ccCCC..GGGgg..",
    "...cCCC..GGGg...",
    "....cCC..GGg....",
    ".....cC..Gg.....",
    "......C..G......",
    "......c..g......",
  ];
  const FILL: Record<string, string> = {
    C: "#C2602F",
    c: "#8F4220",
    G: "#3E8A47",
    g: "#16624F",
  };
  return (
    <svg viewBox="0 0 16 12" shapeRendering="crispEdges" className={className} aria-hidden>
      {MAP.flatMap((row, y) => [...row].map((ch, x) => (FILL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FILL[ch]} /> : null)))}
    </svg>
  );
}
