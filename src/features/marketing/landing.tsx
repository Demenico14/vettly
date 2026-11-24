import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "@/components/icons";
import { Logo, LogoMark } from "@/components/brand/logo";
import { IntroLoader } from "./intro-loader";
import { Principles } from "./principles";
import { ScrollMotion } from "./scroll-motion";

/**
 * The public front page, built on a studio-site rhythm: a dark photographic hero with a running headline, a light
 * statement sheet that slides over it, the product on a black curve, stacking cards for the hiring path, a
 * principles slider, privacy cards and a large footer. Every claim is something Vettly does today; anything that
 * looks like data is labelled as a sample. Granite & Msasa: Public Sans, bush green for actions, msasa copper only
 * where AI hasn't been reviewed.
 */

const INK = "#0B0C0B";

/** What Vettly recognises on a CV, as the region writes it. */
const READS = ["University of Zimbabwe", "NUST", "Midlands State University", "Wits", "UCT", "ICAZ", "CIPS", "IPMZ", "USD", "ZiG", "+263"];

const PRIVACY = [
  { tag: "Your server", title: "AI that stays in house", body: "Vettly's AI can run on your own server, so CVs never go to an outside AI service." },
  { tag: "Consent", title: "The talent pool is opt-in", body: "People join your talent pool only when they say yes, and they're asked again before it lapses." },
  { tag: "Retention", title: "Deleted on schedule", body: "Unsuccessful applicants are archived, then deleted when the retention period you set runs out." },
  { tag: "Requests", title: "Requests answered in time", body: "Record access, correction and deletion requests in one place, and answer them within 30 days." },
];

const SAMPLE = [
  { requirement: "Chartered Accountant (ICAZ or ACCA)", outcome: "Met", quote: "ACCA, Association of Chartered Certified Accountants, 2018", confirmed: true },
  { requirement: "IFRS group reporting", outcome: "Partly", quote: "Prepared monthly IFRS management accounts for three business units", confirmed: false },
  { requirement: "Sage Evolution or a similar ERP", outcome: "No evidence", quote: null, confirmed: false },
];

const PILL = "pressable group inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";
const DISPLAY = "font-medium tracking-[-0.045em] text-balance";

