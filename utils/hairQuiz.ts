// utils/hairQuiz.ts
// Self-reported hair health check. Every option is worth 0-3 points (3 = best).
// This is an informational score, not a medical assessment.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toLocalDateISO } from "@/utils/date";
import { requestSync } from "@/utils/syncSignal";

const KEY = "@hair_massage/hair_quiz_results";

export type Domain = "shedding" | "scalp" | "condition" | "lifestyle";

export const DOMAIN_LABEL: Record<Domain, string> = {
  shedding: "Shedding & thinning",
  scalp: "Scalp comfort",
  condition: "Hair condition",
  lifestyle: "Lifestyle",
};

export type Question = {
  id: string;
  domain: Domain;
  text: string;
  /** Listed best to worst; points are 3, 2, 1, 0 */
  options: [string, string, string, string];
};

export const QUESTIONS: Question[] = [
  {
    id: "shedding",
    domain: "shedding",
    text: "How much hair do you notice falling out (in the shower, on your brush, on your pillow)?",
    options: ["Very little", "About a normal amount", "More than usual", "A lot more than usual"],
  },
  {
    id: "thinning",
    domain: "shedding",
    text: "In the last 6 months, have you noticed thinning, a wider parting or a receding hairline?",
    options: ["No change", "Maybe slightly", "Yes, noticeably", "Yes, significantly"],
  },
  {
    id: "itch",
    domain: "scalp",
    text: "How often is your scalp itchy, flaky or irritated?",
    options: ["Never", "Rarely", "Often", "Almost always"],
  },
  {
    id: "oil",
    domain: "scalp",
    text: "How does your scalp feel a day or two after washing?",
    options: [
      "Balanced and comfortable",
      "A bit oily or a bit dry",
      "Very oily or very dry",
      "Greasy, tight or uncomfortable",
    ],
  },
  {
    id: "breakage",
    domain: "condition",
    text: "How often do you notice split ends or hair snapping off?",
    options: ["Rarely", "Sometimes", "Often", "Constantly"],
  },
  {
    id: "texture",
    domain: "condition",
    text: "How does your hair usually feel?",
    options: [
      "Soft, strong and shiny",
      "Mostly fine",
      "Often dry or brittle",
      "Very dry, rough or straw-like",
    ],
  },
  {
    id: "heat",
    domain: "condition",
    text: "How often do you use heat styling, bleach, colour or chemical treatments?",
    options: ["Rarely or never", "A few times a month", "Weekly", "Almost every day"],
  },
  {
    id: "stress",
    domain: "lifestyle",
    text: "How stressed have you felt over the past month?",
    options: ["Low", "Moderate", "High", "Very high"],
  },
  {
    id: "sleep",
    domain: "lifestyle",
    text: "How much do you sleep on most nights?",
    options: ["7 to 9 hours", "6 to 7 hours", "5 to 6 hours", "Under 5 hours"],
  },
  {
    id: "diet",
    domain: "lifestyle",
    text: "How balanced is your diet (protein, iron-rich foods, fruit and vegetables)?",
    options: ["Very balanced", "Mostly balanced", "Often unbalanced or skipped meals", "Mostly poor"],
  },
];

// option index (0 = best) -> points
export const pointsForOption = (optionIndex: number) => 3 - optionIndex;

export type QuizResult = {
  id: string;
  dateISO: string;
  timestamp: number;
  score: number; // 0-100
  sub: Record<Domain, number>; // 0-100 each
  answers: number[]; // points per question, same order as QUESTIONS
};

export function scoreAnswers(answers: number[]): Pick<QuizResult, "score" | "sub"> {
  const total = answers.reduce((a, b) => a + b, 0);
  const score = Math.round((total / (QUESTIONS.length * 3)) * 100);

  const sub = {} as Record<Domain, number>;
  (Object.keys(DOMAIN_LABEL) as Domain[]).forEach((d) => {
    const idx = QUESTIONS.map((q, i) => (q.domain === d ? i : -1)).filter((i) => i >= 0);
    const pts = idx.reduce((sum, i) => sum + (answers[i] ?? 0), 0);
    sub[d] = Math.round((pts / (idx.length * 3)) * 100);
  });
  return { score, sub };
}

export function categorize(score: number): { label: string; blurb: string } {
  if (score >= 80)
    return { label: "Looking healthy", blurb: "Your answers suggest healthy habits and few concerns. Keep it up." };
  if (score >= 60)
    return { label: "Mostly healthy", blurb: "A few things to watch. Small habit changes can help." };
  if (score >= 40)
    return { label: "Needs some attention", blurb: "Several areas could use care. Start with your lowest area below." };
  return {
    label: "Needs care",
    blurb: "Your answers point to a lot of strain on your hair and scalp. Consider talking to a doctor or dermatologist too.",
  };
}

export const DOMAIN_ADVICE: Record<Domain, string> = {
  shedding: "Check the nutrition tips (iron, zinc, vitamin D, B12) and consider a blood test if shedding continues.",
  scalp: "Go gentle: don't scratch, avoid harsh products, and try the scalp massage technique tips.",
  condition: "Cut back on heat and chemical treatments, and handle hair gently when wet.",
  lifestyle: "Sleep, stress and food all show up in your hair. Small steps in the daily check-in help.",
};

/** True if answers suggest something worth mentioning to a doctor */
export function shouldSuggestDoctor(answers: number[]): boolean {
  const shed = QUESTIONS.findIndex((q) => q.id === "shedding");
  const thin = QUESTIONS.findIndex((q) => q.id === "thinning");
  return answers[shed] === 0 || answers[thin] === 0;
}

export async function getQuizResults(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuizResult[]) : [];
  } catch {
    return [];
  }
}

export async function saveQuizResult(answers: number[]): Promise<QuizResult> {
  const now = new Date();
  const result: QuizResult = {
    id: String(now.getTime()),
    dateISO: toLocalDateISO(now),
    timestamp: now.getTime(),
    answers,
    ...scoreAnswers(answers),
  };
  const all = await getQuizResults();
  await replaceQuizResults([...all, result].slice(-24));
  requestSync();
  return result;
}

// Used by the cloud sync to write merged data (doesn't trigger another sync)
export async function replaceQuizResults(results: QuizResult[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(results));
}