import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";

export type TransactionHistoryItem = {
  id: string;
  type: "Contribution" | "Payout" | "Penalty";
  amount: number;
  date: string;
  explorerUrl: string;
};

type Props = { transactions: TransactionHistoryItem[]; solUsdcRate: number | null };

export function TransactionHistory({ transactions, solUsdcRate }: Props) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.heading}>Transaction History</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No on-chain transactions yet for this committee.</Text>
      ) : (
        <View style={styles.list}>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.row}>
              <View style={styles.left}>
                <Text style={styles.type}>{tx.type}</Text>
                <Text style={styles.date}>{tx.date}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.amount}>{`${tx.amount.toFixed(2)} USDC`}</Text>
                <Text style={styles.subAmount}>
                  {solUsdcRate && solUsdcRate > 0
                    ? `~${(tx.amount / solUsdcRate).toFixed(4)} SOL`
                    : "SOL eq loading..."}
                </Text>
                <Pressable onPress={() => Linking.openURL(tx.explorerUrl).catch(() => undefined)}>
                  <Text style={styles.link}>Explorer</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  heading: { color: colors.textSecondary, fontSize: typography.caption, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  emptyText: { color: colors.textSecondary, fontSize: typography.bodySmall },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  left: { flex: 1 },
  type: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  date: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
  right: { alignItems: "flex-end" },
  amount: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  subAmount: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 1 },
  link: { color: "#40C4FF", fontSize: typography.caption, textDecorationLine: "underline", marginTop: 2 },
});
