import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Session } from "@/types";
import { getSessions } from "@/utils/storage";
import { computeStreak } from "@/utils/analytics";
import { colors, spacing, typography, radii } from "@/constants/theme";

const DAYS_TO_SHOW = 30;

function buildGrid(sessions: Session[]) {
  const daySet = new Set(sessions.map((s) => s.dateISO));
  const cells: { iso: string; done: boolean }[] = [];
  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ iso, done: daySet.has(iso) });
  }
  return cells;
}

export default function TrackerScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  const { current, longest, totalDays } = computeStreak(sessions);
  const grid = buildGrid(sessions);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Streak</Text>
        <Text style={styles.subtitle}>Consistency is what makes the massage routine work.</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{current}</Text>
            <Text style={styles.statLabel}>Current streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{longest}</Text>
            <Text style={styles.statLabel}>Longest streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalDays}</Text>
            <Text style={styles.statLabel}>Total days</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Last {DAYS_TO_SHOW} days</Text>
        <View style={styles.grid}>
          {grid.map((cell) => (
            <View
              key={cell.iso}
              style={[styles.cell, { backgroundColor: cell.done ? colors.primary : colors.track }]}
            />
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Massage completed</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.track, marginLeft: spacing.md }]} />
          <Text style={styles.legendText}>No session</Text>
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
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  statNumber: { ...typography.h1, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2, textAlign: "center" },
  sectionHeading: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 18, height: 18, borderRadius: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { ...typography.caption, color: colors.textMuted },
});
