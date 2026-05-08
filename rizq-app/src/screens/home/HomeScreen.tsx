import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ScreenShell } from "../../components/ScreenShell";
import { SectionHeader } from "../../components/SectionHeader";
import { spacing, colors, radii, typography } from "../../theme/tokens";
import { AICoachWidget } from "./components/AICoachWidget";
import { BalanceCard } from "./components/BalanceCard";
import { CommitteeStrip } from "./components/CommitteeStrip";
import { Header } from "./components/Header";
import { QuickActions } from "./components/QuickActions";
import { UrgentActionCard } from "./components/UrgentActionCard";
import type { BalanceData, CommitteeItem, UrgentAction } from "./types";
import { useAppStore } from "../../store/useAppStore";
import { fetchPkrRate, fetchSolUsdcRate, fetchWalletBalanceSummary } from "../../api/rizqApi";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";

const FLOATING_TAB_BAR_CLEARANCE = 108;
function dueStatusLabel(daysLeftRaw: number) {
  const daysLeft = Number.isFinite(daysLeftRaw) ? daysLeftRaw : 0;
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { connectWeb3AuthWallet } = useWeb3AuthWallet();
  const wallet = useAppStore((s) => s.wallet);
  const solBalanceLamports = useAppStore((s) => s.solBalanceLamports);
  const liveCommittees = useAppStore((s) => s.committees);
  const [isConnectingEmbedded, setIsConnectingEmbedded] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showConnectCard, setShowConnectCard] = useState(true);
  const [clockMs, setClockMs] = useState(Date.now());
  const activeCommitteeId = liveCommittees[0]?.id;
  const urgentAction = useMemo<UrgentAction | null>(() => {
    const urgentCommittee = liveCommittees.find((committee) => committee.daysLeft <= 2);
    if (!urgentCommittee) return null;
    return {
      id: `urgent-${urgentCommittee.id}`,
      title: `${urgentCommittee.name} payment due soon`,
      subtitle: `Cycle ${urgentCommittee.currentCycle ?? 1}: pay your contribution before grace starts.`,
      severity: urgentCommittee.daysLeft <= 1 ? "danger" : "warning",
      targetCommitteeId: urgentCommittee.id,
    };
  }, [liveCommittees]);
  const aiMessage =
    liveCommittees.length > 0
      ? "Keep contributions on time to protect payout order and improve your Rizq score."
      : "Join or create a committee to start getting AI coaching insights.";
  const pkrRateQuery = useQuery({
    queryKey: ["pkr-rate"],
    queryFn: fetchPkrRate,
    refetchInterval: 60_000,
  });
  const solRateQuery = useQuery({
    queryKey: ["sol-usd-rate"],
    queryFn: fetchSolUsdcRate,
    refetchInterval: 60_000,
  });
  const walletSummaryQuery = useQuery({
    queryKey: ["wallet-balance-summary", wallet],
    queryFn: () => fetchWalletBalanceSummary(wallet as string),
    enabled: !!wallet,
    refetchInterval: 20_000,
  });
  useEffect(() => {
    const id = setInterval(() => setClockMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const summaryUpdatedAt = walletSummaryQuery.dataUpdatedAt || 0;
  const summaryAgeMs = summaryUpdatedAt > 0 ? Math.max(0, clockMs - summaryUpdatedAt) : Number.POSITIVE_INFINITY;
  const isWalletSummaryStale = summaryAgeMs > 75_000;
  const walletSummaryLastSyncedLabel =
    summaryUpdatedAt > 0 ? `Last synced ${new Date(summaryUpdatedAt).toLocaleTimeString()}` : "Not synced yet";

  const committees: CommitteeItem[] = useMemo(() => {
    return liveCommittees.map((committee) => ({
      id: committee.id,
      name: committee.name,
      typeLabel: committee.type ?? "General",
      currentCycleLabel: `Cycle ${committee.currentCycle ?? 1} of ${committee.totalCycles ?? 1}`,
      nextPaymentDueLabel: `Next due: ${dueStatusLabel(committee.daysLeft ?? 0)}`,
    }));
  }, [liveCommittees]);

  const isPaymentDue = useMemo(
    () => liveCommittees.some((item) => (item.daysLeft ?? 0) <= 1),
    [liveCommittees]
  );

  const upcomingCycles = useMemo(() => {
    return [...liveCommittees]
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
      .slice(0, 4)
      .map((committee) => {
        const daysLeft = committee.daysLeft ?? 0;
        const tone = daysLeft <= 1 ? "danger" : daysLeft <= 3 ? "warning" : "info";
        const nextDue = committee.nextCycleDate
          ? new Date(committee.nextCycleDate).toLocaleDateString()
          : "TBD";
        const cycle = committee.currentCycle ?? 1;
        return {
          id: committee.id,
          title: committee.name,
          subtitle: `Cycle ${cycle} due ${nextDue}`,
          meta: dueStatusLabel(daysLeft),
          tone,
        };
      });
  }, [liveCommittees]);

  const liveAlerts = useMemo(() => {
    const alerts: Array<{ id: string; text: string; tone: "danger" | "warning" | "info" }> = [];
    liveCommittees.forEach((committee) => {
      const daysLeft = committee.daysLeft ?? 0;
      const status = (committee.status ?? "").toLowerCase();
      if (status.includes("paused")) {
        alerts.push({
          id: `${committee.id}-paused`,
          text: `${committee.name} is paused. Manager action is required.`,
          tone: "warning",
        });
        return;
      }
      if (daysLeft < 0) {
        alerts.push({
          id: `${committee.id}-overdue`,
          text: `${committee.name} is overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"}.`,
          tone: "danger",
        });
        return;
      }
      if (daysLeft === 0) {
        alerts.push({
          id: `${committee.id}-due-today`,
          text: `${committee.name} contribution is due today.`,
          tone: "danger",
        });
        return;
      }
      if (daysLeft <= 2) {
        alerts.push({
          id: `${committee.id}-due-soon`,
          text: `${committee.name} due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
          tone: "warning",
        });
      }
    });
    if (alerts.length === 0 && liveCommittees.length > 0) {
      alerts.push({
        id: "all-good",
        text: "All committees are on track this week.",
        tone: "info",
      });
    }
    return alerts.slice(0, 5);
  }, [liveCommittees]);

  const unreadCount = liveAlerts.filter((alert) => alert.tone !== "info").length;

  const balance: BalanceData = useMemo(() => {
    const totalSol = Math.max(0, solBalanceLamports / 1_000_000_000);
    const solUsdcRate = solRateQuery.data ?? 0;
    const summary = walletSummaryQuery.data;
    const lockedUsdc = Number(summary?.locked_micro_usdc ?? 0) / 1_000_000;
    const pendingPayoutUsdc = Number(summary?.pending_payout_micro_usdc ?? 0) / 1_000_000;
    const inCommitteesSol = solUsdcRate > 0 ? lockedUsdc / solUsdcRate : 0;
    const pendingPayoutsSol = solUsdcRate > 0 ? pendingPayoutUsdc / solUsdcRate : 0;
    const availableSol = Math.max(0, totalSol - inCommitteesSol);
    // Keep total aligned with the same live available-wallet basis shown in card rows.
    // Committee lock/pending values are informative and should not inflate the top total display.
    const adjustedTotalSol = Math.max(0, availableSol);
    const totalUsdcEquivalent = adjustedTotalSol * solUsdcRate;
    const pkrRate = pkrRateQuery.data ?? 280;
    return {
      totalSol: adjustedTotalSol,
      totalUsdcEquivalent,
      availableSol,
      inCommitteesSol,
      pendingPayoutsSol,
      pkrEquivalent: totalUsdcEquivalent * pkrRate,
    };
  }, [pkrRateQuery.data, solBalanceLamports, solRateQuery.data, walletSummaryQuery.data]);

  const handleConnectEmbeddedWallet = useCallback(async () => {
    if (isConnectingEmbedded) return;
    setWalletError(null);
    setIsConnectingEmbedded(true);
    try {
      const walletAddress = await connectWeb3AuthWallet();
      if (!walletAddress) {
        setWalletError("Unable to connect in-app wallet right now.");
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Unable to connect in-app wallet. Please try again.");
    } finally {
      setIsConnectingEmbedded(false);
    }
  }, [connectWeb3AuthWallet, isConnectingEmbedded]);

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.unit,
              paddingBottom: insets.bottom + FLOATING_TAB_BAR_CLEARANCE,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Header unreadCount={unreadCount} onPressNotifications={() => navigation.navigate("Notifications")} />

          <BalanceCard
            balance={balance}
            lastSyncedLabel={walletSummaryLastSyncedLabel}
            isStale={isWalletSummaryStale}
            isRefreshing={walletSummaryQuery.isFetching}
            onRefresh={() => walletSummaryQuery.refetch()}
            onPress={() =>
              navigation.navigate("ProfileTab", {
                screen: "WalletMain",
              })
            }
          />
          {!wallet && showConnectCard ? (
            <View style={styles.connectWallet}>
              <View style={styles.connectHeaderRow}>
                <Text style={styles.connectWalletTitle}>Connect In-App Wallet</Text>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setShowConnectCard(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
              </View>
              <Text style={styles.connectWalletSub}>
                Connect with Rizq in-app wallet to unlock committee actions.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.connectWalletButton,
                  pressed ? styles.connectWalletButtonPressed : null,
                  isConnectingEmbedded ? styles.connectWalletButtonDisabled : null,
                ]}
                disabled={isConnectingEmbedded}
                onPress={handleConnectEmbeddedWallet}
              >
                {isConnectingEmbedded ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.connectWalletButtonText}>Connect In-App Wallet</Text>
                )}
              </Pressable>
              {walletError ? <Text style={styles.walletErrorText}>{walletError}</Text> : null}
            </View>
          ) : null}

          <SectionHeader title="Quick Actions" />
          <QuickActions
            isPayNowDisabled={!isPaymentDue}
            onPressPayNow={() =>
              navigation.navigate("CommitteesTab", {
                screen: "PayContribution",
                params: activeCommitteeId ? { committeeId: activeCommitteeId } : undefined,
              })
            }
            onPressNewCommittee={() =>
              navigation.navigate("CommitteesTab", { screen: "CreateCommittee" })
            }
            onPressJoinCommittee={() =>
              navigation.navigate("CommitteesTab", { screen: "JoinCommittee" })
            }
            onPressInviteFriend={() =>
              navigation.navigate("CommitteesTab", { screen: "JoinCommittee" })
            }
          />

          <SectionHeader title="Live Alerts" />
          <View style={styles.liveAlertList}>
            {liveAlerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.liveAlertItem,
                  alert.tone === "danger"
                    ? styles.liveAlertDanger
                    : alert.tone === "warning"
                      ? styles.liveAlertWarning
                      : styles.liveAlertInfo,
                ]}
              >
                <Text style={styles.liveAlertText}>{alert.text}</Text>
              </View>
            ))}
          </View>

          <SectionHeader title="Next Due" />
          {upcomingCycles.length > 0 ? (
            <View style={styles.upcomingList}>
              {upcomingCycles.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.upcomingItem}
                  onPress={() =>
                    navigation.navigate("CommitteesTab", {
                      screen: "MemberDashboard",
                      params: { committeeId: item.id },
                    })
                  }
                >
                  <View>
                    <Text style={styles.upcomingTitle}>{item.title}</Text>
                    <Text style={styles.upcomingSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text
                    style={[
                      styles.upcomingMeta,
                      item.tone === "danger"
                        ? styles.upcomingMetaDanger
                        : item.tone === "warning"
                          ? styles.upcomingMetaWarning
                          : styles.upcomingMetaInfo,
                    ]}
                  >
                    {item.meta}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.liveAlertItem}>
              <Text style={styles.liveAlertText}>No active committees yet. Create one to start live tracking.</Text>
            </View>
          )}

          {urgentAction ? (
            <UrgentActionCard
              action={urgentAction}
              onPress={() =>
                navigation.navigate("CommitteesTab", {
                  screen: "MemberDashboard",
                  params: { committeeId: urgentAction.targetCommitteeId },
                })
              }
            />
          ) : null}

          <AICoachWidget message={aiMessage} onPress={() => navigation.navigate("AITab")} />

          <SectionHeader title="My Committees" />
          <CommitteeStrip
            committees={committees}
            onPressCommittee={(committeeId) =>
              navigation.navigate("CommitteesTab", {
                screen: "MemberDashboard",
                params: { committeeId },
              })
            }
            onPressCreate={() =>
              navigation.navigate("CommitteesTab", { screen: "CreateCommittee" })
            }
            onPressInviteCode={() =>
              navigation.navigate("CommitteesTab", { screen: "JoinCommittee" })
            }
          />
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.screenX,
    gap: 14,
  },
  connectWallet: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.4)",
    backgroundColor: "rgba(0,230,118,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  connectHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  connectWalletTitle: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  connectWalletSub: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
  connectWalletButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandGreen,
    borderRadius: 10,
    minWidth: 150,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,51,40,0.05)",
  },
  closeButtonText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  connectWalletButtonPressed: {
    opacity: 0.85,
  },
  connectWalletButtonDisabled: {
    opacity: 0.7,
  },
  connectWalletButtonText: {
    color: colors.textInverse,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  walletErrorText: { color: colors.danger, fontSize: typography.caption },
  liveAlertList: {
    gap: 8,
  },
  liveAlertItem: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  liveAlertDanger: {
    borderColor: "rgba(255,82,82,0.45)",
    backgroundColor: "rgba(255,82,82,0.12)",
  },
  liveAlertWarning: {
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  liveAlertInfo: {
    borderColor: "rgba(92,173,255,0.45)",
    backgroundColor: "rgba(92,173,255,0.12)",
  },
  liveAlertText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  upcomingList: {
    gap: 8,
  },
  upcomingItem: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  upcomingTitle: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  upcomingSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  upcomingMeta: {
    fontSize: typography.caption,
    fontWeight: "700",
  },
  upcomingMetaDanger: {
    color: colors.danger,
  },
  upcomingMetaWarning: {
    color: colors.warning,
  },
  upcomingMetaInfo: {
    color: colors.info,
  },
});
