import React, { useMemo, useState } from "react";
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, ParamListBase, RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Clipboard from "@react-native-clipboard/clipboard";
import QRCode from "react-native-qrcode-svg";
import { Copy, Wallet } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import {
  fetchSolUsdcRate,
  fetchWalletSolBalance,
  fetchWalletTransactions,
  type WalletTransactionRow,
} from "../../api/rizqApi";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const FLOATING_TAB_BAR_CLEARANCE = 108;

type WalletTx = {
  id: string;
  type: "Contribution" | "Payout";
  committeeName: string;
  amountMicroUsdc: number;
  amountLabel: string;
  date: string;
  timestamp: number;
  tone: "success" | "danger";
  txSignature: string;
  cycle: number | null;
};

function Layout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <ScreenShell>
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

function toWalletTx(rows: WalletTransactionRow[]): WalletTx[] {
  const mapped = rows.map((tx) => {
    const amountUsdc = Number(tx.amount_micro_usdc) / 1_000_000;
    const isContribution = tx.type === "contribution";
    return {
      id: tx.id,
      type: isContribution ? "Contribution" : "Payout",
      committeeName: tx.committee_name,
      amountMicroUsdc: tx.amount_micro_usdc,
      amountLabel: `${isContribution ? "-" : "+"}${amountUsdc.toFixed(2)}`,
      date: new Date(tx.created_at).toLocaleString(),
      timestamp: new Date(tx.created_at).getTime(),
      tone: isContribution ? "danger" : "success",
      txSignature: tx.tx_signature,
      cycle: tx.cycle_number,
    };
  });
  mapped.sort((a, b) => b.timestamp - a.timestamp);
  return mapped;
}

