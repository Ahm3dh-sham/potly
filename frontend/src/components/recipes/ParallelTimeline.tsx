"use client";

import React, { useEffect, useState } from "react";
import { Eye, Flame, Hourglass, Play, Scissors, Utensils } from "lucide-react";
import type { ParallelTimelineNode, TimelineTrack } from "@/types/recipe";

interface ParallelTimelineProps {
  steps: ParallelTimelineNode[];
  onStartStepTimer: (
    label: string,
    durationSeconds: number,
    stepNumber: number
  ) => void;
}

const TRACK_STYLES: Record<
  TimelineTrack,
  { label: string; color: string; bar: string }
> = {
  prep: {
    label: "Prep",
    color: "bg-[#f1f3e6] text-[#333333] border-[#d3d4c8]",
    bar: "bg-[#4d4c4c]",
  },
  active_cook: {
    label: "Active Heat",
    color: "bg-[#3f6212] text-[#fcfcfd] border-[#3f6212]",
    bar: "bg-[#3f6212]",
  },
  passive_wait: {
    label: "Simmer / Rest",
    color: "bg-[#f1f3e6] text-[#3f6212] border-[#d3d4c8]",
    bar: "bg-[#C44D28]",
  },
  plating: {
    label: "Finish & Serve",
    color: "bg-[#f1f3e6] text-[#000000] border-[#d3d4c8]",
    bar: "bg-[#000000]",
  },
};

function TrackIcon({ track }: { track: TimelineTrack }) {
  switch (track) {
    case "prep":
      return <Scissors className="h-3.5 w-3.5" />;
    case "active_cook":
      return <Flame className="h-3.5 w-3.5" />;
    case "passive_wait":
      return <Hourglass className="h-3.5 w-3.5" />;
    case "plating":
      return <Utensils className="h-3.5 w-3.5" />;
  }
}

