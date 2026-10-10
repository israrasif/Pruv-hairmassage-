// utils/useSessionGuide.ts
// Works out whether the timer should guide this session area by area, and how.
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasPlus, usePlan } from "@/utils/entitlements";
import { getPlan } from "@/utils/planStore";
import { currentWeek, type Plan, type WeekPlan } from "@/utils/planBuilder";
import { buildGuide, type GuideSegment } from "@/utils/sessionGuide";

const GUIDE_KEY = "@hair_massage/guide_on";
const VOICE_KEY = "@hair_massage/voice_on";

export type SessionGuide = {
  plan: Plan | null;
  week: WeekPlan | null;
  weekNumber: number;
  /** A plan exists but this person can't use guidance (free plan after week 1) */
  locked: boolean;
  guideOn: boolean;
  voiceOn: boolean;
  setGuideOn: (v: boolean) => void;
  setVoiceOn: (v: boolean) => void;
  /** Present only when guidance is available and switched on */
  segments: GuideSegment[] | undefined;
  /** The route shown in the card even when the switch is off */
  preview: GuideSegment[];
};

export function useSessionGuide(durationSec: number): SessionGuide {
  const plus = hasPlus(usePlan());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [guideOn, setGuideOnState] = useState(true);
  const [voiceOn, setVoiceOnState] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getPlan().then(setPlan);
      AsyncStorage.multiGet([GUIDE_KEY, VOICE_KEY]).then(([[, g], [, v]]) => {
        if (g != null) setGuideOnState(g === "1");
        if (v != null) setVoiceOnState(v === "1");
      });
    }, []),
  );

  const weekNumber = plan ? currentWeek(plan) : 0;
  // Free users can use guidance during week 1 of their plan; Plus users throughout
  const locked = !!plan && !plus && weekNumber > 1;
  const week = plan && !locked ? plan.weeks[weekNumber - 1] : null;

  const preview = useMemo(
    () => (week ? buildGuide(week.zoneMinutes, durationSec) : []),
    [week, durationSec],
  );

  return {
    plan,
    week,
    weekNumber,
    locked,
    guideOn,
    voiceOn,
    setGuideOn: (v) => {
      setGuideOnState(v);
      AsyncStorage.setItem(GUIDE_KEY, v ? "1" : "0");
    },
    setVoiceOn: (v) => {
      setVoiceOnState(v);
      AsyncStorage.setItem(VOICE_KEY, v ? "1" : "0");
    },
    segments: guideOn && preview.length > 0 ? preview : undefined,
    preview,
  };
}