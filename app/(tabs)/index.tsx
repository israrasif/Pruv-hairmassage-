import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CircularTimer from "@/components/CircularTimer";
import ToggleList from "@/components/ToggleList";
import MediaPlayer from "@/components/MediaPlayer";
import { Activity, Session } from "@/types";
import { getActivities, saveActivities, addSession } from "@/utils/storage";
import { colors, spacing, typography } from "@/constants/theme";
import { toLocalDateISO } from "@/utils/date";

const SESSION_LENGTH_SEC = 1 * 10; // 5 minute default session

export default function HomeScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getActivities().then(setActivities);
  }, []);

  const handleToggle = useCallback(
    async (id: string) => {
      const updated = activities.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a,
      );
      setActivities(updated);
      await saveActivities(updated);
    },
    [activities],
  );

  const handleComplete = useCallback(
    async (elapsedSec: number) => {
      const now = new Date();
      const session: Session = {
        id: `${now.getTime()}`,
        dateISO: toLocalDateISO(now),
        timestamp: now.getTime(),
        durationSec: elapsedSec,
        activities: activities.filter((a) => a.enabled).map((a) => a.label),
      };
      await addSession(session);
      Alert.alert(
        "Session logged 🎉",
        "Nice work — this session was added to your tracker.",
      );
    },
    [activities],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Daily Hair Massage</Text>
        <Text style={styles.subtitle}>
          Follow along, then relax while the timer runs.
        </Text>

        <MediaPlayer />

        <View style={styles.timerWrap}>
          <CircularTimer
            durationSec={SESSION_LENGTH_SEC}
            onComplete={handleComplete}
          />
        </View>

        <ToggleList activities={activities} onToggle={handleToggle} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { ...typography.h1, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  timerWrap: { alignItems: "center", marginTop: spacing.xl },
});
