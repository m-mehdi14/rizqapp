import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import LinearGradient from "react-native-linear-gradient";

export function GoalCompleteScreen() {
  return (
    <ScreenShell variant="celebration">
      <View style={styles.root}>
        <GlassCard style={styles.card}>
          <Text style={styles.headline}>Mubarak ho! 🎉</Text>
          <Text style={styles.sub}>Goal Achieved</Text>
          <Text style={styles.goal}>🌙 Eid Outfit 2026</Text>
          <Text style={styles.amount}>$100 saved in 28 days</Text>
          <View style={styles.sep} />
          <Text style={styles.stat}>✅ 3 believers earned +50%</Text>
          <Text style={styles.stat}>❌ 1 doubter lost their bet</Text>
          <Text style={styles.stat}>Platform fee: $0.27 (1.5%)</Text>
          <LinearGradient colors={[colors.brandGold, "#FF8F00"]} style={styles.primary}>
            <Text style={styles.primaryText}>🎨 Share Achievement Card</Text>
          </LinearGradient>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>Start New Goal</Text>
          </Pressable>
        </GlassCard>
      </View>
    </ScreenShell>
  );
}

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
