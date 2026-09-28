import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { Session } from "@/types";
import { getSessions } from "@/utils/storage";
import { last7DaysCounts, consistencyScore, computeStreak, techniqueFrequency } from "@/utils/analytics";
import { colors, spacing, typography, radii } from "@/constants/theme";

const CHART_WIDTH = Dimensions.get("window").width - spacing.lg * 2;
const CHART_HEIGHT = 160;
const BAR_GAP = 10;

function insightMessage(score: number, streak: number, totalSessions: number): string {
  if (totalSessions === 0) {
    return "Log your first session on the Massage tab to start seeing insights here.";
  }
  if (score >= 70) {
    return "You're highly consistent. Scalp circulation benefits compound with routines like this — keep it up.";
  }
  if (score >= 40) {
    return "You're building a decent rhythm. Try to close the gaps between sessions to see faster results.";
  }
  return "Consistency looks low right now. Even 2–3 short sessions a week tends to work better than sporadic long ones.";
}

export default function AnalyzeScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  const weekly = last7DaysCounts(sessions);
  const score = consistencyScore(sessions);
  const { current } = computeStreak(sessions);
  const freq = techniqueFrequency(sessions);
  const topTechnique = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  const maxCount = Math.max(1, ...weekly.map((w) => w.count));
  const barWidth = (CHART_WIDTH - BAR_GAP * (weekly.length - 1)) / weekly.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Progress Analysis</Text>
        <Text style={styles.subtitle}>A rough read on whether the routine is working for you.</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreNumber}>{score}%</Text>
          <Text style={styles.scoreLabel}>Consistency (last 14 days)</Text>
        </View>

        <Text style={styles.sectionHeading}>This week</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {weekly.map((w, i) => {
            const barHeight = (w.count / maxCount) * (CHART_HEIGHT - 30);
            const x = i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - barHeight - 20;
            return (
              <React.Fragment key={w.label + i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={w.count > 0 ? colors.primary : colors.track}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT - 4}
                  fontSize="11"
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {w.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        <Text style={styles.sectionHeading}>Insight</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>{insightMessage(score, current, sessions.length)}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{current}</Text>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber} numberOfLines={1}>
              {topTechnique ? topTechnique[0] : "—"}
            </Text>
            <Text style={styles.statLabel}>Most used technique</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  scoreCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  scoreNumber: { ...typography.h1, fontSize: 36, color: "#fff" },
  scoreLabel: { ...typography.caption, color: "#fff", marginTop: 4, opacity: 0.9 },
  sectionHeading: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  insightText: { ...typography.body, color: colors.text, lineHeight: 21 },
  statsGrid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
  },
  statNumber: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: "center" },
});
