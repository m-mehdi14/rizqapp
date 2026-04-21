import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { PredictionBar } from "../components/PredictionBar";
import { useAppStore } from "../store/useAppStore";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { createStake } from "../api/rizqApi";

export function PredictionPoolScreen() {
  const route = useRoute();
  const { goalId } = route.params as { goalId: string };
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const goal = useAppStore((s) => s.activeGoals.find((g) => g.id === goalId));
  const yes = (goal?.yesCount ?? 0) * 1_000_000;
  const no = (goal?.noCount ?? 0) * 1_000_000;

  const stakeMutation = useMutation({
    mutationFn: async (isYes: boolean) => {
      if (!wallet) throw new Error("Connect wallet first");
      return createStake({
        goalId,
        stakerWallet: wallet,
        amountLamports: 1_000_000,
        isYes,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["goals", wallet] });
    },
  });

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Prediction Pool</Text>
        <Text style={styles.sub}>{goal?.name ?? "Goal"}</Text>
        <GlassCard style={styles.poolCard}>
          <PredictionBar yesTotal={yes} noTotal={no} />
          <View style={styles.row}>
            <Text style={styles.pool}>${(yes / 1_000_000).toFixed(0)}</Text>
            <Text style={styles.pool}>${(no / 1_000_000).toFixed(0)}</Text>
          </View>
          <Text style={styles.help}>Pool total: ${((yes + no) / 1_000_000).toFixed(0)} USDC</Text>
          <Text style={styles.help}>If goal achieves → YES wins +$3.50</Text>
          <Text style={styles.help}>If goal fails → NO wins +$14</Text>
        </GlassCard>
        <GlassCard style={styles.avatarCard}>
          <Text style={styles.help}>Believers: 👤👤👤 +1 more</Text>
          <Text style={styles.help}>Doubters: 👤</Text>
        </GlassCard>
        <GlassCard style={styles.ctaCard}>
          <Text style={styles.ctaCopy}>I believe Muhammad will hit this goal 🙌</Text>
          <Pressable
            style={styles.yesBtn}
            onPress={() => stakeMutation.mutate(true)}
            disabled={stakeMutation.isPending}
          >
            <Text style={styles.yesText}>
              {stakeMutation.isPending ? "Staking..." : "Stake YES — I&apos;m in!"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.noBtn}
            onPress={() => stakeMutation.mutate(false)}
            disabled={stakeMutation.isPending}
          >
            <Text style={styles.noText}>Stake NO — prove me wrong</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

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
  noBtn: {
    borderWidth: 1,
    borderColor: "#FF7B8A",
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  noText: { color: "#FF7B8A", fontWeight: "700" },
});
