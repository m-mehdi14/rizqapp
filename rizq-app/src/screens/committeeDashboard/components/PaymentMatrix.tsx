import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { a11y, colors, typography } from "../../../theme/tokens";
import type { Member, MemberPaymentStatus } from "../store/useCommitteeDashboardStore";

type Props = {
  members: Member[];
  matrix: MemberPaymentStatus[][];
  onCellPress?: (input: { member: Member; cycle: number; status: MemberPaymentStatus }) => void;
};

function cellColor(status: MemberPaymentStatus) {
  if (status === "paid") return "rgba(0,230,118,0.6)";
  if (status === "pending") return "rgba(255,179,0,0.7)";
  if (status === "overdue") return "rgba(255,82,82,0.7)";
  return "rgba(10,51,40,0.2)";
}

export function PaymentMatrix({ members, matrix, onCellPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Payment Matrix</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.cellHead, styles.memberCol]}>Member</Text>
            {[1, 2, 3, 4, 5].map((cycle) => (
              <Text key={cycle} style={styles.cellHead}>
                {`C${cycle}`}
              </Text>
            ))}
          </View>
          {members.map((member, rowIndex) => (
            <View key={member.id} style={styles.row}>
              <Text style={[styles.memberCol, styles.memberName]}>{member.name}</Text>
              {matrix[rowIndex]?.map((status, colIndex) => (
                <Pressable
                  key={`${member.id}-${colIndex}`}
                  style={[styles.cell, { backgroundColor: cellColor(status) }]}
                  onPress={() => onCellPress?.({ member, cycle: colIndex + 1, status })}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  table: { gap: 8 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberCol: { width: 112 },
  cellHead: { color: colors.textSecondary, fontSize: typography.caption, textAlign: "center" },
  memberName: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  cell: { width: a11y.smallTapTarget, height: a11y.smallTapTarget, borderRadius: 8, borderWidth: 1, borderColor: a11y.highContrastBorder },
});
