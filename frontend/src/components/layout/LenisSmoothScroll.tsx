"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

declare global {
  interface Window {
    __potlyLenis?: Lenis;
  }
}

export function LenisSmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      duration: 1.25,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    window.__potlyLenis = lenis;

    return () => {
      lenis.destroy();
      delete window.__potlyLenis;
    };
  }, []);

  return null;
}
