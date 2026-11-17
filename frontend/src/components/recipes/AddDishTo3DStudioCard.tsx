"use client";

import React, { useState } from "react";
import {
  Box,
  FileText,
  Globe,
  ImageUp,
  Loader2,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { parseRecipeWithAI } from "@/lib/api";
import { fileToBase64, runTesseractOcr } from "@/lib/ocr";
import type { Recipe, UnitSystem } from "@/types/recipe";

interface AddDishTo3DStudioCardProps {
  unitSystem: UnitSystem;
  onDishAdded: (recipe: Recipe, hasUploadedPhoto: boolean) => void;
}

const QUICK_LINK_PRESETS = [
  {
    label: "IG Reel • Lasooni Palak Paneer",
    dishName: "Lasooni Palak Paneer",
    url: "https://www.instagram.com/reel/lasooni-palak-paneer",
  },
  {
    label: "YT Shorts • Air-Fryer Chicken Tikka",
    dishName: "Air-Fryer Tandoori Chicken Tikka",
    url: "https://www.youtube.com/shorts/air-fryer-tandoori-tikka",
  },
  {
    label: "IG Reel • Crispy Mysore Masala Dosa",
    dishName: "Crispy Mysore Masala Dosa",
    url: "https://www.instagram.com/reel/mysore-masala-dosa",
  },
];

const DIET_PILLS = [
  "Make it High-Protein",
  "Jain-Friendly / No Onion-Garlic",
  "Veganize",
  "Air-Fryer Version",
];

export function AddDishTo3DStudioCard({
  unitSystem,
  onDishAdded,
}: AddDishTo3DStudioCardProps) {
  const [mode, setMode] = useState<"link" | "photo">("link");
  const [sourceUrl, setSourceUrl] = useState(
    "https://www.instagram.com/reel/lasooni-palak-paneer"
  );
  const [dishName, setDishName] = useState("");
  const [rawText, setRawText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [dietaryAdaptation, setDietaryAdaptation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setOcrConfidence(null);
    setOcrProgress(8);
    const mime = file.type || "image/jpeg";
    setImageMimeType(mime);

    try {
      const b64 = await fileToBase64(file);
      setImageBase64(b64);
      setPreviewDataUrl(`data:${mime};base64,${b64}`);

      const res = await runTesseractOcr(file, (pct) => setOcrProgress(pct));
      if (res.transcript && res.transcript.trim().length > 12) {
        setRawText(res.transcript.trim());
        const firstLine = res.transcript
          .trim()
          .split(/\r?\n/)[0]
          ?.trim();
        if (firstLine && !dishName.trim()) {
          setDishName(firstLine.slice(0, 64));
        }
      }
      setOcrConfidence(res.confidence);
    } catch {
      setErrorMsg("Photo loaded — add a dish name below if there is no text on the photo.");
    } finally {
      setOcrProgress(null);
    }
  };

  const clearPhoto = () => {
    setImageBase64(null);
    setPreviewDataUrl(null);
    setOcrConfidence(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === "link" && !sourceUrl.trim()) {
      setErrorMsg("Paste an Instagram Reel, YouTube Shorts, or recipe link.");
      return;
    }
    if (mode === "photo" && !imageBase64 && !rawText.trim() && !dishName.trim()) {
      setErrorMsg("Upload a dish photo or enter the dish name / ingredients.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedName = dishName.trim();
      const trimmedNotes = rawText.trim();
      const composedRawText =
        mode === "link"
          ? trimmedName
          : [trimmedName, trimmedNotes].filter(Boolean).join("\n") ||
            "Plated Home Kitchen Special";

      const parsed = await parseRecipeWithAI({
        raw_text: composedRawText,
        source_url: mode === "link" ? sourceUrl.trim() : null,
        image_base64: mode === "photo" ? imageBase64 : null,
        image_mime_type: imageMimeType,
        dietary_adaptation: dietaryAdaptation.trim() || null,
        target_unit_system: unitSystem,
      });

      const enriched: Recipe = {
        ...parsed,
        hero_image_url:
          parsed.hero_image_url ??
          (mode === "photo" && previewDataUrl ? previewDataUrl : null),
      };

      onDishAdded(enriched, mode === "photo" && Boolean(previewDataUrl));

      // Smoothly bring the user back to the 3D Dish & Prep Studio above
      requestAnimationFrame(() => {
        const el = document.getElementById("dish-3d-studio-top");
        if (!el) return;
        if (window.__potlyLenis) {
          window.__potlyLenis.scrollTo(el, { offset: -96, duration: 1.0 });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not build 3D dish right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="add-dish-3d-dock"
      aria-label="Add Dish from Reel Link, YouTube Link, or Photo to 3D Studio"
      className="scroll-mt-28 rounded-[12px] border border-[#d3d4c8] bg-[#e9eade] p-5 sm:p-8"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Studio Explanation */}
        <div className="space-y-4 lg:col-span-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-3 py-1 text-xs font-semibold text-[#3f6212]">
            <Box className="h-3.5 w-3.5" />
            Add to the Table
          </span>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] leading-[1.12] text-[#1e1612] sm:text-3xl">
            From a 30-second video to a proper recipe.
          </h3>
          <p className="text-sm leading-relaxed text-[#333333]">
            Drop a Reel, YouTube Short, or plate photo. We sort the ingredient
            list, convert to katoris, and lay out the cooking order.
          </p>

          <div className="rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] p-4 space-y-2 text-xs text-[#333333]">
            <p className="font-semibold text-[#1e1612]">Ready as soon as you add it:</p>
            <ul className="space-y-1.5 list-disc pl-4">
              <li>Plated dish preview on the stage above</li>
              <li>Katori, Metric, and US measures with instant ingredient swaps</li>
              <li>Step-by-step prep, simmer, and plating schedule</li>
            </ul>
          </div>
        </div>

        {/* Right: Upload / Link Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 lg:col-span-7">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-full border border-[#d3d4c8] bg-[#f1f3e6] p-1">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`btn-press flex items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition-colors ${
                mode === "link"
                  ? "bg-[#3f6212] text-[#fcfcfd]"
                  : "text-[#333333] hover:text-[#000000]"
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Reel / YouTube Link</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={`btn-press flex items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition-colors ${
                mode === "photo"
                  ? "bg-[#3f6212] text-[#fcfcfd]"
                  : "text-[#333333] hover:text-[#000000]"
              }`}
            >
              <ImageUp className="h-3.5 w-3.5" />
              <span>Dish Photo / Recipe Card</span>
            </button>
          </div>

          {mode === "link" ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="studio-reel-url"
                  className="mb-1.5 block text-xs font-semibold text-[#333333]"
                >
                  Instagram Reel, YouTube Short, or Recipe Link
                </label>
                <div className="flex items-center gap-2.5 rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] px-3.5 py-2.5 focus-within:border-[#3f6212]">
                  <Globe className="h-4 w-4 shrink-0 text-[#3f6212]" />
                  <input
                    id="studio-reel-url"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/... or https://youtube.com/shorts/..."
                    className="w-full bg-transparent text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="studio-link-dish-name"
                  className="mb-1.5 block text-xs font-semibold text-[#333333]"
                >
                  Dish Name (optional — sharpens 3D dish matching for Reels)
                </label>
                <input
                  id="studio-link-dish-name"
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g., Paneer Tikka Masala, Malabar Prawn Roast, Masala Dosa..."
                  className="w-full rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] px-3.5 py-2.5 text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:border-[#3f6212] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-[#4d4c4c]">
                  Try a sample:
                </span>
                {QUICK_LINK_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setSourceUrl(preset.url);
                      setDishName(preset.dishName);
                    }}
                    className="btn-press rounded-full border border-[#d3d4c8] bg-[#f1f3e6] px-2.5 py-1 text-[11px] font-medium text-[#1e1612] hover:border-[#3f6212]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {previewDataUrl ? (
                <div className="flex items-center gap-4 rounded-[10px] border border-[#3f6212]/50 bg-[#f1f3e6] p-3">
                  <img
                    src={previewDataUrl}
                    alt="Uploaded dish preview"
                    className="h-20 w-20 shrink-0 rounded-[8px] border border-[#d3d4c8] object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-[#1e1612]">
                      Photo ready for 3D Studio projection
                    </p>
                    {ocrConfidence !== null && (
                      <p className="text-[11px] font-medium text-[#3f6212]">
                        OCR extracted text ({ocrConfidence}% clarity)
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9a2a12] hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-[#4d4c4c]/60 bg-[#f1f3e6] p-5 text-center transition-colors hover:border-[#3f6212]">
                  <ImageUp className="mb-1.5 h-5 w-5 text-[#C44D28]" />
                  <span className="text-xs font-semibold text-[#1e1612]">
                    Upload a plated dish photo or handwritten recipe card
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#4d4c4c]">
                    PNG, JPG, WEBP — builds both the 3D scene &amp; prep steps
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoSelect(e)}
                    className="hidden"
                  />
                </label>
              )}

              {ocrProgress !== null && (
                <div className="flex items-center justify-between rounded-[8px] border border-[#EED9C4] bg-[#FDF6EF] px-3 py-2 text-xs text-[#9A4220]">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scanning photo &amp; ingredients...
                  </span>
                  <span className="font-mono">{ocrProgress}%</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="studio-photo-dish-name"
                    className="mb-1 block text-xs font-semibold text-[#333333]"
                  >
                    Dish Name
                  </label>
                  <input
                    id="studio-photo-dish-name"
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder="e.g., Crispy Mysore Masala Dosa"
                    className="w-full rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] px-3.5 py-2 text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:border-[#3f6212] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="studio-photo-raw-text"
                    className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#333333]"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#3f6212]" />
                    Ingredients / Prep Notes (auto-filled when OCR finds text)
                  </label>
                  <textarea
                    id="studio-photo-raw-text"
                    rows={3}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Optional: paste ingredients or cooking steps..."
                    className="w-full rounded-[10px] border border-[#d3d4c8] bg-[#f1f3e6] p-3 text-xs text-[#000000] placeholder:text-[#4d4c4c] focus:border-[#3f6212] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Dietary Preference */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#333333]">
              Adapt on import (optional)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DIET_PILLS.map((pill) => {
                const active = dietaryAdaptation === pill;
                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setDietaryAdaptation(active ? "" : pill)}
                    className={`btn-press rounded-full border px-3 py-1 text-xs font-medium ${
                      active
                        ? "border-[#3f6212] bg-[#3f6212] text-[#fcfcfd]"
                        : "border-[#d3d4c8] bg-[#f1f3e6] text-[#1e1612] hover:border-[#3f6212]"
                    }`}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-press flex w-full items-center justify-center gap-2 rounded-full bg-[#3f6212] px-5 py-3.5 text-sm font-semibold text-[#fcfcfd] hover:bg-[#33500e] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Building 3D Dish &amp; Prep Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Add Dish &amp; Build in 3D Studio</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
