import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { a11y, colors, radii, typography } from "../../../theme/tokens";
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
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600", flex: 1 },
  actions: { flexDirection: "row", gap: 6 },
  smallBtn: {
    width: a11y.smallTapTarget,
    height: a11y.smallTapTarget,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: a11y.highContrastBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: colors.textPrimary, fontWeight: "700" },
  approvalBtn: {
    marginTop: 6,
    minHeight: a11y.minTapTarget,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(29,158,117,0.4)",
    backgroundColor: "rgba(29,158,117,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  approvalText: { color: colors.brandGreen, fontWeight: "700", fontSize: typography.bodySmall },
});
