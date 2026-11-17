"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { SlidingNumber } from "@/components/core/sliding-number";
import { getRecipe3DImage } from "@/lib/api";
import type { Recipe, RemixMode, UnitSystem } from "@/types/recipe";

interface RecipeRemix3DScrollStageProps {
  recipes: Recipe[];
  selectedRecipe: Recipe;
  currentServings: number;
  unitSystem: UnitSystem;
  activeRemixLoading: RemixMode | null;
  onSelectRecipe: (recipe: Recipe) => void;
  onTriggerRemix: (mode: RemixMode) => void;
  onStartCooking: (recipe: Recipe) => void;
}

interface RemixTrackItem {
  id: string;
  mode: RemixMode | null;
  title: string;
  badge: string;
  subtitle: string;
  accentHex: string;
  textHex: string;
}

const REMIX_TRACK_ITEMS: RemixTrackItem[] = [
  {
    id: "original",
    mode: null,
    title: "Chef Original",
    badge: "Balanced",
    subtitle: "Authentic regional spec",
    accentHex: "#e9eade",
    textHex: "#1e1612",
  },
  {
    id: "high_protein",
    mode: "high_protein",
    title: "High-Protein",
    badge: "+40% Protein",
    subtitle: "Boosts paneer, dal, curd or meat",
    accentHex: "#d9f99d",
    textHex: "#1a2e05",
  },
  {
    id: "jain_no_onion_garlic",
    mode: "jain_no_onion_garlic",
    title: "Jain Remix",
    badge: "No Onion-Garlic",
    subtitle: "Hing & fresh ginger aromatic swap",
    accentHex: "#fde68a",
    textHex: "#451a03",
  },
  {
    id: "vegan",
    mode: "vegan",
    title: "Plant-Based",
    badge: "100% Vegan",
    subtitle: "Organic tofu & cashew malai",
    accentHex: "#bbf7d0",
    textHex: "#064e3b",
  },
  {
    id: "air_fryer",
    mode: "air_fryer",
    title: "Air-Fryer",
    badge: "-65% Oil",
    subtitle: "200°C convection char finish",
    accentHex: "#fed7aa",
    textHex: "#431407",
  },
];

const UNIT_SYSTEM_LABEL: Record<UnitSystem, string> = {
  indian: "150ml Katoris",
  metric: "Metric Grams",
  imperial: "US Cups & Oz",
};

function computeCircularOffset(index: number, activeIndex: number, total: number): number {
  if (total <= 1) return 0;
  let diff = (index - activeIndex + total) % total;
  if (diff > total / 2) diff -= total;
  return diff;
}

