// components/PhotoGuide.tsx
// The "how to take a consistent photo" instructions.
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, radii, spacing, typography } from "@/constants/theme";

const SEEN_KEY = "@hair_massage/photo_guide_seen";

export async function hasSeenPhotoGuide(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === "1";
  } catch {
    return true; // never block taking a photo because of this
  }
}

export async function markPhotoGuideSeen() {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

// Edit the text here to change the instructions
const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: "repeat-outline",
    title: "Same pose every time",
    body: "Pick one view and always use it. Top view: lean your head forward and hold the phone flat, about 20 cm (8 in) above your head, camera pointing down at your parting. Front view: phone upright at arm's length, hairline in the frame.",
  },
  {
    icon: "sunny-outline",
    title: "Good, even light",
    body: "Face a window or use bright daylight. Turn the flash off. Avoid strong shadows, glare and dim rooms, because they hide the hair and change the result.",
  },
  {
    icon: "cut-outline",
    title: "Same hair setup",
    body: "Dry hair, parted the same way, with no hat, clips or heavy products. Take the photo in the same spot at about the same time of day.",
  },
  {
    icon: "mic-outline",
    title: "Can't see the screen? Use the timer",
    body: "The camera has a 5 or 10 second timer with a voice countdown and vibration. It also tells you when the phone is level. Turn your volume up.",
  },
  {
    icon: "eye-outline",
    title: "Check the preview",
    body: "After each photo you'll see a preview. Retake it if it's blurry, dark or the parting isn't in the frame.",
  },
];

export function PhotoGuideContent({
  onDone,
  doneLabel = "Got it",
}: {
  onDone: () => void;
  doneLabel?: string;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Take consistent photos</Text>
        <Text style={styles.sub}>
          Photos only compare well when they're taken the same way each time.
        </Text>
        {STEPS.map((s) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.iconCircle}>
              <Ionicons name={s.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepBody}>{s.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.doneBtn} onPress={onDone} accessibilityRole="button">
          <Text style={styles.doneText}>{doneLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function PhotoGuideModal({
  visible,
  onClose,
  doneLabel,
}: {
  visible: boolean;
  onClose: () => void;
  doneLabel?: string;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <PhotoGuideContent
        doneLabel={doneLabel}
        onDone={() => {
          markPhotoGuideSeen();
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  step: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  stepBody: { ...typography.body, color: colors.textMuted, marginTop: 2, lineHeight: 21 },
  footer: { padding: spacing.lg },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: { ...typography.body, color: "#fff", fontWeight: "700" },
});