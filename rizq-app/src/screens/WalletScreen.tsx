import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography } from "../theme/tokens";
import { USDCAmount } from "../components/USDCAmount";
import { WalletAddressChip } from "../components/WalletAddressChip";
import { useAppStore } from "../store/useAppStore";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { SectionHeader } from "../components/SectionHeader";
import { fetchPkrRate } from "../api/rizqApi";

export function WalletScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const lamports = useAppStore((s) => s.usdcBalance);
  const goals = useAppStore((s) => s.committees);
  const rateQuery = useQuery({
    queryKey: ["pkr-rate"],
    queryFn: fetchPkrRate,
    refetchInterval: 30000,
  });
  const pkrRate = rateQuery.data ?? 280;

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Wallet</Text>
        <GlassCard style={styles.card}>
          <Text style={styles.label}>Total Balance</Text>
          <USDCAmount lamports={lamports} showPKR size="lg" />
          <View style={styles.ratePill}>
            <Text style={styles.rate}>1 USDC = {pkrRate} PKR  ↑ 0.3% today</Text>
          </View>
        </GlassCard>

        {pkrRate > 280 && (
          <GlassCard style={styles.warningCard}>
            <Text style={styles.warningTitle}>💡 Good week to convert remittances</Text>
            <Text style={styles.warningSub}>PKR/USDC rate is above 280</Text>
          </GlassCard>
        )}

        <SectionHeader title="Transactions" />
        <GlassCard style={styles.timelineCard}>
          <Text style={styles.timelineDate}>Today</Text>
          {goals.length === 0 ? (
            <Text style={styles.timelineMeta}>No transactions yet. Join a committee to start saving.</Text>
          ) : (
            <>
              <Text style={styles.timelineItem}>
                ● Committee contribution   - ${(Math.max(0, goals[0].contributionLamports ?? 0) / 1_000_000).toFixed(2)}
              </Text>
              <Text style={styles.timelineMeta}>
                {goals[0].name} · Cycle {goals[0].currentCycle ?? 1}/{goals[0].totalCycles ?? 1}
              </Text>
            </>
          )}
          <Text style={styles.timelineDate}>Apr 14</Text>
          <Text style={styles.timelineItem}>● Committee payout           + $20.00</Text>
          <Text style={styles.timelineMeta}>Received from payout order cycle</Text>
        </GlassCard>

        <Pressable
          onPress={() => Linking.openURL("https://phantom.app/learn/crypto-basics")}
        >
          <Text style={styles.link}>Get USDC via exchange</Text>
        </Pressable>
        {wallet && (
          <View style={styles.row}>
            <Text style={styles.muted}>Address:</Text>
            <WalletAddressChip address={wallet} />
          </View>
        )}
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
  card: { marginTop: spacing.section, padding: spacing.card },
  label: { color: colors.textSecondary, marginBottom: spacing.unit },
  ratePill: {
    marginTop: spacing.unit * 1.5,
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "rgba(0,230,118,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rate: { color: colors.textPrimary, fontSize: typography.caption },
  warningCard: {
    marginTop: spacing.unit * 2,
    padding: spacing.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandGold,
    backgroundColor: "rgba(255,215,64,0.1)",
  },
  warningTitle: { color: colors.brandGold, fontWeight: "700", marginBottom: 4 },
  warningSub: { color: colors.textSecondary },
  timelineCard: { padding: spacing.card, marginTop: spacing.unit },
  timelineDate: { color: colors.textSecondary, marginTop: 10, marginBottom: 6, fontSize: 12 },
  timelineItem: { color: colors.textPrimary, fontWeight: "600" },
  timelineMeta: { color: colors.textSecondary, marginBottom: 6, fontSize: 12 },
  link: { color: colors.accentPurple, marginTop: spacing.section },
  row: { flexDirection: "row", alignItems: "center", marginTop: spacing.section, gap: 8 },
  muted: { color: colors.textSecondary },
});
