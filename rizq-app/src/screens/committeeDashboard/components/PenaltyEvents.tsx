import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, typography } from "../../../theme/tokens";
import type { CommitteePenaltyEvent } from "../../../api/rizqApi";

type Props = {
  events: CommitteePenaltyEvent[];
};

export function PenaltyEvents({ events }: Props) {
  const [filter, setFilter] = useState<"all" | "with_tx" | "no_tx">("all");
  const visibleEvents = useMemo(() => {
    if (filter === "with_tx") return events.filter((event) => Boolean(event.tx_signature));
    if (filter === "no_tx") return events.filter((event) => !event.tx_signature);
    return events;
  }, [events, filter]);

  const actionTone = (action: string) => {
    const normalized = action.trim().toLowerCase();
    if (normalized.includes("remove")) return styles.badgeRemove;
    if (normalized.includes("suspend")) return styles.badgeSuspend;
    return styles.badgeWarning;
  };

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.heading}>Penalty Events</Text>
      <View style={styles.filters}>
        <Pressable
          style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>All</Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filter === "with_tx" && styles.filterChipActive]}
          onPress={() => setFilter("with_tx")}
        >
          <Text style={[styles.filterText, filter === "with_tx" && styles.filterTextActive]}>
            With Tx
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filter === "no_tx" && styles.filterChipActive]}
          onPress={() => setFilter("no_tx")}
        >
          <Text style={[styles.filterText, filter === "no_tx" && styles.filterTextActive]}>
            No Tx
          </Text>
        </Pressable>
      </View>
      {visibleEvents.length === 0 ? (
        <Text style={styles.emptyText}>No penalty events recorded yet.</Text>
      ) : (
        <View style={styles.list}>
          {visibleEvents.map((event) => {
            const amountUsdc = Number(event.penalty_amount ?? 0) / 1_000_000;
            return (
              <View key={event.id} style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.actionRow}>
                    <Text style={[styles.badge, actionTone(event.action_taken)]}>
                      {event.action_taken.toUpperCase()}
                    </Text>
                    <Text style={styles.strike}>{`Strike ${event.strike_number}`}</Text>
                  </View>
                  <Text style={styles.meta}>{new Date(event.created_at).toLocaleString()}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.amount}>{`-${amountUsdc.toFixed(2)} USDC`}</Text>
                  {event.tx_signature ? (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(
                          `https://explorer.solana.com/tx/${event.tx_signature}?cluster=devnet`
                        ).catch(() => undefined)
                      }
                    >
                      <Text style={styles.link}>Explorer</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.noTx}>No tx</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  heading: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  emptyText: { color: colors.textSecondary, fontSize: typography.bodySmall },
  filters: { flexDirection: "row", gap: 8 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  filterChipActive: {
    borderColor: "rgba(64,196,255,0.55)",
    backgroundColor: "rgba(64,196,255,0.16)",
  },
  filterText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  filterTextActive: { color: "#40C4FF" },
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
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    fontSize: typography.caption,
    fontWeight: "800",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeWarning: { color: "#FFD54F", backgroundColor: "rgba(255,213,79,0.17)" },
  badgeSuspend: { color: "#FFAB40", backgroundColor: "rgba(255,171,64,0.17)" },
  badgeRemove: { color: "#FF8A80", backgroundColor: "rgba(255,138,128,0.17)" },
  strike: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  meta: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
  right: { alignItems: "flex-end" },
  amount: { color: "#FF8A80", fontSize: typography.bodySmall, fontWeight: "700" },
  link: { color: "#40C4FF", fontSize: typography.caption, textDecorationLine: "underline", marginTop: 2 },
  noTx: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
});
