import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, ParamListBase, RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  claimCommitteePayout,
  createCommitteeContribution,
  fetchCommitteeHistory,
} from "../../api/rizqApi";
import { usePhantomWallet } from "../../hooks/usePhantomWallet";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";
import { useAppStore } from "../../store/useAppStore";
import type { CommitteesStackParamList } from "../../navigation/RootNavigator";

const FLOATING_TAB_BAR_CLEARANCE = 108;

function useSelectedCommittee() {
  const route = useRoute<RouteProp<CommitteesStackParamList, keyof CommitteesStackParamList>>();
  const routeCommitteeId = (route.params as { committeeId?: string } | undefined)?.committeeId;
  const committees = useAppStore((s) => s.committees);
  const committee =
    committees.find((item) => item.id === routeCommitteeId) ?? committees[0] ?? null;
  return { committee, routeCommitteeId: routeCommitteeId ?? committee?.id };
}

function Layout({
  title,
  subtitle,
  children,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  variant?: "default" | "celebration";
}) {
  return (
    <ScreenShell variant={variant}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.section,
            paddingHorizontal: spacing.screenX,
            paddingBottom: FLOATING_TAB_BAR_CLEARANCE,
            gap: 12,
          }}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ScreenShell>
  );
}

export function PayContributionScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const { committee, routeCommitteeId } = useSelectedCommittee();
  const { signAndSendDevnetProofTx: signWithPhantom } = usePhantomWallet();
  const { signAndSendDevnetProofTx: signWithWeb3Auth } = useWeb3AuthWallet();
  const amountLamports = committee?.contributionLamports ?? 0;
  const amountUsdc = amountLamports / 1_000_000;
  const walletBalanceUsdc = Math.max(0, useAppStore.getState().usdcBalance / 1_000_000);
  const hasEnoughBalance = walletBalanceUsdc >= amountUsdc;
  const [txSignature, setTxSignature] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSignatureValid = useMemo(() => txSignature.trim().length >= 30, [txSignature]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!wallet || !committee?.id || amountLamports <= 0) {
        throw new Error("Wallet or committee missing");
      }
      const signature = txSignature.trim();
      if (signature.length < 30) {
        throw new Error("Enter a confirmed devnet transaction signature");
      }
      await createCommitteeContribution({
        committeeId: committee.id,
        wallet,
        amountLamports,
        txSignature: signature,
      });
    },
    onSuccess: async () => {
      setSubmitError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["committee-history", committee?.id] }),
        queryClient.invalidateQueries({ queryKey: ["committees", wallet] }),
      ]);
      nav.navigate("PayoutNotification", {
        committeeId: routeCommitteeId,
      });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Failed to record contribution");
    },
  });

  return (
    <Layout
      title="Pay Contribution"
      subtitle="Review cycle amount, due date, and wallet balance before signing."
    >
      <GlassCard style={styles.card}>
        <Info label="Committee" value={committee?.name ?? "No active committee"} />
        <Info label="Cycle amount" value={`$${amountUsdc.toFixed(2)} USDC`} />
        <Info
          label="Due date"
          value={
            committee?.nextCycleDate
              ? `${new Date(committee.nextCycleDate).toLocaleDateString()} (${committee.daysLeft} days left)`
              : "Not available"
          }
        />
        <Info
          label="Wallet balance"
          value={`$${walletBalanceUsdc.toFixed(2)} USDC`}
        />
      </GlassCard>
      {!hasEnoughBalance ? (
        <GlassCard style={styles.warningCard}>
          <WarningCircle color={colors.warning} size={18} />
          <Text style={styles.warningBody}>
            Insufficient wallet balance for this committee payment. Deposit USDC first, then retry.
          </Text>
        </GlassCard>
      ) : null}
      <TextInput
        style={styles.input}
        value={txSignature}
        onChangeText={setTxSignature}
        placeholder="Paste confirmed devnet tx signature"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={styles.secondaryBtn}
        onPress={async () => {
          if (!wallet) {
            setSubmitError("Connect wallet first");
            return;
          }
          try {
            setSubmitError(null);
            const signature =
              walletProvider === "embedded"
                ? await signWithWeb3Auth(wallet)
                : await signWithPhantom(wallet);
            setTxSignature(signature);
          } catch (error) {
            setSubmitError(
              error instanceof Error ? error.message : "Failed to capture Phantom signature"
            );
          }
        }}
      >
        <Text style={styles.secondaryText}>
          {walletProvider === "embedded" ? "Sign in Web3Auth Wallet" : "Sign in Phantom"}
        </Text>
      </Pressable>
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <Pressable
        style={styles.primaryBtn}
        disabled={payMutation.isPending || !committee || !wallet || !isSignatureValid || !hasEnoughBalance}
        onPress={() => payMutation.mutate()}
      >
        {payMutation.isPending ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.primaryText}>{`Pay $${amountUsdc.toFixed(2)} USDC`}</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => nav.navigate("LatePayment", { committeeId: routeCommitteeId })}
      >
        <Text style={styles.secondaryText}>Show late-payment state</Text>
      </Pressable>
    </Layout>
  );
}

