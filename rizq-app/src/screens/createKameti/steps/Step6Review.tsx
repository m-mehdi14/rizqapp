import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { CreateKametiDraft } from "../store/useCreateKametiStore";

type Props = {
  draft: CreateKametiDraft;
};

export function Step6Review({ draft }: Props) {
  const amount = Number(draft.amountPerMember || 0);
  const estimatedPayout = amount * draft.maxMembers;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 6: Review & Launch</Text>

      <GlassCard style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Committee Summary</Text>
        <SummaryRow label="Name" value={draft.committeeName || "-"} />
        <SummaryRow label="Purpose" value={draft.purposeType} />
        <SummaryRow label="Description" value={draft.description || "-"} />
        <SummaryRow label="Amount / cycle" value={`$${amount.toFixed(2)} USDC`} />
        <SummaryRow label="Frequency" value={draft.paymentFrequency} />
        <SummaryRow label="Max members" value={`${draft.maxMembers}`} />
        <SummaryRow label="KYC required" value={draft.kycRequired ? "Yes" : "No"} />
        <SummaryRow label="Nominee required" value={draft.nomineeRequired ? "Yes" : "No"} />
        <SummaryRow label="Invite method" value={draft.inviteMethod} />
        <SummaryRow label="Payout order" value={draft.payoutOrder} />
        <SummaryRow
          label="Order editable post launch"
          value={draft.managerCanChangeOrder ? "Yes" : "No"}
        />
        <SummaryRow label="Grace period" value={draft.gracePeriod} />
        <SummaryRow label="Missed payment action" value={draft.missedPaymentAction} />
        <SummaryRow label="Penalty destination" value={draft.penaltyDestination} />
        <SummaryRow label="Welfare opt-in" value={draft.welfareOptIn ? "Yes" : "No"} />
      </GlassCard>

      <GlassCard style={styles.payoutCard}>
        <Text style={styles.payoutLabel}>Estimated Payout per Member</Text>
        <Text style={styles.payoutValue}>{`$${estimatedPayout.toFixed(2)} USDC`}</Text>
        <Text style={styles.payoutSubtext}>{`${draft.maxMembers} cycles for ${draft.maxMembers} members`}</Text>
      </GlassCard>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryCard: {
    gap: 8,
    padding: 14,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    flex: 1,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  payoutCard: {
    gap: 6,
    padding: 14,
  },
  payoutLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  payoutValue: {
    color: colors.brandGreen,
    fontSize: typography.h2,
    fontWeight: "800",
  },
  payoutSubtext: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
});
