// components/HairScanCard.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { analyzeHairPhoto, fetchScans, type Scan } from "@/utils/analyzeHair";

const METRICS: { key: keyof Scan; label: string }[] = [
  { key: "density", label: "Density" },
  { key: "scalp_coverage", label: "Scalp coverage" },
  { key: "shine", label: "Shine" },
  { key: "integrity", label: "Strand health" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function HairScanCard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    try {
      setScans(await fetchScans());
    } catch {
      // Not fatal: the card just shows no history.
    }
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const pickPhoto = async (source: "camera" | "library") => {
    setError(null);
    setTip(null);

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera access needed", "Allow camera access in Settings to take a photo.");
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setPreviewUri(uri);
    setBusy(true);

    const res = await analyzeHairPhoto(uri);
    setBusy(false);

    if (res.ok) {
      setPreviewUri(null);
      setScans((prev) => [...prev, res.scan]);
    } else if (res.reason === "unusable") {
      setError(res.notes || "We couldn't see your hair clearly.");
      setTip(res.photoTips || null);
    } else {
      setError(res.message);
    }
  };

  const latest = scans.length ? scans[scans.length - 1] : null;
  const recent = scans.slice(-5).reverse();

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>AI hair check</Text>
      <Text style={styles.sub}>
        Take a clear photo in good light. Use the same spot and angle each time.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={() => pickPhoto("camera")}
          disabled={busy}
        >
          <Ionicons name="camera-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={[styles.buttonOutline, busy && styles.buttonDisabled]}
          onPress={() => pickPhoto("library")}
          disabled={busy}
        >
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text style={styles.buttonOutlineText}>Choose photo</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.busyBox}>
          {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          <Text style={styles.busyText}>Analyzing your photo… this takes a few seconds.</Text>
        </View>
      )}

      {!busy && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          {tip && <Text style={styles.tipText}>Tip: {tip}</Text>}
        </View>
      )}

      {!busy && latest && (
        <View style={{ marginTop: spacing.lg }}>
          <View style={styles.overallRow}>
            <Text style={styles.overallNumber}>{latest.overall}/10</Text>
            <Text style={styles.overallLabel}>Overall · {formatDate(latest.created_at)}</Text>
          </View>

          {METRICS.map((m) => {
            const value = Number(latest[m.key]) || 0;
            return (
              <View key={m.key} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${value * 10}%` }]} />
                </View>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            );
          })}

          {!!latest.notes && <Text style={styles.notes}>{latest.notes}</Text>}
          {!!latest.photo_tips && (
            <Text style={styles.tipText}>Next photo: {latest.photo_tips}</Text>
          )}
        </View>
      )}

      {!busy && recent.length > 1 && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.historyHeading}>Recent scans</Text>
          {recent.map((s) => (
            <View key={s.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDate(s.created_at)}</Text>
              <Text style={styles.historyScore}>{s.overall}/10</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Visual estimates only, not medical advice. Lighting and angle affect results.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heading: { ...typography.h3, color: colors.text },
  sub: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  buttonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
  },
  buttonText: { ...typography.body, color: "#fff", fontWeight: "600" },
  buttonOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
  },
  buttonOutlineText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  buttonDisabled: { opacity: 0.5 },
  busyBox: { alignItems: "center", marginTop: spacing.lg },
  preview: { width: 160, height: 160, borderRadius: radii.md },
  busyText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.track,
  },
  errorText: { ...typography.body, color: colors.text },
  tipText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  overallRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  overallNumber: { ...typography.h1, color: colors.primary },
  overallLabel: { ...typography.caption, color: colors.textMuted },
  metricRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  metricLabel: { ...typography.caption, color: colors.text, width: 110 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  metricValue: {
    ...typography.caption,
    color: colors.text,
    width: 24,
    textAlign: "right",
  },
  notes: { ...typography.body, color: colors.text, marginTop: spacing.md, lineHeight: 21 },
  historyHeading: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  historyDate: { ...typography.body, color: colors.textMuted },
  historyScore: { ...typography.body, color: colors.text, fontWeight: "600" },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
});