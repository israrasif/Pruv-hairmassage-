// components/GuideCard.tsx  (sits under the timer on the Home screen)
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { SessionGuide } from "@/utils/useSessionGuide";

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

export default function GuideCard({ guide }: { guide: SessionGuide }) {
  const router = useRouter();

  // No plan yet: invite them to build one
  if (!guide.plan) {
    return (
      <Pressable style={styles.card} onPress={() => router.navigate("/routine")} accessibilityRole="button">
        <View style={styles.row}>
          <Ionicons name="navigate-circle-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Want a guided session?</Text>
            <Text style={styles.sub}>
              Build your plan and the timer will tell you when to move to the next area of your scalp.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  }

  // Plan exists but guidance is part of Plus
  if (guide.locked) {
    return (
      <Pressable style={styles.card} onPress={() => router.push("/plans")} accessibilityRole="button">
        <View style={styles.row}>
          <Ionicons name="lock-closed" size={20} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Guided sessions are part of Plus</Text>
            <Text style={styles.sub}>Keep your plan going with area-by-area guidance on the timer.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Guided session</Text>
      <Text style={styles.sub}>
        From your plan, week {guide.weekNumber}. {guide.week?.techniques[0]}
      </Text>

      {guide.preview.map((s, i) => (
        <View key={s.id} style={styles.segRow}>
          <Text style={styles.segNum}>{i + 1}</Text>
          <Text style={styles.segLabel}>{s.label}</Text>
          <Text style={styles.segTime}>{mmss(s.seconds)}</Text>
        </View>
      ))}
      <Text style={styles.pressure}>{guide.plan.pressureRule}</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Guide me area by area</Text>
        <Switch
          value={guide.guideOn}
          onValueChange={guide.setGuideOn}
          trackColor={{ true: colors.primary, false: colors.track }}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={[styles.switchLabel, !guide.guideOn && { color: colors.textMuted }]}>
          Voice cues (vibration always on)
        </Text>
        <Switch
          value={guide.voiceOn}
          onValueChange={guide.setVoiceOn}
          disabled={!guide.guideOn}
          trackColor={{ true: colors.primary, false: colors.track }}
        />
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
    marginTop: spacing.xl,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h3, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  segRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: spacing.sm },
  segNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    lineHeight: 22,
    backgroundColor: colors.track,
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 12,
    overflow: "hidden",
  },
  segLabel: { ...typography.body, color: colors.text, flex: 1 },
  segTime: { ...typography.body, color: colors.textMuted },
  pressure: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  switchLabel: { ...typography.body, color: colors.text, flex: 1, paddingRight: spacing.sm },
});