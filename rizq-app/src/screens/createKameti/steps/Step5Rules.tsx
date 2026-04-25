import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type {
  CreateKametiDraft,
  GracePeriod,
  MissedPaymentAction,
  PenaltyDestination,
} from "../store/useCreateKametiStore";

const GRACE_PERIODS: GracePeriod[] = ["1 day", "3 days", "7 days"];
const MISSED_ACTIONS: MissedPaymentAction[] = [
  "Warning",
  "Suspend payout turn",
  "Remove member",
];
const PENALTY_DESTINATIONS: PenaltyDestination[] = [
  "No penalty",
  "Redistribute to members",
  "Rizq Welfare Pool",
];

type Props = {
  draft: CreateKametiDraft;
  onChange: (patch: Partial<CreateKametiDraft>) => void;
};

export function Step5Rules({ draft, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 5: Rules & Safety</Text>

      <Text style={styles.label}>Late payment grace period</Text>
      <View style={styles.rowWrap}>
        {GRACE_PERIODS.map((item) => (
          <Text
            key={item}
            onPress={() => onChange({ gracePeriod: item })}
            style={[styles.chip, draft.gracePeriod === item && styles.chipActive]}
          >
            {item}
          </Text>
        ))}
      </View>

      <Text style={styles.label}>Action after grace</Text>
      <View style={styles.rowWrap}>
        {MISSED_ACTIONS.map((item) => (
          <Text
            key={item}
            onPress={() => onChange({ missedPaymentAction: item })}
            style={[styles.chip, draft.missedPaymentAction === item && styles.chipActive]}
          >
            {item}
          </Text>
        ))}
      </View>

      <Text style={styles.label}>Penalty destination</Text>
      <View style={styles.rowWrap}>
        {PENALTY_DESTINATIONS.map((item) => (
          <Text
            key={item}
            onPress={() => onChange({ penaltyDestination: item })}
            style={[styles.chip, draft.penaltyDestination === item && styles.chipActive]}
          >
            {item}
          </Text>
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Community welfare opt-in</Text>
          <Text style={styles.switchSubtext}>
            Donate part of the platform fee to Rizq Welfare Pool.
          </Text>
        </View>
        <Switch
          value={draft.welfareOptIn}
          onValueChange={(value) => onChange({ welfareOptIn: value })}
          trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
          thumbColor={draft.welfareOptIn ? colors.brandGreen : "#9aa8b6"}
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
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  chipActive: {
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
