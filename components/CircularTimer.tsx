import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, AppState } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useAudioPlayer } from "expo-audio";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 240;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RESET_DELAY_MS = 900;

interface Props {
  durationSec: number;
  onComplete: (elapsedSec: number) => void;
}

export default function CircularTimer({ durationSec, onComplete }: Props) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimeRef = useRef<number | null>(null); // ms epoch when the session should finish

  const player = useAudioPlayer(require("@/assets/sounds/391540__unlistenable__electro-success-sound.wav"));

  // Keep the screen awake only while a session is actually running.
  useKeepAwake(running ? "hair-massage-session" : undefined);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const reset = () => {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    endTimeRef.current = null;
    setRunning(false);
    setJustFinished(false);
    setRemaining(durationSec);
    progress.setValue(0);
  };

  useEffect(() => {
    reset();
  }, [durationSec]);

  // Recompute remaining from the end timestamp, and finish if time's already up.
  const sync = () => {
    if (endTimeRef.current == null) return;
    const secsLeft = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(secsLeft);
    if (secsLeft <= 0) {
      clearInterval(intervalRef.current!);
      endTimeRef.current = null;
      setRunning(false);
      setJustFinished(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
      player.seekTo(0);
      player.play();

      onCompleteRef.current(durationSec);
      resetTimeoutRef.current = setTimeout(() => {
        setJustFinished(false);
        setRemaining(durationSec);
        progress.setValue(0);
      }, RESET_DELAY_MS);
    }
  };

  useEffect(() => {
    if (running) {
      endTimeRef.current = Date.now() + remaining * 1000;
      intervalRef.current = setInterval(sync, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Re-sync the instant the app comes back to the foreground, instead of
  // waiting for the next 1s tick.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fraction = 1 - remaining / durationSec;
    Animated.timing(progress, {
      toValue: fraction,
      duration: 900,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [remaining]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const statusLabel = justFinished ? "Session complete 🎉" : running ? "Relax..." : "Ready when you are";

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.track} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.time}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>
        <Text style={styles.subtitle}>{statusLabel}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.iconBtn} onPress={reset}>
          <Ionicons name="refresh" size={22} color={colors.primaryDark} />
        </Pressable>
        <Pressable style={styles.mainBtn} onPress={() => setRunning((r) => !r)} disabled={justFinished}>
          <Ionicons name={running ? "pause" : "play"} size={28} color="#fff" />
        </Pressable>
        <View style={{ width: 42 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", top: 0, left: 0, right: 0, height: SIZE, alignItems: "center", justifyContent: "center" },
  time: { ...typography.h1, fontSize: 40, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  controls: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 20 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});