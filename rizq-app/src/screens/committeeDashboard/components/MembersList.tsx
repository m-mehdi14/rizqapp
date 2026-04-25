import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type { Member, MemberPaymentStatus } from "../store/useCommitteeDashboardStore";

type Props = {
  members: Member[];
  onPressMember: (member: Member) => void;
};

const statusLabel: Record<MemberPaymentStatus, string> = {
  paid: "✓",
  pending: "⏳",
  overdue: "!",
  future: "•",
};

const statusColor: Record<MemberPaymentStatus, string> = {
  paid: colors.success,
  pending: colors.warning,
  overdue: colors.danger,
  future: "rgba(255,255,255,0.38)",
};

export function MembersList({ members, onPressMember }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Members</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {members.map((member) => (
          <Pressable key={member.id} onPress={() => onPressMember(member)} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.avatar}</Text>
            </View>
            <Text style={styles.name}>{member.name}</Text>
            <View style={[styles.statusPill, { borderColor: statusColor[member.status] }]}>
              <Text style={[styles.statusText, { color: statusColor[member.status] }]}>
                {`${statusLabel[member.status]} ${member.status}`}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  row: { gap: 10, paddingRight: 10 },
  card: {
    width: 128,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    gap: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.textPrimary, fontWeight: "800", fontSize: typography.caption },
  name: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 11, textTransform: "capitalize", fontWeight: "700" },
});
