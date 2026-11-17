"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Square,
  Sun,
  Timer,
  Trash2,
  Volume2,
} from "lucide-react";
import { useVoiceSousChef } from "@/hooks/useVoiceSousChef";
import {
  requestScreenWakeLock,
  type WakeLockSentinelLike,
} from "@/lib/speech";
import { formatIngredientForDisplay } from "@/lib/unitConverter";
import type {
  ActiveCookingTimer,
  Recipe,
  TimelineTrack,
  UnitSystem,
} from "@/types/recipe";

interface HandsFreeCookViewProps {
  recipe: Recipe;
  currentServings?: number;
  unitSystem?: UnitSystem;
  timers: ActiveCookingTimer[];
  onStartTimer: (
    label: string,
    durationSeconds: number,
    stepNumber: number | null
  ) => void;
  onToggleTimer: (id: string) => void;
  onDismissTimer: (id: string) => void;
  onPauseAllTimers: () => void;
}

const TRACK_LABELS: Record<TimelineTrack, string> = {
  prep: "Prep",
  active_cook: "Active Heat",
  passive_wait: "Simmer / Rest",
  plating: "Finish & Serve",
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shortIngLabel(name: string): string {
  const stripped = name.split("(")[0]?.split("&")[0]?.trim() ?? name;
  const words = stripped.split(/\s+/);
  return words.slice(0, 3).join(" ");
}

export function HandsFreeCookView({
  recipe,
  currentServings,
  unitSystem = "indian",
  timers,
  onStartTimer,
  onToggleTimer,
  onDismissTimer,
  onPauseAllTimers,
}: HandsFreeCookViewProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [manualQuery, setManualQuery] = useState("");
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Reset stepIdx to 0 whenever the active recipe changes
  useEffect(() => {
    setStepIdx(0);
  }, [recipe.id]);

  const totalSteps = recipe.timeline_steps.length;
  const safeStepIdx = Math.min(stepIdx, Math.max(0, totalSteps - 1));
  const currentStep =
    recipe.timeline_steps[safeStepIdx] ?? recipe.timeline_steps[0];

  const scaleFactor =
    (currentServings ?? recipe.servings) / Math.max(1, recipe.servings);

  const handleNextStep = useCallback(() => {
    setStepIdx((prev) => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  const handlePrevStep = useCallback(() => {
    setStepIdx((prev) => Math.max(0, prev - 1));
  }, []);

  // Acquire Screen Wake Lock while in Hands-Free Cooking Mode
  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null;
    void (async () => {
      sentinel = await requestScreenWakeLock();
      setWakeLockActive(Boolean(sentinel));
    })();
    return () => {
      void sentinel?.release();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        handleNextStep();
      } else if (e.key === "ArrowLeft") {
        handlePrevStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNextStep, handlePrevStep]);

  const {
    isListening,
    isSpeaking,
    lastTranscript,
    assistantMessage,
    toggleListening,
    readCurrentStepAloud,
    stopSpeakingAloud,
    simulateVoiceCommand,
  } = useVoiceSousChef({
    recipe,
    currentStepIndex: safeStepIdx,
    unitSystem,
    scaleFactor,
    timers,
    onNextStep: handleNextStep,
    onPrevStep: handlePrevStep,
    onStartTimer,
    onPauseTimers: onPauseAllTimers,
  });

  const quickCommands = useMemo(() => {
    const ing1 = recipe.ingredients[0]?.name
      ? shortIngLabel(recipe.ingredients[0].name)
      : "spices";
    const ing2 = recipe.ingredients[1]?.name
      ? shortIngLabel(recipe.ingredients[1].name)
      : ing1;
    const stepMins = Math.max(
      1,
      Math.round((currentStep?.duration_seconds ?? 300) / 60)
    );
    return [
      "Next step",
      "Repeat",
      `How much ${ing1}?`,
      `Set a timer for ${stepMins} minutes`,
      `What can I substitute for ${ing2}?`,
    ];
  }, [currentStep?.duration_seconds, recipe.ingredients]);

  if (!currentStep) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Main Step Stage */}
      <div className="space-y-5 lg:col-span-8">
        <div className="space-y-6 rounded-[12px] border border-[#d3d4c8] bg-[#e9eade] p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d3d4c8] pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#3f6212] px-2.5 py-0.5 text-[11px] font-semibold text-[#fcfcfd]">
                  {TRACK_LABELS[currentStep.track]}
                </span>
                <span className="text-xs font-semibold text-[#C44D28]">
                  {recipe.title}
                </span>
                {wakeLockActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-2.5 py-0.5 text-[10px] font-medium text-[#4d4c4c]">
                    <Sun className="h-3 w-3 text-[#3f6212]" />
                    Screen awake
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1e1612] sm:text-3xl">
                Step {currentStep.step_number} of {totalSteps}:{" "}
                {currentStep.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`btn-press flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold sm:text-sm ${
                  isListening
                    ? "bg-[#C44D28] text-[#fcfcfd] shadow-sm"
                    : "bg-[#3f6212] text-[#fcfcfd] hover:bg-[#33500e]"
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>Voice Control</span>
                  </>
                )}
              </button>

              {isSpeaking ? (
                <button
                  type="button"
                  onClick={stopSpeakingAloud}
                  className="btn-press flex items-center gap-1.5 rounded-full border border-[#C44D28] bg-[#fdf1ed] px-4 py-2.5 text-xs font-semibold text-[#C44D28] sm:text-sm"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={readCurrentStepAloud}
                  className="btn-press flex items-center gap-1.5 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-4 py-2.5 text-xs font-semibold text-[#1e1612] hover:border-[#3f6212] sm:text-sm"
                >
                  <Volume2 className="h-4 w-4 text-[#3f6212]" />
                  <span>Read Step</span>
                </button>
              )}
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="grid grid-flow-col auto-cols-fr gap-2">
            {recipe.timeline_steps.map((s, idx) => (
              <button
                key={s.step_number}
                type="button"
                onClick={() => setStepIdx(idx)}
                className={`h-2 rounded-full transition-colors ${
                  idx === safeStepIdx
                    ? "bg-[#C44D28]"
                    : idx < safeStepIdx
                      ? "bg-[#3f6212]"
                      : "bg-[#d3d4c8]"
                }`}
                aria-label={`Jump to step ${s.step_number}`}
              />
            ))}
          </div>

          {/* Large Instruction Display */}
          <div className="space-y-4 rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] p-5 sm:p-7">
            <p className="text-lg font-medium leading-relaxed text-[#1e1612] sm:text-2xl">
              {currentStep.instruction}
            </p>

            {currentStep.sensory_cue && (
              <div className="rounded-[8px] border border-[#EED9C4] bg-[#FDF6EF] p-3.5 text-sm text-[#9A4220]">
                <strong className="font-semibold">What to look for:</strong>{" "}
                {currentStep.sensory_cue}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {currentStep.duration_seconds > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onStartTimer(
                      currentStep.timer_label ??
                        `Step ${currentStep.step_number}`,
                      currentStep.duration_seconds,
                      currentStep.step_number
                    )
                  }
                  className="btn-press flex items-center gap-2 rounded-full bg-[#3f6212] px-4 py-2 text-xs font-semibold text-[#fcfcfd] hover:bg-[#33500e] sm:text-sm"
                >
                  <Timer className="h-4 w-4" />
                  <span>
                    Start{" "}
                    {Math.max(1, Math.round(currentStep.duration_seconds / 60))}
                    m Timer
                  </span>
                </button>
              )}

              {currentStep.equipment.map((eq) => (
                <span
                  key={eq}
                  className="rounded-full border border-[#d3d4c8] bg-[#e9eade] px-3 py-1.5 text-xs font-medium text-[#333333]"
                >
                  {eq}
                </span>
              ))}
            </div>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={safeStepIdx === 0}
              onClick={handlePrevStep}
              className="btn-press flex items-center gap-2 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-4 py-2.5 text-xs font-semibold text-[#1e1612] hover:border-[#3f6212] disabled:opacity-40 sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="hidden text-xs text-[#4d4c4c] sm:inline">
              Use ← / → arrow keys or voice
            </span>

            <button
              type="button"
              disabled={safeStepIdx >= totalSteps - 1}
              onClick={handleNextStep}
              className="btn-press flex items-center gap-2 rounded-full bg-[#3f6212] px-5 py-2.5 text-xs font-semibold text-[#fcfcfd] hover:bg-[#33500e] disabled:opacity-40 sm:text-sm"
            >
              <span>Next Step</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Ask Sous Chef Bar */}
        <div className="space-y-4 rounded-[12px] border border-[#d3d4c8] bg-[#e9eade] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1e1612]">
              Ask Sous Chef
            </h3>
            {isSpeaking && (
              <span className="animate-pulse text-xs font-semibold text-[#C44D28]">
                Speaking...
              </span>
            )}
          </div>

          <div className="space-y-1.5 rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] p-4">
            {lastTranscript && (
              <p className="text-xs text-[#4d4c4c]">
                You asked:{" "}
                <span className="font-semibold text-[#1e1612]">
                  &ldquo;{lastTranscript}&rdquo;
                </span>
              </p>
            )}
            <p className="text-sm font-medium leading-relaxed text-[#1e1612]">
              {assistantMessage}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => void simulateVoiceCommand(cmd)}
                className="btn-press rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-3 py-1 text-xs font-medium text-[#1e1612] hover:border-[#3f6212]"
              >
                &ldquo;{cmd}&rdquo;
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualQuery.trim()) return;
              void simulateVoiceCommand(manualQuery);
              setManualQuery("");
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder={`Ask about ${shortIngLabel(recipe.ingredients[0]?.name ?? "an ingredient")}, timers, or substitutes...`}
              className="flex-1 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-4 py-2.5 text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:border-[#3f6212] focus:outline-none"
            />
            <button
              type="submit"
              className="btn-press flex items-center gap-1.5 rounded-full bg-[#3f6212] px-4 py-2.5 text-xs font-semibold text-[#fcfcfd] hover:bg-[#33500e]"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Active Timers & Scaled Ingredients */}
      <div className="space-y-5 lg:col-span-4">
        <div className="space-y-4 rounded-[12px] border border-[#d3d4c8] bg-[#e9eade] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-[#1e1612]">
              <Timer className="h-4 w-4 text-[#C44D28]" />
              <span>Active Timers ({timers.length})</span>
            </h3>
            {timers.length > 0 && (
              <button
                type="button"
                onClick={onPauseAllTimers}
                className="text-xs font-medium text-[#4d4c4c] hover:text-[#1e1612]"
              >
                Pause All
              </button>
            )}
          </div>

          {timers.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-[#d3d4c8] bg-[#f1f3e6] py-6 text-center text-xs text-[#4d4c4c]">
              No timers running yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {timers.map((t) => {
                const pct = Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round((t.remainingSeconds / t.totalSeconds) * 100)
                  )
                );
                return (
                  <div
                    key={t.id}
                    className="space-y-2 rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1e1612]">
                        {t.label}
                      </span>
                      <span className="font-mono text-base font-bold text-[#C44D28] tabular-nums">
                        {formatSeconds(t.remainingSeconds)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#d3d4c8]">
                      <div
                        className="h-full bg-[#C44D28] transition-all duration-300 ease-linear"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleTimer(t.id)}
                        className="btn-press flex items-center gap-1 rounded-full border border-[#d3d4c8] bg-[#e9eade] px-2.5 py-1 text-xs font-medium text-[#1e1612]"
                      >
                        {t.isRunning ? (
                          <>
                            <Pause className="h-3 w-3" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> Resume
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissTimer(t.id)}
                        className="btn-press flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" /> Clear
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ingredients Reference using scaled quantities & selected unitSystem */}
        <div className="space-y-3 rounded-[12px] border border-[#d3d4c8] bg-[#e9eade] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#1e1612]">
              Ingredients ({currentServings ?? recipe.servings} servings)
            </h3>
            <span className="font-mono text-[11px] font-semibold uppercase text-[#3f6212]">
              {unitSystem}
            </span>
          </div>
          <ul className="space-y-2 text-xs">
            {recipe.ingredients.map((ing, i) => {
              const formatted = formatIngredientForDisplay(
                ing,
                unitSystem,
                scaleFactor
              );
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-[8px] border border-[#d3d4c8] bg-[#f1f3e6] p-3"
                >
                  <div>
                    <span className="font-semibold text-[#1e1612]">
                      {ing.name}
                    </span>
                    {ing.preparation_note && (
                      <span className="block text-[11px] text-[#4d4c4c]">
                        {ing.preparation_note}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono font-bold text-[#3f6212] tabular-nums">
                    {formatted.quantity} {formatted.unit}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
