"use client";

import { useEffect } from "react";

interface LenisInstance {
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
    let pollTimer: number | null = null;

    const bootLenis = () => {
      if (!window.Lenis || lenis) return false;
      lenis = new window.Lenis({
        autoRaf: true,
      });
      lenis.on("scroll", (e) => {
        console.log(e);
      });
      window.__potlyLenis = lenis;
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
      lenis?.destroy();
      delete window.__potlyLenis;
    };
  }, []);

  return null;
}
