import { Session } from "@/types";
import { toLocalDateISO, daysAgoISO } from "@/utils/date";

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

export function computeStreak(sessions: Session[]): {
  current: number;
  longest: number;
  totalDays: number;
} {
  const uniqueDays = Array.from(
    new Set(sessions.map((s) => toDateOnly(s.dateISO))),
  ).sort();
  if (uniqueDays.length === 0) return { current: 0, longest: 0, totalDays: 0 };

  // "YYYY-MM-DD" strings parse as UTC midnight, so the difference between
  // two of them is always a whole number of days (no DST or timezone effects).
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diffDays = Math.round(
      (Date.parse(uniqueDays[i]) - Date.parse(uniqueDays[i - 1])) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays === 1) {
      run += 1;
    } else if (diffDays > 1) {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  // current streak: walk backward from today (local date)
  const daySet = new Set(uniqueDays);
  let current = 0;
  while (daySet.has(daysAgoISO(current))) {
    current += 1;
  }

  return { current, longest, totalDays: uniqueDays.length };
}

export function last7DaysCounts(
  sessions: Session[],
): { label: string; count: number }[] {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toLocalDateISO(d);
    const count = sessions.filter((s) => toDateOnly(s.dateISO) === iso).length;
    result.push({ label: dayLabels[d.getDay()], count });
  }
  return result;
}

export function consistencyScore(sessions: Session[]): number {
  // % of last 14 days with at least one session
  const daySet = new Set(sessions.map((s) => toDateOnly(s.dateISO)));
  let hit = 0;
  for (let i = 0; i < 14; i++) {
    if (daySet.has(daysAgoISO(i))) hit += 1;
  }
  return Math.round((hit / 14) * 100);
}

export function activityFrequency(sessions: Session[]): Record<string, number> {
  const freq: Record<string, number> = {};
  sessions.forEach((s) => {
    s.activities.forEach((a) => {
      freq[a] = (freq[a] || 0) + 1;
    });
  });
  return freq;
}