export function WalletMainScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const wallet = useAppStore((s) => s.wallet);
  const solBalanceLamports = useAppStore((s) => s.solBalanceLamports);
  const committees = useAppStore((s) => s.committees);
  const { connectWeb3AuthWallet } = useWeb3AuthWallet();
  const [connectError, setConnectError] = useState<string | null>(null);
  const txQuery = useQuery({
    queryKey: ["wallet-transactions", wallet],
    queryFn: () => fetchWalletTransactions(wallet as string),
    enabled: Boolean(wallet),
  });
  const solRateQuery = useQuery({
    queryKey: ["sol-usdc-rate-wallet"],
    queryFn: fetchSolUsdcRate,
    refetchInterval: 60_000,
  });

  const allTx = useMemo(() => (txQuery.data ? toWalletTx(txQuery.data) : []), [txQuery.data]);
  const txItems = allTx.slice(0, 2);
  const chainSol = Math.max(0, solBalanceLamports / 1_000_000_000);
  const solUsdcRate = solRateQuery.data ?? 0;
  const netCommitteeUsdc = allTx.reduce((sum, tx) => {
    const amountUsdc = tx.amountMicroUsdc / 1_000_000;
    return tx.type === "Payout" ? sum + amountUsdc : sum - amountUsdc;
  }, 0);
  const committeeDeltaSol = solUsdcRate > 0 ? netCommitteeUsdc / solUsdcRate : 0;
  const availableSol = Math.max(0, chainSol + committeeDeltaSol);
  const availableUsdc = availableSol * solUsdcRate;
  const lockedSol =
    committees.reduce(
      (sum, committee) => sum + Math.max(0, committee.contributionLamports ?? 0) / 1_000_000_000,
      0
    ) || 0;
  const lockedUsdc = lockedSol * solUsdcRate;
  const pendingSol = Math.max(0, lockedSol - availableSol);
  const pendingUsdc = pendingSol * solUsdcRate;
  const paidOutUsdc = allTx
    .filter((tx) => tx.type === "Payout")
    .reduce((sum, tx) => sum + tx.amountMicroUsdc / 1_000_000, 0);
  const contributedUsdc = allTx
    .filter((tx) => tx.type === "Contribution")
    .reduce((sum, tx) => sum + tx.amountMicroUsdc / 1_000_000, 0);

  return (
    <Layout
      title="Wallet"
      subtitle="Track SOL balance with USDC equivalents and on-chain activity."
    >
      <GlassCard style={styles.balanceCard}>
        <View style={styles.row}>
          <Wallet color={colors.brandGreen} size={18} />
          <Text style={styles.cardLabel}>Total Balance</Text>
        </View>
        <Text style={styles.balanceValue}>{availableSol.toFixed(4)} SOL</Text>
        <Text style={styles.balanceSub}>≈ ${availableUsdc.toFixed(2)} USDC</Text>
        <Text style={styles.balanceSub}>
          {wallet
            ? `In-App Wallet · ${wallet.slice(0, 4)}...${wallet.slice(-4)}`
            : "Wallet not connected"}
        </Text>
        <View style={styles.breakdownRow}>
          <Pill label={`Available ${availableSol.toFixed(4)} SOL`} tone="success" />
          <Pill label={`Locked ${lockedSol.toFixed(4)} SOL`} />
          <Pill label={`Pending ${pendingSol.toFixed(4)} SOL`} tone="warning" />
        </View>
        <Text style={styles.balanceSub}>
          ≈ Locked ${lockedUsdc.toFixed(2)} USDC • Pending ${pendingUsdc.toFixed(2)} USDC
        </Text>
        <Text style={styles.balanceSub}>
          Chain SOL {chainSol.toFixed(4)} • Committee adj {committeeDeltaSol >= 0 ? "+" : ""}
          {committeeDeltaSol.toFixed(4)} SOL
        </Text>
        <Text style={styles.balanceSub}>
          Committee history: Paid out ${paidOutUsdc.toFixed(2)} • Contributed ${contributedUsdc.toFixed(2)}
        </Text>
      </GlassCard>

      {!wallet ? (
        <GlassCard style={styles.bannerCard}>
          <Text style={styles.bannerText}>
            Connect a wallet to view full transaction history and make committee payments.
          </Text>
        </GlassCard>
      ) : null}
      {txQuery.isLoading ? (
        <GlassCard style={styles.bannerCard}>
          <Text style={styles.bannerText}>Loading wallet transactions...</Text>
        </GlassCard>
      ) : null}
      {txQuery.isError ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorText}>
            Could not fetch wallet transactions. Check network and retry.
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => txQuery.refetch()}>
            <Text style={styles.secondaryText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("WalletDeposit")}>
          <Text style={styles.primaryText}>Deposit</Text>
        </Pressable>
        {!wallet ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={async () => {
              try {
                setConnectError(null);
                await connectWeb3AuthWallet();
              } catch (error) {
                setConnectError(error instanceof Error ? error.message : "Unable to connect in-app wallet.");
              }
            }}
          >
            <Text style={styles.secondaryText}>Connect in-app wallet</Text>
          </Pressable>
        ) : (
          <View style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Wallet connected</Text>
          </View>
        )}
      </View>
      {connectError ? <Text style={styles.errorText}>{connectError}</Text> : null}

      <GlassCard style={styles.card}>
        <Text style={styles.cardLabel}>Recent Activity</Text>
        {txItems.length > 0 ? (
          txItems.map((tx) => (
            <TxRow key={tx.id} type={tx.type} amount={tx.amountLabel} date={tx.date} tone={tx.tone} />
          ))
        ) : (
          <Text style={styles.step}>No transactions found yet for this wallet.</Text>
        )}
      </GlassCard>
      <Pressable style={styles.secondaryBtn} onPress={() => nav.navigate("WalletHistory")}>
        <Text style={styles.secondaryText}>View full history</Text>
      </Pressable>
    </Layout>
  );
}