export function ParallelTimeline({
  steps,
  onStartStepTimer,
}: ParallelTimelineProps) {
  const [selectedTrack, setSelectedTrack] = useState<TimelineTrack | "all">(
    "all"
  );

  useEffect(() => {
    setSelectedTrack("all");
  }, [steps]);

  const totalSpanSeconds = Math.max(
    600,
    ...steps.map((s) => s.start_offset_seconds + s.duration_seconds)
  );

  const trackCounts: Record<TimelineTrack, number> = {
    prep: steps.filter((s) => s.track === "prep").length,
    active_cook: steps.filter((s) => s.track === "active_cook").length,
    passive_wait: steps.filter((s) => s.track === "passive_wait").length,
    plating: steps.filter((s) => s.track === "plating").length,
  };

  const visibleSteps =
    selectedTrack === "all"
      ? steps
      : steps.filter((s) => s.track === selectedTrack);

  return (
    <div className="rounded-[8px] bg-[#e9eade] border border-[#d3d4c8] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d3d4c8] pb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#000000]">
            Cooking Steps &amp; Schedule
          </h3>
          <p className="text-xs text-[#333333] mt-0.5">
            Prep and active cooking steps overlapped so everything finishes hot.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter cooking steps by phase"
          className="flex flex-wrap items-center gap-1.5 text-[11px]"
        >
          <button
            type="button"
            aria-pressed={selectedTrack === "all"}
            onClick={() => setSelectedTrack("all")}
            className={`btn-press px-2.5 py-1 rounded-full border flex items-center gap-1 font-medium cursor-pointer ${
              selectedTrack === "all"
                ? "bg-[#3f6212] text-[#fcfcfd] border-[#3f6212]"
                : "bg-[#f1f3e6] text-[#333333] border-[#d3d4c8] hover:border-[#3f6212] hover:text-[#000000]"
            }`}
          >
            <span>All</span>
            <span className="font-mono text-[10px] opacity-80 tabular-nums">
              ({steps.length})
            </span>
          </button>

          {(Object.keys(TRACK_STYLES) as TimelineTrack[]).map((t) => {
            const isSelected = selectedTrack === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  setSelectedTrack((prev) => (prev === t ? "all" : t))
                }
                className={`btn-press px-2.5 py-1 rounded-full border flex items-center gap-1 font-medium cursor-pointer ${
                  isSelected
                    ? "bg-[#3f6212] text-[#fcfcfd] border-[#3f6212]"
                    : "bg-[#f1f3e6] text-[#333333] border-[#d3d4c8] hover:border-[#3f6212] hover:text-[#000000]"
                }`}
              >
                <TrackIcon track={t} />
                <span>{TRACK_STYLES[t].label}</span>
                <span className="font-mono text-[10px] opacity-80 tabular-nums">
                  ({trackCounts[t]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleSteps.length === 0 ? (
        <div className="rounded-[8px] bg-[#f1f3e6] border border-[#d3d4c8] p-5 text-center space-y-3">
          <p className="text-sm text-[#333333]">
            No {TRACK_STYLES[selectedTrack as TimelineTrack].label} steps in
            this recipe.
          </p>
          <button
            type="button"
            onClick={() => setSelectedTrack("all")}
            className="btn-press px-4 py-1.5 rounded-full bg-[#3f6212] hover:bg-[#33500e] text-[#fcfcfd] text-xs font-medium"
          >
            Show all {steps.length} steps
          </button>
        </div>
      ) : (
        <>
          {/* Visual Schedule Bar */}
          <div className="p-4 rounded-[8px] bg-[#f1f3e6] border border-[#d3d4c8] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#4d4c4c] pb-1 tabular-nums">
              <span>0 min</span>
              <span>{Math.round(totalSpanSeconds / 120)} min</span>
              <span>{Math.round(totalSpanSeconds / 60)} min</span>
            </div>
            {visibleSteps.map((step) => {
              const leftPct = Math.min(
                88,
                Math.round((step.start_offset_seconds / totalSpanSeconds) * 100)
              );
              const widthPct = Math.max(
                10,
                Math.min(
                  100 - leftPct,
                  Math.round((step.duration_seconds / totalSpanSeconds) * 100)
                )
              );
              const style =
                TRACK_STYLES[step.track] ?? TRACK_STYLES.active_cook;
              return (
                <div key={step.step_number} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#000000] font-medium truncate">
                      {step.step_number}. {step.title}
                    </span>
                    <span className="font-mono text-[11px] text-[#4d4c4c] tabular-nums">
                      {Math.max(1, Math.round(step.duration_seconds / 60))}m
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#e9eade] border border-[#d3d4c8] overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${style.bar}`}
                      style={{
                        marginLeft: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Cards */}
          <div className="space-y-3">
            {visibleSteps.map((step) => {
              const style =
                TRACK_STYLES[step.track] ?? TRACK_STYLES.active_cook;
              return (
                <div
                  key={step.step_number}
                  className="p-4 rounded-[8px] bg-[#f1f3e6] border border-[#d3d4c8]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-[#3f6212] text-[#fcfcfd] font-mono text-xs font-semibold flex items-center justify-center tabular-nums">
                        {step.step_number}
                      </span>
                      <h4 className="font-semibold text-sm text-[#000000]">
                        {step.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTrack((prev) =>
                            prev === step.track ? "all" : step.track
                          )
                        }
                        className={`btn-press text-[11px] px-2.5 py-0.5 rounded-full border flex items-center gap-1 font-medium cursor-pointer ${style.color}`}
                      >
                        <TrackIcon track={step.track} />
                        {style.label}
                      </button>
                    </div>

                    {step.duration_seconds > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartStepTimer(
                            step.timer_label ?? `Step ${step.step_number}`,
                            step.duration_seconds,
                            step.step_number
                          )
                        }
                        className="btn-press px-3.5 py-1.5 rounded-full bg-[#3f6212] hover:bg-[#33500e] text-[#fcfcfd] text-xs font-medium flex items-center gap-1.5 tabular-nums"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>
                          {Math.max(1, Math.round(step.duration_seconds / 60))}m
                          Timer
                        </span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-[#333333] mt-2.5 leading-relaxed">
                    {step.instruction}
                  </p>

                  {(step.sensory_cue || step.equipment.length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4d4c4c]">
                      {step.sensory_cue && (
                        <span className="px-2.5 py-1 rounded-full bg-[#e9eade] border border-[#d3d4c8] text-[#333333] flex items-center gap-1.5">
                          <Eye className="h-3 w-3 shrink-0 text-[#3f6212]" />
                          <span>{step.sensory_cue}</span>
                        </span>
                      )}
                      {step.equipment.map((eq) => (
                        <span
                          key={eq}
                          className="px-2.5 py-0.5 rounded-full bg-[#e9eade] border border-[#d3d4c8] text-[#333333]"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
