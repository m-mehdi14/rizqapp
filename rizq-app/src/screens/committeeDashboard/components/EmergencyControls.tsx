import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";

type Props = {
  isPaused?: boolean;
  onTogglePause?: () => void;
  onExport?: () => void;
  onRunPenaltyCheck?: () => void;
  penaltyLoading?: boolean;
};

export function EmergencyControls({
  isPaused,
  onTogglePause,
  onExport,
  onRunPenaltyCheck,
  penaltyLoading,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Emergency Controls</Text>
      <Pressable
        style={[styles.button, styles.pauseButton]}
        onPress={onTogglePause}
      >
        <Text style={styles.pauseText}>{isPaused ? "Resume Committee" : "Pause Committee"}</Text>
      </Pressable>
      <Text style={styles.warning}>
        Warning: pausing stops new contributions and payouts until resumed.
      </Text>
      <Pressable
        style={[styles.button, styles.exportButton]}
        onPress={onExport}
      >
        <Text style={styles.exportText}>Export Full History</Text>
      </Pressable>
      <Pressable
        style={[styles.button, styles.penaltyButton, penaltyLoading && styles.disabled]}
        onPress={onRunPenaltyCheck}
        disabled={penaltyLoading}
      >
        <Text style={styles.penaltyText}>
          {penaltyLoading ? "Running Penalty Check..." : "Run Penalty Check"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  button: {
    minHeight: 44,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pauseButton: {
    borderColor: "rgba(255,179,0,0.65)",
    backgroundColor: "rgba(255,179,0,0.15)",
  },
  pauseText: { color: colors.warning, fontWeight: "700", fontSize: typography.bodySmall },
  warning: { color: colors.textSecondary, fontSize: typography.caption, marginBottom: 2 },
  exportButton: {
    borderColor: "rgba(64,196,255,0.5)",
    backgroundColor: "rgba(64,196,255,0.15)",
  },
  exportText: { color: "#40C4FF", fontWeight: "700", fontSize: typography.bodySmall },
  penaltyButton: {
    borderColor: "rgba(255,82,82,0.5)",
    backgroundColor: "rgba(255,82,82,0.12)",
  },
  penaltyText: { color: "#FF8A80", fontWeight: "700", fontSize: typography.bodySmall },
  disabled: { opacity: 0.55 },
});
