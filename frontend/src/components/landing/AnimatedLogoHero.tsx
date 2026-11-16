"use client";

import { useState, type PointerEvent } from "react";
import { ArrowRight, ScanLine } from "lucide-react";
import { MiseFoodGlyph } from "@/components/brand/MiseFoodLogo";

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
          aria-label="Animated Potly logo floating inside a warm sculptural studio scene"
        >
          <div className="potly-hero-backdrop" aria-hidden="true">
            <div className="potly-hero-aura potly-hero-aura-terracotta" />
            <div className="potly-hero-aura potly-hero-aura-saffron" />
            <div className="potly-hero-aura potly-hero-aura-sage" />
            <svg
              className="potly-hero-arch-svg"
              viewBox="0 0 600 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="300"
                cy="300"
                r="230"
                stroke="rgba(196, 77, 40, 0.12)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <circle
                cx="300"
                cy="300"
                r="175"
                stroke="rgba(30, 22, 18, 0.08)"
                strokeWidth="1"
              />
              <circle
                cx="300"
                cy="300"
                r="122"
                stroke="rgba(223, 155, 53, 0.2)"
                strokeWidth="1"
              />
              <path
                d="M 70 300 H 530"
                stroke="rgba(30, 22, 18, 0.05)"
                strokeWidth="1"
              />
              <path
                d="M 300 70 V 530"
                stroke="rgba(30, 22, 18, 0.05)"
                strokeWidth="1"
              />
            </svg>
            <div className="potly-hero-pedestal-shadow" />
          </div>
          <div className="potly-hero-scene-grain" aria-hidden="true" />

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
                <MiseFoodGlyph size={250} />
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
