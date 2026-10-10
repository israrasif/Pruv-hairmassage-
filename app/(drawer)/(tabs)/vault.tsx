// app/(drawer)/(tabs)/vault.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VaultPhoto } from "@/types";
import {
  getVaultPhotos,
  addVaultPhoto,
  deleteVaultPhoto,
} from "@/utils/storage";
import { syncVaultPhotos, queueRemoteDelete } from "@/utils/vaultSync";
import { hasPlus, usePlan } from "@/utils/entitlements";
import { colors, spacing, typography, radii } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import { usePhotoCapture } from "@/components/usePhotoCapture";

const NUM_COLUMNS = 3;
const GAP = 6;
const ITEM_SIZE =
  (Dimensions.get("window").width - spacing.lg * 2 - GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

// The Plus card in the drawer lists "side-by-side compare" as a Plus feature.
// Set to false while testing if you don't have Plus on your test account.
const COMPARE_REQUIRES_PLUS = true;

const DAY_MS = 24 * 60 * 60 * 1000;

export default function VaultScreen() {
  const router = useRouter();
  const plan = usePlan();

  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [selected, setSelected] = useState<VaultPhoto | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]); // up to 2 photo ids
  const [comparing, setComparing] = useState(false);

  // Sync with the cloud and show a loader while it runs
  const runSync = useCallback(() => {
    setSyncing(true);
    return syncVaultPhotos()
      .then((list) => {
        if (list) setPhotos(list);
      })
      .finally(() => setSyncing(false));
  }, []);

  // Runs every time the Photos tab is opened: show local photos instantly, then sync
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getVaultPhotos().then((list) => active && setPhotos(list));
      setSyncing(true);
      syncVaultPhotos()
        .then((list) => {
          if (active && list) setPhotos(list);
        })
        .finally(() => {
          if (active) setSyncing(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  // Instructions popup (first time) -> custom camera or library -> save to the vault
  const { takePhoto, choosePhoto, ui: captureUI } = usePhotoCapture(async (uri) => {
    const updated = await addVaultPhoto(uri);
    setPhotos(updated);
    runSync();
  });

  const handleDelete = async (id: string) => {
    setSelected(null);
    const updated = await deleteVaultPhoto(id);
    setPhotos(updated);
    await queueRemoteDelete(id);
    runSync();
  };

  // ----- Compare -----
  const exitCompareMode = () => {
    setCompareMode(false);
    setPicked([]);
  };

  const closeCompare = () => {
    setComparing(false);
    exitCompareMode();
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      exitCompareMode();
      return;
    }
    if (COMPARE_REQUIRES_PLUS && !hasPlus(plan)) {
      router.navigate("/plans");
      return;
    }
    if (photos.length < 2) {
      Alert.alert("Add more photos", "You need at least two photos to compare.");
      return;
    }
    setCompareMode(true);
  };

  const handlePhotoPress = (item: VaultPhoto) => {
    if (!compareMode) {
      setSelected(item);
      return;
    }
    setPicked((prev) => {
      if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
      if (prev.length < 2) return [...prev, item.id];
      return [prev[1], item.id]; // a third pick replaces the oldest pick
    });
  };

  // Older photo first = "Before"
  const comparePair = picked
    .map((id) => photos.find((p) => p.id === id))
    .filter((p): p is VaultPhoto => !!p)
    .sort((a, b) => a.timestamp - b.timestamp);
  const [before, after] = comparePair;
  const daysApart =
    before && after
      ? Math.max(0, Math.round((after.timestamp - before.timestamp) / DAY_MS))
      : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.title}>Progress Vault</Text>
        <Text style={styles.subtitle}>
          Private photo log, backed up to your account.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={takePhoto}>
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.actionText}>Camera</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnAlt]}
          onPress={choosePhoto}
        >
          <Ionicons name="images" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Import
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionBtn,
            styles.actionBtnAlt,
            compareMode && styles.actionBtnActive,
          ]}
          onPress={toggleCompareMode}
        >
          <Ionicons
            name="git-compare-outline"
            size={18}
            color={compareMode ? "#fff" : colors.primary}
          />
          <Text
            style={[
              styles.actionText,
              { color: compareMode ? "#fff" : colors.primary },
            ]}
          >
            {compareMode ? "Cancel" : "Compare"}
          </Text>
        </Pressable>
      </View>

      {compareMode && (
        <View style={styles.compareBar}>
          <Text style={styles.compareHint}>
            {picked.length === 2
              ? "Ready to compare"
              : `Tap two photos to compare (${picked.length}/2)`}
          </Text>
          <Pressable
            style={[styles.compareGo, picked.length < 2 && styles.compareGoDisabled]}
            disabled={picked.length < 2}
            onPress={() => setComparing(true)}
          >
            <Text style={styles.compareGoText}>Compare</Text>
          </Pressable>
        </View>
      )}

      {syncing && photos.length > 0 && (
        <View style={styles.syncRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.syncText}>Syncing your photos…</Text>
        </View>
      )}

      {photos.length === 0 ? (
        syncing ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyText}>Loading your photos…</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="lock-closed-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              No photos yet. Your vault is private and backed up to your account.
            </Text>
          </View>
        )
      ) : (
        <FlatList
          data={photos}
          extraData={picked}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={{ padding: spacing.lg }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => {
            const pickIndex = picked.indexOf(item.id);
            const isPicked = pickIndex !== -1;
            return (
              <Pressable onPress={() => handlePhotoPress(item)}>
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    borderRadius: radii.sm,
                    borderWidth: isPicked ? 3 : 0,
                    borderColor: colors.primary,
                    opacity: compareMode && !isPicked ? 0.8 : 1,
                  }}
                />
                {isPicked && (
                  <View style={styles.pickBadge}>
                    <Text style={styles.pickBadgeText}>{pickIndex + 1}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.syncBadge,
                    {
                      backgroundColor: item.synced
                        ? "rgba(0,0,0,0.45)"
                        : "rgba(224,160,48,0.95)",
                    },
                  ]}
                >
                  <Ionicons
                    name={item.synced ? "cloud-done" : "cloud-offline-outline"}
                    size={13}
                    color="#fff"
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {captureUI}

      {/* Single photo viewer */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          {selected && (
            <View style={styles.modalCard}>
              <Image source={{ uri: selected.uri }} style={styles.modalImage} />
              <Text style={styles.modalDate}>{selected.dateISO}</Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalBtn}
                  onPress={() => setSelected(null)}
                >
                  <Text style={styles.modalBtnText}>Close</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: colors.danger }]}
                  onPress={() => handleDelete(selected.id)}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Side-by-side compare */}
      <Modal
        visible={comparing && !!before && !!after}
        transparent
        animationType="fade"
        onRequestClose={closeCompare}
      >
        <View style={styles.modalBackdrop}>
          {before && after && (
            <View style={[styles.modalCard, { width: "92%" }]}>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>Before</Text>
                  <Image source={{ uri: before.uri }} style={styles.compareImage} />
                  <Text style={styles.compareDate}>{before.dateISO}</Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>After</Text>
                  <Image source={{ uri: after.uri }} style={styles.compareImage} />
                  <Text style={styles.compareDate}>{after.dateISO}</Text>
                </View>
              </View>
              <Text style={styles.compareSummary}>
                {daysApart === 0
                  ? "Taken on the same day"
                  : `${daysApart} day${daysApart === 1 ? "" : "s"} apart`}
              </Text>
              <Pressable style={styles.closeBtn} onPress={closeCompare}>
                <Text style={styles.modalBtnText}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { ...typography.h1, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  actionBtnAlt: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionBtnActive: { backgroundColor: colors.primary },
  actionText: { color: "#fff", fontWeight: "600" },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  syncText: { ...typography.caption, color: colors.textMuted },
  compareBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareHint: { ...typography.caption, color: colors.text, flexShrink: 1 },
  compareGo: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  compareGoDisabled: { opacity: 0.4 },
  compareGoText: { color: "#fff", fontWeight: "700" },
  syncBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 10,
    padding: 3,
  },
  pickBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBadgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    width: "85%",
  },
  modalImage: { width: "100%", aspectRatio: 1, borderRadius: radii.md },
  modalDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.track,
  },
  modalBtnText: { fontWeight: "600", color: colors.text },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.track,
    marginTop: spacing.md,
  },
  compareRow: { flexDirection: "row", gap: spacing.sm },
  compareCol: { flex: 1 },
  compareLabel: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  compareImage: { width: "100%", aspectRatio: 1, borderRadius: radii.md },
  compareDate: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  compareSummary: {
    ...typography.body,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "600",
  },
});