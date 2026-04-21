import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/tokens";

type Props = { title: string };

export function SectionHeader({ title }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <Text style={styles.text}>{title.toUpperCase()}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  bar: { width: 2, height: 14, borderRadius: 2, backgroundColor: colors.brandGreen },
  text: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
});
