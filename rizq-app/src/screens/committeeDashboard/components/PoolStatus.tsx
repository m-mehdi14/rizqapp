import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { Committee } from "../store/useCommitteeDashboardStore";

type Props = { committee: Committee; solUsdcRate: number | null };

export function PoolStatus({ committee, solUsdcRate }: Props) {
  const currentSol = solUsdcRate && solUsdcRate > 0 ? committee.poolCurrentUSDC / solUsdcRate : null;
  const targetSol = solUsdcRate && solUsdcRate > 0 ? committee.poolTargetUSDC / solUsdcRate : null;
  const ratio = committee.poolCurrentUSDC / committee.poolTargetUSDC;
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.heading}>Pool Status</Text>
      <Text style={styles.value}>{`$${committee.poolCurrentUSDC} / $${committee.poolTargetUSDC} USDC`}</Text>
      <Text style={styles.subValue}>
        {currentSol != null && targetSol != null
          ? `~${currentSol.toFixed(4)} / ~${targetSol.toFixed(4)} SOL`
          : "SOL equivalent loading..."}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, ratio * 100))}%` }]} />
      </View>
      <Text style={styles.meta}>{`${committee.paidMembersCount} of ${committee.totalMembersCount} members paid`}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 8 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  value: { color: colors.textPrimary, fontSize: typography.h3, fontWeight: "700" },
  subValue: { color: colors.textSecondary, fontSize: typography.caption, marginTop: -2 },
  track: { height: 8, borderRadius: 99, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.14)" },
  fill: { height: "100%", backgroundColor: colors.brandGreen },
  meta: { color: colors.textSecondary, fontSize: typography.bodySmall },
});