export function WalletDepositScreen() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isPollingDeposit, setIsPollingDeposit] = useState(false);
  const [pollMessage, setPollMessage] = useState<string | null>(null);
  const wallet = useAppStore((s) => s.wallet);
  const usdcBalance = useAppStore((s) => s.usdcBalance);
  const solBalanceLamports = useAppStore((s) => s.solBalanceLamports);
  const fullAddress = wallet ?? "";
  const qrValue = fullAddress ? `solana:${fullAddress}` : "";
  const baselineBalanceUsdc = usdcBalance / 1_000_000;
  const baselineBalanceSol = solBalanceLamports / 1_000_000_000;

  const checkForDeposit = async () => {
    if (!wallet) {
      setPollMessage("Connect wallet first to detect incoming USDC.");
      return;
    }
    setIsPollingDeposit(true);
    setPollMessage("Checking Solana chain for incoming SOL/USDC...");
    let found = false;
    let detectedAsset: "SOL" | "USDC" | null = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const updatedUsdc = useAppStore.getState().usdcBalance / 1_000_000;
        const updatedSol = useAppStore.getState().solBalanceLamports / 1_000_000_000;
        await queryClient.invalidateQueries({ queryKey: ["wallet-usdc", wallet] });
        await queryClient.invalidateQueries({ queryKey: ["wallet-sol", wallet] });
        await queryClient.refetchQueries({ queryKey: ["wallet-usdc", wallet], type: "active" });
        await queryClient.refetchQueries({ queryKey: ["wallet-sol", wallet], type: "active" });
        const latestSol = await fetchWalletSolBalance(wallet);
        const latestUsdc = useAppStore.getState().usdcBalance / 1_000_000;
        if (latestSol > Math.max(updatedSol, baselineBalanceSol) + 0.000001) {
          found = true;
          detectedAsset = "SOL";
          break;
        }
        if (latestUsdc > Math.max(updatedUsdc, baselineBalanceUsdc) + 0.000001) {
          found = true;
          detectedAsset = "USDC";
          break;
        }
      } catch {
        // retry after delay
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    setIsPollingDeposit(false);
    setPollMessage(
      found
        ? `${detectedAsset ?? "Asset"} deposit detected. Wallet balance updated.`
        : "No new SOL/USDC deposit detected yet. Try again in a moment."
    );
  };

  return (
    <Layout
      title="Deposit USDC"
      subtitle="Send SOL or USDC to this Solana address. We detect on-chain balance updates."
    >
      <GlassCard style={styles.qrCard}>
        <View style={styles.qrBox}>
          {fullAddress ? (
            <QRCode
              value={qrValue}
              size={126}
              color={colors.deepNavy}
              backgroundColor={colors.textPrimary}
            />
          ) : (
            <Text style={styles.step}>Connect wallet to show QR</Text>
          )}
        </View>
        <Text style={styles.address}>
          {wallet ? `${wallet.slice(0, 10)}...${wallet.slice(-8)}` : "No wallet connected"}
        </Text>
        <Pressable
          style={styles.secondaryBtn}
          disabled={!fullAddress}
          onPress={() => {
            if (!fullAddress) return;
            Clipboard.setString(fullAddress);
            setCopied(true);
          }}
        >
          <View style={styles.row}>
            <Copy color={colors.textPrimary} size={15} />
            <Text style={styles.secondaryText}>{copied ? "Copied" : "Copy Address"}</Text>
          </View>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardLabel}>Transfer instructions</Text>
        <Text style={styles.step}>1. Send SOL or USDC on Solana network to this address.</Text>
        <Text style={styles.step}>2. Paste the Rizq wallet address above as recipient.</Text>
        <Text style={styles.step}>3. Confirm transaction and return to app.</Text>
      </GlassCard>

      <Pressable style={[styles.primaryBtn, isPollingDeposit && { opacity: 0.7 }]} disabled={isPollingDeposit} onPress={checkForDeposit}>
        <Text style={styles.primaryText}>{isPollingDeposit ? "Checking..." : "I have sent it"}</Text>
      </Pressable>
      {pollMessage ? <Text style={styles.bannerText}>{pollMessage}</Text> : null}
    </Layout>
  );
}

export function WalletHistoryScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const wallet = useAppStore((s) => s.wallet);
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Contributions", "Payouts"];
  const txQuery = useQuery({
    queryKey: ["wallet-transactions", wallet],
    queryFn: () => fetchWalletTransactions(wallet as string),
    enabled: Boolean(wallet),
  });
  const rows = txQuery.data ? toWalletTx(txQuery.data) : [];
  const filtered = rows.filter((tx) => {
    if (filter === "All") return true;
    if (filter === "Contributions") return tx.type === "Contribution";
    if (filter === "Payouts") return tx.type === "Payout";
    return false;
  });
  return (
    <Layout
      title="Transaction History"
      subtitle="Filter by transaction type and open detailed proof."
    >
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {txQuery.isLoading ? (
        <GlassCard style={styles.bannerCard}>
          <Text style={styles.bannerText}>Loading transaction history...</Text>
        </GlassCard>
      ) : null}
      {txQuery.isError ? (
        <GlassCard style={styles.errorCard}>
          <Text style={styles.errorText}>Failed to load transaction history.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => txQuery.refetch()}>
            <Text style={styles.secondaryText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.card}>
        {filtered.length > 0 ? (
          filtered.map((tx) => (
            <Pressable key={tx.id} onPress={() => nav.navigate("WalletDetail", { tx })}>
              <TxRow
                type={`${tx.type} · ${tx.committeeName}`}
                amount={tx.amountLabel}
                date={tx.date}
                tone={tx.tone}
              />
            </Pressable>
          ))
        ) : (
          <Text style={styles.step}>No matching transactions.</Text>
        )}
      </GlassCard>
    </Layout>
  );
}

