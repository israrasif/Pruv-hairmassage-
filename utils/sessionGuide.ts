// utils/sessionGuide.ts
// Turns "minutes per area" from the plan into a timed route for one session.
// Pure logic: no storage, no screens.
import type { ZoneId } from "@/utils/planBuilder";

export type GuideSegment = { id: ZoneId; label: string; seconds: number };

// The order areas are visited in: a natural path from the hairline back to the neck
const ORDER: ZoneId[] = ["front", "sides", "crown", "back"];

/**
 * zoneMinutes comes from the plan (how the day's minutes are shared between areas).
 * durationSec is the timer length. The areas are scaled to fit the timer exactly,
 * so it works even if the person changed their default session length.
 */
export function buildGuide(
  zoneMinutes: { zone: ZoneId; label: string; minutes: number }[],
  durationSec: number,
): GuideSegment[] {
  const sorted = [...zoneMinutes].sort((a, b) => ORDER.indexOf(a.zone) - ORDER.indexOf(b.zone));
  const total = sorted.reduce((s, z) => s + z.minutes, 0);
  if (sorted.length === 0 || total <= 0 || durationSec <= 0) return [];

  let used = 0;
  return sorted
    .map((z, i) => {
      const seconds =
        i === sorted.length - 1 ? durationSec - used : Math.round((durationSec * z.minutes) / total);
      used += seconds;
      return { id: z.zone, label: z.label, seconds };
    })
    .filter((s) => s.seconds > 0);
}

/** Which area you should be on after elapsedSec seconds, and how long is left in it */
export function segmentInfo(
  segments: GuideSegment[],
  elapsedSec: number,
): { index: number; secondsLeft: number } {
  let start = 0;
  for (let i = 0; i < segments.length; i++) {
    const end = start + segments[i].seconds;
    if (elapsedSec < end) return { index: i, secondsLeft: end - elapsedSec };
    start = end;
  }
  const last = segments.length - 1;
  return { index: Math.max(0, last), secondsLeft: 0 };
}