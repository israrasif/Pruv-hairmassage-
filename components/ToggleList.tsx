import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Technique } from "@/types";
import { colors, spacing, typography, radii } from "@/constants/theme";

interface Props {
  techniques: Technique[];
  onToggle: (id: string) => void;
}

export default function ToggleList({ techniques, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{"Today's focus"}</Text>
      {techniques.map((t) => (
        <View key={t.id} style={styles.row}>
          <Text style={styles.label}>{t.label}</Text>
          <Switch
            value={t.enabled}
            onValueChange={() => onToggle(t.id)}
            trackColor={{ false: colors.track, true: colors.secondary }}
            thumbColor={t.enabled ? colors.primary : "#fff"}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { ...typography.body, color: colors.text },
});
