import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { colors, spacing } from "@/constants/theme";
import PlusPill from "@/components/PlusPill";

interface Props {
  /** Show the small Plus chip on the right (hidden automatically for Plus users). */
  showPlus?: boolean;
}

/** Hamburger that opens the drawer, plus an optional Plus chip. Put it first inside each screen's SafeAreaView. */
export default function TopBar({ showPlus = false }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu-outline" size={28} color={colors.text} />
      </Pressable>
      {showPlus ? <PlusPill /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 44,
  },
});