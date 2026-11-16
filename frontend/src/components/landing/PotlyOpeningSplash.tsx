"use client";

import React, { useEffect, useState } from "react";

interface PotlyOpeningSplashProps {
  replayTrigger?: number;
}

type SplashPhase = "entering" | "sliding-out" | "done";

const WORDMARK_CHARS = ["p", "o", "t", "l", "y", "."] as const;

/**
 * Full-viewport opening splash screen matching the Potly mobile launch sequence:
 * warm cream canvas -> harvest bowl & tucked vegetables pop -> fixed-slot
 * sequential pop text ("potly.") -> right-to-left slide-over reveal.
 */
export function PotlyOpeningSplash({
  replayTrigger = 0,
}: PotlyOpeningSplashProps) {
  const [phase, setPhase] = useState<SplashPhase>("entering");

  useEffect(() => {
    setPhase("entering");

    const slideTimer = window.setTimeout(() => {
      setPhase("sliding-out");
    }, 1250);

    const doneTimer = window.setTimeout(() => {
      setPhase("done");
    }, 1700);

    return () => {
      window.clearTimeout(slideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [replayTrigger]);

  if (phase === "done") {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Opening potly."
      className="fixed inset-0 z-[100] pointer-events-auto overflow-hidden"
    >
      <div
        key={replayTrigger}
        className={`w-full h-full bg-[#FAF9F5] flex flex-col items-center justify-center select-none potly-splash-canvas ${
          phase === "sliding-out" ? "potly-splash-canvas-exit" : ""
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Harvest Bowl & Three Tucked Vegetables */}
          <svg
            width={132}
            height={112}
            viewBox="0 0 132 112"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="overflow-visible"
          >
            {/* Left: Dual-lobed leafy green vegetable tilted -16deg */}
            <g className="potly-splash-veg potly-splash-veg-1">
              <g transform="rotate(-16 44 52)">
                <path
                  d="M36 62 C30 48 31 32 41 25 C46 21.5 52 24.5 53 31 C56 27 61 28 62 34 C64 42 58 55 52 62 Z"
                  fill="#4CC764"
                />
                <path
                  d="M44 56 C44 46 44.5 38 45.5 31"
                  stroke="#39A850"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* Center: Tapered orange carrot topped with two-leaf sprout, tilted +14deg */}
            <g className="potly-splash-veg potly-splash-veg-2">
              <g transform="rotate(14 70 50)">
                <path
                  d="M70 25 C65 18 59 17 58 21 C57 24.5 64 26 70 25 Z"
                  fill="#4CC764"
                />
                <path
                  d="M70 25 C73 17 79 16 81 19.5 C82.5 23 76 26 70 25 Z"
                  fill="#4CC764"
                />
                <path
                  d="M60 32 C60 27 79 27 79 32 C79 38 75 56 72.5 63 C71.5 66 67.5 66 66.5 63 C64 56 60 38 60 32 Z"
                  fill="#F68921"
                />
              </g>
            </g>

            {/* Right: Golden-yellow rounded citrus/vegetable */}
            <g className="potly-splash-veg potly-splash-veg-3">
              <circle cx="90" cy="56" r="16" fill="#F8C22E" />
            </g>

            {/* Front Bowl Base & Rim */}
            <g className="potly-splash-bowl">
              <rect
                x="21"
                y="54"
                width="90"
                height="8"
                rx="4"
                fill="#7AB344"
              />
              <path
                d="M22 58 H110 C110 85 91 98 66 98 C41 98 22 85 22 58 Z"
                fill="#8DC655"
              />
            </g>
          </svg>

          {/* Fixed-Slot Left-to-Right Sequential Pop Wordmark */}
          <div
            aria-hidden="true"
            className="mt-2 flex items-baseline justify-center tracking-[-0.04em]"
          >
            {WORDMARK_CHARS.map((char, idx) => (
              <span
                key={idx}
                className="potly-splash-char font-switzer font-extrabold text-[54px] sm:text-[62px] leading-none text-[#8DC655]"
                style={{ animationDelay: `${380 + idx * 115}ms` }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
