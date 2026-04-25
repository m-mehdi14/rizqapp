import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, radii, typography } from "../../../theme/tokens";
import type { CreateKametiDraft, PaymentFrequency } from "../store/useCreateKametiStore";

const FREQUENCIES: PaymentFrequency[] = [
  "Weekly",
  "Monthly",
  "Bi-monthly",
  "Quarterly",
];

type Props = {
  draft: CreateKametiDraft;
  onChange: (patch: Partial<CreateKametiDraft>) => void;
};

export function Step2Economics({ draft, onChange }: Props) {
  const amount = Number(draft.amountPerMember || 0);
  const estimatedPayout = amount * draft.maxMembers;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2: Contribution Rules</Text>
      <TextInput
        accessibilityLabel="Amount per member per cycle in USDC"
        keyboardType="decimal-pad"
        placeholder="Amount per member (USDC, min 5)"
        placeholderTextColor={colors.textMuted}
        value={draft.amountPerMember}
        onChangeText={(text) => onChange({ amountPerMember: text })}
        style={styles.input}
      />

      <Text style={styles.label}>Payment Frequency</Text>
      <View style={styles.optionsWrap}>
        {FREQUENCIES.map((value) => {
          const active = draft.paymentFrequency === value;
          return (
            <Text
              key={value}
              onPress={() => onChange({ paymentFrequency: value })}
              style={[styles.optionChip, active && styles.optionChipActive]}
            >
              {value}
            </Text>
          );
        })}
      </View>

      <Text style={styles.helperText}>Number of cycles = number of members.</Text>

      <GlassCard style={styles.previewCard}>
        <Text style={styles.previewTitle}>Auto Preview</Text>
        <Text style={styles.previewBody}>{`Payout will be $${amount.toFixed(2)} × ${draft.maxMembers} members`}</Text>
        <Text style={styles.previewValue}>{`Estimated Payout: $${estimatedPayout.toFixed(2)} USDC`}</Text>
      </GlassCard>
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
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    fontSize: typography.body,
  },
  optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  optionChipActive: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.15)",
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
  previewCard: {
    padding: 14,
    gap: 6,
  },
  previewTitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  previewBody: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
  },
  previewValue: {
    color: colors.brandGreen,
    fontSize: typography.h3,
    fontWeight: "700",
  },
});
