// app/(drawer)/tips.tsx
// Everything on this screen comes from data/tips.json. Edit that file to change the text and images.
import React, { useState } from "react";
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/constants/theme";
import TopBar from "@/components/TopBar";
import tipsData from "@/data/tips.json";
import { tipImages } from "@/data/tipImages";

type Tip = { title: string; body: string; image?: string | null };
type Section = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  image?: string | null;
  tips: Tip[];
};
type TipsData = {
  screen: { title: string; subtitle?: string };
  disclaimer?: string;
  sections: Section[];
};

const data = tipsData as unknown as TipsData;

function resolveImage(image?: string | null): ImageSourcePropType | null {
  if (!image) return null;
  if (image.startsWith("http")) return { uri: image };
  if (image.startsWith("local:")) return tipImages[image.slice(6)] ?? null;
  return null;
}

export default function TipsScreen() {
  const [openId, setOpenId] = useState<string | null>(data.sections[0]?.id ?? null);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{data.screen.title}</Text>
        {!!data.screen.subtitle && <Text style={styles.subtitle}>{data.screen.subtitle}</Text>}

        {data.sections.map((section) => {
          const open = openId === section.id;
          const sectionImage = resolveImage(section.image);
          return (
            <View key={section.id} style={styles.card}>
              <Pressable
                onPress={() => setOpenId(open ? null : section.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                {sectionImage && <Image source={sectionImage} style={styles.sectionImage} />}
                <View style={styles.headerRow}>
                  {!sectionImage && (
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name={(section.icon as keyof typeof Ionicons.glyphMap) ?? "bulb-outline"}
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {!!section.subtitle && <Text style={styles.sectionSub}>{section.subtitle}</Text>}
                  </View>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
              </Pressable>

              {open && (
                <View style={styles.tipList}>
                  {section.tips.map((tip, i) => {
                    const tipImage = resolveImage(tip.image);
                    return (
                      <View key={`${section.id}-${i}`} style={styles.tip}>
                        {tipImage && <Image source={tipImage} style={styles.tipImage} />}
                        <Text style={styles.tipTitle}>{tip.title}</Text>
                        <Text style={styles.tipBody}>{tip.body}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {!!data.disclaimer && <Text style={styles.disclaimer}>{data.disclaimer}</Text>}
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  sectionImage: { width: "100%", height: 130 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tipList: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  tip: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  tipImage: { width: "100%", height: 140, borderRadius: radii.md, marginBottom: spacing.sm },
  tipTitle: { ...typography.body, color: colors.text, fontWeight: "700" },
  tipBody: { ...typography.body, color: colors.textMuted, marginTop: 4, lineHeight: 21 },
  disclaimer: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 18 },
});