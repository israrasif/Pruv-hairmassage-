// components/ReminderCard.tsx  (goes in Settings)
import React, { useCallback, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getSessions } from "@/utils/storage";
import {
  DEFAULT_REMINDER,
  ReminderSettings,
  computeUsualMinutes,
  ensureNotificationPermission,
  formatTimeOfDay,
  getReminderSettings,
  rescheduleReminders,
  saveReminderSettings,
} from "@/utils/reminders";

const STEP_MIN = 30;

export default function ReminderCard() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [usual, setUsual] = useState<{ minutes: number; basedOn: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getReminderSettings().then(setSettings);
      getSessions().then((s) => setUsual(computeUsualMinutes(s)));
    }, []),
  );

  const update = async (next: ReminderSettings) => {
    setSettings(next);
    await saveReminderSettings(next);
    await rescheduleReminders();
  };

  const toggle = async (on: boolean) => {
    if (on) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert(
          "Notifications are off",
          "Allow notifications for Growmo in your phone settings to get reminders.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    await update({ ...settings, enabled: on });
  };

  const stepFixed = (delta: number) =>
    update({ ...settings, fixedMinutes: (settings.fixedMinutes + delta + 1440) % 1440 });

  const smartLine = () => {
    if (settings.mode !== "smart") return null;
    if (usual) {
      return `We'll remind you around ${formatTimeOfDay(
        (usual.minutes - 15 + 1440) % 1440,
      )}, based on your last ${usual.basedOn} sessions.`;
    }
    return `Not enough pattern yet. We'll use ${formatTimeOfDay(
      settings.fixedMinutes,
    )} until we learn your routine.`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Daily reminder</Text>
          <Text style={styles.sub}>
            Only sent on days you haven't done a session yet.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={toggle}
          trackColor={{ true: colors.primary, false: colors.track }}
        />
      </View>

      {settings.enabled && (
        <>
          <View style={styles.segment}>
            {(["smart", "fixed"] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.segBtn, settings.mode === m && styles.segBtnActive]}
                onPress={() => update({ ...settings, mode: m })}
                accessibilityRole="button"
              >
                <Text style={[styles.segText, settings.mode === m && styles.segTextActive]}>
                  {m === "smart" ? "Smart (learns my time)" : "Fixed time"}
                </Text>
              </Pressable>
            ))}
          </View>

          {smartLine() && <Text style={styles.info}>{smartLine()}</Text>}

          {settings.mode === "fixed" && (
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => stepFixed(-STEP_MIN)}
                accessibilityLabel="Earlier by 30 minutes"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.time}>{formatTimeOfDay(settings.fixedMinutes)}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => stepFixed(STEP_MIN)}
                accessibilityLabel="Later by 30 minutes"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          )}
          {settings.mode === "smart" && (
            <View style={styles.stepper}>
              <Text style={styles.stepperLabel}>Fallback time</Text>
              <Pressable style={styles.stepBtn} onPress={() => stepFixed(-STEP_MIN)}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.time}>{formatTimeOfDay(settings.fixedMinutes)}</Text>
              <Pressable style={styles.stepBtn} onPress={() => stepFixed(STEP_MIN)}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
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
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.h3, color: colors.text },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.track,
    borderRadius: radii.md,
    padding: 3,
    marginTop: spacing.md,
  },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radii.md },
  segBtnActive: { backgroundColor: colors.surface },
  segText: { ...typography.caption, color: colors.textMuted },
  segTextActive: { color: colors.text, fontWeight: "700" },
  info: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stepperLabel: { ...typography.caption, color: colors.textMuted, marginRight: "auto" },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  stepBtnText: { fontSize: 20, color: colors.primary, lineHeight: 22 },
  time: { ...typography.h3, color: colors.text, minWidth: 90, textAlign: "center" },
});