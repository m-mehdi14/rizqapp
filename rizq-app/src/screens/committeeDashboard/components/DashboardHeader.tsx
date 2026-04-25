import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { Committee } from "../store/useCommitteeDashboardStore";

type Props = {
  committee: Committee;
  inviteCode?: string | null;
  onCopyInviteCode?: (code: string) => void;
};

function healthColor(health: Committee["health"]) {
  if (health === "green") return colors.success;
  if (health === "red") return colors.danger;
  return colors.warning;
}

export function DashboardHeader({ committee, inviteCode, onCopyInviteCode }: Props) {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{committee.name}</Text>
        <Text style={styles.typePill}>{committee.type}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cycle}>{`Cycle ${committee.cycleCurrent} of ${committee.cycleTotal}`}</Text>
        <View style={[styles.healthBadge, { borderColor: healthColor(committee.health) }]}>
          <Text style={[styles.healthText, { color: healthColor(committee.health) }]}>
            {`Health: ${committee.health.toUpperCase()}`}
          </Text>
        </View>
      </View>
      <Text style={styles.payoutLine}>
        {`You receive in Month ${committee.userPayoutMonth} — ${committee.userPayoutInDays} days away`}
      </Text>
      {inviteCode ? (
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{`Join code: ${inviteCode}`}</Text>
          <Pressable
            style={styles.copyBtn}
            onPress={() => onCopyInviteCode?.(inviteCode)}
            accessibilityRole="button"
          >
            <Text style={styles.copyBtnText}>Copy</Text>
          </Pressable>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: colors.textPrimary, fontSize: typography.h3, fontWeight: "700", flex: 1 },
  typePill: {
    color: colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  cycle: { color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: "600" },
  healthBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  healthText: { fontSize: typography.caption, fontWeight: "700" },
  payoutLine: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  inviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  inviteCode: { color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: "700" },
  copyBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyBtnText: { color: colors.brandGreen, fontSize: typography.caption, fontWeight: "700" },
});
