import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { fetchCommitteeAnnouncements, fetchWalletTransactions } from "../../api/rizqApi";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const FLOATING_TAB_BAR_CLEARANCE = 108;

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  tone: "danger" | "warning" | "info";
  committeeId?: string;
};

export function NotificationsScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const wallet = useAppStore((s) => s.wallet);
  const committees = useAppStore((s) => s.committees);
  const committeeById = useMemo(() => new Map(committees.map((c) => [c.id, c.name])), [committees]);

  const notificationsQuery = useQuery({
    queryKey: ["notifications-feed", wallet, committees.map((c) => c.id).join(",")],
    queryFn: async () => {
      const items: NotificationItem[] = [];

      committees.forEach((committee) => {
        const daysLeft = Math.max(0, committee.daysLeft ?? 0);
        if (daysLeft === 0) {
          items.push({
            id: `${committee.id}-due-today`,
            title: `${committee.name}: Due today`,
            message: "Your current cycle contribution is due today.",
            createdAt: Date.now() - 1_000,
            tone: "danger",
            committeeId: committee.id,
          });
        } else if (daysLeft <= 2) {
          items.push({
            id: `${committee.id}-due-soon`,
            title: `${committee.name}: Due soon`,
            message: `Contribution due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
            createdAt: Date.now() - 2_000,
            tone: "warning",
            committeeId: committee.id,
          });
        }
      });

      if (wallet) {
        const txRows = await fetchWalletTransactions(wallet).catch(() => []);
        txRows.slice(0, 6).forEach((tx, index) => {
          const typeLabel = tx.type === "payout" ? "Payout received" : "Contribution recorded";
          const committeeName = committeeById.get(tx.committee_id) ?? tx.committee_name;
          items.push({
            id: `tx-${tx.id}`,
            title: typeLabel,
            message: `${committeeName} • ${(Number(tx.amount_micro_usdc) / 1_000_000).toFixed(2)} USDC`,
            createdAt: new Date(tx.created_at).getTime() - index,
            tone: tx.type === "payout" ? "info" : "warning",
            committeeId: tx.committee_id,
          });
        });
      }

      const announcementGroups = await Promise.all(
        committees.slice(0, 8).map(async (committee) => ({
          committeeId: committee.id,
          committeeName: committee.name,
          rows: await fetchCommitteeAnnouncements(committee.id).catch(() => []),
        }))
      );
      announcementGroups.forEach((group) => {
        group.rows.slice(0, 3).forEach((row) => {
          items.push({
            id: `announcement-${row.id}`,
            title: `${group.committeeName}: ${row.title}`,
            message: row.message,
            createdAt: new Date(row.created_at).getTime(),
            tone: "info",
            committeeId: group.committeeId,
          });
        });
      });

      items.sort((a, b) => b.createdAt - a.createdAt);
      return items.slice(0, 50);
    },
    refetchInterval: 20000,
  });

  const rows = notificationsQuery.data ?? [];

  return (
    <ScreenShell>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.section,
            paddingHorizontal: spacing.screenX,
            paddingBottom: FLOATING_TAB_BAR_CLEARANCE,
            gap: 10,
          }}
        >
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Live committee updates, due reminders, payouts, and announcements.</Text>

          {notificationsQuery.isLoading ? (
            <GlassCard style={styles.card}>
              <Text style={styles.itemMessage}>Loading notifications...</Text>
            </GlassCard>
          ) : null}

          {rows.length === 0 && !notificationsQuery.isLoading ? (
            <GlassCard style={styles.card}>
              <Text style={styles.itemMessage}>No notifications yet. Join a committee to get live updates.</Text>
            </GlassCard>
          ) : null}

          {rows.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                item.tone === "danger"
                  ? styles.cardDanger
                  : item.tone === "warning"
                    ? styles.cardWarning
                    : styles.cardInfo,
              ]}
              onPress={() => {
                if (!item.committeeId) return;
                nav.navigate("CommitteesTab", {
                  screen: "MemberDashboard",
                  params: { committeeId: item.committeeId },
                });
              }}
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMessage}>{item.message}</Text>
              <Text style={styles.itemTime}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardDanger: {
    borderColor: "rgba(255,82,82,0.45)",
    backgroundColor: "rgba(255,82,82,0.11)",
  },
  cardWarning: {
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.11)",
  },
  cardInfo: {
    borderColor: "rgba(10,51,40,0.28)",
    backgroundColor: "rgba(10,51,40,0.08)",
  },
  itemTitle: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  itemMessage: { color: colors.textPrimary, fontSize: typography.caption, lineHeight: 18 },
  itemTime: { color: colors.textSecondary, fontSize: 11 },
});

