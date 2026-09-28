import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 240;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  durationSec: number;
  onComplete: (elapsedSec: number) => void;
}

export default function CircularTimer({ durationSec, onComplete }: Props) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(durationSec);
    progress.setValue(0);
  }, [durationSec]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            onComplete(durationSec);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

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

  const reset = () => {
    setRunning(false);
    setRemaining(durationSec);
    progress.setValue(0);
  };

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.track}
          strokeWidth={STROKE}
          fill="none"
        />
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
        <Text style={styles.subtitle}>{running ? "Relax..." : "Ready when you are"}</Text>
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.iconBtn} onPress={reset}>
          <Ionicons name="refresh" size={22} color={colors.primaryDark} />
        </Pressable>
        <Pressable style={styles.mainBtn} onPress={() => setRunning((r) => !r)}>
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
