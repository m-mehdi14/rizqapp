import React, { useCallback, useMemo, useState } from "react";
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
import { fetchPkrRate } from "../../api/rizqApi";
import { usePhantomWallet } from "../../hooks/usePhantomWallet";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";

const FLOATING_TAB_BAR_CLEARANCE = 108;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { connect } = usePhantomWallet();
  const { connectWeb3AuthWallet, isConfigured: web3AuthConfigured } = useWeb3AuthWallet();
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const userId = useAppStore((s) => s.userId);
  const displayName = useAppStore((s) => s.displayName);
  const usdcBalance = useAppStore((s) => s.usdcBalance);
  const liveCommittees = useAppStore((s) => s.committees);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isConnectingEmbedded, setIsConnectingEmbedded] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
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
  const unreadCount = 3;
  const pkrRateQuery = useQuery({
    queryKey: ["pkr-rate"],
    queryFn: fetchPkrRate,
    refetchInterval: 60_000,
  });

  const committees: CommitteeItem[] = useMemo(() => {
    return liveCommittees.map((committee) => ({
      id: committee.id,
      name: committee.name,
      typeLabel: committee.type ?? "General",
      currentCycleLabel: `Cycle ${committee.currentCycle ?? 1} of ${committee.totalCycles ?? 1}`,
      nextPaymentDueLabel: `Next due: in ${committee.daysLeft} days`,
    }));
  }, [liveCommittees]);

  const isPaymentDue = useMemo(
    () => committees.some((item) => item.nextPaymentDueLabel.toLowerCase().includes("tomorrow")),
    [committees]
  );

  const balance: BalanceData = useMemo(() => {
    const inCommitteesUsdc = liveCommittees.reduce(
      (sum, committee) => sum + Math.max(0, committee.savedLamports) / 1_000_000,
      0
    );
    const totalUsdc = Math.max(0, usdcBalance / 1_000_000);
    const pendingPayoutsUsdc = liveCommittees
      .filter((committee) => (committee.status ?? "").toLowerCase().includes("payout"))
      .reduce(
        (sum, committee) => sum + Math.max(0, committee.contributionLamports ?? 0) / 1_000_000,
        0
      );
    const availableUsdc = Math.max(0, totalUsdc - inCommitteesUsdc);
    const pkrRate = pkrRateQuery.data ?? 280;
    return {
      totalUsdc,
      availableUsdc,
      inCommitteesUsdc,
      pendingPayoutsUsdc,
      pkrEquivalent: totalUsdc * pkrRate,
    };
  }, [liveCommittees, pkrRateQuery.data, usdcBalance]);

  const handleConnectWallet = useCallback(async () => {
    if (isConnectingWallet) return;
    setWalletError(null);
    setIsConnectingWallet(true);
    try {
      await connect();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Unable to open Phantom right now. Please try again.");
    } finally {
      setIsConnectingWallet(false);
    }
  }, [connect, isConnectingWallet]);

  const handleConnectEmbeddedWallet = useCallback(async () => {
    if (isConnectingEmbedded) return;
    setWalletError(null);
    setIsConnectingEmbedded(true);
    try {
      const walletAddress = await connectWeb3AuthWallet();
      if (!walletAddress) {
        setWalletError("Unable to connect Web3Auth wallet right now.");
      }
    } catch {
      setWalletError("Unable to connect Web3Auth wallet. Please try again.");
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
          <Header unreadCount={unreadCount} onPressNotifications={() => undefined} />
          <View style={styles.connectWallet}>
            {!wallet ? (
              <>
                <Text style={styles.connectWalletTitle}>Connect Phantom Wallet</Text>
                <Text style={styles.connectWalletSub}>
                  Connect to unlock committee actions and real on-chain activity.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.connectWalletButton,
                    pressed ? styles.connectWalletButtonPressed : null,
                    isConnectingWallet ? styles.connectWalletButtonDisabled : null,
                  ]}
                  disabled={isConnectingWallet}
                  onPress={handleConnectWallet}
                >
                  {isConnectingWallet ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.connectWalletButtonText}>Connect Wallet</Text>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.connectWalletSecondaryButton,
                    pressed ? styles.connectWalletButtonPressed : null,
                    isConnectingEmbedded ? styles.connectWalletButtonDisabled : null,
                  ]}
                  disabled={isConnectingEmbedded || !web3AuthConfigured}
                  onPress={handleConnectEmbeddedWallet}
                >
                  {isConnectingEmbedded ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.connectWalletSecondaryButtonText}>Use In-App Wallet (Web3Auth)</Text>
                  )}
                </Pressable>
                {!web3AuthConfigured ? (
                  <Text style={styles.walletHintText}>
                    Add `RIZQ_WEB3AUTH_CLIENT_ID` in `rizq-app/.env` (from Web3Auth dashboard).
                  </Text>
                ) : null}
                {walletError ? <Text style={styles.walletErrorText}>{walletError}</Text> : null}
              </>
            ) : (
              <>
                <View style={styles.walletConnectedBadge}>
                  <Text style={styles.walletConnectedBadgeText}>Connected</Text>
                </View>
                <Text style={styles.connectWalletTitle}>Phantom Wallet Linked</Text>
                <Text style={styles.connectWalletSub}>
                  {wallet.slice(0, 4)}...{wallet.slice(-4)}
                </Text>
                <Text style={styles.connectWalletProvider}>
                  Provider: {walletProvider === "embedded" ? "In-App Wallet (Web3Auth)" : "Phantom"}
                </Text>
                <Text style={styles.identityText}>
                  {displayName ? `${displayName} · ` : ""}
                  {userId ? `User ${userId.slice(0, 8)}` : "Connected user"}
                </Text>
              </>
            )}
          </View>

          <BalanceCard
            balance={balance}
            onPress={() =>
              navigation.navigate("ProfileTab", {
                screen: "WalletMain",
              })
            }
          />

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
    padding: 12,
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
  connectWalletSecondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    minWidth: 150,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
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
  connectWalletSecondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "700",
  },
  connectWalletProvider: {
    color: colors.info,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  walletErrorText: {
    color: "#ffd1d1",
    fontSize: typography.caption,
  },
  walletHintText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  walletConnectedBadge: {
    alignSelf: "flex-start",
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.45)",
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  walletConnectedBadgeText: {
    color: "#8DFFAA",
    fontSize: typography.caption,
    fontWeight: "700",
  },
  identityText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
});
