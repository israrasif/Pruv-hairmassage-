import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { colors, radii, spacing } from "@/constants/theme";
import { hasPlus, usePlan } from "@/utils/entitlements";

/** Small "Plus" chip for screen top bars. Hidden once the user has Plus. */
export default function PlusPill() {
  const router = useRouter();
  const plan = usePlan();
  if (hasPlus(plan)) return null;

  return (
    <Pressable
      onPress={() => router.push("/plans")}
      style={styles.pill}
      accessibilityRole="button"
      accessibilityLabel="See Plus plan"
    >
      <Text style={styles.text}>Plus</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  text: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
});