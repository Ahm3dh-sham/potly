"use client";

import React, { useEffect, useState } from "react";
import { type ActiveTab } from "@/components/layout/AppShell";
import { EloqwntLandingShell } from "@/components/landing/EloqwntLandingShell";
import { HandsFreeCookView } from "@/components/cooking/HandsFreeCookView";
import { PantryRescueView } from "@/components/pantry/PantryRescueView";
import { AddDishTo3DStudioCard } from "@/components/recipes/AddDishTo3DStudioCard";
import { OcrImporterModal } from "@/components/recipes/OcrImporterModal";
import { RecipeRemix3DScrollStage } from "@/components/recipes/RecipeRemix3DScrollStage";
import { SocialCookbooksView } from "@/components/social/SocialCookbooksView";
import { KineticPrepTimeline } from "@/components/timeline/KineticPrepTimeline";
import { useParallelTimers } from "@/hooks/useParallelTimers";
import {
  FALLBACK_RECIPES,
  fetchRecipes,
  forkRecipeOnServer,
  remixRecipeWithAI,
} from "@/lib/api";
import type {
  NormalizedIngredient,
  Recipe,
  RemixMode,
  UnitSystem,
} from "@/types/recipe";

export default function MiseFoodWorkspacePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hub");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("indian");
  const [recipes, setRecipes] = useState<Recipe[]>(FALLBACK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(
    FALLBACK_RECIPES[0]!
  );
  const [currentServings, setCurrentServings] = useState<number>(
    FALLBACK_RECIPES[0]?.servings ?? 3
  );
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [remixNote, setRemixNote] = useState("");
  const [isForking, setIsForking] = useState(false);
  const [activeRemixLoading, setActiveRemixLoading] =
    useState<RemixMode | null>(null);

  const {
    timers,
    startTimer,
    toggleTimer,
    dismissTimer,
    pauseAllTimers,
  } = useParallelTimers();

  const reloadRecipes = async (q?: string) => {
    const loaded = await fetchRecipes(q);
    if (loaded.length > 0) {
      setRecipes(loaded);
      setSelectedRecipe((prev) => {
        const match = loaded.find((r) => r.id === prev.id);
        return match ?? loaded[0]!;
      });
    }
  };

  useEffect(() => {
    void reloadRecipes();
  }, []);

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentServings(recipe.servings);
  };

  const handleReplaceIngredient = (
    idx: number,
    replacement: NormalizedIngredient
  ) => {
    setSelectedRecipe((prev) => {
      const nextIngs = [...prev.ingredients];
      nextIngs[idx] = replacement;
      const recalculatedCost = nextIngs.reduce(
        (sum, ing) => sum + (ing.nutrition_meta?.estimated_cost_inr ?? 25),
        0
      );
      const updated: Recipe = {
        ...prev,
        ingredients: nextIngs,
        estimated_total_cost_inr: Math.round(recalculatedCost),
      };
      setRecipes((list) =>
        list.map((r) => (r.id === updated.id ? updated : r))
      );
      return updated;
    });
  };

  const handleOneClickAiRemix = async (mode: RemixMode) => {
    setActiveRemixLoading(mode);
    try {
      const targetRecipeId = selectedRecipe.parent_recipe_id ?? selectedRecipe.id;
      const sourceBase =
        recipes.find((r) => r.id === targetRecipeId) ?? selectedRecipe;
      const remixed = await remixRecipeWithAI(
        targetRecipeId,
        mode,
        undefined,
        currentServings,
        sourceBase
      );
      setRecipes((prev) => [remixed, ...prev]);
      setSelectedRecipe(remixed);
      setCurrentServings(remixed.servings);
    } finally {
      setActiveRemixLoading(null);
    }
  };

  const handleForkRemix = async () => {
    setIsForking(true);
    try {
      const note =
        remixNote.trim() ||
        `Scaled to ${currentServings} servings (${unitSystem})`;
      const forked = await forkRecipeOnServer(
        selectedRecipe,
        note,
        selectedRecipe.ingredients,
        currentServings
      );
      setRecipes((prev) => [forked, ...prev]);
      setSelectedRecipe(forked);
      setRemixNote("");
    } catch {
      const localFork: Recipe = {
        ...selectedRecipe,
        id: `fork-${Date.now()}`,
        title: `${selectedRecipe.title} (My Version)`,
        servings: currentServings,
        parent_recipe_id: selectedRecipe.id,
        remix_note:
          remixNote.trim() ||
          `Scaled to ${currentServings} servings (${unitSystem})`,
        forks_count: (selectedRecipe.forks_count ?? 0) + 1,
        likes_count: (selectedRecipe.likes_count ?? 0) + 1,
      };
      setRecipes((prev) => [localFork, ...prev]);
      setSelectedRecipe(localFork);
      setRemixNote("");
    } finally {
      setIsForking(false);
    }
  };

  const focusAddedDishInStudio = (newRecipe: Recipe) => {
    setRecipes((prev) => [newRecipe, ...prev]);
    setSelectedRecipe(newRecipe);
    setCurrentServings(newRecipe.servings);
    setActiveTab("hub");
  };

  return (
    <EloqwntLandingShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unitSystem={unitSystem}
      onChangeUnitSystem={setUnitSystem}
      onOpenOcrModal={() => setOcrModalOpen(true)}
      recipes={recipes}
      onSelectRecipe={(r) => {
        handleSelectRecipe(r);
        setActiveTab("hub");
      }}
      activeTimers={timers}
      onStartQuickTimer={(label, seconds, stepNum) => {
        startTimer(label, seconds, stepNum);
      }}
    >
      {activeTab === "hub" && (
        <div className="space-y-8">
          <RecipeRemix3DScrollStage
            recipes={recipes}
            selectedRecipe={selectedRecipe}
            currentServings={currentServings}
            unitSystem={unitSystem}
            activeRemixLoading={activeRemixLoading}
            remixNote={remixNote}
            isForking={isForking}
            onChangeRemixNote={setRemixNote}
            onForkRemix={() => void handleForkRemix()}
            onChangeServings={setCurrentServings}
            onChangeUnitSystem={setUnitSystem}
            onReplaceIngredient={handleReplaceIngredient}
            onStartStepTimer={(label, seconds, stepNum) => {
              startTimer(label, seconds, stepNum);
            }}
            onSelectRecipe={handleSelectRecipe}
            onTriggerRemix={(mode) => {
              void handleOneClickAiRemix(mode);
            }}
            onStartCooking={(r) => {
              handleSelectRecipe(r);
              setActiveTab("sous-chef");
            }}
          />

          <AddDishTo3DStudioCard
            unitSystem={unitSystem}
            onDishAdded={(newRecipe) => {
              focusAddedDishInStudio(newRecipe);
            }}
          />
        </div>
      )}

      {activeTab === "kinetic-prep" && (
        <KineticPrepTimeline
          recipes={recipes}
          onStartStepTimer={(label, seconds, stepNum) => {
            startTimer(label, seconds, stepNum);
          }}
        />
      )}

      {activeTab === "pantry" && (
        <PantryRescueView
          recipes={recipes}
          onSelectRecipeToCook={(recipeId) => {
            const found = recipes.find((r) => r.id === recipeId);
            if (found) {
              handleSelectRecipe(found);
              setActiveTab("sous-chef");
            }
          }}
        />
      )}

      {activeTab === "sous-chef" && (
        <HandsFreeCookView
          recipe={selectedRecipe}
          currentServings={currentServings}
          unitSystem={unitSystem}
          timers={timers}
          onStartTimer={startTimer}
          onToggleTimer={toggleTimer}
          onDismissTimer={dismissTimer}
          onPauseAllTimers={pauseAllTimers}
        />
      )}

      {activeTab === "social" && (
        <SocialCookbooksView
          recipes={recipes}
          selectedRecipe={selectedRecipe}
          onSelectRecipe={(r) => {
            handleSelectRecipe(r);
            setActiveTab("hub");
          }}
          onReviewAdded={() => {
            void reloadRecipes();
          }}
        />
      )}

      <OcrImporterModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        unitSystem={unitSystem}
        onRecipeParsed={(newRecipe) => {
          focusAddedDishInStudio(newRecipe);
          requestAnimationFrame(() => {
            const el = document.getElementById("dish-3d-studio-top");
            if (el) {
              if (window.__potlyLenis) {
                window.__potlyLenis.scrollTo(el, { offset: -96, duration: 1.0 });
              } else {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }
          });
        }}
      />
    </EloqwntLandingShell>
  );
}
