// utils/useDataSync.ts
// Call useDataSyncTriggers() once inside the signed-in layout (app/(drawer)/_layout.tsx).
// It backs up your data when the app opens, returns to the foreground, and when you move
// between screens (at most once every 20 seconds). Changes you make also request a sync themselves.
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { usePathname } from "expo-router";
import { syncUserData } from "@/utils/dataSync";

const MIN_GAP_MS = 20_000;

export function useDataSyncTriggers() {
  const pathname = usePathname();
  const lastRun = useRef(0);

  useEffect(() => {
    if (Date.now() - lastRun.current < MIN_GAP_MS) return;
    lastRun.current = Date.now();
    syncUserData();
  }, [pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        lastRun.current = Date.now();
        syncUserData();
      }
    });
    return () => sub.remove();
  }, []);
}