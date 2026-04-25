import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { CommitteeCard } from "../components/CommitteeCard";
import { CoachingCard } from "../components/CoachingCard";
import { USDCAmount } from "../components/USDCAmount";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { SectionHeader } from "../components/SectionHeader";
import { fetchCoaching } from "../api/rizqApi";

export function DashboardScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const userId = useAppStore((s) => s.userId);
  const balanceLamports = useAppStore((s) => s.usdcBalance);
  const committees = useAppStore((s) => s.committees);
  const navigation = useNavigation();

  const firstName = wallet ? wallet.slice(0, 6) : "there";
  const now = new Date();
  const topCommitteeId = committees[0]?.id;
  const coachingQuery = useQuery({
    queryKey: ["coaching", topCommitteeId, userId],
    queryFn: () => fetchCoaching(topCommitteeId as string, userId),
    enabled: !!topCommitteeId,
    refetchInterval: 30000,
  });

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Good morning, {firstName} 🌤</Text>
            <Text style={styles.date}>{now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</Text>
          </View>
          <View style={styles.bell}>
            <Text style={styles.bellText}>🔔</Text>
          </View>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardLabel}>USDC Balance</Text>
          <USDCAmount lamports={balanceLamports} showPKR size="lg" />
          <View style={styles.sep} />
          <Text style={styles.summary}>
            {committees.length} active committees · {committees.reduce((acc, c) => acc + (c.memberCount ?? 0), 0)} members
          </Text>
        </GlassCard>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {[
            ["⚡", "Pay", "CommitteesTab"],
            ["📨", "Invite", "CommitteesTab"],
            ["🧾", "Schedule", "CommitteesTab"],
            ["🤖", "Coach", "AITab"],
          ].map(([emoji, label, tab]) => (
            <Pressable
              key={label}
              style={styles.quickPill}
              onPress={() => navigation.dispatch(CommonActions.navigate({ name: tab as never }))}
            >
              <Text style={styles.quickText}>{emoji} {label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="My Committees" />
        {committees.length === 0 ? (
          <Pressable
            style={styles.emptyCard}
            onPress={() => navigation.dispatch(CommonActions.navigate({ name: "CreateTab" }))}
          >
            <Text style={styles.emptyTitle}>Your first committee is waiting.</Text>
            <Text style={styles.empty}>Create a committee and invite trusted members.</Text>
          </Pressable>
        ) : (
          committees.map((g) => (
            <CommitteeCard
              key={g.id}
              committee={g}
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate({
                    name: "CommitteesTab",
                    params: {
                      screen: "MemberDashboard",
                      params: { committeeId: g.id },
                    },
                  })
                )
              }
            />
          ))
        )}

        <SectionHeader title="This Week's Coaching" />
        <CoachingCard
          message={coachingQuery.data?.message ?? "Coach is preparing your weekly update."}
          dateLabel={
            coachingQuery.data?.created_at
              ? new Date(coachingQuery.data.created_at).toLocaleDateString()
              : now.toLocaleDateString()
          }
          goalHealthScore={4}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section + 4,
    paddingBottom: spacing.section * 2,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.section, gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,215,64,0.3)",
  },
  avatarText: { color: colors.textPrimary, fontWeight: "700" },
  greet: { color: colors.textPrimary, fontSize: typography.h2, fontWeight: "600" },
  date: { color: colors.textSecondary },
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  bellText: { fontSize: 16 },
  card: {
    padding: spacing.card,
    marginBottom: spacing.section,
  },
  cardLabel: { color: colors.textSecondary, marginBottom: spacing.unit, fontSize: 13 },
  sep: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 12 },
  summary: { color: colors.textSecondary, fontSize: 13 },
  quickRow: { gap: 10, marginBottom: spacing.section - 4 },
  quickPill: {
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.card,
    marginBottom: spacing.section,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.h3, fontWeight: "700", marginBottom: 8 },
  empty: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
