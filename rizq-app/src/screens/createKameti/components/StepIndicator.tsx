import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../../theme/tokens";

type Props = {
  step: number;
  totalSteps: number;
};

export function StepIndicator({ step, totalSteps }: Props) {
  return (
    <View>
      <Text style={styles.label}>{`Step ${step} of ${totalSteps}`}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(step / totalSteps) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    fontWeight: "700",
  },
  track: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.brandGreen,
  },
});
