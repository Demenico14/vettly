import type { CSSProperties } from "react";
import { IntroSkip } from "./intro-skip";

/**
 * The front page's opening: two collaborators build the Vettly mark on a black canvas, then the canvas lifts away.
 * The Vettly cursor (copper, the colour of an unreviewed suggestion) draws a selection and the copper leaf appears;
 * the HR cursor (green, a person's confirmation) clicks and the green leaf completes the V; the wordmark types in.
 *
 * It runs entirely on CSS keyframes (globals.css, "Front page intro"), so it finishes on its own even without
 * JavaScript. The inline script below hides it before first paint on a repeat visit in the same tab session, or
 * when the visitor prefers reduced motion. Any click, key, wheel or touch skips it (IntroSkip).
 */

// The mark's geometry, from src/components/brand/logo.tsx (dark-surface colours).
const LEFT = "M48 84 Q50.5 35.3 10 8 Q7.5 56.7 48 84 Z";
const RIGHT = "M52 84 Q49.5 35.3 90 8 Q92.5 56.7 52 84 Z";
const LEFT_RIB = "M45 78 L20 28";
const RIGHT_RIB = "M55 78 L80 28";

const SKIP = `try{var r=matchMedia("(prefers-reduced-motion: reduce)").matches;if(r||sessionStorage.getItem("vettly-intro")){var s=document.createElement("style");s.textContent=".vi{display:none!important}:root{--intro-delay:0s}";document.head.appendChild(s)}else{sessionStorage.setItem("vettly-intro","1")}}catch(e){}`;

export function IntroLoader() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SKIP }} />
      <div className="vi" aria-hidden>
        <div className="vi-panel">
          <div className="vi-avatars">
            <span className="vi-av vi-av-ai">V</span>
            <span className="vi-av vi-av-hr">HR</span>
          </div>

          <div className="vi-stage">
            <div className="vi-mark">
              <svg viewBox="0 0 100 88" className="vi-svg">
                <g className="vi-leaf-l">
                  <path d={LEFT} fill="#DB7A4A" />
                  <path d={LEFT_RIB} stroke="#0B0C0B" strokeWidth="2.6" strokeLinecap="round" />
                </g>
                <g className="vi-leaf-r">
                  <path d={RIGHT} fill="#5FB08D" stroke="#0B0C0B" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" />
                  <path d={RIGHT_RIB} stroke="#0B0C0B" strokeWidth="2.6" strokeLinecap="round" />
                </g>
              </svg>
              <span className="vi-select">
                <i className="vi-h vi-h-tl" />
                <i className="vi-h vi-h-tr" />
                <i className="vi-h vi-h-bl" />
                <i className="vi-h vi-h-br" />
                <span className="vi-select-label">Suggested</span>
              </span>
              <span className="vi-ripple" />
              <Cursor className="vi-cursor-ai" label="Vettly" />
              <Cursor className="vi-cursor-hr" label="HR" />
            </div>
            <p className="vi-word">
              {"Vettly".split("").map((ch, i) => (
                <span key={i} style={{ "--i": i } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </p>
          </div>

          <p className="vi-status">
            <span className="vi-s1">
              <i className="bg-[#DB7A4A]" />
              Vettly is suggesting
            </span>
            <span className="vi-s2">
              <i className="bg-[#5FB08D]" />
              HR is confirming
            </span>
            <span className="vi-s3">
              <i className="bg-white" />
              Shortlist ready
            </span>
          </p>
          <p className="vi-count" />
        </div>
      </div>
      <IntroSkip />
    </>
  );
}

function Cursor({ className, label }: { className: string; label: string }) {
  return (
    <span className={`vi-cursor ${className}`}>
      <svg viewBox="0 0 16 21" className="vi-arrow">
        <path d="M1 1 L1 17 L5.4 12.8 L8.6 20 L11.6 18.7 L8.5 11.6 L14.6 11.6 Z" fill="currentColor" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="vi-tag">{label}</span>
    </span>
  );
}
