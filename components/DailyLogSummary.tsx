// components/DailyLogSummary.tsx  (goes in the Tracker's selected-day section)
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  DailyLog,
  formatActivity,
  formatMood,
  formatSleep,
  getDailyLog,
} from "@/utils/dailyLog";

export default function DailyLogSummary({ dateISO }: { dateISO: string }) {
  const [log, setLog] = useState<DailyLog>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDailyLog(dateISO).then((l) => active && setLog(l));
      return () => {
        active = false;
      };
    }, [dateISO]),
  );

  const empty =
    log.sleepHours == null && log.activityMin == null && log.mood == null;

  if (empty) {
    return <Text style={styles.empty}>No check-in logged this day.</Text>;
  }

  const items = [
    log.sleepHours != null && { icon: "😴", label: "Sleep", value: formatSleep(log.sleepHours) },
    log.activityMin != null && { icon: "🏃", label: "Activity", value: formatActivity(log.activityMin) },
    log.mood != null && { icon: "🙂", label: "Mood", value: formatMood(log.mood) },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Daily check-in</Text>
      <View style={styles.row}>
        {items.map((i) => (
          <View key={i.label} style={styles.item}>
            <Text style={styles.itemLabel}>
              {i.icon} {i.label}
            </Text>
            <Text style={styles.itemValue}>{i.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm },
  item: { flex: 1 },
  itemLabel: { ...typography.caption, color: colors.textMuted },
  itemValue: { ...typography.body, color: colors.text, fontWeight: "700", marginTop: 2 },
  empty: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
});
