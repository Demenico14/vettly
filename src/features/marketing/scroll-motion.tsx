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
 *  data-grow       scales up to 1 as it enters, from its value (default 0.92)
 *  data-float      a floating nav, shown (data-shown) once the hero is mostly scrolled past
 *  data-marquee    a running ticker, paused while it is off screen
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
    const growers = [...document.querySelectorAll<HTMLElement>("[data-grow]")].map((el) => ({ el, from: Number(el.dataset.grow) || 0.92 }));
    const float = document.querySelector<HTMLElement>("[data-float]");

    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    let vh = window.innerHeight;
    let pinned = false;
    let frame = 0;

    const layout = () => {
      vh = window.innerHeight;
      pinned = !!pin && getComputedStyle(pin).position === "sticky";
      // Only a sticky hero gets an offset; on a relative one (phones) top would shift it off screen.
      if (pin) pin.style.top = pinned ? `${Math.min(0, vh - pin.offsetHeight)}px` : "";
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (float) float.toggleAttribute("data-shown", y > vh * 0.85);

      // The pin (and so the sheet covering the hero) only happens where the hero is sticky.
      if (sheet && pin && pinned) {
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
        words.forEach((w, i) => {
          const q = clamp(lit - i);
          w.style.opacity = String(0.15 + 0.85 * q);
          w.style.filter = q >= 1 ? "" : `blur(${((1 - q) * 8).toFixed(1)}px)`;
        });
      }

      for (const { el, from } of growers) {
        const r = el.getBoundingClientRect();
        const p = clamp((vh - r.top) / (vh * 0.7));
        el.style.scale = String(from + (1 - from) * p);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      layout();
      onScroll();
    };

    // Tickers only run while on screen.
    const io = new IntersectionObserver((entries) =>
      entries.forEach((e) => (e.isIntersecting ? (e.target as HTMLElement).removeAttribute("data-paused") : (e.target as HTMLElement).setAttribute("data-paused", ""))),
    );
    document.querySelectorAll("[data-marquee]").forEach((el) => io.observe(el));

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
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
