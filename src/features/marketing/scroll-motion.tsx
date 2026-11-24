"use client";

import { useEffect } from "react";

/**
 * Scroll-linked motion for the front page, driven from one passive, rAF-throttled scroll listener.
 * Everything is visible and in place by default, so the page reads the same if this never runs.
 *
 *  data-pin        the hero: pins once its bottom reaches the viewport's bottom, so the next section slides over it
 *  data-dim        a veil inside the pinned hero that darkens as the sheet covers it
 *  data-sheet      the rounded section that slides up over the pinned hero
 *  data-parallax   drifts up at this fraction of the scroll (hero photos)
 *  data-fill       a heading whose [data-word] children fill in, word by word, as it crosses the viewport
 *  data-grow       scales from 0.92 to 1 as it enters
 *
 * With reduced motion the pin and sheet stay (they are layout, not movement); drift, fill and growth are skipped.
 */
export function ScrollMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pin = document.querySelector<HTMLElement>("[data-pin]");
    const dim = document.querySelector<HTMLElement>("[data-dim]");
    const sheet = document.querySelector<HTMLElement>("[data-sheet]");
    const drifters = [...document.querySelectorAll<HTMLElement>("[data-parallax]")].map((el) => ({ el, speed: Number(el.dataset.parallax) || 0 }));
    const fills = [...document.querySelectorAll<HTMLElement>("[data-fill]")].map((el) => ({ el, words: [...el.querySelectorAll<HTMLElement>("[data-word]")] }));
    const growers = [...document.querySelectorAll<HTMLElement>("[data-grow]")];

    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    let vh = window.innerHeight;
    let frame = 0;

    const layout = () => {
      vh = window.innerHeight;
      if (pin) pin.style.top = `${Math.min(0, vh - pin.offsetHeight)}px`;
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;

      if (sheet && pin) {
        // 0 while the sheet is below the fold, 1 once it reaches the top.
        const cover = clamp(1 - sheet.getBoundingClientRect().top / vh);
        if (dim) dim.style.opacity = String(cover * 0.55);
        if (!reduce) pin.style.scale = String(1 - cover * 0.04);
      }
      if (reduce) return;

      if (y < vh * 2) for (const { el, speed } of drifters) el.style.translate = `0 ${(-y * speed).toFixed(1)}px`;

      for (const { el, words } of fills) {
        const r = el.getBoundingClientRect();
        // Starts filling when the heading's top is 85% down the viewport, done by 40%.
        const p = clamp((vh * 0.85 - r.top) / (vh * 0.45));
        const lit = p * words.length;
        words.forEach((w, i) => (w.style.opacity = String(0.18 + 0.82 * clamp(lit - i))));
      }

      for (const el of growers) {
        const r = el.getBoundingClientRect();
        const p = clamp((vh - r.top) / (vh * 0.6));
        el.style.scale = String(0.92 + 0.08 * p);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      layout();
      onScroll();
    };

    layout();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = pin ? new ResizeObserver(onResize) : null;
    if (pin) ro?.observe(pin);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
