import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type { PayoutTurn } from "../store/useCommitteeDashboardStore";

type Props = {
  turns: PayoutTurn[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRequestApproval?: () => void;
  loading?: boolean;
};

export function PayoutReorder({ turns, onMoveUp, onMoveDown, onRequestApproval, loading = false }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Payout Order Management</Text>
      {turns.map((turn, index) => (
        <View key={`${turn.turn}-${turn.memberName}`} style={styles.row}>
          <Text style={styles.name}>{`${turn.turn}. ${turn.memberName}`}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.smallBtn} onPress={() => onMoveUp(index)} disabled={loading}>
              <Text style={styles.btnText}>↑</Text>
            </Pressable>
            <Pressable style={styles.smallBtn} onPress={() => onMoveDown(index)} disabled={loading}>
              <Text style={styles.btnText}>↓</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        style={styles.approvalBtn}
        onPress={onRequestApproval}
        disabled={loading}
      >
        <Text style={styles.approvalText}>
          {loading ? "Submitting..." : "Request Order Change Approval"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700", marginBottom: 2 },
  row: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600", flex: 1 },
  actions: { flexDirection: "row", gap: 6 },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: colors.textPrimary, fontWeight: "700" },
  approvalBtn: {
    marginTop: 6,
    minHeight: 44,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  approvalText: { color: colors.brandGreen, fontWeight: "700", fontSize: typography.bodySmall },
});
