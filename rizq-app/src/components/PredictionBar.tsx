import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { a11y, colors, radii } from "../theme/tokens";

type Props = { yesTotal: number; noTotal: number };

export function PredictionBar({ yesTotal, noTotal }: Props) {
  const total = yesTotal + noTotal || 1;
  const yesPct = Math.round((yesTotal / total) * 100);
  const noPct = Math.max(0, 100 - yesPct);
  return (
    <View>
      <View style={styles.labels}>
        <Text style={styles.yesLabel}>YES {yesPct}%</Text>
        <Text style={styles.noLabel}>NO {noPct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.yes, { flex: yesTotal || 0.0001 }]} />
        <View style={[styles.no, { flex: noTotal || 0.0001 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  yesLabel: { color: colors.brandGreen, fontWeight: "700" },
  noLabel: { color: "#FF7B8A", fontWeight: "700" },
  track: {
    height: 14,
    borderRadius: radii.chip,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: a11y.mediumContrastBorder,
    backgroundColor: "rgba(10,51,40,0.05)",
  },
  yes: { height: "100%", backgroundColor: colors.brandGreen },
  no: { height: "100%", backgroundColor: "#FF7B8A" },
});
