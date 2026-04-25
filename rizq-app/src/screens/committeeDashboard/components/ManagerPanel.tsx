import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { radii, typography } from "../../../theme/tokens";

type Props = {
  children: React.ReactNode;
};

export function ManagerPanel({ children }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Manager Controls</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(64,196,255,0.4)",
    backgroundColor: "rgba(64,196,255,0.08)",
    padding: 12,
    gap: 10,
  },
  title: {
    color: "#40C4FF",
    fontSize: typography.body,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
