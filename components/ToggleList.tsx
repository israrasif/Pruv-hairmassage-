import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Activity } from "@/types";
import { colors, spacing, typography, radii } from "@/constants/theme";

interface Props {
  activities: Activity[];
  onToggle: (id: string) => void;
}

export default function ToggleList({ activities, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{"Today's focus"}</Text>
      {activities.map((a) => (
        <View key={a.id} style={styles.row}>
          <Text style={styles.label}>{a.label}</Text>
          <Switch
            value={a.enabled}
            onValueChange={() => onToggle(a.id)}
            trackColor={{ false: colors.track, true: colors.secondary }}
            thumbColor={a.enabled ? colors.primary : "#fff"}
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
