"use client";

import * as React from "react";
import type { Figure, Glyph } from "@/types/psychometrics";
import { cn } from "@/lib/utils";

/**
 * Draws the pictures in test questions from their data: charts, tables, pattern grids, shapes, machines,
 * record pairs and spreadsheets. Plain SVG in the brand's ink and green, sized to their container, with a
 * text description for screen readers. Nothing here knows the answer.
 */
export function TestFigure({ figure, alt, className, compact = false }: { figure: Figure; alt?: string; className?: string; compact?: boolean }) {
  switch (figure.kind) {
    case "bars":
      return <Bars f={figure} alt={alt} className={className} />;
    case "table":
      return <DataTable title={figure.title} head={figure.head} rows={figure.rows} className={className} />;
    case "sheet":
      return <Sheet f={figure} className={className} />;
    case "pair":
      return <Pair f={figure} className={className} />;
    case "matrix":
      return <Grid cells={figure.cells} cols={3} alt={alt} className={className} />;
    case "series":
      return <Grid cells={figure.cells} cols={figure.cells.length} alt={alt} className={className} />;
    case "glyphs":
      return <Grid cells={[figure.glyphs]} cols={1} alt={alt} className={className} bare={compact} />;
    case "shape":
      return <Shape f={figure} alt={alt} className={className} />;
    case "gears":
      return <Gears f={figure} alt={alt} className={className} compact={compact} />;
    case "lever":
      return <Lever f={figure} alt={alt} className={className} />;
    case "pulley":
      return <Pulley f={figure} alt={alt} className={className} />;
    case "belt":
      return <Belt f={figure} alt={alt} className={className} />;
  }
}

const INK = "var(--color-ink-900)";
const LINE = "var(--color-ink-300)";

/* ---------- Charts and tables ---------- */

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1);
}

