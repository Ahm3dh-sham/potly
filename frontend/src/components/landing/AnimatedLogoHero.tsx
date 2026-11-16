"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedLogoHeroProps {
  onExplore: () => void;
  onImport: () => void;
}

function SplitCharText({
  text,
  lineDelayMs = 0,
}: {
  text: string;
  lineDelayMs?: number;
}) {
  return (
    <span className="dm-split-text" aria-hidden="true">
      {Array.from(text).map((char, idx) => (
        <span key={idx} className="dm-char-mask">
          <span
            className="dm-char"
            style={
              {
                "--char-index": idx,
                "--line-delay": `${lineDelayMs}ms`,
              } as React.CSSProperties
            }
          >
            {char === " " ? "\u00A0" : char}
          </span>
        </span>
      ))}
    </span>
  );
}

export function AnimatedLogoHero({
  onExplore,
  onImport,
}: AnimatedLogoHeroProps) {
  const heroMediaRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  const [cardsInView, setCardsInView] = useState(false);
  const [ctaInView, setCtaInView] = useState(false);

  // Scroll-linked parallax backdrop mirroring Don Molinico MotionParallax (-8% -> +8%)
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let frameId = 0;

    const updateParallax = () => {
      frameId = 0;
      const el = heroMediaRef.current;
      if (!el) return;
      const progress = Math.min(
        1,
        Math.max(0, window.scrollY / Math.max(1, window.innerHeight))
      );
      const translateY = -8 + progress * 16;
      el.style.setProperty("--dm-parallax-y", `${translateY.toFixed(3)}%`);
    };

    const onScroll = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateParallax);
      }
    };

    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Observe 3-card fan-out and polygon ribbon CTAs entering viewport
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setCardsInView(true);
      setCtaInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === cardsRef.current) {
            setCardsInView(true);
            observer.unobserve(entry.target);
          } else if (entry.target === ctaRef.current) {
            setCtaInView(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 }
    );

    if (cardsRef.current) observer.observe(cardsRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#f1f3e6] border-b border-[#d3d4c8]">
      {/* =====================================================================
          DON MOLINICO HERO STAGE — Full-bleed scroll-parallax counter scene
          with centered Potly emblem & 3-line monumental character-reveal title
         ===================================================================== */}
      <section className="dm-hero" aria-labelledby="potly-hero-title">
        <div
          ref={heroMediaRef}
          className="dm-hero__media"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/potly-hero-kitchen.webp"
            alt=""
            className="dm-hero__photo"
          />
          <div className="dm-hero__wash" />
          <div className="dm-hero__grain" />
        </div>

        <div className="dm-hero__inner">
          <div className="dm-hero__badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-steam-toque.jpg"
              alt="potly. Steam Toque and Harvest Bowl Logo"
              className="w-full h-full object-contain rounded-[14px]"
            />
          </div>

          <h1
            id="potly-hero-title"
            aria-label="Less juggling, more dinner"
            className="dm-title-large"
          >
            <span className="dm-title-large__line dm-title-large__line--first">
              <span className="dm-title-large__sup dm-title-large__sup--left">
                <span>150 ML</span>
                <span>KATORI</span>
              </span>
              <span className="dm-title-large__word">
                <SplitCharText text="LESS" lineDelayMs={60} />
              </span>
              <span className="dm-title-large__sup dm-title-large__sup--right">
                <span>PARALLEL</span>
                <span>KITCHEN</span>
              </span>
            </span>
            <span className="dm-title-large__line">
              <SplitCharText text="JUGGLING" lineDelayMs={180} />
            </span>
            <span className="dm-title-large__line">
              <SplitCharText text="MORE DINNER" lineDelayMs={300} />
            </span>
          </h1>
        </div>
      </section>

      {/* =====================================================================
          EDITORIAL MANIFESTO + 3-CARD SCROLL FAN-OUT + POLYGON RIBBON CTAS
         ===================================================================== */}
      <section className="dm-showcase-band">
        <div className="dm-manifesto">
          <div className="dm-manifesto__emblem">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-steam-toque.jpg"
              alt="potly. emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="dm-manifesto__title">
            THE RHYTHM OF THE INDIAN HOME KITCHEN
          </p>
          <p className="dm-manifesto__text">
            IN POTLY WE BRING CALM BACK TO EVERYDAY COOKING. FROM SAVED REELS
            AND HANDWRITTEN CARDS TO 150ML KATORI MEASUREMENTS AND PARALLEL
            BURNER TIMELINES — SO EVERY DISH LANDS AT THE TABLE PIPING HOT.
          </p>
        </div>

        {/* 3-Card Scroll Fan-Out Showcase */}
        <div className="dm-cards-wrap">
          <div
            ref={cardsRef}
            className={`dm-cards ${cardsInView ? "is-inview" : ""}`}
          >
            <div className="dm-cards__inner">
              <button
                type="button"
                onClick={onImport}
                className="dm-card dm-card--left text-left cursor-pointer"
              >
                <span className="dm-card__index">01 / IMPORTER</span>
                <div className="dm-card__body">
                  <span className="dm-card__pill">URL • REEL • PHOTO OCR</span>
                  <h2 className="dm-card__heading">
                    KATORI &amp; REEL IMPORTER
                  </h2>
                  <p className="dm-card__copy">
                    Paste any YouTube Short, blog, or handwritten card into strict
                    150ml katori and gram measurements.
                  </p>
                </div>
                <span className="dm-card__action">Import Link / Photo →</span>
              </button>

              <button
                type="button"
                onClick={onExplore}
                className="dm-card dm-card--center text-left cursor-pointer"
              >
                <span className="dm-card__index">02 / TIMELINE</span>
                <div className="dm-card__crest">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-steam-toque.jpg"
                    alt="potly. logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="dm-card__body">
                  <span className="dm-card__pill">COOK TOGETHER ENGINE</span>
                  <h2 className="dm-card__heading">
                    4-DISH PARALLEL TIMELINE
                  </h2>
                  <p className="dm-card__copy">
                    Weave dal, sabzi, tikka, and rice inside passive simmer
                    windows so every bowl lands hot at once.
                  </p>
                </div>
                <span className="dm-card__action">Explore Studio →</span>
              </button>

              <button
                type="button"
                onClick={onExplore}
                className="dm-card dm-card--right text-left cursor-pointer"
              >
                <span className="dm-card__index">03 / HANDS-FREE</span>
                <div className="dm-card__body">
                  <span className="dm-card__pill">WAKE-LOCK VOICE CHEF</span>
                  <h2 className="dm-card__heading">HANDS-FREE VOICE CHEF</h2>
                  <p className="dm-card__copy">
                    Keep your screen awake and ask for quantities, next steps,
                    or parallel timers without touching your phone.
                  </p>
                </div>
                <span className="dm-card__action">Launch Voice Mode →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Polygon Clip-Path Ribbon CTAs */}
        <div ref={ctaRef} className="dm-tasting">
          <button
            type="button"
            onClick={onExplore}
            className={`dm-tasting__link dm-tasting__link--primary btn-press ${
              ctaInView ? "is-inview" : ""
            }`}
          >
            <span className="dm-tasting__link__cta">
              <span className="dm-ml">
                <span className="dm-ml-i" data-label="EXPLORE LIVE STUDIO">
                  EXPLORE LIVE STUDIO
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onImport}
            className={`dm-tasting__link dm-tasting__link--secondary btn-press ${
              ctaInView ? "is-inview" : ""
            }`}
          >
            <span className="dm-tasting__link__cta">
              <span className="dm-ml">
                <span className="dm-ml-i" data-label="IMPORT A RECIPE LINK">
                  IMPORT A RECIPE LINK
                </span>
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
