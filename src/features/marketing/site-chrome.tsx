import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand/logo";

/** Shared chrome for Vettly's public pages (front page, pricing): header, floating nav, footer and the pixel leaves. */

export const INK = "#0B0C0B";
export const PILL =
  "pressable group inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2";
export const DISPLAY = "font-medium tracking-[-0.045em] text-balance";

/** The top bar, in white on a dark surface. */
export function SiteHeader() {
  return (
    <header role="banner" className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12">
      <Link href="/" aria-label="Vettly home" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
        <Logo onDark />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
        <Link href="/#how" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
          How it works
        </Link>
        <Link href="/#inside" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
          Inside Vettly
        </Link>
        <Link href="/#privacy" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
          Privacy
        </Link>
        <Link href="/pricing" className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-white/75 hover:text-white md:inline-block">
          Pricing
        </Link>
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
  );
}

export function Footer() {
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
                ["How it works", "/#how"],
                ["Inside Vettly", "/#inside"],
                ["Privacy", "/#privacy"],
                ["Pricing", "/pricing"],
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
            <Link href={href} className="text-white/80 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small pill that follows you once the hero has gone, so the way in is never far. */
export function FloatingNav() {
  return (
    <div data-float className="floating-nav pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <nav
        aria-label="Quick"
        className="flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-md"
      >
        <Link href="/#main" aria-label="Back to top" className="grid size-9 place-items-center rounded-full hover:bg-ink-100">
          <LogoMark className="h-4" />
        </Link>
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

/** The two msasa leaves of the Vettly mark, drawn in pixels: copper (unreviewed) and green (confirmed). */
export function PixelLeaves({ className }: { className?: string }) {
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
