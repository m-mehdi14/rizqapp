import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { PayoutTurn } from "../store/useCommitteeDashboardStore";

type Props = { turns: PayoutTurn[] };

export function PayoutSchedule({ turns }: Props) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.heading}>Payout Schedule</Text>
      <View style={styles.list}>
        {turns.map((turn) => (
          <View
            key={`${turn.turn}-${turn.memberName}`}
            style={[styles.row, turn.isCurrentUser && styles.currentUserRow]}
          >
            <Text style={styles.rowLeft}>{`${turn.turn}. ${turn.memberName}`}</Text>
            <Text style={styles.rowRight}>
              {turn.completed ? `✓ ${turn.paidDate ?? turn.dueDate}` : turn.dueDate}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  currentUserRow: {
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.11)",
  },
  rowLeft: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  rowRight: { color: colors.textSecondary, fontSize: typography.caption },
});
