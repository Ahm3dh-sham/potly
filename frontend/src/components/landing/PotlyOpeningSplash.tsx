"use client";

import React, { useEffect, useState } from "react";

interface PotlyOpeningSplashProps {
  replayTrigger?: number;
}

type SplashPhase = "entering" | "sliding-out" | "done";

const WORDMARK_CHARS = ["p", "o", "t", "l", "y", "."] as const;

export function PotlyOpeningSplash({
  replayTrigger = 0,
}: PotlyOpeningSplashProps) {
  const [phase, setPhase] = useState<SplashPhase>("entering");

  useEffect(() => {
    setPhase("entering");

    const slideTimer = window.setTimeout(() => {
      setPhase("sliding-out");
    }, 1300);

    const doneTimer = window.setTimeout(() => {
      setPhase("done");
    }, 1750);

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
        className={`w-full h-full bg-[#FFFFFF] flex flex-col items-center justify-center select-none potly-splash-canvas ${
          phase === "sliding-out" ? "potly-splash-canvas-exit" : ""
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Official Potly Steam Toque & Harvest Bowl Logo */}
          <div className="potly-splash-bowl w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-steam-toque.jpg"
              alt="potly. Steam Toque and Harvest Bowl Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Fixed-Slot Left-to-Right Sequential Pop Wordmark */}
          <div
            aria-hidden="true"
            className="-mt-2 flex items-baseline justify-center tracking-[-0.04em]"
          >
            {WORDMARK_CHARS.map((char, idx) => (
              <span
                key={idx}
                className={`potly-splash-char font-switzer font-extrabold text-[52px] sm:text-[60px] leading-none ${
                  char === "." ? "text-[#C44D28]" : "text-[#1E1612]"
                }`}
                style={{ animationDelay: `${340 + idx * 115}ms` }}
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
