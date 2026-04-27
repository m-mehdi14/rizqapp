import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { ScreenShell } from "../../components/ScreenShell";
import { SectionHeader } from "../../components/SectionHeader";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  applyCommitteeMemberAction,
  fetchCommitteeAnnouncements,
  fetchCommitteeDashboard,
  fetchCommitteeHistory,
  fetchSolUsdcRate,
  reorderCommitteePayout,
  requestCommitteeOrderChangeApproval,
  sendCommitteePaymentReminder,
  sendCommitteeAnnouncement,
  updateCommitteeStatus,
} from "../../api/rizqApi";
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
  const userId = useAppStore((s) => s.userId);
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
  const solRateQuery = useQuery({
    queryKey: ["sol-usdc-rate-committee-dashboard"],
    queryFn: fetchSolUsdcRate,
    refetchInterval: 60_000,
  });

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

  const paymentMatrixData = useMemo(
    () => dashboardQuery.data?.payment_matrix ?? [],
    [dashboardQuery.data?.payment_matrix]
  );

  const committeeView = useMemo(() => {
    const totalCycles = dashboardQuery.data?.committee.total_cycles ?? activeCommittee?.totalCycles ?? 1;
    const currentCycle = dashboardQuery.data?.committee.current_cycle ?? activeCommittee?.currentCycle ?? 1;
    const contributionUsdc = Math.max(0, (activeCommittee?.contributionLamports ?? 0) / 1_000_000);
    const targetPool = contributionUsdc * Math.max(1, activeCommittee?.memberCount ?? 1);
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
      solUsdcRate: solRateQuery.data ?? null,
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
      paidMembersCount: paidMembers || 0,
      totalMembersCount: activeCommittee?.memberCount ?? 0,
    };
  }, [
    activeCommittee,
    dashboardQuery.data?.committee.current_cycle,
    dashboardQuery.data?.committee.name,
    dashboardQuery.data?.committee.next_cycle_date,
    dashboardQuery.data?.committee.total_cycles,
    hasPaidCurrentCycle,
    historyQuery.data?.contributions,
    paidAt,
  ]);

  const contributionStatusData = useMemo(
    () => ({
      nextPaymentAmount: Math.max(0, (activeCommittee?.contributionLamports ?? 0) / 1_000_000),
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
      solRateQuery.data,
    ]
  );

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
    mutationFn: async (input: { memberId: string; action: "suspend" | "activate" | "remove" }) => {
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
          <PoolStatus committee={committeeView} solUsdcRate={solRateQuery.data ?? null} />

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
            <TransactionHistory transactions={txRows} solUsdcRate={solRateQuery.data ?? null} />
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
                  />
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
});