export function RecipeRemix3DScrollStage({
  recipes,
  selectedRecipe,
  currentServings,
  unitSystem,
  activeRemixLoading,
  onSelectRecipe,
  onTriggerRemix,
  onStartCooking,
}: RecipeRemix3DScrollStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelCooldownRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const [pointerTilt, setPointerTilt] = useState<{ rx: number; ry: number }>({
    rx: 0,
    ry: 0,
  });

  // Scroll-linked 3D counter-drift (inspired by Vogue Business / Archrival dual-track scroll)
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });
  const upperTrackDrift = useTransform(smoothProgress, [0, 1], [16, -16]);
  const lowerTrackDrift = useTransform(smoothProgress, [0, 1], [-12, 12]);
  const auraScale = useTransform(smoothProgress, [0, 0.5, 1], [0.92, 1.08, 0.94]);

  const safeRecipes = recipes.length > 0 ? recipes : [selectedRecipe];
  const rawActiveIndex = safeRecipes.findIndex((r) => r.id === selectedRecipe.id);
  const activeIndex = rawActiveIndex >= 0 ? rawActiveIndex : 0;

  const stepRecipe = useCallback(
    (delta: number) => {
      if (safeRecipes.length <= 1) return;
      const nextIdx =
        (activeIndex + delta + safeRecipes.length) % safeRecipes.length;
      const next = safeRecipes[nextIdx];
      if (next) {
        onSelectRecipe(next);
      }
    },
    [activeIndex, onSelectRecipe, safeRecipes]
  );

  // Horizontal wheel / trackpad gesture cycles recipes without blocking vertical page scroll
  const handleWheelOnStage = (e: React.WheelEvent<HTMLDivElement>) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    if (absX > absY && absX > 18) {
      const now = Date.now();
      if (now - wheelCooldownRef.current < 320) return;
      wheelCooldownRef.current = now;
      stepRecipe(e.deltaX > 0 ? 1 : -1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (startX === null || endX === undefined) return;
    const dx = endX - startX;
    if (Math.abs(dx) > 42) {
      stepRecipe(dx < 0 ? 1 : -1);
    }
  };

  const handlePointerMoveCenter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setPointerTilt({
      rx: Number((-ny * 7).toFixed(2)),
      ry: Number((nx * 9).toFixed(2)),
    });
  };

  const activeScaleFactor =
    selectedRecipe.servings > 0 ? currentServings / selectedRecipe.servings : 1;
  const activeCostInr = Math.round(
    selectedRecipe.estimated_total_cost_inr * activeScaleFactor
  );
  const activeCalories = Math.round(
    selectedRecipe.ingredients.reduce(
      (sum, ing) => sum + (ing.nutrition_meta.calories_kcal ?? 0),
      0
    ) / Math.max(1, selectedRecipe.servings)
  );
  const activeProtein = Math.round(
    selectedRecipe.ingredients.reduce(
      (sum, ing) => sum + (ing.nutrition_meta.protein_g ?? 0),
      0
    ) / Math.max(1, selectedRecipe.servings)
  );
  const totalMinutes =
    selectedRecipe.prep_time_minutes + selectedRecipe.cook_time_minutes;

  // Short scannable dish headline for the editorial pill strip
  const shortDishName = useMemo(() => {
    const cleaned = selectedRecipe.title.replace(/\s*\([^)]*\)\s*$/g, "").trim();
    return cleaned.length > 44 ? `${cleaned.slice(0, 42).trimEnd()}…` : cleaned;
  }, [selectedRecipe.title]);

  const activeRemixKey = selectedRecipe.remix_mode ?? "original";

  const handleRemixCardClick = (item: RemixTrackItem) => {
    if (item.mode === null) {
      if (selectedRecipe.parent_recipe_id) {
        const parent = safeRecipes.find(
          (r) => r.id === selectedRecipe.parent_recipe_id
        );
        if (parent) {
          onSelectRecipe(parent);
          return;
        }
      }
      return;
    }
    if (activeRemixLoading !== null) return;
    onTriggerRemix(item.mode);
  };

  return (
    <section
      ref={stageRef}
      aria-label="3D Recipes and Remix Showcase"
      className="relative mb-8 overflow-hidden rounded-[12px] border border-[#d3d4c8] bg-[#f1f3e6] shadow-[0_18px_50px_rgba(30,22,18,0.06)]"
    >
      {/* Top Studio Header Strip */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#d3d4c8]/80 bg-[#e9eade]/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3f6212] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#fcfcfd]">
            <Flame className="h-3 w-3" />
            3D Dish &amp; Remix Stage
          </span>
          <span className="text-xs font-medium text-[#4d4c4c]">
            Swipe, scroll sideways, or tap side plates to mix &amp; remix
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#1e1612] tabular-nums">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(safeRecipes.length).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => stepRecipe(-1)}
              aria-label="Previous 3D dish"
              className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d3d4c8] bg-[#f1f3e6] text-[#1e1612] hover:border-[#3f6212]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => stepRecipe(1)}
              aria-label="Next 3D dish"
              className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d3d4c8] bg-[#f1f3e6] text-[#1e1612] hover:border-[#3f6212]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Central Culinary Radial Aura + Upper 3D Plated Dish Carousel */}
      <div
        onWheel={handleWheelOnStage}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden px-3 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6"
      >
        {/* Central radial aura matching the Vogue Business / Archrival stage */}
        <motion.div
          aria-hidden="true"
          style={{ scale: auraScale }}
          className="pointer-events-none absolute left-1/2 top-[44%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[460px] sm:w-[460px]"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(223,155,53,0.34) 0%, rgba(196,77,40,0.20) 34%, rgba(63,98,18,0.12) 56%, rgba(241,243,230,0) 74%)",
            }}
          />
        </motion.div>

        {/* Subtle editorial watermark coordinates behind center aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-5 z-0 flex items-center justify-between px-6 text-[10px] font-mono uppercase tracking-[0.18em] text-[#4d4c4c]/60 sm:px-10"
        >
          <span>150ML KATORI / 3D STUDIO</span>
          <span>POTLY ARCHIVE</span>
        </div>

        {/* 3-Slot Perspective Stage (Left Flank • Center Spotlight • Right Flank) */}
        <motion.div
          style={{ x: upperTrackDrift, perspective: 1400 }}
          className="relative z-10 mx-auto h-[290px] w-full max-w-[980px] sm:h-[360px]"
        >
          {safeRecipes.map((recipe, idx) => {
            const offset = computeCircularOffset(
              idx,
              activeIndex,
              safeRecipes.length
            );
            const isCenter = offset === 0;
            const isVisible = Math.abs(offset) <= 2;
            if (!isVisible) return null;

            const imgSrc = getRecipe3DImage(recipe);

            const targetX =
              offset === 0
                ? "0%"
                : offset === -1
                  ? "-76%"
                  : offset === 1
                    ? "76%"
                    : offset < 0
                      ? "-145%"
                      : "145%";
            const targetScale =
              offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.72 : 0.54;
            const targetRotateY =
              offset === 0 ? 0 : offset < 0 ? 22 : -22;
            const targetZ = offset === 0 ? 32 : -110;
            const targetOpacity =
              offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.78 : 0;

            return (
              <motion.div
                key={recipe.id}
                initial={false}
                animate={{
                  x: targetX,
                  z: targetZ,
                  scale: targetScale,
                  rotateY: targetRotateY,
                  opacity: targetOpacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 230,
                  damping: 26,
                  mass: 0.75,
                }}
                style={{
                  zIndex: isCenter ? 30 : Math.abs(offset) === 1 ? 20 : 10,
                  transformStyle: "preserve-3d",
                  pointerEvents: Math.abs(offset) <= 1 ? "auto" : "none",
                }}
                onClick={() => {
                  if (!isCenter) onSelectRecipe(recipe);
                }}
                onPointerMove={isCenter ? handlePointerMoveCenter : undefined}
                onPointerLeave={
                  isCenter ? () => setPointerTilt({ rx: 0, ry: 0 }) : undefined
                }
                role={isCenter ? undefined : "button"}
                tabIndex={isCenter ? undefined : 0}
                aria-label={isCenter ? undefined : `Inspect ${recipe.title}`}
                onKeyDown={
                  isCenter
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectRecipe(recipe);
                        }
                      }
                }
                className={`absolute left-1/2 top-0 flex w-[235px] -ml-[117.5px] flex-col items-center sm:w-[310px] sm:-ml-[155px] ${
                  isCenter ? "cursor-default" : "cursor-pointer"
                }`}
              >
                {/* 3D Floating Plated Render */}
                <motion.div
                  animate={
                    isCenter
                      ? {
                          rotateX: pointerTilt.rx,
                          rotateY: pointerTilt.ry,
                        }
                      : { rotateX: 0, rotateY: 0 }
                  }
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  className="relative flex h-[210px] w-[210px] items-center justify-center sm:h-[272px] sm:w-[272px]"
                >
                  <img
                    src={imgSrc}
                    alt={recipe.title}
                    draggable={false}
                    className={`h-full w-full object-contain transition-transform duration-300 select-none ${
                      isCenter
                        ? "drop-shadow-[0_24px_26px_rgba(30,22,18,0.18)]"
                        : "hover:scale-[1.03] drop-shadow-[0_14px_16px_rgba(30,22,18,0.10)]"
                    }`}
                    style={{
                      WebkitMaskImage:
                        "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                      maskImage:
                        "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                    }}
                  />

                  {isCenter && recipe.remix_note && (
                    <span className="absolute right-2 top-2 rounded-full border border-[#3f6212] bg-[#3f6212] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#fcfcfd] shadow-sm">
                      Remixed
                    </span>
                  )}
                </motion.div>

                {/* Side Dish Peek Label (Clickable to bring into spotlight) */}
                {!isCenter && Math.abs(offset) === 1 && (
                  <div className="mt-1 max-w-[190px] text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#4d4c4c]">
                      {recipe.cuisine}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#1e1612]">
                      {recipe.title}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Active Center Recipe Nameplate & Animated Live Price / Stats */}
        <div className="relative z-20 mx-auto -mt-3 max-w-2xl text-center sm:-mt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRecipe.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-2"
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium">
                <span className="rounded-full bg-[#3f6212] px-2.5 py-0.5 font-semibold text-[#fcfcfd]">
                  {selectedRecipe.cuisine}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d3d4c8] bg-[#e9eade] px-2.5 py-0.5 text-[#1e1612] tabular-nums">
                  <Clock className="h-3 w-3 text-[#3f6212]" />
                  {totalMinutes}m
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#d3d4c8] bg-[#e9eade] px-2.5 py-0.5 text-[#1e1612] tabular-nums">
                  <Users className="h-3 w-3 text-[#3f6212]" />
                  {currentServings} servings
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-[#3f6212]/40 bg-[#f1f3e6] px-2.5 py-0.5 font-mono font-bold text-[#3f6212]">
                  ₹<SlidingNumber value={activeCostInr} />
                </span>
              </div>

              <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#1e1612] sm:text-3xl">
                {selectedRecipe.title}
              </h3>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Lower Track: Counter-Gliding 1-Click Remix Wheel (Matches Reference Mix-and-Match Bottom Track) */}
        <motion.div
          style={{ x: lowerTrackDrift }}
          className="relative z-20 mx-auto mt-6 max-w-4xl"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3f6212]">
              <Sparkles className="h-3 w-3" />
              Lower Track • 1-Click Remix Layer
            </span>
            {selectedRecipe.parent_recipe_id && (
              <button
                type="button"
                onClick={() => handleRemixCardClick(REMIX_TRACK_ITEMS[0]!)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4d4c4c] hover:text-[#1e1612]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Original
              </button>
            )}
          </div>

          <div
            role="radiogroup"
            aria-label="1-Click Recipe Remix Options"
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {REMIX_TRACK_ITEMS.map((item) => {
              const isActiveRemix = activeRemixKey === item.id;
              const isLoading =
                item.mode !== null && activeRemixLoading === item.mode;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={activeRemixLoading !== null}
                  aria-pressed={isActiveRemix}
                  onClick={() => handleRemixCardClick(item)}
                  className={`btn-press relative overflow-hidden rounded-[10px] border p-3 text-left transition-all ${
                    isActiveRemix
                      ? "border-[#3f6212] bg-[#14190f] text-[#fcfcfd] shadow-md"
                      : "border-[#d3d4c8] bg-[#e9eade]/90 text-[#1e1612] hover:border-[#3f6212]/70 hover:bg-[#e9eade]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      style={{
                        backgroundColor: item.accentHex,
                        color: item.textHex,
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {item.badge}
                    </span>
                    {isLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#d9f99d]" />
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      isActiveRemix ? "text-[#fcfcfd]" : "text-[#1e1612]"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`mt-0.5 line-clamp-1 text-[11px] ${
                      isActiveRemix ? "text-[#d3d4c8]" : "text-[#4d4c4c]"
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Vogue Business / Archrival-Inspired Editorial Pill-Highlighted Story Strip */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-20 mx-auto mt-7 max-w-3xl border-t border-[#d3d4c8] pt-6 text-center"
        >
          <p className="text-base leading-[1.75] tracking-[-0.015em] text-[#1e1612] sm:text-xl sm:leading-[1.8]">
            Plating{" "}
            <span className="inline-block rounded-md bg-[#d9f99d] px-2 py-0.5 font-semibold text-[#1a2e05]">
              {shortDishName}
            </span>{" "}
            with{" "}
            <span className="inline-block rounded-md bg-[#fde68a] px-2 py-0.5 font-semibold text-[#451a03]">
              {selectedRecipe.ingredients.length} ingredients
            </span>{" "}
            measured in{" "}
            <span className="inline-block rounded-md bg-[#fed7aa] px-2 py-0.5 font-semibold text-[#431407]">
              {UNIT_SYSTEM_LABEL[unitSystem]}
            </span>{" "}
            delivers{" "}
            <span className="inline-block rounded-md bg-[#3f6212] px-2 py-0.5 font-semibold text-[#fcfcfd]">
              {activeProtein}g protein
            </span>{" "}
            ({activeCalories} kcal) per serving — ready in{" "}
            <span className="font-mono font-semibold text-[#3f6212]">
              {totalMinutes} min
            </span>
            .
          </p>

          {/* Bottom Dish Scrubber Pills + Direct Cook CTA */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {safeRecipes.map((r, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRecipe(r)}
                  aria-label={`Jump to ${r.title}`}
                  className={`btn-press h-7 rounded-full border px-2.5 font-mono text-[11px] font-semibold tabular-nums transition-colors ${
                    active
                      ? "border-[#3f6212] bg-[#3f6212] text-[#fcfcfd]"
                      : "border-[#d3d4c8] bg-[#e9eade] text-[#4d4c4c] hover:border-[#3f6212] hover:text-[#1e1612]"
                  }`}
                >
                  {String(idx + 1).padStart(2, "0")}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onStartCooking(selectedRecipe)}
              className="btn-press ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#C44D28] px-4 py-1.5 text-xs font-semibold text-[#fcfcfd] hover:bg-[#a83e1d]"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Cook Hands-Free</span>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
