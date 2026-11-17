"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
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
  GitFork,
  Loader2,
  Mic,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { SlidingNumber } from "@/components/core/sliding-number";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
  useMorphingDialog,
} from "@/components/core/morphing-dialog";
import { ScrollArea } from "@/components/website/scroll-area";
import { IngredientList } from "@/components/recipes/IngredientList";
import { ParallelTimeline } from "@/components/recipes/ParallelTimeline";
import {
  ARCHETYPE_3D_IMAGE,
  getRecipe3DImage,
  getRecipeArchetype,
} from "@/lib/api";
import type {
  NormalizedIngredient,
  Recipe,
  RemixMode,
  UnitSystem,
} from "@/types/recipe";

interface RecipeRemix3DScrollStageProps {
  recipes: Recipe[];
  selectedRecipe: Recipe;
  currentServings: number;
  unitSystem: UnitSystem;
  activeRemixLoading: RemixMode | null;
  remixNote: string;
  isForking: boolean;
  onChangeRemixNote: (note: string) => void;
  onForkRemix: () => void;
  onChangeServings: (servings: number) => void;
  onChangeUnitSystem: (sys: UnitSystem) => void;
  onReplaceIngredient: (
    idx: number,
    replacement: NormalizedIngredient
  ) => void;
  onStartStepTimer: (
    label: string,
    durationSeconds: number,
    stepNumber: number
  ) => void;
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

function resolveDishImage(
  recipe: Recipe,
  failedMap: Record<string, boolean>
): { rawImgSrc: string; imgSrc: string } {
  const rawImgSrc = getRecipe3DImage(recipe);
  const fallback =
    /(mutton|lamb|goat|kulambu|kuzhambu|chettinad|rogan josh|keema)/i.test(
      `${recipe.title} ${recipe.cuisine}`
    )
      ? "/recipes/mutton-kulambu-3d.jpg"
      : ARCHETYPE_3D_IMAGE[getRecipeArchetype(recipe)];
  return {
    rawImgSrc,
    imgSrc: failedMap[rawImgSrc] ? fallback : rawImgSrc,
  };
}

function computeCircularOffset(
  index: number,
  activeIndex: number,
  total: number
): number {
  if (total <= 1) return 0;
  let diff = (index - activeIndex + total) % total;
  if (diff > total / 2) diff -= total;
  return diff;
}

function DishDialogModalActions({
  recipe,
  onSelectRecipe,
  onStartCooking,
}: {
  recipe: Recipe;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
}) {
  const { setIsOpen } = useMorphingDialog();
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#d3d4c8] pt-4">
      <button
        type="button"
        onClick={() => {
          onSelectRecipe(recipe);
          setIsOpen(false);
        }}
        className="btn-press rounded-full border border-[#d3d4c8] bg-[#e9eade] px-4 py-2 text-xs font-semibold text-[#1e1612] hover:border-[#3f6212]"
      >
        Focus in 3D Stage
      </button>
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          onStartCooking(recipe);
        }}
        className="btn-press inline-flex items-center gap-1.5 rounded-full bg-[#3f6212] px-4 py-2 text-xs font-semibold text-[#fcfcfd] hover:bg-[#33500e]"
      >
        <Mic className="h-3.5 w-3.5" />
        <span>Cook Hands-Free</span>
      </button>
    </div>
  );
}

