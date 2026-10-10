// components/LabeledSlider.tsx
// Needs: npx expo install @react-native-community/slider
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Turns the value into text, e.g. (v) => `${v} min` */
  format: (v: number) => string;
  /** Called once when the user lets go of the slider */
  onComplete: (v: number) => void;
  /** Show "Not logged" until the user touches the slider */
  unset?: boolean;
};

export default function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onComplete,
  unset = false,
}: Props) {
  const [live, setLive] = useState(value);
  useEffect(() => setLive(value), [value]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, unset && styles.valueUnset]}>
          {unset ? "Not logged" : format(live)}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={setLive}
        onSlidingComplete={onComplete}
        minimumTrackTintColor={unset ? colors.track : colors.primary}
        maximumTrackTintColor={colors.track}
        thumbTintColor={colors.primary}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { ...typography.body, color: colors.text, fontWeight: "600" },
  value: { ...typography.body, color: colors.primary, fontWeight: "700" },
  valueUnset: { color: colors.textMuted, fontWeight: "400" },
  slider: { width: "100%", height: 40 },
});