export function LatePaymentScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const { routeCommitteeId } = useSelectedCommittee();
  return (
    <Layout
      title="Late Payment"
      subtitle="You are inside grace period. Pay now to keep your payout turn safe."
    >
      <GlassCard style={styles.warningCard}>
        <WarningCircle color={colors.warning} size={18} />
        <Text style={styles.warningTitle}>Grace period active</Text>
        <Text style={styles.warningBody}>2 days remaining before payout turn suspension.</Text>
      </GlassCard>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => nav.navigate("PayContribution", { committeeId: routeCommitteeId })}
      >
        <Text style={styles.primaryText}>Pay Now</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryBtn}
        onPress={() => nav.navigate("OverduePayment", { committeeId: routeCommitteeId })}
      >
        <Text style={styles.secondaryText}>View overdue screen</Text>
      </Pressable>
    </Layout>
  );
}

export function OverduePaymentScreen() {
  return (
    <Layout
      title="Overdue Payment"
      subtitle="Grace period expired. Your payout turn is suspended until contribution is settled."
    >
      <GlassCard style={styles.dangerCard}>
        <WarningCircle color={colors.danger} size={18} />
        <Text style={styles.dangerTitle}>Suspension active</Text>
        <Text style={styles.warningBody}>
          Payment is still allowed. After payment, you can request reinstatement from manager.
        </Text>
      </GlassCard>
      <Pressable style={styles.primaryBtn}>
        <Text style={styles.primaryText}>Pay and request reinstatement</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>Contact manager</Text>
      </Pressable>
    </Layout>
  );
}

export function PayoutNotificationScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const { committee, routeCommitteeId } = useSelectedCommittee();
  const grossUsdc =
    ((committee?.contributionLamports ?? 0) * Math.max(1, committee?.memberCount ?? 1)) / 1_000_000;
  return (
    <Layout
      title="Payout Available"
      subtitle="Your cycle payout is ready to claim."
      variant="celebration"
    >
      <GlassCard style={styles.card}>
        <Info label="Committee" value={committee?.name ?? "No active committee"} />
        <Info label="Gross pool" value={`$${grossUsdc.toFixed(2)} USDC`} />
        <Info label="Status" value="Ready to claim" />
      </GlassCard>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => nav.navigate("PayoutClaim", { committeeId: routeCommitteeId })}
      >
        <Text style={styles.primaryText}>Open Claim Screen</Text>
      </Pressable>
    </Layout>
  );
}