function DishMorphingModalBody({
  recipe,
  imgSrc,
  onImageError,
  onSelectRecipe,
  onStartCooking,
}: {
  recipe: Recipe;
  imgSrc: string;
  onImageError: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
}) {
  const totalMin = recipe.prep_time_minutes + recipe.cook_time_minutes;
  return (
    <MorphingDialogContent
      style={{
        borderRadius: "12px",
      }}
      className="relative h-auto w-[500px] max-w-[92vw] border border-[#d3d4c8] bg-[#f1f3e6] shadow-2xl"
    >
      <ScrollArea className="h-[85vh]" type="scroll">
        <div className="relative p-6">
          <div className="flex justify-center py-6">
            <MorphingDialogImage
              src={imgSrc}
              alt={recipe.title}
              onError={onImageError}
              className="h-auto w-[220px] rounded-[8px] object-cover shadow-[0_14px_24px_rgba(30,22,18,0.14)]"
            />
          </div>
          <div>
            <MorphingDialogTitle className="text-xl font-semibold tracking-tight text-[#1e1612]">
              {recipe.title}
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="mt-1 text-xs font-medium text-[#4d4c4c]">
              {recipe.cuisine} • {totalMin}m • {recipe.servings} servings • ₹
              {Math.round(recipe.estimated_total_cost_inr)}
            </MorphingDialogSubtitle>
            <div className="mt-4 space-y-4 text-sm text-[#333333]">
              <p className="leading-relaxed">{recipe.description}</p>

              <div className="rounded-[10px] border border-[#d3d4c8] bg-[#e9eade] p-3.5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#3f6212]">
                  Ingredients ({recipe.ingredients.length})
                </p>
                <ul className="space-y-1.5 text-xs">
                  {recipe.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between gap-2 border-b border-[#d3d4c8]/60 pb-1 last:border-none last:pb-0"
                    >
                      <span className="font-medium text-[#1e1612]">
                        {ing.name}
                      </span>
                      <span className="shrink-0 font-mono font-semibold text-[#3f6212]">
                        {ing.quantity} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3f6212]">
                  Parallel Prep &amp; Cooking Steps ({recipe.timeline_steps.length})
                </p>
                <ol className="space-y-2 text-xs">
                  {recipe.timeline_steps.map((st) => (
                    <li
                      key={st.step_number}
                      className="rounded-[8px] border border-[#d3d4c8] bg-[#e9eade]/70 p-3"
                    >
                      <p className="font-semibold text-[#1e1612]">
                        {st.step_number}. {st.title}
                      </p>
                      <p className="mt-1 leading-relaxed text-[#4d4c4c]">
                        {st.instruction}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <DishDialogModalActions
              recipe={recipe}
              onSelectRecipe={onSelectRecipe}
              onStartCooking={onStartCooking}
            />
          </div>
        </div>
      </ScrollArea>
      <MorphingDialogClose />
    </MorphingDialogContent>
  );
}

export function RecipeRemix3DScrollStage({
  recipes,
  selectedRecipe,
  currentServings,
  unitSystem,
  activeRemixLoading,
  remixNote,
  isForking,
  onChangeRemixNote,
  onForkRemix,
  onChangeServings,
  onChangeUnitSystem,
  onReplaceIngredient,
  onStartStepTimer,
  onSelectRecipe,
  onTriggerRemix,
  onStartCooking,
}: RecipeRemix3DScrollStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const wheelCooldownRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const [failedImgUrls, setFailedImgUrls] = useState<Record<string, boolean>>(
    {}
  );
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
  const auraScale = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    [0.92, 1.08, 0.94]
  );

  const safeRecipes = recipes.length > 0 ? recipes : [selectedRecipe];
  const rawActiveIndex = safeRecipes.findIndex(
    (r) => r.id === selectedRecipe.id
  );
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

  const scrollToAddDock = () => {
    const el = document.getElementById("add-dish-3d-dock");
    if (!el) return;
    if (window.__potlyLenis) {
      window.__potlyLenis.scrollTo(el, { offset: -96, duration: 1.0 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeScaleFactor =
    selectedRecipe.servings > 0
      ? currentServings / selectedRecipe.servings
      : 1;
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

  const shortDishName = useMemo(() => {
    const cleaned = selectedRecipe.title
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim();
    return cleaned.length > 44
      ? `${cleaned.slice(0, 42).trimEnd()}…`
      : cleaned;
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
      id="dish-3d-studio-top"
      ref={stageRef}
      aria-label="3D Recipes, Remix, and Prep Studio"
      className="scroll-mt-24 relative overflow-hidden rounded-[12px] border border-[#d3d4c8] bg-[#f1f3e6] shadow-[0_18px_50px_rgba(30,22,18,0.06)]"
    >
      {/* Top Studio Header Strip */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#d3d4c8]/80 bg-[#e9eade]/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3f6212] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#fcfcfd]">
            <Flame className="h-3 w-3" />
            Dish Archive
          </span>
          <button
            type="button"
            onClick={scrollToAddDock}
            className="btn-press inline-flex items-center gap-1 rounded-full border border-[#3f6212]/40 bg-[#f1f3e6] px-2.5 py-1 text-[11px] font-semibold text-[#3f6212] hover:bg-[#3f6212] hover:text-[#fcfcfd]"
          >
            <Plus className="h-3 w-3" />
            Add Dish (Reel / YT / Photo)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
        className="relative overflow-hidden px-3 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8"
      >
        {/* Central radial aura matching the Vogue Business / Archrival stage */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[170px] -translate-x-1/2 -translate-y-1/2 sm:top-[215px]"
        >
          <motion.div
            style={{ scale: auraScale }}
            className="h-[340px] w-[340px] rounded-full sm:h-[460px] sm:w-[460px]"
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(223,155,53,0.34) 0%, rgba(196,77,40,0.20) 34%, rgba(63,98,18,0.12) 56%, rgba(241,243,230,0) 74%)",
              }}
            />
          </motion.div>
        </div>

        {/* Subtle editorial watermark coordinates behind center aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-5 z-0 flex items-center justify-between px-6 font-mono text-[10px] uppercase tracking-[0.18em] text-[#4d4c4c]/60 sm:px-10"
        >
          <span>150ML KATORI / 3D STUDIO</span>
          <span>POTLY ARCHIVE</span>
        </div>

        {/* 3-Slot Perspective Stage (Left Flank • Center Spotlight • Right Flank) */}
        <motion.div
          style={{ x: upperTrackDrift, perspective: 1400 }}
          className="relative z-10 mx-auto h-[270px] w-full max-w-[980px] sm:h-[345px]"
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

            const { rawImgSrc, imgSrc } = resolveDishImage(
              recipe,
              failedImgUrls
            );
            const isCustomPhoto =
              imgSrc.startsWith("data:image/") || /^https?:\/\//i.test(imgSrc);

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
                className={`absolute left-1/2 top-0 flex w-[245px] -ml-[122.5px] flex-col items-center sm:w-[320px] sm:-ml-[160px] ${
                  isCenter ? "cursor-default" : "cursor-pointer"
                }`}
              >
                {/* Center Spotlight: Crisp 3D Studio Render */}
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
                  className="relative flex h-[215px] w-[215px] items-center justify-center sm:h-[276px] sm:w-[276px]"
                >
                    {isCenter ? (
                      <MorphingDialog
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 24,
                        }}
                      >
                        <MorphingDialogTrigger
                          style={{ borderRadius: "12px" }}
                          className="group relative flex h-full w-full items-center justify-center focus:outline-none"
                        >
                          {isCustomPhoto ? (
                            <div className="relative h-[196px] w-[196px] overflow-hidden rounded-full border-4 border-[#e9eade] bg-[#f1f3e6] shadow-[0_24px_30px_rgba(30,22,18,0.22)] ring-2 ring-[#C44D28]/40 transition-transform duration-300 group-hover:scale-[1.03] sm:h-[246px] sm:w-[246px]">
                              <MorphingDialogImage
                                src={imgSrc}
                                alt={recipe.title}
                                onError={() =>
                                  setFailedImgUrls((prev) => ({
                                    ...prev,
                                    [rawImgSrc]: true,
                                  }))
                                }
                                className="h-full w-full object-cover select-none"
                              />
                            </div>
                          ) : (
                            <MorphingDialogImage
                              src={imgSrc}
                              alt={recipe.title}
                              className="h-full w-full object-contain drop-shadow-[0_24px_26px_rgba(30,22,18,0.18)] transition-transform duration-300 group-hover:scale-[1.03] select-none"
                              style={{
                                WebkitMaskImage:
                                  "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                                maskImage:
                                  "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                              }}
                            />
                          )}
                          <span className="sr-only">
                            Inspect {recipe.title} image &amp; recipe details
                          </span>
                        </MorphingDialogTrigger>
                        <MorphingDialogContainer>
                          <DishMorphingModalBody
                            recipe={recipe}
                            imgSrc={imgSrc}
                            onImageError={() =>
                              setFailedImgUrls((prev) => ({
                                ...prev,
                                [rawImgSrc]: true,
                              }))
                            }
                            onSelectRecipe={onSelectRecipe}
                            onStartCooking={onStartCooking}
                          />
                        </MorphingDialogContainer>
                      </MorphingDialog>
                    ) : isCustomPhoto ? (
                      <div className="relative h-[196px] w-[196px] overflow-hidden rounded-full border-4 border-[#e9eade] bg-[#f1f3e6] shadow-[0_24px_30px_rgba(30,22,18,0.22)] ring-2 ring-[#C44D28]/40 sm:h-[246px] sm:w-[246px]">
                        <img
                          src={imgSrc}
                          alt={recipe.title}
                          draggable={false}
                          onError={() =>
                            setFailedImgUrls((prev) => ({
                              ...prev,
                              [rawImgSrc]: true,
                            }))
                          }
                          className="h-full w-full object-cover select-none"
                        />
                      </div>
                    ) : (
                      <img
                        src={imgSrc}
                        alt={recipe.title}
                        draggable={false}
                        className="h-full w-full object-contain drop-shadow-[0_14px_16px_rgba(30,22,18,0.10)] transition-transform duration-300 hover:scale-[1.03] select-none"
                        style={{
                          WebkitMaskImage:
                            "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                          maskImage:
                            "radial-gradient(circle at 50% 49%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0) 97%)",
                        }}
                      />
                    )}

                    {isCenter && recipe.remix_note && (
                      <span className="absolute right-2 top-2 rounded-full border border-[#3f6212] bg-[#3f6212] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#fcfcfd] shadow-sm">
                        Remixed
                      </span>
                    )}
                    {isCenter && recipe.id.startsWith("imp-") && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#C44D28] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#fcfcfd] shadow-sm">
                        Added to 3D
                      </span>
                    )}
                </motion.div>

                {/* Side Dish Peek Label (Clickable to bring into spotlight) */}
                {!isCenter && Math.abs(offset) === 1 && (
                  <div className="mt-1 max-w-[220px] text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4d4c4c]">
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
        <div className="relative z-20 mx-auto mt-1 max-w-2xl text-center">
          <div className="space-y-2">
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
            <p className="mx-auto max-w-xl text-xs leading-relaxed text-[#4d4c4c] sm:text-sm">
              {selectedRecipe.description}
            </p>
          </div>
        </div>

        {/* Lower Track: Counter-Gliding 1-Click Remix Wheel */}
        <motion.div
          style={{ x: lowerTrackDrift }}
          className="relative z-20 mx-auto mt-6 max-w-4xl"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3f6212]">
              <Sparkles className="h-3 w-3" />
              Adapt the Recipe
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
        <div className="relative z-20 mx-auto mt-7 max-w-3xl border-t border-[#d3d4c8] pt-6 text-center">
          <p className="text-base leading-[1.75] tracking-[-0.015em] text-[#1e1612] sm:text-xl sm:leading-[1.8]">
            <span className="inline-block rounded-md bg-[#d9f99d] px-2 py-0.5 font-semibold text-[#1a2e05]">
              {shortDishName}
            </span>{" "}
            —{" "}
            <span className="inline-block rounded-md bg-[#fde68a] px-2 py-0.5 font-semibold text-[#451a03]">
              {selectedRecipe.ingredients.length} pantry items
            </span>
            ,{" "}
            <span className="inline-block rounded-md bg-[#fed7aa] px-2 py-0.5 font-semibold text-[#431407]">
              {UNIT_SYSTEM_LABEL[unitSystem]}
            </span>
            ,{" "}
            <span className="inline-block rounded-md bg-[#3f6212] px-2 py-0.5 font-semibold text-[#fcfcfd]">
              {activeProtein}g protein
            </span>{" "}
            per plate ({activeCalories} kcal),{" "}
            <span className="font-mono font-semibold text-[#3f6212]">
              {totalMinutes} min
            </span>{" "}
            start to finish.
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
                  {r.id.startsWith("imp-") ? " ★" : ""}
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

          {/* Dish Image MorphingDialog Gallery Strip */}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-left">
            {safeRecipes.map((r) => {
              const { rawImgSrc: rRawImg, imgSrc: rImgSrc } = resolveDishImage(
                r,
                failedImgUrls
              );
              const isSelectedCard = r.id === selectedRecipe.id;

              return (
                <MorphingDialog
                  key={`morph-${r.id}`}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 24,
                  }}
                >
                  <MorphingDialogTrigger
                    style={{ borderRadius: "6px" }}
                    className={`border transition-colors ${
                      isSelectedCard
                        ? "border-[#3f6212] bg-[#e9eade]"
                        : "border-[#d3d4c8] bg-[#f1f3e6] hover:border-[#3f6212]/70"
                    }`}
                  >
                    <div className="flex items-center space-x-3 p-2.5">
                      <MorphingDialogImage
                        src={rImgSrc}
                        alt={r.title}
                        onError={() =>
                          setFailedImgUrls((prev) => ({
                            ...prev,
                            [rRawImg]: true,
                          }))
                        }
                        className="h-9 w-9 shrink-0 object-cover object-center"
                        style={{ borderRadius: "4px" }}
                      />
                      <div className="flex min-w-0 flex-col items-start justify-center space-y-0">
                        <MorphingDialogTitle className="line-clamp-1 text-[11px] font-semibold text-[#1e1612] sm:text-xs">
                          {r.title}
                        </MorphingDialogTitle>
                        <MorphingDialogSubtitle className="line-clamp-1 text-[10px] text-[#4d4c4c] sm:text-[11px]">
                          {r.cuisine} • ₹{Math.round(r.estimated_total_cost_inr)}
                        </MorphingDialogSubtitle>
                      </div>
                    </div>
                  </MorphingDialogTrigger>
                  <MorphingDialogContainer>
                    <DishMorphingModalBody
                      recipe={r}
                      imgSrc={rImgSrc}
                      onImageError={() =>
                        setFailedImgUrls((prev) => ({
                          ...prev,
                          [rRawImg]: true,
                        }))
                      }
                      onSelectRecipe={onSelectRecipe}
                      onStartCooking={onStartCooking}
                    />
                  </MorphingDialogContainer>
                </MorphingDialog>
              );
            })}
          </div>
        </div>

        {/* Integrated Prep & Katori Workspace inside the 3D Studio */}
        <div className="relative z-20 mx-auto mt-8 max-w-6xl border-t border-[#d3d4c8] pt-6 space-y-6">
          {/* Save Personal Note / Version Fork Bar */}
          <div className="flex flex-col gap-3 rounded-[10px] border border-[#d3d4c8] bg-[#e9eade] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3f6212]">
                Dish Prep &amp; Ingredients
              </span>
              <span className="text-xs text-[#4d4c4c]">
                Synced live with{" "}
                <strong className="text-[#1e1612]">{shortDishName}</strong>
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:min-w-[360px]">
              <label htmlFor="remix-note-input" className="sr-only">
                Personal recipe note
              </label>
              <input
                id="remix-note-input"
                type="text"
                value={remixNote}
                onChange={(e) => onChangeRemixNote(e.target.value)}
                placeholder="Add personal note (e.g., extra ginger, less chili)..."
                className="flex-1 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-4 py-2 text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:border-[#3f6212] focus:outline-none"
              />
              <button
                type="button"
                disabled={isForking}
                onClick={onForkRemix}
                className="btn-press inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-4 py-2 text-xs font-semibold text-[#000000] hover:border-[#3f6212]"
              >
                <GitFork className="h-3.5 w-3.5 text-[#3f6212]" />
                <span>{isForking ? "Saving..." : "Save My Version"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <IngredientList
                recipeTitle={selectedRecipe.title}
                baseServings={selectedRecipe.servings}
                currentServings={currentServings}
                onChangeServings={onChangeServings}
                unitSystem={unitSystem}
                onChangeUnitSystem={onChangeUnitSystem}
                ingredients={selectedRecipe.ingredients}
                onReplaceIngredient={onReplaceIngredient}
              />
            </div>
            <div className="lg:col-span-7">
              <ParallelTimeline
                steps={selectedRecipe.timeline_steps}
                onStartStepTimer={onStartStepTimer}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
