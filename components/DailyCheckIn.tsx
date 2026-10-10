// components/DailyCheckIn.tsx  (goes on the Home screen)
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radii, spacing, typography } from "@/constants/theme";
import LabeledSlider from "@/components/LabeledSlider";
import { toLocalDateISO } from "@/utils/date";
import {
  DailyLog,
  formatActivity,
  formatMood,
  formatSleep,
  getDailyLog,
  saveDailyLog,
} from "@/utils/dailyLog";

export default function DailyCheckIn() {
  const [dateISO, setDateISO] = useState(() => toLocalDateISO(new Date()));
  const [log, setLog] = useState<DailyLog>({});

  // Reload on focus so it rolls over to the new day after midnight
  useFocusEffect(
    useCallback(() => {
      const today = toLocalDateISO(new Date());
      setDateISO(today);
      getDailyLog(today).then(setLog);
    }, []),
  );

  const update = async (patch: Partial<DailyLog>) => {
    setLog((prev) => ({ ...prev, ...patch }));
    await saveDailyLog(dateISO, patch);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Today's check-in</Text>
      <Text style={styles.sub}>
        Takes 10 seconds. Helps you spot what affects your hair.
      </Text>

      <LabeledSlider
        label="😴  Sleep"
        value={log.sleepHours ?? 7}
        min={0}
        max={12}
        step={0.5}
        unset={log.sleepHours == null}
        format={formatSleep}
        onComplete={(v) => update({ sleepHours: v })}
      />
      <LabeledSlider
        label="🏃  Physical activity"
        value={log.activityMin ?? 30}
        min={0}
        max={120}
        step={5}
        unset={log.activityMin == null}
        format={formatActivity}
        onComplete={(v) => update({ activityMin: v })}
      />
      <LabeledSlider
        label="🙂  Mood"
        value={log.mood ?? 3}
        min={1}
        max={5}
        step={1}
        unset={log.mood == null}
        format={formatMood}
        onComplete={(v) => update({ mood: v })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  title: { ...typography.h3, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
