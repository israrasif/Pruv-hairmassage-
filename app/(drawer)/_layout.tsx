import React from "react";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import DrawerContent from "@/components/DrawerContent";
import { colors } from "@/constants/theme";

// Always open on the tabs (Home / timer), not on whichever drawer screen sorts first.
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        initialRouteName="(tabs)"
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          // Every screen draws its own title + TopBar (hamburger), like the tabs do today.
          headerShown: false,
          drawerType: "front",
          drawerStyle: { backgroundColor: colors.background, width: 300 },
        }}
      >
        <Drawer.Screen name="(tabs)" options={{ title: "Home" }} />
        <Drawer.Screen name="research" options={{ title: "Research" }} />
        <Drawer.Screen name="routine" options={{ title: "Routine builder" }} />
        <Drawer.Screen name="community" options={{ title: "Community" }} />
        <Drawer.Screen name="plans" options={{ title: "Plans" }} />
        <Drawer.Screen name="settings" options={{ title: "Settings" }} />
        <Drawer.Screen name="help" options={{ title: "Help" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}