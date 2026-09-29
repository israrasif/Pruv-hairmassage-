import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Thread } from "@/types";
import { getThreads, addMessageToThread } from "@/utils/storage";
import { colors, spacing, typography, radii } from "@/constants/theme";

export default function CommunityScreen() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(() => {
    getThreads().then(setThreads);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const sendMessage = async () => {
    if (!activeThreadId || !draft.trim()) return;
    const updated = await addMessageToThread(activeThreadId, draft.trim());
    setThreads(updated);
    setDraft("");
  };

  if (activeThread) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.threadHeader}>
            <Pressable
              onPress={() => setActiveThreadId(null)}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadHeaderTitle} numberOfLines={1}>
                {activeThread.title}
              </Text>
              <Text style={styles.threadHeaderCategory}>
                {activeThread.category}
              </Text>
            </View>
          </View>

          <FlatList
            data={activeThread.messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item }) => (
              <View style={styles.messageBubble}>
                <Text style={styles.messageAuthor}>{item.author}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Share a tip or ask a question..."
              placeholderTextColor={colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>
          Swap tips and progress with others on the same routine.
        </Text>
      </View>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.threadCard}
            onPress={() => setActiveThreadId(item.id)}
          >
            <View style={styles.threadCardTop}>
              <Text style={styles.threadCategory}>{item.category}</Text>
              <Text style={styles.threadReplies}>
                {item.messages.length} replies
              </Text>
            </View>
            <Text style={styles.threadTitle}>{item.title}</Text>
            {item.messages.length > 0 && (
              <Text style={styles.threadPreview} numberOfLines={1}>
                {item.messages[item.messages.length - 1].author}:{" "}
                {item.messages[item.messages.length - 1].text}
              </Text>
            )}
          </Pressable>
        )}
      />
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
  threadCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  threadCardTop: { flexDirection: "row", justifyContent: "space-between" },
  threadCategory: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  threadReplies: { ...typography.caption, color: colors.textMuted },
  threadTitle: { ...typography.h3, color: colors.text, marginTop: 4 },
  threadPreview: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },

  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm },
  threadHeaderTitle: { ...typography.h3, color: colors.text },
  threadHeaderCategory: { ...typography.caption, color: colors.textMuted },
  messageBubble: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  messageAuthor: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  messageText: { ...typography.body, color: colors.text, marginTop: 2 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    color: colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
