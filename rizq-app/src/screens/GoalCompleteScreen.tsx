import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import LinearGradient from "react-native-linear-gradient";

export function CommitteeCycleCompleteScreen() {
  return (
    <ScreenShell variant="celebration">
      <View style={styles.root}>
        <GlassCard style={styles.card}>
          <Text style={styles.headline}>Mubarak ho! 🎉</Text>
          <Text style={styles.sub}>Cycle Completed</Text>
          <Text style={styles.goal}>🌙 Hajj 2026 Circle</Text>
          <Text style={styles.amount}>$100 contributed in 28 days</Text>
          <View style={styles.sep} />
          <Text style={styles.stat}>Members paid on time this cycle.</Text>
          <Text style={styles.stat}>Payout moved to scheduled recipient.</Text>
          <Text style={styles.stat}>Platform fee: $0.27 (1.5%)</Text>
          <LinearGradient colors={[colors.brandGold, "#FF8F00"]} style={styles.primary}>
            <Text style={styles.primaryText}>🎨 Share Achievement Card</Text>
          </LinearGradient>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>Start New Committee</Text>
          </Pressable>
        </GlassCard>
      </View>
    </ScreenShell>
  );
}

// Backward-compatible export while route names are being migrated.
export const GoalCompleteScreen = CommitteeCycleCompleteScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.screenX,
    justifyContent: "center",
  },
  headline: {
    color: colors.accentGold,
    fontSize: typography.display,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.unit,
    marginBottom: spacing.section,
  },
  goal: { color: colors.textPrimary, textAlign: "center", marginBottom: spacing.unit },
  amount: {
    color: colors.brandGold,
    textAlign: "center",
    fontSize: typography.h2,
    fontWeight: "700",
    marginBottom: spacing.unit * 1.5,
  },
  card: { padding: spacing.card, marginBottom: spacing.section },
  sep: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 10 },
  stat: { color: colors.textSecondary, marginBottom: 8 },
  primary: {
    marginTop: spacing.section - 6,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  primaryText: { color: colors.textInverse, fontWeight: "700" },
  link: { marginTop: spacing.unit * 2, alignItems: "center" },
  linkText: { color: colors.brandGreen, fontWeight: "700" },
});
