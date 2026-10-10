// components/HairHealthCard.tsx  (goes in the Analyze tab, free for everyone)
import React, { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { hasPlus, usePlan } from "@/utils/entitlements";
import { fetchScans, type Scan } from "@/utils/analyzeHair";
import {
  DOMAIN_ADVICE,
  DOMAIN_LABEL,
  Domain,
  QUESTIONS,
  QuizResult,
  categorize,
  getQuizResults,
  pointsForOption,
  saveQuizResult,
  shouldSuggestDoctor,
} from "@/utils/hairQuiz";

const DAY_MS = 86400000;
// Combined score = 60% questionnaire + 40% photo scan. Photo scores are a rougher estimate,
// so the questionnaire gets the bigger share.
const QUIZ_WEIGHT = 0.6;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function HairHealthCard() {
  const router = useRouter();
  const plan = usePlan();
  const plus = hasPlus(plan);

  const [latest, setLatest] = useState<QuizResult | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getQuizResults().then((all) => active && setLatest(all.length ? all[all.length - 1] : null));
      if (plus) {
        fetchScans()
          .then((list) => active && setScan(list.length ? list[list.length - 1] : null))
          .catch(() => {});
      }
      return () => {
        active = false;
      };
    }, [plus]),
  );

  const start = () => {
    setAnswers([]);
    setStep(0);
    setOpen(true);
  };

  const choose = async (optionIndex: number) => {
    const next = [...answers.slice(0, step), pointsForOption(optionIndex)];
    if (step < QUESTIONS.length - 1) {
      setAnswers(next);
      setStep(step + 1);
      return;
    }
    const result = await saveQuizResult(next);
    setLatest(result);
    setOpen(false);
  };

  const back = () => {
    if (step === 0) setOpen(false);
    else setStep(step - 1);
  };

  const q = QUESTIONS[step];
  const cat = latest ? categorize(latest.score) : null;

  const weakest = latest
    ? (Object.entries(latest.sub) as [Domain, number][])
        .filter(([, v]) => v < 70)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
    : [];

  const scanIsRecent = !!scan && Date.now() - new Date(scan.created_at).getTime() < 30 * DAY_MS;
  const combined =
    latest && scan && scanIsRecent
      ? Math.round(QUIZ_WEIGHT * latest.score + (1 - QUIZ_WEIGHT) * scan.overall * 10)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Hair health check</Text>
        <View style={styles.freeTag}>
          <Text style={styles.freeTagText}>Free</Text>
        </View>
      </View>

      {!latest ? (
        <>
          <Text style={styles.sub}>
            Answer 10 quick questions about your hair, scalp and lifestyle to get a self-reported score.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={start} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Start (about 2 min)</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>{latest.score}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.catLabel}>{cat?.label}</Text>
              <Text style={styles.dateText}>{formatDate(latest.dateISO)}</Text>
            </View>
          </View>
          <Text style={styles.blurb}>{cat?.blurb}</Text>

          {(Object.keys(DOMAIN_LABEL) as Domain[]).map((d) => (
            <View key={d} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{DOMAIN_LABEL[d]}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${latest.sub[d]}%` }]} />
              </View>
              <Text style={styles.metricValue}>{latest.sub[d]}</Text>
            </View>
          ))}

          {weakest.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.focusHeading}>Where to focus</Text>
              {weakest.map(([d]) => (
                <Text key={d} style={styles.advice}>
                  • <Text style={{ fontWeight: "700" }}>{DOMAIN_LABEL[d]}:</Text> {DOMAIN_ADVICE[d]}
                </Text>
              ))}
            </View>
          )}

          {shouldSuggestDoctor(latest.answers) && (
            <View style={styles.doctorBox}>
              <Text style={styles.doctorText}>
                Heavy shedding or clear thinning can have medical causes (such as thyroid, iron or
                hormone changes). It's worth mentioning to a doctor or dermatologist.
              </Text>
            </View>
          )}

          {plus ? (
            combined != null && scan ? (
              <View style={styles.combinedBox}>
                <Text style={styles.combinedTitle}>With your latest photo scan</Text>
                <Text style={styles.combinedBody}>
                  Photo scan {scan.overall}/10 · Combined score{" "}
                  <Text style={{ fontWeight: "700", color: colors.primary }}>{combined}/100</Text>
                </Text>
                <Text style={styles.combinedNote}>
                  60% questionnaire + 40% photo scan. If the two disagree a lot, trust the
                  trend over any single number.
                </Text>
              </View>
            ) : (
              <Text style={styles.teaser}>
                Take a photo scan below (within 30 days) to see a combined score.
              </Text>
            )
          ) : (
            <Pressable style={styles.teaserRow} onPress={() => router.push("/plans")}>
              <Ionicons name="lock-closed" size={14} color={colors.primaryDark} />
              <Text style={styles.teaserLink}>
                Plus adds a photo scan for a more complete score
              </Text>
            </Pressable>
          )}

          <Pressable style={styles.outlineBtn} onPress={start} accessibilityRole="button">
            <Text style={styles.outlineBtnText}>Retake the check</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.disclaimer}>
        Self-reported and for information only. Not a medical diagnosis.
      </Text>

      {/* Question flow */}
      <Modal visible={open} animationType="slide" onRequestClose={back}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalTop}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Ionicons name={step === 0 ? "close" : "chevron-back"} size={26} color={colors.text} />
            </Pressable>
            <Text style={styles.progressText}>
              Question {step + 1} of {QUESTIONS.length}
            </Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${((step + 1) / QUESTIONS.length) * 100}%` }]}
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.domainTag}>{DOMAIN_LABEL[q.domain]}</Text>
            <Text style={styles.question}>{q.text}</Text>
            {q.options.map((label, i) => (
              <Pressable
                key={label}
                style={[styles.option, answers[step] === pointsForOption(i) && styles.optionChosen]}
                onPress={() => choose(i)}
                accessibilityRole="button"
              >
                <Text style={styles.optionText}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { ...typography.h3, color: colors.text },
  freeTag: {
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  freeTagText: { ...typography.caption, color: colors.primaryDark, fontWeight: "700" },
  sub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryBtnText: { ...typography.body, color: "#fff", fontWeight: "600" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    marginTop: spacing.md,
  },
  outlineBtnText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.md },
  scoreNumber: { ...typography.h1, fontSize: 40, color: colors.primary },
  scoreOutOf: { ...typography.body, color: colors.textMuted, marginLeft: 2 },
  catLabel: { ...typography.h3, color: colors.text },
  dateText: { ...typography.caption, color: colors.textMuted },
  blurb: { ...typography.body, color: colors.text, marginTop: spacing.xs, lineHeight: 21 },
  metricRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  metricLabel: { ...typography.caption, color: colors.text, width: 128 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  metricValue: { ...typography.caption, color: colors.text, width: 28, textAlign: "right" },
  focusHeading: { ...typography.body, color: colors.text, fontWeight: "700" },
  advice: { ...typography.caption, color: colors.text, marginTop: spacing.xs, lineHeight: 18 },
  doctorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.track,
  },
  doctorText: { ...typography.caption, color: colors.text, lineHeight: 18 },
  combinedBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  combinedTitle: { ...typography.caption, color: colors.textMuted },
  combinedBody: { ...typography.body, color: colors.text, marginTop: 2 },
  combinedNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  teaser: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  teaserRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  teaserLink: { ...typography.caption, color: colors.primaryDark, fontWeight: "700" },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  modalSafe: { flex: 1, backgroundColor: colors.background },
  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  progressText: { ...typography.caption, color: colors.textMuted },
  progressTrack: {
    height: 6,
    backgroundColor: colors.track,
    borderRadius: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  modalBody: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  domainTag: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  question: { ...typography.h3, color: colors.text, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 26 },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionChosen: { borderColor: colors.primary, borderWidth: 2 },
  optionText: { ...typography.body, color: colors.text },
});