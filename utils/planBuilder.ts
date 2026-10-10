// utils/planBuilder.ts
// Turns a person's answers into a 12-week massage plan. Pure logic: no storage, no screens.
// Every number and sentence comes from data/planConfig.json, so you can change the plans by editing that file.
// This is a habit plan, not a treatment. Nothing in here claims to cure or treat hair loss.

// ---------------------------------------------------------------- types
export type ThinningArea = "none" | "front" | "crown" | "diffuse" | "patchy";
export type ScalpState = "comfortable" | "sensitive" | "problem";
export type Level = "L1" | "L2" | "L3" | "L4";
export type ZoneId = "front" | "crown" | "sides" | "back";

export type PlanIntake = {
  thinningArea: ThinningArea; // "Where do you notice thinning?"
  scalpState: ScalpState; // "How does your scalp feel?"
  shedCheckedByDoctor: boolean; // "Have you had your shedding checked by a doctor?"
  minutesAvailable: 5 | 10 | 15 | 20; // "How long can you realistically spend per day?"
};

export type QuizInput = {
  score: number; // 0-100
  sub: { shedding: number; scalp: number; condition: number; lifestyle: number }; // 0-100 each
  // points for each question id: 3 = best answer ... 0 = worst
  answers: Record<string, number>;
};

export type ScanInput = {
  overall: number; // 0-10
  density: number;
  scalp_coverage: number;
} | null;

export type ProfileId =
  | "heavy_shedding"
  | "pattern"
  | "diffuse"
  | "scalp_comfort"
  | "condition"
  | "stress_sleep"
  | "maintenance";

export type TaskType = "checkup" | "review" | "quiz" | "photo" | "habit" | "checkin" | "shedding_check";

export type PlanTask = { id: string; type: TaskType; text: string };

export type WeekPlan = {
  week: number;
  phase: "foundation" | "build" | "sustain";
  level: Level;
  minutesPerDay: number;
  daysPerWeek: number;
  sessionsPerDay: 1 | 2;
  zoneMinutes: { zone: ZoneId; label: string; minutes: number }[];
  techniques: string[];
  tasks: PlanTask[];
  milestone?: string;
};

export type Plan = {
  configVersion: number;
  createdAt: string; // ISO
  profile: ProfileId;
  tags: string[]; // extra factors found, e.g. "sensitive", "lifestyle", "nutrition"
  title: string;
  summary: string;
  expectation: string;
  preferredTime: "evening" | "any";
  pressureRule: string;
  safetyNotes: string[];
  intake: PlanIntake;
  targetLevel: Level;
  weeks: WeekPlan[];
};

export type BuildResult =
  | { kind: "plan"; plan: Plan }
  | { kind: "doctor_first"; reason: "patchy" | "problem"; title: string; body: string };

type Config = any; // shape of data/planConfig.json

// ------------------------------------------------------------- helpers
const LEVEL_ORDER: Level[] = ["L1", "L2", "L3", "L4"];
const levelIndex = (l: Level) => LEVEL_ORDER.indexOf(l);
const minLevel = (a: Level, b: Level): Level => (levelIndex(a) <= levelIndex(b) ? a : b);

function phaseFor(week: number): WeekPlan["phase"] {
  return week <= 2 ? "foundation" : week <= 6 ? "build" : "sustain";
}

// ------------------------------------------------------ choose profile
export function chooseProfile(
  quiz: QuizInput,
  intake: PlanIntake,
): { profile: ProfileId; tags: string[] } {
  const shed = quiz.answers["shedding"] ?? 3; // 0 = "a lot more than usual"
  const heavy = shed === 0;
  const elevatedShedding = shed <= 1;
  const tags: string[] = [];

  if (intake.scalpState === "sensitive" || quiz.sub.scalp < 50) tags.push("sensitive");
  if (quiz.sub.lifestyle < 50) tags.push("lifestyle");
  if (quiz.sub.condition < 50) tags.push("condition");
  if ((quiz.answers["diet"] ?? 3) <= 1 || quiz.sub.shedding < 60) tags.push("nutrition");
  if (elevatedShedding) tags.push("elevated_shedding");

  let profile: ProfileId;
  if (heavy) profile = "heavy_shedding";
  else if (intake.thinningArea === "front" || intake.thinningArea === "crown") profile = "pattern";
  else if (intake.thinningArea === "diffuse") profile = "diffuse";
  else if (tags.includes("sensitive")) profile = "scalp_comfort";
  else if (tags.includes("condition")) profile = "condition";
  else if (tags.includes("lifestyle")) profile = "stress_sleep";
  else profile = "maintenance";

  // The profile itself shouldn't repeat as a tag
  const dedupe: Record<string, string> = { scalp_comfort: "sensitive", condition: "condition", stress_sleep: "lifestyle" };
  return { profile, tags: tags.filter((t) => t !== dedupe[profile]) };
}

