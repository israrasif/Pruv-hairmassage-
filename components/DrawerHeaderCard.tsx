import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { daysLeft, usePlanInfo, type Plan } from "@/utils/entitlements";
import { displayName, useUser } from "@/utils/useUser";

const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  plus: "Plus",
  premium: "Premium",
};

const BADGE: Record<Plan, { bg: string; fg: string }> = {
  free: { bg: colors.track, fg: colors.textMuted },
  plus: { bg: colors.accent, fg: colors.primaryDark },
  premium: { bg: colors.primary, fg: "#fff" },
};

export default function DrawerHeaderCard({ onPress }: { onPress?: () => void }) {
  const user = useUser();
  const { plan, expiresAt, isTrial } = usePlanInfo();

  const name = displayName(user);
  const avatarUrl: string | undefined = user?.user_metadata?.avatar_url;
  const days = daysLeft(expiresAt);
  const badge = BADGE[plan];

  let remaining: string | null = null;
  if (days !== null) {
    const unit = days === 1 ? "day" : "days";
    remaining = `${days} ${unit} left${isTrial ? " in trial" : ""}`;
  } else if (plan === "free") {
    remaining = "Upgrade for more";
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>
              {PLAN_LABEL[plan]}
            </Text>
          </View>
          {remaining ? <Text style={styles.remaining}>{remaining}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { ...typography.h3, color: "#fff" },
  info: { flex: 1, gap: 6 },
  name: { ...typography.h3, color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  remaining: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
});