export function Landing() {
  return (
    <div className="bg-canvas text-fg">
      <IntroLoader />
      <ScrollMotion />
      <FloatingNav />

      <main id="main">
        {/* The dark hero and the band below it pin once seen; the statement sheet then slides up over them. */}
        <div data-pin className="relative origin-top md:sticky" style={{ background: INK }}>
          <Hero />
          <ReadsBand />
          <div data-dim aria-hidden className="pointer-events-none absolute inset-0 bg-black opacity-0" />
        </div>

        <div className="relative z-10">
          <Statement />
          <Inside />
          <div style={{ background: INK }} className="text-white">
            <HowItWorks />
            <Honest />
            <Privacy />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white">
      <div data-parallax="0.12" className="absolute inset-0 -z-20 scale-110">
        <Image src="/images/auth/panel-interview.webp" alt="" fill priority sizes="100vw" className="object-cover object-[62%_35%] brightness-[0.62] grayscale-[0.25]" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,#0B0C0B_8%,rgba(11,12,11,0.72)_42%,rgba(11,12,11,0.35)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(11,12,11,0.65),transparent_60%)]" />

      <header role="banner" className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Vettly home" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <Logo onDark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
            How it works
          </a>
          <a href="#inside" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
            Inside Vettly
          </a>
          <a href="#privacy" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
            Privacy
          </a>
          <Link href="/login" className="rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-white/10">
            Sign in
          </Link>
          <Link
            href="/register"
            className="pressable hidden rounded-full bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink-900 hover:bg-ink-100 sm:inline-block"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      <div className="flex-1" />

      <div className="relative z-10 flex justify-end px-5 sm:px-8 lg:px-12">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md">
          <span aria-hidden className="size-2 rounded-full bg-[#5FB08D]" />
          30 days free. No card needed.
        </p>
      </div>

      {/* The headline, running. Screen readers and reduced motion get it once, still. */}
      <h1 className="sr-only px-5 text-[clamp(3rem,12vw,6rem)] leading-[0.95] font-medium tracking-[-0.045em] motion-reduce:not-sr-only motion-reduce:mt-4 sm:px-8 lg:px-12">
        Shortlists you can defend.
      </h1>
      <div aria-hidden className="ticker relative z-10 mt-3 overflow-hidden motion-reduce:hidden" data-marquee>
        <div className="ticker-track [animation-duration:36s]">
          {[0, 1].map((copy) => (
            <p key={copy} className="flex shrink-0 items-center text-[clamp(4.25rem,11.5vw,10.5rem)] leading-[1.05] font-medium tracking-[-0.05em] whitespace-nowrap">
              {[0, 1].map((k) => (
                <Fragment key={k}>
                  <span className="pl-[0.3em]">Shortlists you can defend</span>
                  <LogoMark onDark className="ml-[0.3em] h-[0.62em]" />
                </Fragment>
              ))}
            </p>
          ))}
        </div>
      </div>

      <div className="landing-rise relative z-10 grid grid-cols-1 gap-8 px-5 pt-8 pb-12 sm:px-8 md:grid-cols-2 lg:px-12 lg:pb-14">
        <div>
          <p className="max-w-[34ch] text-xl leading-snug text-white sm:text-2xl">
            Vettly reads every CV against your vacancy&apos;s requirements, quotes the line that proves each one, and leaves the decision with your team.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/register" className={`${PILL} bg-primary-500 text-white hover:bg-primary-400 focus-visible:outline-white`}>
              Start free trial
              <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/login" className={`${PILL} text-white ring-1 ring-white/30 hover:bg-white/10 focus-visible:outline-white`}>
              Sign in
            </Link>
          </div>
        </div>
        <p className="max-w-[44ch] self-end text-base leading-relaxed text-white/75 md:justify-self-end">
          <span className="font-bold text-white">{"Real talk: "}</span>a match score on its own can&apos;t tell you why someone made the shortlist. Vettly shows you the
          line on the CV behind every requirement, and flags what&apos;s missing so you can ask.
        </p>
      </div>

      <PixelLeaves className="absolute right-5 bottom-4 z-10 w-12 opacity-90 sm:right-8 lg:right-12 lg:w-14" />
    </section>
  );
}

