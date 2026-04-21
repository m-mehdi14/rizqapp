import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ProgressBar } from "../components/ProgressBar";
import { USDCAmount } from "../components/USDCAmount";
import { useAppStore } from "../store/useAppStore";
import type { GoalsStackParamList } from "../navigation/RootNavigator";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";
import { createStake } from "../api/rizqApi";

type Nav = NativeStackNavigationProp<GoalsStackParamList, "GoalDetail">;

export function GoalDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { goalId } = route.params as { goalId: string };
  const wallet = useAppStore((s) => s.wallet);
  const goal = useAppStore((s) => s.activeGoals.find((g) => g.id === goalId));
  const [pendingLamports, setPendingLamports] = React.useState(10_000_000);

  const depositMutation = useMutation({
    mutationFn: async (lamports: number) => {
      if (!wallet) throw new Error("Connect wallet first");
      return createStake({
        goalId,
        stakerWallet: wallet,
        amountLamports: lamports,
        isYes: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["goals", wallet] });
    },
  });

  if (!goal) {
    return (
      <ScreenShell>
        <View style={styles.root}>
          <Text style={styles.title}>Goal not found</Text>
        </View>
      </ScreenShell>
    );
  }

  const [g0] = goalGradient(goal.type);
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <GlassCard style={[styles.hero, { borderColor: `${g0}33` }]}>
          <Text style={styles.title}>{goalEmoji(goal.type)} {goal.name}</Text>
          <ProgressBar value={goal.progress} goalType={goal.type} />
          <View style={styles.row}>
            <USDCAmount lamports={goal.savedLamports} />
            <Text style={styles.of}>of</Text>
            <USDCAmount lamports={goal.targetLamports} />
          </View>
          <Text style={styles.meta}>⏰ {goal.daysLeft} days left</Text>
          <Text style={styles.meta}>💰 ${(Math.max(0, (goal.targetLamports - goal.savedLamports) / 1_000_000) / Math.max(1, Math.ceil(goal.daysLeft / 7))).toFixed(2)} more each week to hit it</Text>
        </GlassCard>

        <Text style={styles.section}>Your Squad</Text>
        <GlassCard style={styles.squadCard}>
          <Text style={styles.squadRow}>● Believers: {goal.yesCount}</Text>
          <Text style={styles.squadRow}>● Doubters: {goal.noCount}</Text>
          <Text style={styles.squadMeta}>
            {goal.yesCount} believe in you · {goal.noCount} doubter
          </Text>
        </GlassCard>

        <Text style={styles.section}>Deposit</Text>
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
          onPress={() => depositMutation.mutate(pendingLamports)}
          disabled={depositMutation.isPending}
        >
          <Text style={styles.primaryText}>
            {depositMutation.isPending ? "Depositing..." : "Deposit via Phantom"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => navigation.navigate("PredictionPool", { goalId })}
        >
          <Text style={styles.secondaryText}>Open prediction pool</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

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
