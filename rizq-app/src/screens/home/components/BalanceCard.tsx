import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
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

function formatSol(value: number): string {
  return `${value.toFixed(4)} SOL`;
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
        <LinearGradient
          colors={["rgba(23,125,94,0.94)", "rgba(13,91,68,0.96)", "rgba(10,51,40,0.98)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        />
        <LinearGradient
          colors={["rgba(111,220,182,0.24)", "rgba(111,220,182,0.04)"]}
          start={{ x: 0.1, y: 0.05 }}
          end={{ x: 1, y: 1 }}
          style={styles.softSweep}
        />
        <View style={styles.glowOrb} />
        <View style={styles.glowOrbSmall} />
        <View style={styles.glowOrbBottomRight} />
        <Text style={styles.label}>Total Balance</Text>
        <Text style={styles.total}>{formatSol(balance.totalSol)}</Text>
        <Text style={styles.pkr}>
          ≈ {formatUsd(balance.totalUsdcEquivalent)} USDC • {formatPkr(balance.pkrEquivalent)}
        </Text>
        {/* TODO: Use React Query + CoinGecko polling every 60s here. */}

        <View style={styles.figureRow}>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>Available</Text>
            <Text style={styles.figureValue}>{formatSol(balance.availableSol)}</Text>
          </View>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>In committees</Text>
            <Text style={styles.figureValue}>{formatSol(balance.inCommitteesSol)}</Text>
          </View>
          <View style={styles.figureItem}>
            <Text style={styles.figureLabel}>Pending payouts</Text>
            <Text style={styles.figureValue}>{formatSol(balance.pendingPayoutsSol)}</Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(111,220,182,0.35)",
    backgroundColor: "rgba(10,51,40,0.92)",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  softSweep: {
    ...StyleSheet.absoluteFillObject,
  },
  glowOrb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -120,
    top: -130,
    backgroundColor: "rgba(111,220,182,0.3)",
  },
  glowOrbSmall: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    left: -95,
    bottom: -95,
    backgroundColor: "rgba(146,232,200,0.24)",
  },
  glowOrbBottomRight: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    right: 55,
    bottom: -120,
    backgroundColor: "rgba(69,191,146,0.18)",
  },
  label: {
    color: "rgba(255,255,255,0.82)",
    fontSize: typography.caption,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  total: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },
  pkr: {
    color: "rgba(255,255,255,0.86)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 82,
    justifyContent: "space-between",
  },
  figureLabel: {
    color: "rgba(255,255,255,0.86)",
    fontSize: typography.caption,
    lineHeight: 16,
    minHeight: 32,
  },
  figureValue: {
    color: "#FFFFFF",
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
});