function Bars({ f, alt, className }: { f: Extract<Figure, { kind: "bars" }>; alt?: string; className?: string }) {
  const W = 520;
  const H = 260;
  const pad = { l: 44, r: 12, t: 16, b: 40 };
  const max = niceMax(Math.max(...f.series.flatMap((s) => s.values)));
  const groupW = (W - pad.l - pad.r) / f.categories.length;
  const barW = Math.min(34, (groupW - 16) / f.series.length);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const colours = ["var(--color-primary-600)", "var(--color-ink-400)", "var(--color-primary-300)"];
  return (
    <figure className={cn("rounded-lg bg-surface p-4 ring-1 ring-line", className)}>
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">{f.title}</span>
        <span className="flex items-center gap-3 text-xs text-fg-muted">
          {f.series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: colours[i] }} aria-hidden />
              {s.name}
            </span>
          ))}
          <span className="text-fg-subtle">({f.unit})</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={alt ?? f.title}>
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * p)} y2={y(max * p)} stroke={LINE} strokeWidth={p === 0 ? 1.2 : 0.6} />
            <text x={pad.l - 6} y={y(max * p) + 4} textAnchor="end" fontSize="11" fill="var(--color-fg-subtle)">
              {Math.round(max * p).toLocaleString("en-GB")}
            </text>
          </g>
        ))}
        {f.categories.map((c, ci) => {
          const gx = pad.l + groupW * ci + (groupW - barW * f.series.length) / 2;
          return (
            <g key={c}>
              {f.series.map((s, si) => {
                const v = s.values[ci]!;
                return (
                  <g key={s.name}>
                    <rect x={gx + si * barW} y={y(v)} width={barW - 3} height={y(0) - y(v)} rx={2} fill={colours[si]} />
                    <text x={gx + si * barW + (barW - 3) / 2} y={y(v) - 4} textAnchor="middle" fontSize="10" fill={INK} fontWeight={600}>
                      {v.toLocaleString("en-GB")}
                    </text>
                  </g>
                );
              })}
              <text x={pad.l + groupW * ci + groupW / 2} y={H - pad.b + 18} textAnchor="middle" fontSize="12" fill={INK}>
                {c}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function DataTable({ title, head, rows, className }: { title: string; head: string[]; rows: (string | number)[][]; className?: string }) {
  return (
    <figure className={cn("overflow-x-auto rounded-lg bg-surface p-4 ring-1 ring-line", className)}>
      <figcaption className="mb-2 text-sm font-semibold text-ink-900">{title}</figcaption>
      <table className="w-full text-sm tabular">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={cn("border-b border-line-strong py-1.5 font-semibold text-fg", i === 0 ? "text-left" : "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="border-b border-line py-1.5 text-left font-medium text-fg">
                    {c}
                  </th>
                ) : (
                  <td key={i} className="border-b border-line py-1.5 text-right text-fg">
                    {typeof c === "number" ? c.toLocaleString("en-GB") : c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Sheet({ f, className }: { f: Extract<Figure, { kind: "sheet" }>; className?: string }) {
  const letters = f.cols.map((_, i) => String.fromCharCode(65 + i));
  return (
    <figure className={cn("overflow-x-auto rounded-lg bg-surface ring-1 ring-line", className)}>
      <table className="w-full border-collapse font-mono text-[13px] tabular">
        <thead>
          <tr className="bg-ink-100 text-fg-subtle">
            <th className="w-9 border border-line px-2 py-1 font-normal" aria-hidden />
            {letters.map((l) => (
              <th key={l} scope="col" className="border border-line px-2 py-1 font-semibold">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="border border-line bg-ink-100 px-2 py-1 text-fg-subtle">
              1
            </th>
            {f.cols.map((c) => (
              <td key={c} className="border border-line px-2 py-1 font-sans font-semibold text-fg">
                {c}
              </td>
            ))}
          </tr>
          {f.rows.map((r, ri) => (
            <tr key={ri}>
              <th scope="row" className="border border-line bg-ink-100 px-2 py-1 font-normal text-fg-subtle">
                {ri + 2}
              </th>
              {r.map((c, i) => (
                <td key={i} className={cn("border border-line px-2 py-1 whitespace-pre text-fg", typeof c === "number" && "text-right")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Pair({ f, className }: { f: Extract<Figure, { kind: "pair" }>; className?: string }) {
  return (
    <figure className={cn("grid gap-2 rounded-lg bg-surface p-4 ring-1 ring-line", className)}>
      {(
        [
          ["Original", f.left],
          ["Copy", f.right],
        ] as const
      ).map(([label, text]) => (
        <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-3">
          <span className="text-xs font-semibold text-fg-subtle">{label}</span>
          <span className="font-mono text-lg tracking-wide break-all text-ink-900">{text}</span>
        </div>
      ))}
    </figure>
  );
}

/* ---------- Pattern symbols ---------- */

function shapePath(shape: Glyph["shape"], s: number): React.ReactNode {
  const pts = (n: number, r: number, rot = -90) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((rot + (360 / n) * i) * Math.PI) / 180;
      return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
  switch (shape) {
    case "circle":
      return <circle r={s * 0.46} />;
    case "square":
      return <rect x={-s * 0.42} y={-s * 0.42} width={s * 0.84} height={s * 0.84} />;
    case "triangle":
      return <polygon points={pts(3, s * 0.52)} transform={`translate(0 ${s * 0.08})`} />;
    case "diamond":
      return <polygon points={pts(4, s * 0.5)} />;
    case "pentagon":
      return <polygon points={pts(5, s * 0.48)} />;
    case "hexagon":
      return <polygon points={pts(6, s * 0.48, 0)} />;
    case "star": {
      const p = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? s * 0.22 : s * 0.5;
        const a = ((-90 + 36 * i) * Math.PI) / 180;
        return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
      }).join(" ");
      return <polygon points={p} />;
    }
    case "cross": {
      const a = s * 0.15;
      const b = s * 0.45;
      return <polygon points={`${-a},${-b} ${a},${-b} ${a},${-a} ${b},${-a} ${b},${a} ${a},${a} ${a},${b} ${-a},${b} ${-a},${a} ${-b},${a} ${-b},${-a} ${-a},${-a}`} />;
    }
    case "arrow": {
      const w = s * 0.14;
      const h = s * 0.46;
      return <polygon points={`0,${-h} ${s * 0.34},${-h * 0.2} ${w},${-h * 0.2} ${w},${h} ${-w},${h} ${-w},${-h * 0.2} ${-s * 0.34},${-h * 0.2}`} />;
    }
  }
}

const LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.25, 0],
    [0.25, 0],
  ],
  3: [
    [0, -0.24],
    [-0.25, 0.2],
    [0.25, 0.2],
  ],
  4: [
    [-0.24, -0.24],
    [0.24, -0.24],
    [-0.24, 0.24],
    [0.24, 0.24],
  ],
};

function GlyphCell({ glyphs, size, id }: { glyphs: Glyph[]; size: number; id: string }) {
  return (
    <g>
      {glyphs.map((g, gi) => {
        const n = Math.min(4, Math.max(1, g.count ?? 1));
        const s = n === 1 ? size * 0.62 : size * 0.36;
        return LAYOUT[n]!.map(([dx, dy], k) => {
          const clip = `${id}-${gi}-${k}`;
          return (
            <g key={`${gi}-${k}`} transform={`translate(${size / 2 + dx * size} ${size / 2 + dy * size}) rotate(${g.rot ?? 0})`}>
              {g.fill === "half" && (
                <defs>
                  <clipPath id={clip}>
                    <rect x={-s} y={-s} width={s} height={s * 2} />
                  </clipPath>
                </defs>
              )}
              {g.fill === "half" && (
                <g fill={INK} clipPath={`url(#${clip})`}>
                  {shapePath(g.shape, s)}
                </g>
              )}
              <g fill={g.fill === "solid" ? INK : "none"} stroke={INK} strokeWidth={2} strokeLinejoin="round">
                {shapePath(g.shape, s)}
              </g>
            </g>
          );
        });
      })}
    </g>
  );
}

function Grid({ cells, cols, alt, className, bare = false }: { cells: (Glyph[] | null)[]; cols: number; alt?: string; className?: string; bare?: boolean }) {
  const id = React.useId().replace(/:/g, "");
  const size = 72;
  const gap = 6;
  const rows = Math.ceil(cells.length / cols);
  const W = cols * size + (cols - 1) * gap;
  const H = rows * size + (rows - 1) * gap;
  return (
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} className={cn("h-auto w-full", className)} role="img" aria-label={alt}>
      {cells.map((c, i) => {
        const x = (i % cols) * (size + gap);
        const y = Math.floor(i / cols) * (size + gap);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {!bare && <rect width={size} height={size} rx={8} fill={c ? "var(--color-surface)" : "var(--color-primary-50)"} stroke={c ? LINE : "var(--color-primary-500)"} strokeDasharray={c ? undefined : "4 3"} />}
            {c ? (
              <GlyphCell glyphs={c} size={size} id={`${id}-${i}`} />
            ) : (
              <text x={size / 2} y={size / 2 + 9} textAnchor="middle" fontSize="26" fontWeight={700} fill="var(--color-primary-700)">
                ?
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Shapes ---------- */

function Shape({ f, alt, className }: { f: Extract<Figure, { kind: "shape" }>; alt?: string; className?: string }) {
  const u = 18;
  const w = Math.max(...f.cells.map((c) => c[0])) + 1;
  const h = Math.max(...f.cells.map((c) => c[1])) + 1;
  const side = Math.max(w, h);
  const ox = ((side - w) * u) / 2;
  const oy = ((side - h) * u) / 2;
  return (
    <svg viewBox={`-6 -6 ${side * u + 12} ${side * u + 12}`} className={cn("h-auto w-full", className)} role="img" aria-label={alt ?? f.label}>
      {f.cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={ox + x * u} y={oy + y * u} width={u} height={u} fill="var(--color-primary-600)" stroke="var(--color-surface)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

/* ---------- Machines ---------- */

function Turn({ cx, cy, r, dir }: { cx: number; cy: number; r: number; dir: "cw" | "ccw" }) {
  const a0 = dir === "cw" ? -150 : -30;
  const a1 = dir === "cw" ? -30 : -150;
  const p = (a: number) => [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r] as const;
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const head = dir === "cw" ? `${x1 - 2},${y1 - 7} ${x1 + 7},${y1 + 2} ${x1 - 6},${y1 + 5}` : `${x1 + 2},${y1 - 7} ${x1 - 7},${y1 + 2} ${x1 + 6},${y1 + 5}`;
  return (
    <g stroke="var(--color-primary-700)" fill="none" strokeWidth={2.5} strokeLinecap="round">
      <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 ${dir === "cw" ? 1 : 0} ${x1} ${y1}`} />
      <polygon points={head} fill="var(--color-primary-700)" stroke="none" />
    </g>
  );
}

function GearShape({ cx, cy, teeth, num, label, labelDrop = 0 }: { cx: number; cy: number; teeth: number; num: number; label: string; labelDrop?: number }) {
  const r = 14 + teeth * 1.1;
  const pts: string[] = [];
  const n = Math.max(8, Math.round(teeth / 2));
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * 2 * i) / (n * 2);
    const rr = i % 2 ? r : r + 6;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return (
    <g>
      <polygon points={pts.join(" ")} fill="var(--color-ink-100)" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={11} fill={INK} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--color-surface)">
        {num}
      </text>
      {label && (
        <text x={cx} y={cy + r + 20 + labelDrop} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">
          {label}
        </text>
      )}
    </g>
  );
}

function Gears({ f, alt, className, compact = false }: { f: Extract<Figure, { kind: "gears" }>; alt?: string; className?: string; compact?: boolean }) {
  const radii = f.teeth.map((t) => 14 + t * 1.1);
  const xs: number[] = [];
  let x = 20;
  radii.forEach((r, i) => {
    x += i === 0 ? r : radii[i - 1]! + r + 4;
    xs.push(x);
  });
  const W = x + radii[radii.length - 1]! + 20;
  const H = Math.max(...radii) * 2 + 84;
  const cy = Math.max(...radii) + 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-auto w-full", className)} role="img" aria-label={alt}>
      {f.teeth.map((t, i) => (
        <GearShape key={i} cx={xs[i]!} cy={cy} teeth={t} num={i + 1} label={compact ? "" : `${t} teeth`} labelDrop={i % 2 ? 14 : 0} />
      ))}
      <Turn cx={xs[0]!} cy={cy} r={radii[0]! + 14} dir={f.driver} />
      {f.rpm && (
        <text x={xs[0]!} y={14} textAnchor="middle" fontSize="12" fill="var(--color-primary-700)" fontWeight={600}>
          {f.rpm} rpm
        </text>
      )}
    </svg>
  );
}

function Lever({ f, alt, className }: { f: Extract<Figure, { kind: "lever" }>; alt?: string; className?: string }) {
  const W = 520;
  const unit = (W - 60) / f.length;
  const bx = (m: number) => 30 + m * unit;
  const beamY = 90;
  return (
    <svg viewBox={`0 0 ${W} 170`} className={cn("h-auto w-full", className)} role="img" aria-label={alt}>
      <rect x={bx(0)} y={beamY - 5} width={bx(f.length) - bx(0)} height={10} rx={3} fill="var(--color-ink-700)" />
      <polygon points={`${bx(f.fulcrum)},${beamY + 5} ${bx(f.fulcrum) - 18},${beamY + 40} ${bx(f.fulcrum) + 18},${beamY + 40}`} fill="var(--color-primary-600)" />
      <line x1={10} x2={W - 10} y1={beamY + 41} y2={beamY + 41} stroke={LINE} strokeWidth={2} />
      {Array.from({ length: f.length + 1 }, (_, m) => (
        <g key={m}>
          <line x1={bx(m)} x2={bx(m)} y1={beamY + 54} y2={beamY + 60} stroke={LINE} />
          <text x={bx(m)} y={beamY + 74} textAnchor="middle" fontSize="10" fill="var(--color-fg-subtle)">
            {Math.abs(m - f.fulcrum)} m
          </text>
        </g>
      ))}
      {f.loads.map((l, i) => (
        <g key={i}>
          <rect x={bx(l.at) - 26} y={beamY - 44} width={52} height={38} rx={4} fill={l.label === "?" ? "var(--color-primary-50)" : "var(--color-ink-100)"} stroke={l.label === "?" ? "var(--color-primary-500)" : INK} strokeDasharray={l.label === "?" ? "4 3" : undefined} />
          <text x={bx(l.at)} y={beamY - 20} textAnchor="middle" fontSize="13" fontWeight={700} fill={INK}>
            {l.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Pulley({ f, alt, className }: { f: Extract<Figure, { kind: "pulley" }>; alt?: string; className?: string }) {
  const n = f.ropes;
  const W = 260;
  const left = W / 2 - (n - 1) * 14;
  return (
    <svg viewBox={`0 0 ${W} 230`} className={cn("mx-auto h-auto w-full max-w-[16rem]", className)} role="img" aria-label={alt}>
      <rect x={20} y={8} width={W - 40} height={10} fill="var(--color-ink-700)" />
      <rect x={W / 2 - 40} y={18} width={80} height={22} rx={6} fill="var(--color-ink-100)" stroke={INK} />
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={left + i * 28} x2={left + i * 28} y1={40} y2={140} stroke="var(--color-primary-600)" strokeWidth={3} />
      ))}
      <rect x={W / 2 - 40} y={138} width={80} height={20} rx={6} fill="var(--color-ink-100)" stroke={INK} />
      <line x1={W / 2} x2={W / 2} y1={158} y2={172} stroke={INK} strokeWidth={2} />
      <rect x={W / 2 - 36} y={172} width={72} height={44} rx={4} fill="var(--color-ink-900)" />
      <text x={W / 2} y={199} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--color-surface)">
        {f.load}
      </text>
      <text x={W - 24} y={92} textAnchor="end" fontSize="11" fill="var(--color-fg-muted)">
        {n} rope{n === 1 ? "" : "s"}
      </text>
    </svg>
  );
}

function Belt({ f, alt, className }: { f: Extract<Figure, { kind: "belt" }>; alt?: string; className?: string }) {
  const r = 46;
  const [x1, x2, cy] = [90, 330, 90];
  return (
    <svg viewBox="0 0 420 180" className={cn("h-auto w-full", className)} role="img" aria-label={alt}>
      {f.crossed ? (
        <g stroke="var(--color-primary-600)" strokeWidth={4}>
          <line x1={x1} y1={cy - r} x2={x2} y2={cy + r} />
          <line x1={x1} y1={cy + r} x2={x2} y2={cy - r} />
        </g>
      ) : (
        <g stroke="var(--color-primary-600)" strokeWidth={4}>
          <line x1={x1} y1={cy - r} x2={x2} y2={cy - r} />
          <line x1={x1} y1={cy + r} x2={x2} y2={cy + r} />
        </g>
      )}
      {[x1, x2].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={cy} r={r} fill="var(--color-ink-100)" stroke={INK} strokeWidth={2} />
          <circle cx={x} cy={cy} r={6} fill={INK} />
          <text x={x} y={cy + r + 22} textAnchor="middle" fontSize="12" fontWeight={600} fill={INK}>
            {i === 0 ? "Left wheel" : "Right wheel"}
          </text>
        </g>
      ))}
      <Turn cx={x1} cy={cy} r={r + 12} dir={f.driver} />
    </svg>
  );
}
