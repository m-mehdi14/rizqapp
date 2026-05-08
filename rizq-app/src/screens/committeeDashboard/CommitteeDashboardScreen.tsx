import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { SectionHeader } from "../../components/SectionHeader";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  applyCommitteeMemberAction,
  fetchCommitteeAnnouncements,
  fetchCommitteeDashboard,
  fetchCommitteeHistory,
  fetchNomineeClaims,
  fetchCommitteePenaltyEvents,
  fetchSolUsdcRate,
  enforceCommitteePenalties,
  depositCommitteeCollateral,
  recordCommitteePenaltyOnChain,
  reorderCommitteePayout,
  requestCommitteeOrderChangeApproval,
  sendCommitteePaymentReminder,
  sendCommitteeAnnouncement,
  updateCommitteeStatus,
} from "../../api/rizqApi";
import { useSolanaTransactionSigner } from "../../hooks/useSolanaTransactionSigner";
import { processMissedPaymentTx } from "../../solana/committeeSafetyProgram";
import { useAppStore } from "../../store/useAppStore";
import { AccordionSection } from "./components/AccordionSection";
import { AnnouncementSender } from "./components/AnnouncementSender";
import { ContributionStatus } from "./components/ContributionStatus";
import { DashboardHeader } from "./components/DashboardHeader";
import { EmergencyControls } from "./components/EmergencyControls";
import { ManagerPanel } from "./components/ManagerPanel";
import { MemberActionModal } from "./components/MemberActionModal";
import { MembersList } from "./components/MembersList";
import { PaymentMatrix } from "./components/PaymentMatrix";
import { PoolStatus } from "./components/PoolStatus";
import { PayoutReorder } from "./components/PayoutReorder";
import { PayoutSchedule } from "./components/PayoutSchedule";
import { PenaltyEvents } from "./components/PenaltyEvents";
import { TransactionHistory } from "./components/TransactionHistory";
import type { Member, PayoutTurn } from "./store/useCommitteeDashboardStore";

const FLOATING_TAB_BAR_CLEARANCE = 108;