export function PayoutClaimScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const { committee, routeCommitteeId } = useSelectedCommittee();
  const { signAndSendDevnetProofTx: signWithPhantom } = usePhantomWallet();
  const { signAndSendDevnetProofTx: signWithWeb3Auth } = useWeb3AuthWallet();
  const grossLamports =
    (committee?.contributionLamports ?? 0) * Math.max(1, committee?.memberCount ?? 1);
  const feeLamports = Math.round(grossLamports * 0.015);
  const netLamports = Math.max(0, grossLamports - feeLamports);
  const grossUsdc = grossLamports / 1_000_000;
  const feeUsdc = feeLamports / 1_000_000;
  const netUsdc = netLamports / 1_000_000;
  const [txSignature, setTxSignature] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSignatureValid = useMemo(() => txSignature.trim().length >= 30, [txSignature]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!wallet || !committee?.id || netLamports <= 0) {
        throw new Error("Wallet or committee missing");
      }
      const signature = txSignature.trim();
      if (signature.length < 30) {
        throw new Error("Enter a confirmed devnet transaction signature");
      }
      await claimCommitteePayout({
        committeeId: committee.id,
        recipientWallet: wallet,
        amountLamports: netLamports,
        cycleNumber: committee.currentCycle,
        txSignature: signature,
      });
    },
    onSuccess: async () => {
      setSubmitError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["committee-history", committee?.id] }),
        queryClient.invalidateQueries({ queryKey: ["committees", wallet] }),
      ]);
      nav.navigate("PostPayout", { committeeId: routeCommitteeId });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Failed to claim payout");
    },
  });

  return (
    <Layout
      title="Claim Payout"
      subtitle="Fee breakdown is transparent before signature."
      variant="celebration"
    >
      <GlassCard style={styles.card}>
        <Info label="Gross pool" value={`$${grossUsdc.toFixed(2)} USDC`} />
        <Info label="Platform fee (1.5%)" value={`$${feeUsdc.toFixed(2)} USDC`} />
        <Info label="Net to wallet" value={`$${netUsdc.toFixed(2)} USDC`} />
      </GlassCard>
      <TextInput
        style={styles.input}
        value={txSignature}
        onChangeText={setTxSignature}
        placeholder="Paste confirmed devnet tx signature"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={styles.secondaryBtn}
        onPress={async () => {
          if (!wallet) {
            setSubmitError("Connect wallet first");
            return;
          }
          try {
            setSubmitError(null);
            const signature =
              walletProvider === "embedded"
                ? await signWithWeb3Auth(wallet)
                : await signWithPhantom(wallet);
            setTxSignature(signature);
          } catch (error) {
            setSubmitError(
              error instanceof Error ? error.message : "Failed to capture Phantom signature"
            );
          }
        }}
      >
        <Text style={styles.secondaryText}>
          {walletProvider === "embedded" ? "Sign in Web3Auth Wallet" : "Sign in Phantom"}
        </Text>
      </Pressable>
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      <Pressable
        style={styles.primaryBtn}
        disabled={claimMutation.isPending || !wallet || !committee || !isSignatureValid}
        onPress={() => claimMutation.mutate()}
      >
        {claimMutation.isPending ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.primaryText}>{`Claim $${netUsdc.toFixed(2)} USDC`}</Text>
        )}
      </Pressable>
    </Layout>
  );
}

export function PostPayoutScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const { committee } = useSelectedCommittee();
  const historyQuery = useQuery({
    queryKey: ["committee-history", committee?.id],
    queryFn: () => fetchCommitteeHistory(committee?.id as string),
    enabled: !!committee?.id,
  });
  const latestPayout = historyQuery.data?.payouts?.[0] ?? null;
  const payoutUsdc = latestPayout ? Number(latestPayout.amount_micro_usdc) / 1_000_000 : 0;
  const contributedUsdc = (historyQuery.data?.contributions ?? []).reduce(
    (sum, item) => sum + Number(item.amount_micro_usdc) / 1_000_000,
    0
  );

  return (
    <Layout
      title="Payout Confirmed"
      subtitle="Your wallet balance is updated and on-chain proof is available."
      variant="celebration"
    >
      <GlassCard style={styles.successCard}>
        <CheckCircle color={colors.success} size={18} />
        <Text style={styles.successTitle}>Claim successful</Text>
        <Text style={styles.warningBody}>
          Tx hash: {latestPayout?.tx_signature ?? "Pending"} • View on Solana Explorer
        </Text>
      </GlassCard>
      <GlassCard style={styles.card}>
        <Info label="Contributed to date" value={`$${contributedUsdc.toFixed(2)} USDC`} />
        <Info label="Received today" value={`$${payoutUsdc.toFixed(2)} USDC`} />
        <Info
          label="Remaining cycles"
          value={String(Math.max(0, (committee?.totalCycles ?? 1) - (committee?.currentCycle ?? 1)))}
        />
        <Info label="Recipient" value={wallet ?? "Unknown wallet"} />
      </GlassCard>
      <Pressable style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>Share milestone card</Text>
      </Pressable>
    </Layout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 21 },
  card: { padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  infoLabel: { color: colors.textSecondary, fontSize: typography.bodySmall },
  infoValue: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  errorText: { color: colors.danger, fontSize: typography.caption },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.textInverse, fontSize: typography.body, fontWeight: "800" },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  warningCard: {
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  warningTitle: { color: colors.warning, fontSize: typography.body, fontWeight: "800" },
  warningBody: { color: colors.textPrimary, fontSize: typography.bodySmall },
  dangerCard: {
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.45)",
    backgroundColor: "rgba(255,82,82,0.12)",
  },
  dangerTitle: { color: colors.danger, fontSize: typography.body, fontWeight: "800" },
  successCard: {
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.12)",
  },
  successTitle: { color: colors.success, fontSize: typography.body, fontWeight: "800" },
});
