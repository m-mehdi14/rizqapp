import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ProgressBar } from "../components/ProgressBar";
import { USDCAmount } from "../components/USDCAmount";
import { useAppStore } from "../store/useAppStore";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";

export function CommitteeDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const params = route.params as { goalId?: string; committeeId?: string };
  const committeeId = params.committeeId ?? params.goalId ?? "";
  const updateCommittee = useAppStore((s) => s.updateCommittee);
  const committee = useAppStore((s) => s.committees.find((g) => g.id === committeeId));
  const [pendingLamports, setPendingLamports] = React.useState(10_000_000);

  if (!committee) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          <Text style={styles.title}>Committee not found</Text>
        </View>
      </ScreenShell>
    );
  }

  const [g0] = goalGradient(committee.type);
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <GlassCard style={[styles.hero, { borderColor: `${g0}33` }]}>
          <Text style={styles.title}>{goalEmoji(committee.type)} {committee.name}</Text>
          <ProgressBar value={committee.progress} goalType={committee.type} />
          <View style={styles.row}>
            <USDCAmount lamports={committee.savedLamports} />
            <Text style={styles.of}>of</Text>
            <USDCAmount lamports={committee.targetLamports} />
          </View>
          <Text style={styles.meta}>⏰ Next due in {committee.daysLeft} days</Text>
          <Text style={styles.meta}>
            Cycle {committee.currentCycle ?? 1} of {committee.totalCycles ?? 1} · contribution ${(Math.max(0, committee.contributionLamports ?? 0) / 1_000_000).toFixed(2)} USDC
          </Text>
        </GlassCard>

        <Text style={styles.section}>Committee status</Text>
        <GlassCard style={styles.squadCard}>
          <Text style={styles.squadRow}>● Members: {committee.memberCount ?? 0}/{committee.maxMembers ?? 0}</Text>
          <Text style={styles.squadRow}>● Status: {committee.status ?? "active"}</Text>
          <Text style={styles.squadMeta}>
            This committee follows fixed payout order and contribution cycles.
          </Text>
        </GlassCard>

        <Text style={styles.section}>Pay contribution</Text>
        <View style={styles.chips}>
          {[10, 25, 50].map((n) => (
            <Pressable
              key={n}
              style={[styles.chip, pendingLamports === n * 1_000_000 && styles.chipOn]}
              onPress={() => setPendingLamports(n * 1_000_000)}
            >
              <Text style={styles.chipText}>${n}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.primary}
          onPress={() => {
            const nextSaved = committee.savedLamports + pendingLamports;
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
          <Text style={styles.primaryText}>
            Pay via Phantom
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() =>
            navigation.navigate("CommitteesTab", {
              screen: "MemberDashboard",
              params: { committeeId },
            })
          }
        >
          <Text style={styles.secondaryText}>Open committee dashboard</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

// Backward-compatible export while route names are being migrated.
export const GoalDetailScreen = CommitteeDetailScreen;

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
  },
  hero: { padding: spacing.card, marginBottom: spacing.section },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "600",
    marginBottom: spacing.unit,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.unit * 1.5 },
  of: { color: colors.textSecondary },
  meta: { color: colors.textSecondary, marginTop: spacing.unit, lineHeight: 20 },
  section: {
    marginTop: spacing.section,
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: typography.h2,
  },
  squadCard: { padding: spacing.card },
  squadRow: { color: colors.textPrimary, marginBottom: 8 },
  squadMeta: { color: colors.textSecondary, marginTop: 6 },
  chips: { flexDirection: "row", gap: 8, marginTop: spacing.unit },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.chip,
    backgroundColor: colors.elevatedSurface,
  },
  chipOn: {
    borderWidth: 1,
    borderColor: colors.brandGreen,
  },
  chipText: { color: colors.textPrimary },
  primary: {
    marginTop: spacing.unit * 2,
    backgroundColor: colors.brandGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  primaryText: { color: colors.textInverse, fontWeight: "700" },
  secondary: {
    marginTop: spacing.unit * 2,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { color: colors.accentPurple, fontWeight: "600" },
});
