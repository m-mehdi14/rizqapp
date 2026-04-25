import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { JoinInviteData } from "../store/useJoinKametiStore";

type Props = {
  inviteData: JoinInviteData;
};

export function JoinConfirm({ inviteData }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Join</Text>
      <GlassCard style={styles.card}>
        <Text style={styles.label}>First Contribution Due Date</Text>
        <Text style={styles.value}>{inviteData.firstContributionDueDate}</Text>
        <Text style={styles.label}>Amount Required</Text>
        <Text style={styles.amount}>{`$${inviteData.contributionAmountUSDC.toFixed(2)} USDC`}</Text>
      </GlassCard>
      <Text style={styles.helper}>
        By confirming, you agree to contribute on time and follow committee rules.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: "700",
  },
  card: {
    padding: 16,
    gap: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
    marginBottom: 6,
  },
  amount: {
    color: colors.brandGreen,
    fontSize: 30,
    fontWeight: "800",
  },
  helper: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
});
