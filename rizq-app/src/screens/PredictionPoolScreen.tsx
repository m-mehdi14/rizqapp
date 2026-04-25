import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";

export function CommitteeContributionPlannerScreen() {
  const route = useRoute();
  const params = route.params as { goalId?: string; committeeId?: string };
  const committeeId = params.committeeId ?? params.goalId ?? "";
  const committee = useAppStore((s) => s.committees.find((g) => g.id === committeeId));
  const updateCommittee = useAppStore((s) => s.updateCommittee);
  const contributionLamports = Math.max(0, committee?.contributionLamports ?? 0);
  const paidLamports = Math.max(0, committee?.savedLamports ?? 0);
  const totalLamports = Math.max(contributionLamports, committee?.targetLamports ?? 0);
  const remainingLamports = Math.max(0, totalLamports - paidLamports);

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Contribution Planner</Text>
        <Text style={styles.sub}>{committee?.name ?? "Committee"}</Text>
        <GlassCard style={styles.poolCard}>
          <Text style={styles.help}>Cycle progress</Text>
          <View style={styles.row}>
            <Text style={styles.pool}>Paid ${(paidLamports / 1_000_000).toFixed(0)}</Text>
            <Text style={styles.pool}>Remaining ${(remainingLamports / 1_000_000).toFixed(0)}</Text>
          </View>
          <Text style={styles.help}>Per-cycle contribution: ${(contributionLamports / 1_000_000).toFixed(2)} USDC</Text>
          <Text style={styles.help}>Next due in {committee?.daysLeft ?? 0} days</Text>
          <Text style={styles.help}>Status: {committee?.status ?? "active"}</Text>
        </GlassCard>
        <GlassCard style={styles.avatarCard}>
          <Text style={styles.help}>Members: {committee?.memberCount ?? 0}/{committee?.maxMembers ?? 0}</Text>
          <Text style={styles.help}>Cycle: {committee?.currentCycle ?? 1}/{committee?.totalCycles ?? 1}</Text>
        </GlassCard>
        <GlassCard style={styles.ctaCard}>
          <Text style={styles.ctaCopy}>Record one contribution payment for this cycle.</Text>
          <Pressable
            style={styles.yesBtn}
            onPress={() => {
              if (!committee) return;
              const nextSaved = committee.savedLamports + contributionLamports;
              const nextProgress =
                committee.targetLamports > 0
                  ? Math.max(0, Math.min(1, nextSaved / committee.targetLamports))
                  : committee.progress;
              updateCommittee(committeeId, {
                savedLamports: nextSaved,
                progress: nextProgress,
                lastStakeAt: new Date().toISOString(),
              });
            }}
          >
            <Text style={styles.yesText}>
              Pay contribution
            </Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

// Backward-compatible export while route names are being migrated.
export const PredictionPoolScreen = CommitteeContributionPlannerScreen;

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
  },
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "600" },
  sub: { color: colors.textSecondary, marginTop: 4 },
  poolCard: { marginTop: spacing.section, padding: spacing.card },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, marginBottom: 8 },
  pool: { color: colors.textPrimary, fontWeight: "700" },
  help: { color: colors.textSecondary, marginTop: 6 },
  avatarCard: { marginTop: spacing.unit * 2, padding: spacing.card },
  ctaCard: { marginTop: spacing.section, padding: spacing.card },
  ctaCopy: { color: colors.textPrimary, marginBottom: 14, fontSize: typography.h3, fontWeight: "600" },
  yesBtn: {
    backgroundColor: colors.brandGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
    marginBottom: spacing.unit * 2,
  },
  yesText: { color: colors.textInverse, fontWeight: "700" },
});
