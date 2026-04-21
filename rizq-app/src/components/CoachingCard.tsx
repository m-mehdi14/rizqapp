import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors, spacing, typography } from "../theme/tokens";
import { GlassCard } from "./GlassCard";

type Props = { message: string; dateLabel: string; goalHealthScore: number };

export function CoachingCard({ message, dateLabel, goalHealthScore }: Props) {
  const health = Math.max(0, Math.min(5, goalHealthScore));
  const healthText =
    health >= 5 ? "Excellent" : health >= 4 ? "Good" : health >= 3 ? "Watch Out" : "Critical";
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>✨ Your Weekly Coaching</Text>
      <Text style={styles.meta}>{dateLabel}</Text>
      <LinearGradient colors={[colors.brandPurple, colors.info]} style={styles.messageBorder}>
        <View style={styles.messageInner}>
          <Text style={styles.text}>{message}</Text>
        </View>
      </LinearGradient>
      <View style={styles.healthRow}>
        <View style={styles.gauge}>
          <Text style={styles.gaugeValue}>{health}/5</Text>
        </View>
        <Text style={styles.healthText}>Goal Health · {healthText}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
  },
  title: { color: colors.textPrimary, fontSize: typography.h3, fontWeight: "700" },
  text: {
    color: colors.textPrimary,
    fontSize: typography.bodyCoaching,
    lineHeight: 30,
  },
  meta: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 4 },
  messageBorder: {
    borderRadius: 16,
    padding: 1.2,
    marginTop: spacing.unit * 1.5,
  },
  messageInner: {
    borderRadius: 15,
    backgroundColor: "rgba(8,14,26,0.8)",
    padding: spacing.card - 2,
  },
  healthRow: {
    marginTop: spacing.unit * 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gauge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,230,118,0.12)",
  },
  gaugeValue: { color: colors.brandGreen, fontWeight: "700", fontSize: 12 },
  healthText: { color: colors.textSecondary, fontSize: typography.bodySmall },
});