export function WalletDetailScreen() {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const tx = (route.params as { tx?: WalletTx } | undefined)?.tx;
  const explorerUrl = tx
    ? `https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`
    : null;
  return (
    <Layout
      title="Transaction Detail"
      subtitle="This is your on-chain proof of payment."
    >
      <GlassCard style={styles.card}>
        <Info label="Type" value={tx?.type ?? "N/A"} />
        <Info label="Committee" value={tx?.committeeName ?? "N/A"} />
        <Info label="Amount" value={tx ? `${tx.amountLabel} USDC` : "N/A"} />
        <Info label="Timestamp" value={tx?.date ?? "N/A"} />
        <Info label="Cycle" value={tx?.cycle != null ? String(tx.cycle) : "N/A"} />
        <Info
          label="Tx hash"
          value={tx ? `${tx.txSignature.slice(0, 8)}...${tx.txSignature.slice(-8)}` : "N/A"}
        />
      </GlassCard>
      <Pressable
        style={styles.secondaryBtn}
        onPress={() => {
          if (!explorerUrl) return;
          Linking.openURL(explorerUrl).catch(() => undefined);
        }}
      >
        <Text style={styles.secondaryText}>Open Solana Explorer</Text>
      </Pressable>
    </Layout>
  );
}

function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" }) {
  return (
    <Text
      style={[
        styles.pill,
        tone === "success" && styles.pillSuccess,
        tone === "warning" && styles.pillWarning,
      ]}
    >
      {label}
    </Text>
  );
}

function TxRow({
  type,
  amount,
  date,
  tone,
}: {
  type: string;
  amount: string;
  date: string;
  tone: "success" | "danger";
}) {
  return (
    <View style={styles.txRow}>
      <View>
        <Text style={styles.txType}>{type}</Text>
        <Text style={styles.txDate}>{date}</Text>
      </View>
      <Text style={[styles.txAmount, tone === "success" ? styles.txAmountSuccess : styles.txAmountDanger]}>
        {amount}
      </Text>
    </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  balanceCard: { padding: 14, gap: 7 },
  card: { padding: 14, gap: 8 },
  cardLabel: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  balanceValue: { color: colors.brandGreen, fontSize: 36, fontWeight: "900", lineHeight: 40 },
  balanceSub: { color: colors.textSecondary, fontSize: typography.caption },
  breakdownRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  pill: {
    color: colors.textPrimary,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    backgroundColor: "rgba(10,51,40,0.06)",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  pillSuccess: { color: colors.success, borderColor: "rgba(0,230,118,0.45)", backgroundColor: "rgba(0,230,118,0.12)" },
  pillWarning: { color: colors.warning, borderColor: "rgba(255,179,0,0.45)", backgroundColor: "rgba(255,179,0,0.12)" },
  actionRow: { flexDirection: "row", gap: 8 },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.textInverse, fontWeight: "700", fontSize: typography.bodySmall },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    backgroundColor: "rgba(10,51,40,0.04)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  txRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,51,40,0.1)",
    paddingVertical: 8,
  },
  txType: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  txDate: { color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 },
  txAmount: { fontSize: typography.bodySmall, fontWeight: "800" },
  txAmountSuccess: { color: colors.success },
  txAmountDanger: { color: colors.danger },
  errorText: { color: colors.danger, fontSize: typography.caption },
  bannerCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.18)",
    backgroundColor: "rgba(10,51,40,0.04)",
  },
  bannerText: { color: colors.textSecondary, fontSize: typography.caption },
  errorCard: {
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.35)",
    backgroundColor: "rgba(255,82,82,0.08)",
  },
  qrCard: { padding: 14, gap: 10, alignItems: "center" },
  qrBox: {
    width: 150,
    height: 150,
    borderRadius: 14,
    backgroundColor: "rgba(10,51,40,0.06)",
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  address: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
  step: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.2)",
    backgroundColor: "rgba(10,51,40,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipOn: { borderColor: "rgba(0,230,118,0.5)", backgroundColor: "rgba(0,230,118,0.14)" },
  filterText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  filterTextOn: { color: colors.brandGreen },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  infoLabel: { color: colors.textSecondary, fontSize: typography.bodySmall },
  infoValue: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700", flexShrink: 1, textAlign: "right" },
});
