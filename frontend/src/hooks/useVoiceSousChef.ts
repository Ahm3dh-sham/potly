"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { querySousChefVoice } from "@/lib/api";
import {
  createSpeechRecognition,
  speakAloud,
  stopSpeaking,
  type SpeechRecognitionInstance,
} from "@/lib/speech";
import type { ActiveCookingTimer, Recipe, UnitSystem } from "@/types/recipe";

interface UseVoiceSousChefOptions {
  recipe: Recipe;
  currentStepIndex: number;
  unitSystem?: UnitSystem;
  scaleFactor?: number;
  timers: ActiveCookingTimer[];
  onNextStep: () => void;
  onPrevStep: () => void;
  onStartTimer: (label: string, seconds: number, stepNumber: number | null) => void;
  onPauseTimers: () => void;
}

function getDefaultGreeting(recipe: Recipe): string {
  const ingHint = recipe.ingredients[0]?.name.split("(")[0]?.trim() || "spice";
  return `Ready for ${recipe.title} — ask "How much ${ingHint}?", say "Next step", or "Set a timer".`;
}

export function useVoiceSousChef({
  recipe,
  currentStepIndex,
  unitSystem = "indian",
  scaleFactor = 1,
  timers,
  onNextStep,
  onPrevStep,
  onStartTimer,
  onPauseTimers,
}: UseVoiceSousChefOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const [assistantMessage, setAssistantMessage] = useState<string>(() =>
    getDefaultGreeting(recipe)
  );
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setLastTranscript("");
    setAssistantMessage(getDefaultGreeting(recipe));
  }, [recipe]);

  const currentStep =
    recipe.timeline_steps[currentStepIndex] ?? recipe.timeline_steps[0];

  const stopSpeakingAloud = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const handleVoiceCommand = useCallback(
    async (transcript: string) => {
      const cleaned = transcript.trim();
      if (!cleaned || !currentStep) return;

      setLastTranscript(cleaned);
      const res = await querySousChefVoice(
        {
          recipe_title: recipe.title,
          current_step_number: currentStep.step_number,
          current_instruction: currentStep.instruction,
          ingredients: recipe.ingredients,
          user_transcript: cleaned,
          active_timers: timers.map(
            (t) => `${t.label}: ${t.remainingSeconds}s remaining`
          ),
        },
        {
          unitSystem,
          scaleFactor,
          stepTitle: currentStep.title,
          stepDurationSeconds: currentStep.duration_seconds,
          sensoryCue: currentStep.sensory_cue,
          equipment: currentStep.equipment,
        }
      );

      setAssistantMessage(res.spoken_reply);
      if (res.action_command === "NEXT_STEP") {
        onNextStep();
      } else if (res.action_command === "PREV_STEP") {
        onPrevStep();
      } else if (
        res.action_command === "START_TIMER" &&
        res.timer_seconds
      ) {
        onStartTimer(
          res.timer_label ?? `Step ${currentStep.step_number} Timer`,
          res.timer_seconds,
          currentStep.step_number
        );
      } else if (res.action_command === "PAUSE_TIMERS") {
        onPauseTimers();
      }

      setIsSpeaking(true);
      speakAloud(res.spoken_reply, () => setIsSpeaking(false));
    },
    [
      currentStep,
      onNextStep,
      onPauseTimers,
      onPrevStep,
      onStartTimer,
      recipe.ingredients,
      recipe.title,
      scaleFactor,
      timers,
      unitSystem,
    ]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    stopSpeakingAloud();
    const instance = createSpeechRecognition();
    if (!instance) {
      setAssistantMessage(
        "Microphone speech recognition isn't supported in this browser — type below or tap any quick command pill."
      );
      return;
    }

    instance.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      if (latest && latest.isFinal && latest[0]?.transcript) {
        void handleVoiceCommand(latest[0].transcript);
      }
    };
    instance.onerror = (ev) => {
      setIsListening(false);
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setAssistantMessage(
          "Microphone access was blocked — allow mic permission or use the Ask Sous Chef input below."
        );
      }
    };
    instance.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current = instance;
      instance.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setAssistantMessage(
        "Could not start microphone right now — use the quick voice chips or type your question below."
      );
    }
  }, [handleVoiceCommand, isListening, stopSpeakingAloud]);

  const readCurrentStepAloud = useCallback(() => {
    if (!currentStep) return;
    setIsSpeaking(true);
    const cueSuffix = currentStep.sensory_cue
      ? ` What to look for: ${currentStep.sensory_cue}.`
      : "";
    const text = `Step ${currentStep.step_number}, ${currentStep.title}. ${currentStep.instruction}${cueSuffix}`;
    setAssistantMessage(text);
    speakAloud(text, () => setIsSpeaking(false));
  }, [currentStep]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    lastTranscript,
    assistantMessage,
    toggleListening,
    readCurrentStepAloud,
    stopSpeakingAloud,
    simulateVoiceCommand: handleVoiceCommand,
  };
}
