import { Session } from "@/types";

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

export function computeStreak(sessions: Session[]): { current: number; longest: number; totalDays: number } {
  const uniqueDays = Array.from(new Set(sessions.map((s) => toDateOnly(s.dateISO)))).sort();
  if (uniqueDays.length === 0) return { current: 0, longest: 0, totalDays: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      run += 1;
    } else if (diffDays > 1) {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  // current streak: walk backward from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daySet = new Set(uniqueDays);
  let current = 0;
  const cursor = new Date(today);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (daySet.has(iso)) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { current, longest, totalDays: uniqueDays.length };
}

export function last7DaysCounts(sessions: Session[]): { label: string; count: number }[] {
  const result: { label: string; count: number }[] = [];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const iso = d.toISOString().slice(0, 10);
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
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (daySet.has(iso)) hit += 1;
  }
  return Math.round((hit / 14) * 100);
}

export function techniqueFrequency(sessions: Session[]): Record<string, number> {
  const freq: Record<string, number> = {};
  sessions.forEach((s) => {
    s.techniques.forEach((t) => {
      freq[t] = (freq[t] || 0) + 1;
    });
  });
  return freq;
}
