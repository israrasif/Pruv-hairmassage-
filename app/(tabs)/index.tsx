import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CircularTimer from "@/components/CircularTimer";
import ToggleList from "@/components/ToggleList";
import MediaPlayer from "@/components/MediaPlayer";
import { Technique, Session } from "@/types";
import { getTechniques, saveTechniques, addSession } from "@/utils/storage";
import { colors, spacing, typography, radii } from "@/constants/theme";
import { toLocalDateISO } from "@/utils/date";


const SESSION_LENGTH_SEC = 1 * 10; // 5 minute default session

export default function HomeScreen() {
  const [techniques, setTechniques] = useState<Technique[]>([]);

  useEffect(() => {
    getTechniques().then(setTechniques);
  }, []);

  const handleToggle = useCallback(
    async (id: string) => {
      const updated = techniques.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t));
      setTechniques(updated);
      await saveTechniques(updated);
    },
    [techniques]
  );

  const handleComplete = useCallback(
    async (elapsedSec: number) => {
      const now = new Date();
      const session: Session = {
        id: `${now.getTime()}`,
        dateISO: toLocalDateISO(now),
        timestamp: now.getTime(),
        durationSec: elapsedSec,
        techniques: techniques.filter((t) => t.enabled).map((t) => t.label),
      };
      await addSession(session);
      Alert.alert("Session logged 🎉", "Nice work — this session was added to your tracker.");
    },
    [techniques]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Daily Hair Massage</Text>
        <Text style={styles.subtitle}>Follow along, then relax while the timer runs.</Text>

        <MediaPlayer />

        <View style={styles.timerWrap}>
          <CircularTimer durationSec={SESSION_LENGTH_SEC} onComplete={handleComplete} />
        </View>

        <ToggleList techniques={techniques} onToggle={handleToggle} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  timerWrap: { alignItems: "center", marginTop: spacing.xl },
});
