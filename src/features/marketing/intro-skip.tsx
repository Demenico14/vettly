"use client";

import { useEffect } from "react";

/** Lets any click, key, wheel or touch cut the intro short, and starts the hero's own entrance straight away. */
export function IntroSkip() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".vi");
    if (!el || getComputedStyle(el).display === "none") return;
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, skip));
    function skip() {
      el!.classList.add("is-skipped");
      document.documentElement.style.setProperty("--intro-delay", "0s");
      off();
    }
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    const done = (e: AnimationEvent) => {
      if (e.target === el) off();
    };
    el.addEventListener("animationend", done);
    return () => {
      off();
      el.removeEventListener("animationend", done);
    };
  }, []);
  return null;
}
