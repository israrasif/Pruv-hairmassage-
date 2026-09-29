import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Session } from "@/types";
import { getSessions } from "@/utils/storage";
import { computeStreak } from "@/utils/analytics";
import { daysAgoISO } from "@/utils/date";
import { colors, spacing, typography, radii } from "@/constants/theme";

const DAYS_TO_SHOW = 30;

function groupByDay(sessions: Session[]): Record<string, Session[]> {
  const map: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    (map[s.dateISO] ||= []).push(s);
  });
  Object.values(map).forEach((list) => list.sort((a, b) => a.timestamp - b.timestamp));
  return map;
}

function cellColor(count: number) {
  if (count === 0) return colors.track;
  if (count === 1) return colors.secondary;
  return colors.primary;
}

function formatDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function TrackerScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(daysAgoISO(0));

  useFocusEffect(
    useCallback(() => {
      getSessions().then(setSessions);
      setSelectedDay(daysAgoISO(0));
    }, [])
  );

  const { current, longest, totalDays } = computeStreak(sessions);
  const byDay = useMemo(() => groupByDay(sessions), [sessions]);

  const grid = [];
  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const iso = daysAgoISO(i);
    grid.push({ iso, count: byDay[iso]?.length ?? 0 });
  }

  const selectedSessions = byDay[selectedDay] ?? [];

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
            <Pressable
              key={cell.iso}
              onPress={() => setSelectedDay(cell.iso)}
              style={[
                styles.cell,
                { backgroundColor: cellColor(cell.count) },
                cell.iso === selectedDay && styles.cellSelected,
              ]}
            />
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.track }]} />
          <Text style={styles.legendText}>None</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.secondary, marginLeft: spacing.md }]} />
          <Text style={styles.legendText}>1 session</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.primary, marginLeft: spacing.md }]} />
          <Text style={styles.legendText}>2+ sessions</Text>
        </View>

        <Text style={styles.sectionHeading}>{formatDay(selectedDay)}</Text>
        {selectedSessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions logged this day.</Text>
        ) : (
          selectedSessions.map((s) => (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <Text style={styles.sessionTime}>{formatTime(s.timestamp)}</Text>
                <Text style={styles.sessionDuration}>{Math.round(s.durationSec / 60)} min</Text>
              </View>
              <View style={styles.chipRow}>
                {s.techniques.length === 0 ? (
                  <Text style={styles.emptyText}>No techniques selected</Text>
                ) : (
                  s.techniques.map((t) => (
                    <View key={t} style={styles.chip}>
                      <Text style={styles.chipText}>{t}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ))
        )}
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
  cell: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
  cellSelected: { borderColor: colors.primaryDark },
  legendRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { ...typography.caption, color: colors.textMuted },
  emptyText: { ...typography.body, color: colors.textMuted },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionTop: { flexDirection: "row", justifyContent: "space-between" },
  sessionTime: { ...typography.h3, color: colors.text },
  sessionDuration: { ...typography.caption, color: colors.textMuted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { ...typography.caption, color: colors.primaryDark },
});