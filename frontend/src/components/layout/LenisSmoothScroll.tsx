"use client";

import { useEffect } from "react";

interface LenisInstance {
  raf: (time: number) => void;
  on: (event: "scroll", callback: (e: unknown) => void) => void;
  destroy: () => void;
}

type LenisConstructor = new (options?: {
  autoRaf?: boolean;
}) => LenisInstance;

declare global {
  interface Window {
    Lenis?: LenisConstructor;
    __potlyLenis?: LenisInstance;
  }
}

export function LenisSmoothScroll() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let lenis: LenisInstance | null = null;
    let rafId = 0;
    let pollTimer: number | null = null;

    const bootLenis = () => {
      if (!window.Lenis || lenis) return false;

      // Initialize Lenis
      lenis = new window.Lenis();
      window.__potlyLenis = lenis;

      // Use requestAnimationFrame to continuously update the scroll
      function raf(time: number) {
        lenis?.raf(time);
        rafId = window.requestAnimationFrame(raf);
      }

      rafId = window.requestAnimationFrame(raf);
      return true;
    };

    if (!bootLenis()) {
      pollTimer = window.setInterval(() => {
        if (bootLenis() && pollTimer !== null) {
          window.clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 60);
    }

    return () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      lenis?.destroy();
      delete window.__potlyLenis;
    };
  }, []);

  return null;
}
