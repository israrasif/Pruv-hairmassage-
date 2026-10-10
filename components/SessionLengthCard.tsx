// components/SessionLengthCard.tsx  (goes in Settings)
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import LabeledSlider from "@/components/LabeledSlider";
import {
  DEFAULT_SESSION_MIN,
  MAX_SESSION_MIN,
  MIN_SESSION_MIN,
  getSessionLengthMin,
  setSessionLengthMin,
} from "@/utils/settings";

const PRESETS = [5, 10, 15, 20, 30];

export default function SessionLengthCard() {
  const [minutes, setMinutes] = useState(DEFAULT_SESSION_MIN);

  useEffect(() => {
    getSessionLengthMin().then(setMinutes);
  }, []);

  const save = (m: number) => {
    setMinutes(m);
    setSessionLengthMin(m);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Default session length</Text>
      <Text style={styles.sub}>How long the timer runs on the Home screen.</Text>

      <LabeledSlider
        label="Duration"
        value={minutes}
        min={MIN_SESSION_MIN}
        max={MAX_SESSION_MIN}
        step={1}
        format={(v) => `${v} min`}
        onComplete={save}
      />
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{MIN_SESSION_MIN} min</Text>
        <Text style={styles.rangeText}>{MAX_SESSION_MIN} min</Text>
      </View>

      <View style={styles.chips}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => save(p)}
            style={[styles.chip, minutes === p && styles.chipActive]}
            accessibilityRole="button"
            accessibilityLabel={`Set to ${p} minutes`}
          >
            <Text style={[styles.chipText, minutes === p && styles.chipTextActive]}>
              {p} min
            </Text>
          </Pressable>
        ))}
      </View>
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
    marginBottom: spacing.lg,
  },
  title: { ...typography.h3, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  rangeRow: { flexDirection: "row", justifyContent: "space-between" },
  rangeText: { ...typography.caption, color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: "#fff", fontWeight: "700" },
});
