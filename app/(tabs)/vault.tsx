import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { VaultPhoto } from "@/types";
import {
  getVaultPhotos,
  addVaultPhoto,
  deleteVaultPhoto,
} from "@/utils/storage";
import { colors, spacing, typography, radii } from "@/constants/theme";

const NUM_COLUMNS = 3;
const GAP = 6;
const ITEM_SIZE =
  (Dimensions.get("window").width - spacing.lg * 2 - GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export default function VaultScreen() {
  const [photos, setPhotos] = useState<VaultPhoto[]>([]);
  const [selected, setSelected] = useState<VaultPhoto | null>(null);

  const load = useCallback(() => {
    getVaultPhotos().then(setPhotos);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const captureFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera permission needed",
        "Enable camera access in Settings to add photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const updated = await addVaultPhoto(result.assets[0].uri);
      setPhotos(updated);
    }
  };

  const importFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Photos permission needed",
        "Enable photo library access in Settings to import photos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const updated = await addVaultPhoto(result.assets[0].uri);
      setPhotos(updated);
    }
  };

  const handleDelete = async (id: string) => {
    setSelected(null);
    const updated = await deleteVaultPhoto(id);
    setPhotos(updated);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress Vault</Text>
        <Text style={styles.subtitle}>
          Private, on-device photo log of your hair over time.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={captureFromCamera}>
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.actionText}>Camera</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnAlt]}
          onPress={importFromLibrary}
        >
          <Ionicons name="images" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Import
          </Text>
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="lock-closed-outline"
            size={32}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No photos yet. Your vault is private and stored only on this device.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={{ padding: spacing.lg }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)}>
              <Image
                source={{ uri: item.uri }}
                style={{
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  borderRadius: radii.sm,
                }}
              />
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade">
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
  actionText: { color: "#fff", fontWeight: "600" },
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
});