export function CommitteeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const queryClient = useQueryClient();
  const route = useRoute();
  const routeCommitteeId =
    (route.params as { committeeId?: string } | undefined)?.committeeId ?? undefined;
  const authToken = useAppStore((s) => s.authToken);
  const wallet = useAppStore((s) => s.wallet);
  const userId = useAppStore((s) => s.userId);
  const { signAndSendPrepared, canSignPrepared } = useSolanaTransactionSigner();
  const committees = useAppStore((s) => s.committees);
  const activeCommittee =
    committees.find((committee) => committee.id === routeCommitteeId) ?? committees[0] ?? null;
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [isManagerView, setIsManagerView] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  const historyQuery = useQuery({
    queryKey: ["committee-history", activeCommittee?.id],
    queryFn: () => fetchCommitteeHistory(activeCommittee?.id as string),
    enabled: !!activeCommittee?.id,
    refetchInterval: 20000,
  });
  const dashboardQuery = useQuery({
    queryKey: ["committee-dashboard", activeCommittee?.id],
    queryFn: () => fetchCommitteeDashboard(activeCommittee?.id as string, authToken ?? undefined),
    enabled: !!activeCommittee?.id,
    refetchInterval: 15000,
  });
  const announcementsQuery = useQuery({
    queryKey: ["committee-announcements", activeCommittee?.id],
    queryFn: () => fetchCommitteeAnnouncements(activeCommittee?.id as string),
    enabled: !!activeCommittee?.id,
    refetchInterval: 15000,
  });
  const penaltiesQuery = useQuery({
    queryKey: ["committee-penalties", activeCommittee?.id],
    queryFn: () => fetchCommitteePenaltyEvents(activeCommittee?.id as string, authToken as string),
    enabled:
      !!activeCommittee?.id &&
      !!authToken &&
      isManagerView &&
      Boolean(dashboardQuery.data?.committee.is_manager),
    refetchInterval: 15000,
  });
  const nomineeClaimsQuery = useQuery({
    queryKey: ["committee-nominee-claims", activeCommittee?.id],
    queryFn: () => fetchNomineeClaims({ committeeId: activeCommittee?.id as string }),
    enabled: !!activeCommittee?.id && isManagerView && Boolean(dashboardQuery.data?.committee.is_manager),
    refetchInterval: 15000,
  });
  const solRateQuery = useQuery({
    queryKey: ["sol-usdc-rate-committee-dashboard"],
    queryFn: fetchSolUsdcRate,
    refetchInterval: 60_000,
  });
  const [lastKnownSolUsdcRate, setLastKnownSolUsdcRate] = useState<number | null>(null);
  useEffect(() => {
    if (typeof solRateQuery.data === "number" && Number.isFinite(solRateQuery.data) && solRateQuery.data > 0) {
      setLastKnownSolUsdcRate(solRateQuery.data);
    }
  }, [solRateQuery.data]);
  const effectiveSolUsdcRate = solRateQuery.data ?? lastKnownSolUsdcRate;

  const canManage = Boolean(dashboardQuery.data?.committee.is_manager);
  useEffect(() => {
    setIsManagerView(canManage);
  }, [canManage, activeCommittee?.id]);

  const managerSubtitle = useMemo(() => {
    if (isManagerView && canManage) return "Manager mode active";
    return "Member mode active";
  }, [canManage, isManagerView]);

  const txRows = useMemo(() => {
    const contributions = (historyQuery.data?.contributions ?? []).map((item) => ({
      id: `c-${item.id}`,
      type: "Contribution" as const,
      amount: Number(item.amount_micro_usdc) / 1_000_000,
      date: new Date(item.created_at).toLocaleDateString(),
      timestamp: new Date(item.created_at).getTime(),
      explorerUrl: `https://explorer.solana.com/tx/${item.tx_signature}?cluster=devnet`,
    }));
    const payouts = (historyQuery.data?.payouts ?? []).map((item) => ({
      id: `p-${item.id}`,
      type: "Payout" as const,
      amount: Number(item.amount_micro_usdc) / 1_000_000,
      date: new Date(item.claimed_at).toLocaleDateString(),
      timestamp: new Date(item.claimed_at).getTime(),
      explorerUrl: `https://explorer.solana.com/tx/${item.tx_signature}?cluster=devnet`,
    }));
    const rows = [...contributions, ...payouts];
    rows.sort((a, b) => b.timestamp - a.timestamp);
    return rows.map(({ timestamp: _timestamp, ...row }) => row);
  }, [historyQuery.data]);

  const hasPaidCurrentCycle = useMemo(() => {
    const cycleNow =
      dashboardQuery.data?.committee.current_cycle ?? activeCommittee?.currentCycle ?? 1;
    const recentContribution = historyQuery.data?.contributions.find(
      (item) =>
        item.cycle_number === cycleNow &&
        (!userId || item.user_id === userId)
    );
    return Boolean(recentContribution);
  }, [activeCommittee?.currentCycle, dashboardQuery.data?.committee.current_cycle, historyQuery.data?.contributions, userId]);

  const paidAt = useMemo(() => {
    if (!hasPaidCurrentCycle) return undefined;
    const cycleNow =
      dashboardQuery.data?.committee.current_cycle ?? activeCommittee?.currentCycle ?? 1;
    const recent = historyQuery.data?.contributions.find(
      (item) => item.cycle_number === cycleNow && (!userId || item.user_id === userId)
    );
    return recent ? new Date(recent.created_at).toLocaleString() : undefined;
  }, [activeCommittee?.currentCycle, dashboardQuery.data?.committee.current_cycle, hasPaidCurrentCycle, historyQuery.data?.contributions, userId]);

  const membersData = useMemo<Member[]>(
    () =>
      (dashboardQuery.data?.members ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        status: member.status,
        payoutTurn: member.payout_position || 0,
        history: member.history.map((h) => ({
          cycle: h.cycle,
          status: h.status,
          amount: Math.max(0, (activeCommittee?.contributionLamports ?? 0) / 1_000_000),
          date: "-",
        })),
      })),
    [activeCommittee?.contributionLamports, dashboardQuery.data?.members]
  );

  const payoutScheduleData = useMemo<PayoutTurn[]>(
    () =>
      (dashboardQuery.data?.payout_schedule ?? []).map((turn) => {
        const member = dashboardQuery.data?.members.find((m) => m.id === turn.member_id);
        return {
          turn: turn.turn,
          memberName: turn.member_name,
          dueDate: turn.due_date,
          completed: turn.completed,
          isCurrentUser: member?.user_id === userId,
          paidDate: turn.completed ? turn.due_date : undefined,
        };
      }),
    [dashboardQuery.data?.members, dashboardQuery.data?.payout_schedule, userId]
  );
  const payoutReadiness = useMemo(() => {
    const currentCycle =
      dashboardQuery.data?.committee.current_cycle ?? activeCommittee?.currentCycle ?? 1;
    const activeMembersCount = (dashboardQuery.data?.members ?? []).filter(
      (m) => m.membership_status === "active"
    ).length;
    const paidContributorCount = new Set(
      (historyQuery.data?.contributions ?? [])
        .filter((item) => (item.cycle_number ?? 0) === currentCycle)
        .map((item) => item.user_id)
    ).size;
    const currentTurnRow =
      (dashboardQuery.data?.payout_schedule ?? []).find((row) => row.turn === currentCycle) ?? null;
    const isCurrentUserTurn =
      currentTurnRow != null &&
      (currentTurnRow.is_current_user || Boolean(userId && currentTurnRow.member_id === userId));
    const cycleDateMs = dashboardQuery.data?.committee.next_cycle_date
      ? new Date(dashboardQuery.data.committee.next_cycle_date).getTime()
      : null;
    const cycleDateReached = cycleDateMs == null ? true : Date.now() >= cycleDateMs;
    const alreadyClaimed = Boolean(currentTurnRow?.completed);
    const poolReady = paidContributorCount >= Math.max(1, activeMembersCount);
    const reasons: string[] = [];
    if (alreadyClaimed) reasons.push("Already claimed");
    if (!cycleDateReached) reasons.push("Cycle date not reached");
    if (!isCurrentUserTurn) reasons.push("Not your turn");
    if (!poolReady) {
      const missing = Math.max(0, Math.max(1, activeMembersCount) - paidContributorCount);
      reasons.push(`Waiting for ${missing} member(s)`);
    }
    return {
      ready: reasons.length === 0,
      reasons,
      summary: `${paidContributorCount}/${Math.max(1, activeMembersCount)} paid in cycle ${currentCycle}`,
    };
  }, [
    activeCommittee?.currentCycle,
    dashboardQuery.data?.committee.current_cycle,
    dashboardQuery.data?.committee.next_cycle_date,
    dashboardQuery.data?.members,
    dashboardQuery.data?.payout_schedule,
    historyQuery.data?.contributions,
    userId,
  ]);

  const paymentMatrixData = useMemo(
    () => dashboardQuery.data?.payment_matrix ?? [],
    [dashboardQuery.data?.payment_matrix]
  );

  const committeeView = useMemo(() => {
    const totalCycles = dashboardQuery.data?.committee.total_cycles ?? activeCommittee?.totalCycles ?? 1;
    const currentCycle = dashboardQuery.data?.committee.current_cycle ?? activeCommittee?.currentCycle ?? 1;
    const contributionUsdc = Math.max(0, (activeCommittee?.contributionLamports ?? 0) / 1_000_000);
    const targetPool = contributionUsdc * Math.max(1, activeCommittee?.memberCount ?? 1);
    const projectedAtMaxPool =
      contributionUsdc * Math.max(1, activeCommittee?.maxMembers ?? activeCommittee?.memberCount ?? 1);
    const paidMembers = historyQuery.data?.contributions
      ? new Set(
          historyQuery.data.contributions
            .filter((item) => item.cycle_number === currentCycle)
            .map((item) => item.user_id)
        ).size
      : 0;
    const health =
      (activeCommittee?.daysLeft ?? 0) <= 1
        ? "red"
        : (activeCommittee?.daysLeft ?? 0) <= 3
          ? "amber"
          : "green";
    return {
      id: activeCommittee?.id ?? "",
      name: activeCommittee?.name ?? dashboardQuery.data?.committee.name ?? "Committee",
      type:
        activeCommittee?.type?.toLowerCase().includes("wedding")
          ? "Wedding"
          : activeCommittee?.type?.toLowerCase().includes("hajj")
            ? "Hajj"
            : activeCommittee?.type?.toLowerCase().includes("education")
              ? "Education"
              : "General",
      cycleCurrent: currentCycle,
      cycleTotal: totalCycles,
      userPayoutMonth: Math.min(totalCycles, Math.max(1, currentCycle + 1)),
      userPayoutInDays: Math.max(0, activeCommittee?.daysLeft ?? 0),
      health,
      nextPaymentAmount: contributionUsdc,
      nextPaymentDueDate: activeCommittee?.nextCycleDate
        ? new Date(activeCommittee.nextCycleDate).toISOString().slice(0, 10)
        : dashboardQuery.data?.committee.next_cycle_date?.slice(0, 10) ?? "-",
      daysRemaining: activeCommittee?.daysLeft ?? 0,
      solUsdcRate: effectiveSolUsdcRate ?? null,
      hasPaidCurrentCycle,
      paidAt,
      poolCurrentUSDC:
        Number(
          (historyQuery.data?.contributions ?? []).reduce(
            (sum, item) => sum + Number(item.amount_micro_usdc) / 1_000_000,
            0
          )
        ) || 0,
      poolTargetUSDC: targetPool > 0 ? targetPool : contributionUsdc,
      poolProjectedAtMaxUSDC: projectedAtMaxPool > 0 ? projectedAtMaxPool : targetPool,
      maxMembersCount: activeCommittee?.maxMembers ?? activeCommittee?.memberCount ?? 0,
      paidMembersCount: paidMembers || 0,
      totalMembersCount: activeCommittee?.memberCount ?? 0,
    };
  }, [
    activeCommittee,
    dashboardQuery.data?.committee.current_cycle,
    dashboardQuery.data?.committee.name,
    dashboardQuery.data?.committee.next_cycle_date,
    dashboardQuery.data?.committee.total_cycles,
    effectiveSolUsdcRate,
    hasPaidCurrentCycle,
    historyQuery.data?.contributions,
    paidAt,
  ]);

  const contributionStatusData = useMemo(
    () => ({
      nextPaymentAmount: Math.max(0, (activeCommittee?.contributionLamports ?? 0) / 1_000_000),
      solUsdcRate: effectiveSolUsdcRate ?? null,
      nextPaymentDueDate: activeCommittee?.nextCycleDate
        ? new Date(activeCommittee.nextCycleDate).toLocaleDateString()
        : dashboardQuery.data?.committee.next_cycle_date
          ? new Date(dashboardQuery.data.committee.next_cycle_date).toLocaleDateString()
          : "-",
      daysRemaining: activeCommittee?.daysLeft ?? 0,
      hasPaidCurrentCycle,
      paidAt,
    }),
    [
      activeCommittee?.contributionLamports,
      activeCommittee?.daysLeft,
      activeCommittee?.nextCycleDate,
      dashboardQuery.data?.committee.next_cycle_date,
      hasPaidCurrentCycle,
      paidAt,
      effectiveSolUsdcRate,
    ]
  );
  const safetyView = useMemo(() => {
    const safety = dashboardQuery.data?.committee.safety;
    if (!safety) return null;
    const collateralUsdc = Number(safety.collateral_deposited_micro_usdc ?? 0) / 1_000_000;
    const deferredTotalUsdc = Number(safety.deferred_total_micro_usdc ?? 0) / 1_000_000;
    const deferredReleasedUsdc = Number(safety.deferred_released_micro_usdc ?? 0) / 1_000_000;
    const deferredRemainingUsdc = Math.max(0, deferredTotalUsdc - deferredReleasedUsdc);
    const pid = safety.safety_program_id?.trim();
    const programShort =
      pid && pid.length > 12 ? `${pid.slice(0, 4)}…${pid.slice(-4)}` : pid ?? null;
    return {
      mode: safety.onchain_enabled
        ? "Devnet committee_safety · rules enforced in backend"
        : "Backend safety mirror",
      onchain: Boolean(safety.onchain_enabled),
      programShort,
      strikes: Number(safety.penalty_strikes ?? 0),
      payoutEligibility: safety.is_eligible_for_payout ? "Eligible" : "Suspended",
      collateralUsdc,
      collateralSource: safety.collateral_source ?? null,
      collateralTxShort:
        typeof safety.collateral_tx_signature === "string" && safety.collateral_tx_signature.length > 12
          ? `${safety.collateral_tx_signature.slice(0, 6)}...${safety.collateral_tx_signature.slice(-6)}`
          : safety.collateral_tx_signature ?? null,
      deferredReleasedUsdc,
      deferredRemainingUsdc,
    };
  }, [dashboardQuery.data?.committee.safety]);

  const isPaused = (dashboardQuery.data?.committee.status ?? "").toLowerCase() === "paused";
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  const reorderMutation = useMutation({
    mutationFn: async (input: { fromIndex: number; toIndex: number }) => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      await reorderCommitteePayout({
        committeeId: activeCommittee.id,
        fromIndex: input.fromIndex,
        toIndex: input.toIndex,
        token: authToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["committee-dashboard", activeCommittee?.id] });
    },
    onError: (error) => {
      Alert.alert("Reorder failed", getErrorMessage(error));
    },
  });
  const announcementMutation = useMutation({
    mutationFn: async () => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      if (!announcementText.trim()) return;
      await sendCommitteeAnnouncement({
        committeeId: activeCommittee.id,
        title: "Committee Update",
        message: announcementText.trim(),
        token: authToken,
      });
    },
    onSuccess: async () => {
      setAnnouncementText("");
      await queryClient.invalidateQueries({
        queryKey: ["committee-announcements", activeCommittee?.id],
      });
      Alert.alert("Announcement sent", "Members have been notified.");
    },
    onError: (error) => {
      Alert.alert("Announcement failed", getErrorMessage(error));
    },
  });
  const memberActionMutation = useMutation({
    mutationFn: async (input: { memberId: string; action: "suspend" | "activate" | "remove" | "deceased" }) => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      await applyCommitteeMemberAction({
        committeeId: activeCommittee.id,
        memberId: input.memberId,
        action: input.action,
        token: authToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["committee-dashboard", activeCommittee?.id] });
      setMemberModalOpen(false);
    },
    onError: (error) => {
      Alert.alert("Member update failed", getErrorMessage(error));
    },
  });
  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      await updateCommitteeStatus({
        committeeId: activeCommittee.id,
        status: isPaused ? "active" : "paused",
        token: authToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["committee-dashboard", activeCommittee?.id] });
      Alert.alert("Status updated", isPaused ? "Committee resumed." : "Committee paused.");
    },
    onError: (error) => {
      Alert.alert("Status update failed", getErrorMessage(error));
    },
  });
  const orderApprovalMutation = useMutation({
    mutationFn: async () => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      return await requestCommitteeOrderChangeApproval({
        committeeId: activeCommittee.id,
        token: authToken,
      });
    },
    onSuccess: (result) => {
      Alert.alert(
        "Approval requested",
        `Request sent for ${result.member_count} members. Push notifications: ${result.push_sent}.`
      );
      queryClient.invalidateQueries({
        queryKey: ["committee-announcements", activeCommittee?.id],
      });
    },
    onError: (error) => {
      Alert.alert("Approval request failed", getErrorMessage(error));
    },
  });
  const reminderMutation = useMutation({
    mutationFn: async (input: { memberId: string; cycle: number }) => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      await sendCommitteePaymentReminder({
        committeeId: activeCommittee.id,
        memberId: input.memberId,
        cycleNumber: input.cycle,
        token: authToken,
      });
    },
    onSuccess: (_result, variables) => {
      const member = membersData.find((item) => item.id === variables.memberId);
      Alert.alert("Reminder sent", `Payment reminder sent to ${member?.name ?? "member"}.`);
    },
    onError: (error) => {
      Alert.alert("Reminder failed", getErrorMessage(error));
    },
  });
  const enforcePenaltyMutation = useMutation({
    mutationFn: async () => {
      if (!authToken || !activeCommittee?.id) throw new Error("Login required for manager controls.");
      const dash = dashboardQuery.data;
      const safety = dash?.committee.safety;
      const managerW = dash?.committee.manager_wallet?.trim() ?? "";
      const overdueMember = (dash?.members ?? []).find(
        (m) => m.status === "overdue" && m.wallet_address && m.wallet_address.length > 0
      );
      const useChainPenalty =
        Boolean(safety?.onchain_enabled) &&
        Boolean(safety?.committee_pda) &&
        managerW.length > 0 &&
        Boolean(overdueMember?.wallet_address) &&
        Boolean(wallet) &&
        wallet === managerW &&
        canSignPrepared;

      if (useChainPenalty && overdueMember?.wallet_address) {
        const sig = await processMissedPaymentTx({
          managerWalletAddress: managerW,
          targetMemberWalletAddress: overdueMember.wallet_address,
          feePayerWalletAddress: wallet as string,
          signAndSendPrepared,
        });
        return await recordCommitteePenaltyOnChain({
          committeeId: activeCommittee.id,
          token: authToken,
          targetWallet: overdueMember.wallet_address,
          txSignature: sig,
        });
      }

      return await enforceCommitteePenalties({
        committeeId: activeCommittee.id,
        token: authToken,
      });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["committee-dashboard", activeCommittee?.id] }),
        queryClient.invalidateQueries({ queryKey: ["committee-history", activeCommittee?.id] }),
        queryClient.invalidateQueries({ queryKey: ["committee-announcements", activeCommittee?.id] }),
      ]);
      if ("strike_number" in result && result.strike_number != null) {
        Alert.alert(
          "On-chain penalty recorded",
          `Strike ${result.strike_number} synced for overdue member. Avoid running full penalty check immediately after to prevent duplicate strikes.`
        );
        return;
      }
      const bulk = result as {
        overdue: boolean;
        checked_members: number;
        penalized_members: number;
      };
      const title = bulk.overdue ? "Penalty check complete" : "Penalty check not needed";
      const detail = bulk.overdue
        ? `Checked ${bulk.checked_members} members, penalized ${bulk.penalized_members}.`
        : "Current cycle is not overdue yet.";
      Alert.alert(title, detail);
    },
    onError: (error) => {
      Alert.alert("Penalty check failed", getErrorMessage(error));
    },
  });

  const showManagerCollateralPrompt = useMemo(() => {
    const c = dashboardQuery.data?.committee;
    if (!c?.is_manager || !c.safety) return false;
    return Number(c.safety.collateral_deposited_micro_usdc ?? 0) === 0;
  }, [dashboardQuery.data?.committee]);

  const recordManagerCollateralMutation = useMutation({
    mutationFn: async () => {
      if (!authToken || !activeCommittee?.id || !wallet) {
        throw new Error("Sign in and connect your wallet first.");
      }
      const sig = `wallet-proof-collateral-${Date.now()}-${wallet.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
      return await depositCommitteeCollateral({
        committeeId: activeCommittee.id,
        txSignature: sig,
        wallet,
        authToken,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["committee-dashboard", activeCommittee?.id] });
      Alert.alert("Collateral recorded", "Your manager collateral lock is saved for penalties and safety.");
    },
    onError: (error) => {
      Alert.alert("Collateral record failed", getErrorMessage(error));
    },
  });

  return (
    <ScreenShell>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.unit,
              paddingBottom: insets.bottom + FLOATING_TAB_BAR_CLEARANCE,
            },
          ]}
        >
          <View style={styles.modeToggleWrap}>
            <Text style={styles.modeTitle}>Committee Dashboard</Text>
            <Text style={styles.modeSub}>{managerSubtitle}</Text>
            <View style={styles.modeButtons}>
              <Pressable
                style={[styles.modeButton, !isManagerView && styles.modeButtonOn]}
                onPress={() => setIsManagerView(false)}
              >
                <Text style={[styles.modeButtonText, !isManagerView && styles.modeButtonTextOn]}>
                  Member View
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modeButton,
                  isManagerView && canManage && styles.modeButtonOn,
                  !canManage && styles.modeButtonDisabled,
                ]}
                onPress={() => {
                  if (!canManage) {
                    Alert.alert("Manager access required", "Only committee manager can use manager controls.");
                    return;
                  }
                  setIsManagerView(true);
                }}
              >
                <Text style={[styles.modeButtonText, isManagerView && canManage && styles.modeButtonTextOn]}>
                  Manager View
                </Text>
              </Pressable>
            </View>
          </View>

          <DashboardHeader
            committee={committeeView}
            inviteCode={dashboardQuery.data?.committee.invite_code ?? activeCommittee?.inviteCode ?? null}
            onCopyInviteCode={(code) => {
              Clipboard.setString(code);
              Alert.alert("Copied", "Committee join code copied.");
            }}
          />
          <ContributionStatus
            committee={contributionStatusData}
            onPayNow={() => {
              navigation.navigate("PayContribution", {
                committeeId: activeCommittee?.id,
              });
            }}
          />
          <GlassCard style={styles.payoutReadinessCard}>
            <Text style={styles.payoutReadinessTitle}>Payout Readiness</Text>
            <Text style={styles.payoutReadinessSub}>{payoutReadiness.summary}</Text>
            <View style={styles.readinessBadgeRow}>
              {payoutReadiness.ready ? (
                <View style={[styles.readinessBadge, styles.readinessBadgeReady]}>
                  <Text style={[styles.readinessBadgeText, styles.readinessBadgeTextReady]}>Ready to claim</Text>
                </View>
              ) : (
                payoutReadiness.reasons.map((reason) => (
                  <View key={reason} style={styles.readinessBadge}>
                    <Text style={styles.readinessBadgeText}>{reason}</Text>
                  </View>
                ))
              )}
            </View>
            <Pressable
              style={[
                styles.payoutReadinessBtn,
                !payoutReadiness.ready && styles.payoutReadinessBtnSecondary,
              ]}
              onPress={() =>
                navigation.navigate(
                  payoutReadiness.ready ? "PayoutClaim" : "PayoutNotification",
                  { committeeId: activeCommittee?.id }
                )
              }
            >
              <Text
                style={[
                  styles.payoutReadinessBtnText,
                  !payoutReadiness.ready && styles.payoutReadinessBtnTextSecondary,
                ]}
              >
                {payoutReadiness.ready ? "Claim payout now" : "View payout lock reasons"}
              </Text>
            </Pressable>
          </GlassCard>
          {showManagerCollateralPrompt ? (
            <GlassCard style={styles.collateralPrompt}>
              <Text style={styles.collateralPromptTitle}>Manager collateral</Text>
              <Text style={styles.collateralPromptBody}>
                As manager you lock the same per-cycle amount as members. This should fill automatically when you
                launch with on-chain safety; if it still shows $0 here, tap below to record it in the app (off-chain
                mirror — same as member join without chain).
              </Text>
              <Pressable
                style={[
                  styles.collateralPromptBtn,
                  recordManagerCollateralMutation.isPending && styles.collateralPromptBtnDisabled,
                ]}
                disabled={recordManagerCollateralMutation.isPending}
                onPress={() => recordManagerCollateralMutation.mutate()}
              >
                <Text style={styles.collateralPromptBtnText}>
                  {recordManagerCollateralMutation.isPending ? "Saving…" : "Record collateral deposit"}
                </Text>
              </Pressable>
            </GlassCard>
          ) : null}
          <PoolStatus committee={committeeView} solUsdcRate={effectiveSolUsdcRate ?? null} />
          {safetyView ? (
            <View style={styles.safetyCard}>
              <Text style={styles.safetyTitle}>{safetyView.mode}</Text>
              {safetyView.programShort ? (
                <Text style={styles.safetySub}>{`Program ${safetyView.programShort}`}</Text>
              ) : null}
              <Text style={styles.safetyRow}>{`Strikes: ${safetyView.strikes} · Payout: ${safetyView.payoutEligibility}`}</Text>
              <Text style={styles.safetyRow}>{`Collateral: $${safetyView.collateralUsdc.toFixed(2)} USDC`}</Text>
              <Text style={styles.safetyRow}>
                {`Collateral source: ${
                  safetyView.collateralSource === "on_chain_tx"
                    ? "On-chain verified"
                    : safetyView.collateralSource === "wallet_proof"
                      ? "App-recorded"
                      : "Not recorded yet"
                }${safetyView.collateralTxShort ? ` (${safetyView.collateralTxShort})` : ""}`}
              </Text>
              <Text style={styles.safetyRow}>{`Deferred released: $${safetyView.deferredReleasedUsdc.toFixed(2)} · Remaining: $${safetyView.deferredRemainingUsdc.toFixed(2)}`}</Text>
              {safetyView.onchain && safetyView.collateralUsdc <= 0 ? (
                <Text style={styles.safetyHint}>
                  Collateral shows $0 until a deposit is recorded: members via join; managers via launch (on-chain) plus API sync, or use “Record collateral deposit” below if needed.
                </Text>
              ) : null}
            </View>
          ) : null}

          <AccordionSection title="Members List" defaultOpen>
            <MembersList
              members={membersData}
              onPressMember={(member) => {
                setActiveMember(member);
                setMemberModalOpen(true);
              }}
            />
          </AccordionSection>

          <AccordionSection title="Payout Schedule" defaultOpen>
            <PayoutSchedule turns={payoutScheduleData} />
          </AccordionSection>

          <AccordionSection title="Transaction History" defaultOpen={false}>
            <TransactionHistory transactions={txRows} solUsdcRate={effectiveSolUsdcRate ?? null} />
          </AccordionSection>

          <AccordionSection title="Committee Announcements" defaultOpen={false}>
            <AnnouncementSender
              value={announcementText}
              onChange={setAnnouncementText}
              onSend={() => announcementMutation.mutate()}
              sending={announcementMutation.isPending}
              recent={announcementsQuery.data ?? []}
              hideComposer={!isManagerView || !canManage}
            />
          </AccordionSection>

          {isManagerView && canManage ? (
            <>
              <SectionHeader title="Manager Area" />
              <ManagerPanel>
                <AccordionSection title="Payment Status Grid">
                  <PaymentMatrix
                    members={membersData}
                    matrix={paymentMatrixData}
                    onCellPress={({ member, cycle, status }) => {
                      if (status === "paid") {
                        Alert.alert("Already paid", `${member.name} has already paid cycle ${cycle}.`);
                        return;
                      }
                      if (status === "future") {
                        Alert.alert("Future cycle", "Reminders are only for current/past cycles.");
                        return;
                      }
                      reminderMutation.mutate({ memberId: member.id, cycle });
                    }}
                  />
                </AccordionSection>

                <AccordionSection title="Payout Reorder">
                  <PayoutReorder
                    turns={payoutScheduleData}
                    onMoveUp={(index) =>
                      reorderMutation.mutate({
                        fromIndex: index,
                        toIndex: Math.max(0, index - 1),
                      })
                    }
                    onMoveDown={(index) =>
                      reorderMutation.mutate({
                        fromIndex: index,
                        toIndex: Math.min(payoutScheduleData.length - 1, index + 1),
                      })
                    }
                    onRequestApproval={() => orderApprovalMutation.mutate()}
                    loading={reorderMutation.isPending || orderApprovalMutation.isPending}
                  />
                </AccordionSection>

                <AccordionSection title="Emergency Tools" defaultOpen={false}>
                  <EmergencyControls
                    isPaused={isPaused}
                    onTogglePause={() => statusMutation.mutate()}
                    onExport={async () => {
                      const lines = [
                        "type,date,amount_usdc,explorer_url",
                        ...txRows.map((row) =>
                          `${row.type},${row.date},${row.amount.toFixed(2)},${row.explorerUrl}`
                        ),
                      ];
                      const exportText = [
                        `Committee: ${committeeView.name}`,
                        `Cycle: ${committeeView.cycleCurrent}/${committeeView.cycleTotal}`,
                        "",
                        lines.join("\n"),
                      ].join("\n");
                      await Share.share({
                        title: `${committeeView.name} history export`,
                        message: exportText,
                      });
                    }}
                    onRunPenaltyCheck={() => enforcePenaltyMutation.mutate()}
                    penaltyLoading={enforcePenaltyMutation.isPending}
                  />
                </AccordionSection>
                <AccordionSection title="Penalty Events" defaultOpen={false}>
                  <PenaltyEvents events={penaltiesQuery.data ?? []} />
                </AccordionSection>
                <AccordionSection title="Nominee Claims" defaultOpen={false}>
                  <View style={styles.nomineeClaimsWrap}>
                    {(nomineeClaimsQuery.data ?? []).slice(0, 8).map((claim) => {
                      const amount = Number(claim.amount_micro_usdc ?? 0) / 1_000_000;
                      const expires =
                        claim.expires_at != null ? new Date(claim.expires_at).toLocaleDateString() : "n/a";
                      return (
                        <View key={claim.id} style={styles.nomineeClaimRow}>
                          <Text style={styles.nomineeClaimTitle}>
                            {claim.nominee_name ?? "Unknown nominee"} · ${amount.toFixed(2)}
                          </Text>
                          <Text style={styles.nomineeClaimMeta}>
                            {`Status: ${claim.status.toUpperCase()} · Expires: ${expires}`}
                          </Text>
                        </View>
                      );
                    })}
                    {!nomineeClaimsQuery.isLoading && (nomineeClaimsQuery.data?.length ?? 0) === 0 ? (
                      <Text style={styles.nomineeClaimMeta}>
                        No nominee claims yet. Use member action "Mark as deceased" to trigger flow.
                      </Text>
                    ) : null}
                  </View>
                </AccordionSection>
              </ManagerPanel>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <MemberActionModal
        visible={memberModalOpen}
        member={activeMember}
        isManager={isManagerView && canManage}
        onSendReminder={(member) => {
          reminderMutation.mutate({
            memberId: member.id,
            cycle: dashboardQuery.data?.committee.current_cycle ?? 1,
          });
        }}
        onViewPaymentHistory={(member) => {
          setMemberModalOpen(false);
          Alert.alert(
            "History",
            `Open Transaction History section to review latest transfers for ${member.name}.`
          );
        }}
        onAction={(action, member) => {
          if (action === "deceased") {
            Alert.alert(
              "Confirm nominee flow",
              "This marks the member as deceased, notifies nominee claim flow (30 days), and expired claims move to welfare. Continue?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm",
                  style: "destructive",
                  onPress: () => memberActionMutation.mutate({ memberId: member.id, action }),
                },
              ]
            );
            return;
          }
          memberActionMutation.mutate({ memberId: member.id, action });
        }}
        onClose={() => setMemberModalOpen(false)}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenX,
    gap: 12,
  },
  modeToggleWrap: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    gap: 8,
  },
  modeTitle: { color: colors.textPrimary, fontSize: typography.h2, fontWeight: "700" },
  modeSub: { color: colors.textSecondary, fontSize: typography.bodySmall },
  modeButtons: { flexDirection: "row", gap: 8 },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  modeButtonOn: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.13)",
  },
  modeButtonDisabled: {
    opacity: 0.45,
  },
  modeButtonText: { color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: "700" },
  modeButtonTextOn: { color: colors.brandGreen },
  safetyCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    gap: 4,
  },
  safetyTitle: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "800" },
  safetySub: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
  safetyRow: { color: colors.textSecondary, fontSize: typography.caption },
  safetyHint: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 8,
    opacity: 0.9,
    lineHeight: 18,
  },
  nomineeClaimsWrap: { gap: 8 },
  nomineeClaimRow: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.input,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    gap: 4,
  },
  nomineeClaimTitle: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  nomineeClaimMeta: { color: colors.textSecondary, fontSize: typography.caption },
  collateralPrompt: { padding: 14, gap: 10 },
  collateralPromptTitle: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: "800",
  },
  collateralPromptBody: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 },
  collateralPromptBtn: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  collateralPromptBtnDisabled: { opacity: 0.55 },
  collateralPromptBtnText: { color: colors.textInverse, fontWeight: "700", fontSize: typography.bodySmall },
  payoutReadinessCard: { padding: 14, gap: 8 },
  payoutReadinessTitle: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "800" },
  payoutReadinessSub: { color: colors.textSecondary, fontSize: typography.caption },
  readinessBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  readinessBadge: {
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    backgroundColor: "rgba(10,51,40,0.05)",
    borderRadius: 999,
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessBadgeReady: {
    borderColor: "rgba(29,158,117,0.45)",
    backgroundColor: "rgba(29,158,117,0.12)",
  },
  readinessBadgeText: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
  readinessBadgeTextReady: { color: colors.brandGreenDim },
  payoutReadinessBtn: {
    marginTop: 4,
    minHeight: 42,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutReadinessBtnSecondary: {
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    backgroundColor: "rgba(10,51,40,0.05)",
  },
  payoutReadinessBtnText: { color: colors.textInverse, fontWeight: "700", fontSize: typography.bodySmall },
  payoutReadinessBtnTextSecondary: { color: colors.textPrimary },
});
