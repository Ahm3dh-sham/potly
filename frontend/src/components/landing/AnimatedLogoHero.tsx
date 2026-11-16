"use client";

import { useState, type PointerEvent } from "react";
import { ArrowRight, ScanLine } from "lucide-react";

interface AnimatedLogoHeroProps {
  onExplore: () => void;
  onImport: () => void;
}

export function AnimatedLogoHero({
  onExplore,
  onImport,
}: AnimatedLogoHeroProps) {
  const [tilt, setTilt] = useState({ x: -7, y: 3 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setTilt({ x: x * 16 - 3, y: y * -12 + 2 });
  };

  return (
    <section className="potly-hero" aria-labelledby="potly-hero-title">
      <div className="potly-hero-inner">
        <div className="potly-hero-copy">
          <span className="potly-hero-kicker">
            <span className="potly-hero-kicker-dot" />
            A calmer way to cook, together
          </span>
          <h1 id="potly-hero-title">
            Less juggling.
            <br />
            <em>More dinner.</em>
          </h1>
          <p className="potly-hero-description">
            Potly turns recipe links, Reels and family cards into a connected
            cooking flow—measured in katoris, timed together, and ready to finish
            hot.
          </p>
          <div className="potly-hero-actions">
            <button
              type="button"
              onClick={onExplore}
              className="potly-hero-primary btn-press"
            >
              Explore the studio <ArrowRight aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={onImport}
              className="potly-hero-secondary btn-press"
            >
              <ScanLine aria-hidden="true" size={16} /> Import a recipe
            </button>
          </div>
          <div className="potly-hero-proof" aria-label="Potly highlights">
            <div>
              <strong>150 ml</strong>
              <span>katori-perfect</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>38%</strong>
              <span>less active prep</span>
            </div>
            <i aria-hidden="true" />
            <div>
              <strong>4 dishes</strong>
              <span>one hot finish</span>
            </div>
          </div>
        </div>

        <div
          className="potly-hero-scene"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setTilt({ x: -7, y: 3 })}
          aria-label="Animated Potly logo floating on a dark forest espresso stage"
        >
          <div className="potly-hero-backdrop" aria-hidden="true">
            <div className="potly-hero-aura potly-hero-aura-olive" />
            <div className="potly-hero-aura potly-hero-aura-saffron" />
            <div className="potly-hero-aura potly-hero-aura-terracotta" />
            <svg
              className="potly-hero-arch-svg"
              viewBox="0 0 600 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="24"
                y="24"
                width="552"
                height="552"
                rx="22"
                stroke="rgba(233, 234, 222, 0.09)"
                strokeWidth="1"
              />
              <circle
                cx="300"
                cy="300"
                r="228"
                stroke="rgba(223, 155, 53, 0.22)"
                strokeWidth="1"
                strokeDasharray="4 7"
              />
              <circle
                cx="300"
                cy="300"
                r="176"
                stroke="rgba(169, 202, 120, 0.16)"
                strokeWidth="1"
              />
              <circle
                cx="300"
                cy="300"
                r="126"
                stroke="rgba(223, 155, 53, 0.26)"
                strokeWidth="1"
              />
              <path
                d="M 60 300 H 540"
                stroke="rgba(233, 234, 222, 0.06)"
                strokeWidth="1"
              />
              <path
                d="M 300 60 V 540"
                stroke="rgba(233, 234, 222, 0.06)"
                strokeWidth="1"
              />
              <circle cx="300" cy="72" r="2.5" fill="rgba(223, 155, 53, 0.45)" />
              <circle cx="300" cy="528" r="2.5" fill="rgba(223, 155, 53, 0.45)" />
              <circle cx="72" cy="300" r="2.5" fill="rgba(223, 155, 53, 0.45)" />
              <circle cx="528" cy="300" r="2.5" fill="rgba(223, 155, 53, 0.45)" />
            </svg>
            <div className="potly-hero-pedestal-shadow" />
          </div>
          <div className="potly-hero-scene-grain" aria-hidden="true" />

          <span className="potly-hero-stage-tag">
            POTLY STUDIO — KATORI &amp; TIMELINE ENGINE
          </span>

          <div
            className="potly-hero-orbit potly-hero-orbit-one"
            aria-hidden="true"
          />
          <div
            className="potly-hero-orbit potly-hero-orbit-two"
            aria-hidden="true"
          />

          <div
            className="potly-hero-logo-tilt"
            style={{
              transform: `perspective(1100px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            }}
          >
            <div className="potly-hero-logo-float">
              <div className="potly-hero-logo-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-steam-toque.jpg"
                  alt="potly. Steam Toque and Harvest Bowl Logo"
                  className="w-full h-full object-contain rounded-[22px]"
                />
              </div>
            </div>
          </div>

          <span className="potly-hero-caption">
            A little more joy in the everyday.
          </span>
        </div>
      </div>
    </section>
  );
}