/** Where a studio would put client logos: what Vettly reads, as the region writes it. */
function ReadsBand() {
  return (
    <section aria-label="What Vettly reads" className="relative flex flex-col gap-4 border-t border-white/10 py-8 text-white sm:flex-row sm:items-center sm:gap-10">
      <p className="shrink-0 px-5 text-sm text-white/60 sm:max-w-[16rem] sm:pl-8 lg:pl-12">
        Reads qualifications, bodies, currencies and numbers the way the region writes them.
      </p>
      <div data-marquee className="ticker relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
              {READS.map((r) => (
                <li key={r} className="flex items-center text-xl font-semibold tracking-[-0.02em] whitespace-nowrap text-white/55">
                  {r}
                  <span aria-hidden className="mx-6 inline-block size-1.5 bg-white/25" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

/** The light sheet: one large statement whose words come out of the blur as it crosses the screen. */
function Statement() {
  const words = (s: string) =>
    s.split(" ").map((w, i) => (
      <Fragment key={`${s}-${i}`}>
        <span data-word className="inline-block">
          {w}
        </span>{" "}
      </Fragment>
    ));
  return (
    <section data-sheet className="overflow-hidden rounded-t-[2rem] bg-canvas shadow-[0_-24px_60px_rgba(0,0,0,0.35)] sm:rounded-t-[2.75rem]">
      <Frame>
        <div className="px-5 pt-24 pb-24 sm:px-10 lg:px-16 lg:pt-36 lg:pb-32">
          <h2 data-fill className={`${DISPLAY} max-w-[22ch] text-[clamp(2.5rem,5.6vw,5.25rem)] leading-[1.02] text-ink-900`}>
            {words("Every match shows its working,")}
            <span data-word className="relative mx-[0.08em] inline-block h-[0.74em] w-[1.6em] translate-y-[0.06em] overflow-hidden rounded-full align-baseline">
              <Image src="/images/auth/hr-team-boardroom.webp" alt="" fill sizes="160px" className="object-cover" />
            </span>{" "}
            {words("from the first CV to a signed offer.")}
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-10 lg:mt-20 lg:grid-cols-2">
            <div className="lg:col-start-2">
              <p className="max-w-[46ch] text-lg leading-relaxed text-ink-700 sm:text-xl">
                Vettly checks each requirement on its own and quotes the line on the CV that proves it. What it suggests stays copper until someone on your team confirms
                it; then it turns green. Nothing is decided for you, and every decision is kept with its reason.
              </p>
              <a
                href="#how"
                className="pressable mt-8 inline-flex h-12 items-center gap-3 rounded-full bg-ink-900 pr-5 pl-2 text-sm font-semibold text-white hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <span aria-hidden className="flex">
                  <span className="grid size-8 place-items-center rounded-full border-2 border-ink-900 bg-[#DB7A4A] text-[11px] font-bold text-ink-900">V</span>
                  <span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-ink-900 bg-[#5FB08D] text-[11px] font-bold text-ink-900">HR</span>
                </span>
                Vettly suggests, your team decides
              </a>
            </div>
          </div>
        </div>
      </Frame>
    </section>
  );
}

/** The product on a black curve, growing into place as it rises. */
function Inside() {
  return (
    <section id="inside" className="relative overflow-hidden bg-canvas">
      <Frame>
        <div className="px-5 pt-6 text-center sm:px-10">
          <h2 className={`${DISPLAY} text-[clamp(3.5rem,10vw,8.5rem)] leading-[0.95] text-ink-900`}>Inside Vettly</h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-lg text-ink-600">
            One vacancy, every candidate, and each requirement checked with its evidence. This is the screen your team works from.
          </p>
        </div>
      </Frame>
      <div className="relative mt-16 pb-24 lg:mt-20 lg:pb-32">
        <div aria-hidden className="absolute top-[30%] -right-[25%] bottom-0 -left-[25%] rounded-t-[50%]" style={{ background: INK }} />
        <div className="relative px-4 sm:px-8">
          <ProductScreen />
        </div>
      </div>
    </section>
  );
}

function ProductScreen() {
  const people = [
    { name: "Tatenda Moyo", met: 4, stage: "Shortlisted", on: true },
    { name: "Rufaro Ndlovu", met: 5, stage: "Shortlisted" },
    { name: "Kudzai Chikore", met: 3, stage: "Screening" },
    { name: "Nyasha Banda", met: 2, stage: "Screening" },
  ];
  return (
    <figure data-grow="0.86" className="mx-auto max-w-5xl origin-top rounded-[1.5rem] bg-[#141816] p-2.5 shadow-[0_40px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
      <div className="flex items-center justify-between px-3 pt-1.5 pb-3 text-white">
        <p className="flex items-center gap-2.5 text-sm font-semibold">
          <LogoMark onDark className="h-4" />
          Finance Manager · Harare
        </p>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/75">Sample</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <ul aria-label="Candidates" className="hidden flex-col gap-1 rounded-2xl bg-white/[0.04] p-2 lg:flex">
          {people.map((p) => (
            <li key={p.name} className={`rounded-xl px-3 py-2.5 ${p.on ? "bg-white/10" : ""}`}>
              <p className="flex items-center justify-between text-sm font-semibold text-white">
                {p.name}
                <span className="text-xs font-medium text-white/55">{p.stage}</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-white/60 tabular-nums">
                <span aria-hidden className="flex gap-0.5">
                  {Array.from({ length: 6 }, (_, k) => (
                    <span key={k} className={`h-1.5 w-3 rounded-full ${k < p.met ? "bg-[#5FB08D]" : "bg-white/15"}`} />
                  ))}
                </span>
                {p.met} of 6 requirements met
              </p>
            </li>
          ))}
        </ul>
        <SampleCheck />
      </div>
      <figcaption className="px-3 pt-3 pb-1 text-xs text-white/50">A sample vacancy. Names and CV lines are made up.</figcaption>
    </figure>
  );
}

function SampleCheck() {
  return (
    <div className="rounded-2xl bg-surface p-2">
      <p className="px-4 pt-3 pb-2 text-sm font-semibold text-ink-900">Tatenda Moyo · requirement check</p>
      <ul className="divide-y divide-line">
        {SAMPLE.map((r) => (
          <li key={r.requirement} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 px-4 py-4">
            <p className="text-sm font-semibold text-fg">{r.requirement}</p>
            <span
              className={`self-start text-xs font-bold ${r.outcome === "Met" ? "text-success-700" : r.outcome === "Partly" ? "text-warning-700" : "text-danger-700"}`}
            >
              {r.outcome}
            </span>
            <p className="col-span-2 text-sm text-fg-muted">{r.quote ? <q className="text-fg">{r.quote}</q> : "Nothing on the CV shows this. Ask at screening."}</p>
            <span className="col-span-2">{r.confirmed ? <Confirmed /> : <Suggested />}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

/** The hiring path as three cards that stack as you scroll. */
function HowItWorks() {
  const cards: { label: string; title: string; body: string; tone: string; art: ReactNode }[] = [
    {
      label: "CVs in · Screening",
      title: "Screen",
      body: "Upload PDFs and Word files in bulk. Vettly reads each one into a profile you check, then tests every candidate against your requirements, with the CV line behind each answer.",
      tone: "bg-primary-600 text-white",
      art: <ScreenArt />,
    },
    {
      label: "Shortlist · Tests · Interviews",
      title: "Assess",
      body: "Move people on with a reason that's kept. Send tests candidates take on their phone, then interview with structured questions and scorecards panellists fill in on their own.",
      tone: "bg-[#ECE9E1] text-ink-900",
      art: <AssessArt />,
    },
    {
      label: "Offer · Hired",
      title: "Hire",
      body: "Offer letters on your letterhead, approved in order and sent as a PDF. One record from the first CV to the signed offer, ready for an audit.",
      tone: "bg-[#1B2420] text-white ring-1 ring-white/10",
      art: <HireArt />,
    },
  ];
  const tilt = ["lg:-rotate-3", "lg:rotate-[1.5deg]", "lg:-rotate-1"];
  const shift = ["lg:ml-0", "lg:ml-[31%]", "lg:ml-[62%]"];
  return (
    <section id="how" className="relative pt-28 pb-10 lg:pt-36">
      <div className="px-5 text-center sm:px-8">
        <h2 className={`${DISPLAY} text-[clamp(3rem,8vw,7rem)] leading-[0.98]`}>
          How hiring <span className="text-white/45">gets done.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[56ch] text-lg text-white/70">
          Seven steps, the same on every vacancy and every candidate, in three stages. Everyone knows where things stand and what comes next.
        </p>
      </div>
      <ol className="relative mx-auto mt-20 max-w-7xl px-4 sm:px-8">
        {cards.map((c, i) => (
          <li
            key={c.title}
            style={{ top: `calc(12vh + ${i * 1.5}rem)` }}
            className={`sticky mb-[22vh] flex min-h-[30rem] w-full flex-col rounded-[1.75rem] p-7 shadow-[0_30px_60px_rgba(0,0,0,0.35)] last:mb-0 sm:p-9 lg:w-[38%] ${c.tone} ${tilt[i]} ${shift[i]}`}
          >
            <span className="self-center rounded-full bg-black/15 px-3 py-1 text-xs font-semibold">{c.label}</span>
            <h3 className={`${DISPLAY} mt-6 text-center text-[clamp(3rem,6vw,4.75rem)] leading-none`}>{c.title}</h3>
            <p className="mx-auto mt-5 max-w-[36ch] text-center text-base leading-relaxed opacity-85">{c.body}</p>
            <div className="mt-auto pt-8">{c.art}</div>
          </li>
        ))}
      </ol>
      <div className="h-[18vh]" aria-hidden />
    </section>
  );
}

function ScreenArt() {
  return (
    <div aria-hidden className="rounded-xl bg-white p-4 text-ink-900 shadow-lg">
      <p className="text-xs font-bold">Curriculum vitae</p>
      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-11/12 rounded-full bg-ink-200" />
        <div className="h-1.5 w-8/12 rounded-full bg-ink-200" />
      </div>
      <p className="mt-3 inline-block border-b-2 border-dashed border-accent-500 text-xs font-semibold">ACCA, Association of Chartered Certified Accountants</p>
      <div className="mt-3">
        <Suggested />
      </div>
    </div>
  );
}

function AssessArt() {
  const rows = [
    ["Technical knowledge", 4],
    ["Communication", 3],
    ["Judgement", 5],
  ] as const;
  return (
    <div aria-hidden className="rounded-xl bg-white p-4 shadow-lg">
      <p className="text-xs font-bold text-ink-900">Scorecard · panellist 2</p>
      <ul className="mt-3 space-y-2">
        {rows.map(([name, n]) => (
          <li key={name} className="flex items-center justify-between text-xs text-ink-700">
            {name}
            <span className="flex gap-1">
              {Array.from({ length: 5 }, (_, k) => (
                <span key={k} className={`size-2 rounded-full ${k < n ? "bg-primary-600" : "bg-ink-200"}`} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HireArt() {
  return (
    <div aria-hidden className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
      <p className="text-xs font-bold text-white">Offer letter · approvals</p>
      <ol className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
        {["HR", "Finance", "Managing director"].map((who, i) => (
          <Fragment key={who}>
            {i > 0 && <span className="text-white/30">→</span>}
            <li className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <CircleCheck weight="fill" className="size-3.5 text-[#5FB08D]" />
              {who}
            </li>
          </Fragment>
        ))}
      </ol>
      <p className="mt-3 text-xs text-white/60">Sent as a PDF on your letterhead</p>
    </div>
  );
}

/** Where a testimonial slider would go: how Vettly works with your team, and a way in. */
function Honest() {
  return (
    <section className="px-4 py-24 sm:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 px-1 lg:grid-cols-2 lg:items-end">
          <h2 className={`${DISPLAY} text-[clamp(2.75rem,5.5vw,4.75rem)] leading-[1]`}>
            Vettly suggests. <span className="text-white/45">Your team decides.</span>
          </h2>
          <p className="max-w-[48ch] text-lg leading-relaxed text-white/70 lg:justify-self-end">
            No black-box scores and no automatic rejections. Every suggestion shows its evidence, and nobody moves forward until a person says so.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          <div className="flex flex-col rounded-[1.75rem] bg-white/[0.05] p-7 ring-1 ring-white/10 sm:p-9">
            <PixelLeaves className="w-12" />
            <h3 className="mt-auto pt-16 text-2xl font-semibold tracking-[-0.02em]">Ready to try it?</h3>
            <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-white/70">
              Set up your organisation, add a vacancy and upload your first CVs in an afternoon.
            </p>
            <Link href="/register" className={`${PILL} mt-7 self-start bg-white text-ink-900 hover:bg-ink-100 focus-visible:outline-white`}>
              Start free trial
              <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <Principles />
        </div>
      </div>
    </section>
  );
}

/** Privacy, in the cards a studio would use for its update log. */
function Privacy() {
  return (
    <section id="privacy" className="border-t border-white/10 py-24 lg:py-32">
      <div className="px-5 text-center sm:px-8">
        <h2 className={`${DISPLAY} text-[clamp(3rem,8vw,7rem)] leading-[0.98]`}>
          Your data <span className="text-white/45">stays yours.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[54ch] text-lg text-white/70">
          Built around Zimbabwe&apos;s Cyber and Data Protection Act and South Africa&apos;s POPIA, with the controls in your hands.
        </p>
      </div>
      <ul className="mx-auto mt-16 flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:px-8 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {PRIVACY.map((p) => (
          <li
            key={p.title}
            className="flex min-h-[20rem] w-[80vw] max-w-[22rem] shrink-0 snap-start flex-col rounded-[1.5rem] bg-white/[0.05] p-6 ring-1 ring-white/10 lg:w-auto lg:max-w-none"
          >
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85">
              <span aria-hidden className="size-1.5 rounded-full bg-[#5FB08D]" />
              {p.tag}
            </span>
            <h3 className="mt-auto pt-14 text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance">{p.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 text-white" style={{ background: INK }}>
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[70rem] -translate-x-1/2 rounded-full bg-primary-600/25 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 pt-24 pb-10 sm:px-8 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,1fr)] lg:pt-32">
        <div className="flex flex-col items-start">
          <Logo onDark />
          <p className="mt-5 max-w-[30ch] text-sm leading-relaxed text-white/65">Smarter Hiring. Faster. For HR teams across Zimbabwe and Southern Africa.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className={`${PILL} h-11 bg-primary-500 px-5 text-sm text-white hover:bg-primary-400 focus-visible:outline-white`}>
              Start free trial
            </Link>
            <Link href="/login" className={`${PILL} h-11 px-5 text-sm text-white ring-1 ring-white/30 hover:bg-white/10 focus-visible:outline-white`}>
              Sign in
            </Link>
          </div>
        </div>
        <div>
          <p className={`${DISPLAY} text-[clamp(2.75rem,6vw,5.5rem)] leading-[1]`}>
            Hire on <PixelLeaves className="inline-block h-[0.7em] w-auto align-baseline" /> evidence, starting this week.
          </p>
          <nav aria-label="Footer" className="mt-16 grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <FooterCol
              title="Product"
              links={[
                ["How it works", "#how"],
                ["Inside Vettly", "#inside"],
                ["Privacy", "#privacy"],
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                ["Start free trial", "/register"],
                ["Sign in", "/login"],
              ]}
            />
            <div>
              <p className="font-semibold text-white/45">Built for</p>
              <ul className="mt-4 space-y-2.5 text-white/80">
                <li>Zimbabwe · CDPA</li>
                <li>South Africa · POPIA</li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-7 text-sm text-white/55 sm:px-8">
        <p>© 2026 Vettly</p>
        <p>Smarter Hiring. Faster.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-semibold text-white/45">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("#") ? (
              <a href={href} className="text-white/80 hover:text-white">
                {label}
              </a>
            ) : (
              <Link href={href} className="text-white/80 hover:text-white">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small pill that follows you once the hero has gone, so the way in is never far. */
function FloatingNav() {
  return (
    <div data-float className="floating-nav pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <nav
        aria-label="Quick"
        className="flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-md"
      >
        <a href="#main" aria-label="Back to top" className="grid size-9 place-items-center rounded-full hover:bg-ink-100">
          <LogoMark className="h-4" />
        </a>
        <Link href="/login" className="rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-ink-900 hover:bg-ink-100">
          Sign in
        </Link>
        <Link href="/register" className="pressable rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-primary-700">
          Start free trial
        </Link>
      </nav>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------------------- */

/** The light frame from the statement sheet: two hairlines down the content edges, crosshairs at the top. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-[calc(100%-1.5rem)] max-w-7xl border-x border-line sm:w-[calc(100%-3rem)]">
      <Cross className="-top-[5px] -left-[5px]" />
      <Cross className="-top-[5px] -right-[5px]" />
      {children}
    </div>
  );
}

function Cross({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 9 9" aria-hidden className={`pointer-events-none absolute z-10 size-[9px] text-ink-400 ${className}`}>
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Suggested() {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-dashed border-accent-500 bg-white px-2.5 text-xs font-semibold text-accent-700">
      Suggested by Vettly
    </span>
  );
}

function Confirmed() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success-50 px-2.5 text-xs font-semibold text-success-700">
      <CircleCheck weight="fill" className="size-3.5" aria-hidden />
      Confirmed by HR
    </span>
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
  const FILL: Record<string, string> = { C: "#C2602F", c: "#8F4220", G: "#3E8A47", g: "#16624F" };
  return (
    <svg viewBox="0 0 16 12" shapeRendering="crispEdges" className={className} aria-hidden>
      {MAP.flatMap((row, y) => [...row].map((ch, x) => (FILL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FILL[ch]} /> : null)))}
    </svg>
  );
}
