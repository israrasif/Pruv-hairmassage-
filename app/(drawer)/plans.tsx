import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "@/components/TopBar";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { usePlan } from "@/utils/entitlements";

// Prices and perks are placeholders until RevenueCat offerings are wired in.
const TIERS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    perks: [
      "Massage timer and tracker",
      "Self-reported hair health score",
      "1 progress photo / month",
      "1 research article / month",
    ],
  },
  {
    key: "plus",
    name: "Plus",
    price: "$4-7 / month",
    perks: [
      "Unlimited photos + side-by-side compare",
      "Photo-informed score with trend graphs",
      "Routine builder",
      "Weekly research digest and recap",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$12-15 / month",
    perks: ["Everything in Plus", "Community", "Expert Q&A", "Deeper research"],
    note: "Founding-member offer, opens later",
  },
];

export default function PlansScreen() {
  const plan = usePlan();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Plans</Text>
        <Text style={styles.subtitle}>Pick what fits your routine.</Text>

        {TIERS.map((tier) => (
          <View key={tier.key} style={[styles.card, plan === tier.key && styles.cardActive]}>
            <Text style={styles.name}>
              {tier.name}
              {plan === tier.key ? "  (current)" : ""}
            </Text>
            <Text style={styles.price}>{tier.price}</Text>
            {tier.perks.map((p) => (
              <Text key={p} style={styles.perk}>• {p}</Text>
            ))}
            {tier.note ? <Text style={styles.note}>{tier.note}</Text> : null}
          </View>
        ))}

        <Pressable
          style={styles.restore}
          onPress={() => Alert.alert("Restore purchases", "Will be connected with RevenueCat.")}
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>
        {/* TODO: subscribe buttons, trial copy, Terms and Privacy links (required by Apple). */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm + 4 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardActive: { borderColor: colors.primary },
  name: { ...typography.h3, color: colors.text },
  price: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  perk: { ...typography.body, color: colors.text, lineHeight: 20 },
  note: { ...typography.caption, marginTop: spacing.xs, color: colors.primaryDark, fontWeight: "600" },
  restore: { alignSelf: "center", padding: spacing.sm + 4 },
  restoreText: { color: colors.primary, fontWeight: "600" },
});