// -------------------------------------------------------- zone minutes
function zoneWeights(config: Config, profile: ProfileId, area: ThinningArea): Record<ZoneId, number> {
  const style = config.profiles[profile].zoneStyle as "even" | "relax" | "focus";
  const styles = config.zoneStyles;
  let w: Record<ZoneId, number>;

  if (style === "focus" && (area === "front" || area === "crown")) {
    // The thinning area gets a bit more time; the rest of the scalp shares the remainder equally
    const rest = 1 - styles.focus.focusArea;
    w = { front: rest / 3, crown: rest / 3, sides: rest / 3, back: rest / 3 };
    w[area] = styles.focus.focusArea;
  } else if (style === "focus") {
    w = { ...styles.even };
  } else {
    w = { ...styles[style] };
  }

  // Heavy shedding with a known thinning area: shift a little time to that area, keep it calm
  if (profile === "heavy_shedding" && (area === "front" || area === "crown")) {
    w[area] += 0.15;
    w.sides -= 0.075;
    w.back -= 0.075;
  }
  return w;
}

// Splits session minutes across zones in half-minute steps, using the largest-remainder method.
// Every zone first gets minEach minutes (so the whole scalp is always covered), and only the minutes
// left over are shared out by weight. In a short session that means an even split.
export function splitMinutes(
  total: number,
  weights: Record<ZoneId, number>,
  labels: Record<ZoneId, string>,
  minEach = 0,
): { zone: ZoneId; label: string; minutes: number }[] {
  const zones = Object.keys(weights) as ZoneId[];
  const base = Math.min(minEach, total / zones.length);
  const remaining = total - base * zones.length;
  const sum = zones.reduce((s, z) => s + weights[z], 0);
  const units = Math.round(remaining * 2); // half-minute units
  const out = zones.map((z) => {
    const exact = (weights[z] / sum) * units;
    return { z, n: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let left = units - out.reduce((s, r) => s + r.n, 0);
  [...out].sort((a, b) => b.frac - a.frac).forEach((r) => {
    if (left > 0) {
      r.n += 1;
      left -= 1;
    }
  });
  return zones
    .map((z) => ({ zone: z, label: labels[z], minutes: base + out.find((r) => r.z === z)!.n / 2 }))
    .filter((z) => z.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

// ------------------------------------------------------- week schedule
function levelForWeek(config: Config, week: number, target: Level, delayWeeks: number): Level {
  const eff = Math.max(1, week - delayWeeks); // sensitive scalps start the ramp later
  const r = config.ramp;
  if (week <= 2 + delayWeeks && delayWeeks > 0) return "L1";
  let step: string;
  if (eff <= 2) step = r.weeks1to2;
  else if (eff <= 4) step = r.weeks3to4;
  else if (eff <= 6) step = r.weeks5to6;
  else step = r.weeks7to12;
  const wanted: Level = step === "target" ? target : (step as Level);
  return minLevel(wanted, target);
}

function massageFor(
  config: Config,
  level: Level,
  intake: PlanIntake,
  profile: ProfileId,
  weights: Record<ZoneId, number>,
  sensitive: boolean,
  week: number,
  daysCap: number,
): Pick<WeekPlan, "level" | "minutesPerDay" | "daysPerWeek" | "sessionsPerDay" | "zoneMinutes" | "techniques"> {
  const lv = config.levels[level];
  const minutes = Math.min(lv.minutes, intake.minutesAvailable, config.maxMinutesPerDay);
  const days = Math.max(3, Math.min(lv.days, daysCap));
  const split = minutes >= config.ramp.splitSessionsFromMinutes;
  const labels = config.zones as Record<ZoneId, string>;
  const techniques: string[] = sensitive
    ? config.techniques.sensitive
    : week <= 2
      ? config.techniques.weeks1to2
      : week <= 4
        ? config.techniques.weeks3to4
        : config.techniques.weeks5to12;
  return {
    level,
    minutesPerDay: minutes,
    daysPerWeek: days,
    sessionsPerDay: split ? 2 : 1,
    zoneMinutes: splitMinutes(minutes, weights, labels, config.minMinutesPerZone ?? 0),
    techniques,
  };
}

// ----------------------------------------------------------- tasks
const TYPE_PRIORITY: Record<TaskType, number> = {
  checkup: 1,
  review: 2,
  quiz: 2,
  photo: 3,
  habit: 4,
  checkin: 5,
  shedding_check: 99, // one-tap question, not counted toward the weekly limit
};

function tasksForWeek(config: Config, week: number, profile: ProfileId, tags: string[], needsCheckup: boolean): PlanTask[] {
  const t = config.tasks;
  const all: PlanTask[] = [];

  if (needsCheckup && week === 1) all.push({ id: `w${week}-checkup`, type: "checkup", text: t.checkup });
  if (profile === "heavy_shedding" && week === 12) {
    all.push({ id: `w${week}-recheck`, type: "checkup", text: t.checkupRecheck });
  }
  if (config.quizWeeks.includes(week)) all.push({ id: `w${week}-quiz`, type: "quiz", text: t.quiz });
  if (config.photoWeeks.includes(week)) all.push({ id: `w${week}-photo`, type: "photo", text: t.photo });
  if (config.checkinWeeks.includes(week)) all.push({ id: `w${week}-checkin`, type: "checkin", text: t.checkin });

  const applies = (for_: string[]) =>
    for_.includes("*") || for_.includes(profile) || for_.some((f) => tags.includes(f));
  config.habits
    .filter((h: any) => h.week === week && applies(h.for))
    .forEach((h: any) => all.push({ id: `w${week}-habit`, type: "habit", text: h.text }));

  const sorted = all.sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]);
  const limited = sorted.slice(0, config.maxTasksPerWeek);

  if (config.sheddingCheckProfiles.includes(profile)) {
    limited.push({ id: `w${week}-shedding`, type: "shedding_check", text: t.sheddingCheck });
  }
  return limited;
}

// ----------------------------------------------------------- build plan
export function buildPlan(
  config: Config,
  quiz: QuizInput,
  scan: ScanInput,
  intake: PlanIntake,
  now: Date = new Date(),
): BuildResult {
  // Gates: no massage plan until a doctor has looked at these
  if (intake.thinningArea === "patchy") return { kind: "doctor_first", reason: "patchy", ...config.gates.patchy };
  if (intake.scalpState === "problem") return { kind: "doctor_first", reason: "problem", ...config.gates.problem };

  const { profile, tags } = chooseProfile(quiz, intake);
  const pc = config.profiles[profile];
  const sensitive = tags.includes("sensitive") || profile === "scalp_comfort";
  const target: Level = sensitive ? minLevel(pc.targetLevel, "L2") : pc.targetLevel;
  const delay = sensitive ? config.ramp.sensitiveDelayWeeks : 0;

  // Who gets a "get a check-up" task in week 1
  const lowScan = scan != null && scan.overall <= 3;
  const needsCheckup =
    !intake.shedCheckedByDoctor &&
    (profile === "heavy_shedding" || tags.includes("elevated_shedding") || quiz.score < 35 || lowScan);

  const weights = zoneWeights(config, profile, intake.thinningArea);
  const weeks: WeekPlan[] = [];
  for (let week = 1; week <= config.planWeeks; week++) {
    const level = levelForWeek(config, week, target, delay);
    weeks.push({
      week,
      phase: phaseFor(week),
      ...massageFor(config, level, intake, profile, weights, sensitive, week, pc.daysCap),
      tasks: tasksForWeek(config, week, profile, tags, needsCheckup),
      milestone: config.milestones[String(week)],
    });
  }

  return {
    kind: "plan",
    plan: {
      configVersion: config.version,
      createdAt: now.toISOString(),
      profile,
      tags,
      title: pc.title,
      summary: pc.summary,
      expectation: pc.expectation,
      preferredTime: pc.preferredTime,
      pressureRule: config.pressureRule,
      safetyNotes: config.safetyNotes,
      intake,
      targetLevel: target,
      weeks,
    },
  };
}

// ------------------------------------------------------------ progress
export function currentWeek(plan: Plan, now: Date = new Date()): number {
  const days = Math.floor((now.getTime() - new Date(plan.createdAt).getTime()) / 86400000);
  return Math.min(plan.weeks.length, Math.max(1, Math.floor(days / 7) + 1));
}

export function weekDateRange(plan: Plan, week: number): { start: Date; end: Date } {
  const start = new Date(plan.createdAt);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/** How many different days in the given week had at least one session */
export function daysDoneInWeek(plan: Plan, week: number, sessionTimestamps: number[]): number {
  const { start, end } = weekDateRange(plan, week);
  const days = new Set<string>();
  sessionTimestamps.forEach((ts) => {
    if (ts >= start.getTime() && ts < end.getTime()) days.add(new Date(ts).toDateString());
  });
  return days.size;
}

// -------------------------------------------------------------- review
export type ReviewAction = "keep" | "simplify" | "step_up" | "gentle_reset";

export type ReviewResult = {
  action: ReviewAction;
  adherence: number; // 0-1 over the last (up to) 4 completed weeks
  message: string;
};

export function reviewPlan(
  config: Config,
  plan: Plan,
  sessionTimestamps: number[],
  sheddingAnswers: Record<number, "less" | "same" | "more">,
  irritationReported: boolean,
  now: Date = new Date(),
): ReviewResult {
  const cw = currentWeek(plan, now);
  const completed = Array.from({ length: cw - 1 }, (_, i) => i + 1).slice(-4);
  let planned = 0;
  let done = 0;
  completed.forEach((w) => {
    const target = plan.weeks[w - 1].daysPerWeek;
    planned += target;
    done += Math.min(target, daysDoneInWeek(plan, w, sessionTimestamps));
  });
  const adherence = planned === 0 ? 0 : done / planned;

  const lastTwo = completed.slice(-2);
  const moreShedding = lastTwo.length === 2 && lastTwo.every((w) => sheddingAnswers[w] === "more");

  if (irritationReported || moreShedding) {
    return {
      action: "gentle_reset",
      adherence,
      message: irritationReported
        ? "Your scalp felt irritated, so let's go back to short, light sessions for two weeks. If it doesn't settle, please see a doctor."
        : "You've told us shedding has been higher for two weeks in a row. We'll drop back to short, light sessions, and we'd suggest talking to a doctor and sharing your progress report.",
    };
  }
  if (completed.length > 0 && adherence < config.review.simplifyBelow) {
    return {
      action: "simplify",
      adherence,
      message: "Life gets busy. Let's make the plan easier so it's something you can keep up: fewer days and shorter sessions. A smaller habit you keep beats a bigger one you drop.",
    };
  }
  const stepTo = config.profiles[plan.profile].stepUpTo as Level | null;
  if (
    completed.length >= 2 &&
    adherence >= config.review.stepUpAtOrAbove &&
    stepTo &&
    levelIndex(plan.targetLevel) < levelIndex(stepTo) &&
    plan.intake.scalpState === "comfortable" &&
    plan.intake.minutesAvailable >= config.levels[stepTo].minutes
  ) {
    return {
      action: "step_up",
      adherence,
      message: "You've been very consistent. If your scalp feels comfortable, you can move up to longer sessions for the rest of your plan.",
    };
  }
  return {
    action: "keep",
    adherence,
    message: completed.length === 0
      ? "Your first review appears after your first full week."
      : "You're on track. Keep going and judge your progress using your photos and scores, not day-to-day changes.",
  };
}

/** Changes the weeks from fromWeek onwards. Returns a new plan. */
export function applyReview(config: Config, plan: Plan, action: ReviewAction, fromWeek: number): Plan {
  if (action === "keep") return plan;
  const sensitive = plan.tags.includes("sensitive") || plan.profile === "scalp_comfort";
  const pc = config.profiles[plan.profile];
  const weights = zoneWeights(config, plan.profile, plan.intake.thinningArea);

  let targetLevel = plan.targetLevel;
  if (action === "step_up" && pc.stepUpTo) targetLevel = pc.stepUpTo as Level;

  const weeks = plan.weeks.map((w) => {
    if (w.week < fromWeek) return w;
    let level: Level = w.level;
    let daysCap = pc.daysCap;
    if (action === "step_up") level = minLevel(targetLevel, levelForWeek(config, w.week, targetLevel, 0));
    if (action === "gentle_reset") level = w.week < fromWeek + 2 ? "L1" : minLevel(w.level, "L2");
    if (action === "simplify") {
      level = LEVEL_ORDER[Math.max(0, levelIndex(w.level) - 1)];
      daysCap = Math.max(config.review.minDaysAfterSimplify, w.daysPerWeek - 2);
    }
    const m = massageFor(config, level, plan.intake, plan.profile, weights, sensitive, w.week, daysCap);
    return { ...w, ...m };
  });
  return { ...plan, targetLevel, weeks };
}