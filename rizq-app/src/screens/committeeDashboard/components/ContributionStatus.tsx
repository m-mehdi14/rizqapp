import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, radii, typography } from "../../../theme/tokens";

export type ContributionStatusData = {
  nextPaymentAmount: number;
  solUsdcRate?: number | null;
  nextPaymentDueDate: string;
  daysRemaining: number;
  hasPaidCurrentCycle: boolean;
  paidAt?: string;
};

type Props = {
  committee: ContributionStatusData;
  onPayNow: () => void;
};

export function ContributionStatus({ committee, onPayNow }: Props) {
  const solEquivalent =
    committee.solUsdcRate && committee.solUsdcRate > 0
      ? committee.nextPaymentAmount / committee.solUsdcRate
      : 0;
  const primaryAmountLabel = solEquivalent > 0 ? `~${solEquivalent.toFixed(4)} SOL` : "-- SOL";
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.heading}>My Contribution Status</Text>
      <Text style={styles.amount}>{primaryAmountLabel}</Text>
      <Text style={styles.amountSub}>{`$${committee.nextPaymentAmount.toFixed(2)} USDC`}</Text>
      <Text style={styles.meta}>{`Due ${committee.nextPaymentDueDate} • ${committee.daysRemaining} days left`}</Text>

      {!committee.hasPaidCurrentCycle ? (
        <Pressable style={styles.button} onPress={onPayNow} accessibilityRole="button">
          <Text style={styles.buttonText}>Pay Now</Text>
        </Pressable>
      ) : (
        <View style={styles.paidWrap}>
          <Text style={styles.paid}>Paid ✓ {committee.paidAt ?? ""}</Text>
          <Text style={styles.link}>View on Solana Explorer</Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 6 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  amount: { color: colors.brandGreen, fontSize: 30, fontWeight: "800" },
  amountSub: { color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: "700" },
  meta: { color: colors.textPrimary, fontSize: typography.bodySmall },
  button: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.textInverse, fontSize: typography.body, fontWeight: "700" },
  paidWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.4)",
    backgroundColor: "rgba(0,230,118,0.08)",
    borderRadius: radii.input,
    padding: 10,
    gap: 4,
  },
  paid: { color: colors.success, fontSize: typography.bodySmall, fontWeight: "700" },
  link: { color: "#40C4FF", fontSize: typography.caption, textDecorationLine: "underline" },
});
