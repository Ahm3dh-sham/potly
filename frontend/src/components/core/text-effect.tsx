"use client";

import React from "react";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "framer-motion";

export type PresetType = "blur" | "fade-in-blur" | "scale" | "fade" | "slide";
export type PerType = "word" | "char" | "line";

export interface TextEffectProps {
  children: string;
  per?: PerType;
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  trigger?: boolean;
  inView?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
}

const defaultStaggerTimes: Record<PerType, number> = {
  char: 0.035,
  word: 0.1,
  line: 0.14,
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const defaultItemTransition: Transition = {
  duration: 0.62,
  ease: [0.22, 1, 0.36, 1],
};

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(12px)" },
      visible: {
        opacity: 1,
        filter: "blur(0px)",
        transition: defaultItemTransition,
      },
      exit: { opacity: 0, filter: "blur(12px)" },
    },
  },
  "fade-in-blur": {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 24, filter: "blur(12px)" },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: defaultItemTransition,
      },
      exit: { opacity: 0, y: 24, filter: "blur(12px)" },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: { opacity: 1, scale: 1, transition: defaultItemTransition },
      exit: { opacity: 0, scale: 0.85 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: defaultItemTransition },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: "105%" },
      visible: {
        opacity: 1,
        y: "0%",
        transition: defaultItemTransition,
      },
      exit: { opacity: 0, y: "105%" },
    },
  },
};

const wrapperPassthroughVariants: Variants = {
  hidden: {},
  visible: {},
  exit: {},
};

export function TextEffect({
  children,
  per = "word",
  as = "p",
  variants,
  className = "",
  preset = "slide",
  delay = 0,
  trigger = true,
  inView = false,
  onAnimationComplete,
  segmentWrapperClassName = "",
}: TextEffectProps) {
  const segments =
    per === "line"
      ? children.split("\n")
      : per === "word"
        ? children.split(/(\s+)/)
        : children.split("");

  const MotionTag = motion[
    as as keyof typeof motion
  ] as React.ComponentType<{
    initial?: string;
    animate?: string;
    whileInView?: string;
    viewport?: { once?: boolean; amount?: number };
    exit?: string;
    variants?: Variants;
    className?: string;
    onAnimationComplete?: () => void;
    children?: React.ReactNode;
  }>;

  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: presetVariants.slide.item };

  const baseContainer = variants?.container ?? selectedVariants.container;
  const visibleVariant = baseContainer.visible as
    | TargetAndTransition
    | undefined;
  const visibleTransition =
    visibleVariant &&
    typeof visibleVariant === "object" &&
    "transition" in visibleVariant
      ? (visibleVariant.transition as Transition | undefined)
      : undefined;

  const containerVariants: Variants = {
    ...baseContainer,
    visible: {
      ...visibleVariant,
      transition: {
        ...visibleTransition,
        staggerChildren:
          (visibleTransition as { staggerChildren?: number } | undefined)
            ?.staggerChildren ?? defaultStaggerTimes[per],
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = variants?.item ?? selectedVariants.item;

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          initial="hidden"
          animate={inView ? undefined : "visible"}
          whileInView={inView ? "visible" : undefined}
          viewport={inView ? { once: true, amount: 0.25 } : undefined}
          exit="exit"
          variants={containerVariants}
          className={className || undefined}
          onAnimationComplete={onAnimationComplete}
        >
          {segments.map((segment, index) => {
            if (/^\s+$/.test(segment)) {
              return <span key={`space-${index}`}>{segment}</span>;
            }
            return (
              <motion.span
                key={`seg-${index}`}
                variants={wrapperPassthroughVariants}
                className={`inline-block overflow-hidden align-bottom pb-[0.04em] ${segmentWrapperClassName}`.trim()}
              >
                <motion.span
                  variants={itemVariants}
                  className="inline-block whitespace-pre will-change-transform"
                >
                  {segment}
                </motion.span>
              </motion.span>
            );
          })}
        </MotionTag>
      )}
    </AnimatePresence>
  );
}

export function TextEffectWithPreset() {
  return (
    <TextEffect per="word" as="h3" preset="slide">
      Animate your ideas with motion-primitives
    </TextEffect>
  );
}
