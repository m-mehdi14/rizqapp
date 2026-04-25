import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, spacing, typography } from "../../../theme/tokens";
import type { BalanceData } from "../types";

type Props = {
  balance: BalanceData;
  onPress: () => void;
};

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPkr(value: number): string {
  return `PKR ${Math.round(value).toLocaleString()}`;
}

export function BalanceCard({ balance, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open wallet details"
      onPress={onPress}
    >
      <GlassCard style={styles.card}>
        <Text style={styles.label}>Total Balance</Text>
        <Text style={styles.total}>{formatUsd(balance.totalUsdc)} USDC</Text>
        <Text style={styles.pkr}>≈ {formatPkr(balance.pkrEquivalent)}</Text>
        {/* TODO: Use React Query + CoinGecko polling every 60s here. */}

        <View style={styles.figureRow}>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>Available</Text>
            <Text style={styles.figureValue}>{formatUsd(balance.availableUsdc)}</Text>
          </View>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>In committees</Text>
            <Text style={styles.figureValue}>{formatUsd(balance.inCommitteesUsdc)}</Text>
          </View>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>Pending payouts</Text>
            <Text style={styles.figureValue}>{formatUsd(balance.pendingPayoutsUsdc)}</Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  total: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "800",
  },
  pkr: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: 4,
    marginBottom: 14,
  },
  figureRow: {
    flexDirection: "row",
    gap: 8,
  },
  figureItem: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  figureLabel: {
    color: colors.textMuted,
    fontSize: typography.caption,
    marginBottom: 4,
  },
  figureValue: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
});
