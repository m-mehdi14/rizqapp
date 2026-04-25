import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type { CreateKametiDraft, PayoutOrder } from "../store/useCreateKametiStore";

const PAYOUT_OPTIONS: PayoutOrder[] = [
  "Manager sets order",
  "Random lottery (Solana VRF)",
  "First joined = first paid",
];

type Props = {
  draft: CreateKametiDraft;
  onChange: (patch: Partial<CreateKametiDraft>) => void;
};

export function Step4Payout({ draft, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 4: Payout Order</Text>
      <View style={styles.optionsWrap}>
        {PAYOUT_OPTIONS.map((option) => {
          const active = draft.payoutOrder === option;
          return (
            <Text
              key={option}
              onPress={() => onChange({ payoutOrder: option })}
              style={[styles.optionChip, active && styles.optionChipActive]}
            >
              {option}
            </Text>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Manager can change order after launch?</Text>
          <Text style={styles.switchSubtext}>
            Requires 2/3 member approval if unlocked.
          </Text>
        </View>
        <Switch
          value={draft.managerCanChangeOrder}
          onValueChange={(value) => onChange({ managerCanChangeOrder: value })}
          trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
          thumbColor={draft.managerCanChangeOrder ? colors.brandGreen : "#9aa8b6"}
        />
      </View>
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
  optionsWrap: { gap: 8 },
  optionChip: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: "hidden",
  },
  optionChipActive: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.15)",
  },
  switchRow: {
    minHeight: 64,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  switchSubtext: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
});
