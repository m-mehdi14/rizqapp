import React, { useMemo, useState } from "react";
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, ParamListBase, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Clipboard from "@react-native-clipboard/clipboard";
import { Copy, QrCode, Wallet } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { fetchWalletTransactions, type WalletTransactionRow } from "../../api/rizqApi";
import { usePhantomWallet } from "../../hooks/usePhantomWallet";
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
      tone: isContribution ? "danger" : "success",
      txSignature: tx.tx_signature,
      cycle: tx.cycle_number,
    };
  });
  mapped.sort((a, b) => b.date.localeCompare(a.date));
  return mapped;
}

export function WalletMainScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const usdcBalance = useAppStore((s) => s.usdcBalance);
  const committees = useAppStore((s) => s.committees);
  const { connect } = usePhantomWallet();
  const { connectWeb3AuthWallet } = useWeb3AuthWallet();
  const [connectError, setConnectError] = useState<string | null>(null);
  const txQuery = useQuery({
    queryKey: ["wallet-transactions", wallet],
    queryFn: () => fetchWalletTransactions(wallet as string),
    enabled: Boolean(wallet),
  });

  const allTx = useMemo(() => (txQuery.data ? toWalletTx(txQuery.data) : []), [txQuery.data]);
  const txItems = allTx.slice(0, 2);
  const availableUsdc = Math.max(0, usdcBalance / 1_000_000);
  const lockedUsdc =
    committees.reduce(
      (sum, committee) => sum + Math.max(0, committee.contributionLamports ?? 0) / 1_000_000,
      0
    ) || 0;
  const pendingUsdc = Math.max(0, lockedUsdc - availableUsdc);
  const paidOutUsdc = allTx
    .filter((tx) => tx.type === "Payout")
    .reduce((sum, tx) => sum + tx.amountMicroUsdc / 1_000_000, 0);
  const contributedUsdc = allTx
    .filter((tx) => tx.type === "Contribution")
    .reduce((sum, tx) => sum + tx.amountMicroUsdc / 1_000_000, 0);

  return (
    <Layout
      title="Wallet"
      subtitle="Track available, locked, and pending USDC with on-chain history."
    >
      <GlassCard style={styles.balanceCard}>
        <View style={styles.row}>
          <Wallet color={colors.brandGreen} size={18} />
          <Text style={styles.cardLabel}>Total Balance</Text>
        </View>
        <Text style={styles.balanceValue}>${availableUsdc.toFixed(2)} USDC</Text>
        <Text style={styles.balanceSub}>
          {wallet
            ? `${walletProvider === "embedded" ? "Web3Auth In-App" : "Phantom"} · ${wallet.slice(0, 4)}...${wallet.slice(-4)}`
            : "Wallet not connected"}
        </Text>
        <View style={styles.breakdownRow}>
          <Pill label={`Available $${availableUsdc.toFixed(2)}`} tone="success" />
          <Pill label={`Locked $${lockedUsdc.toFixed(2)}`} />
          <Pill label={`Pending $${pendingUsdc.toFixed(2)}`} tone="warning" />
        </View>
        <Text style={styles.balanceSub}>
          Paid out ${paidOutUsdc.toFixed(2)} • Contributed ${contributedUsdc.toFixed(2)}
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
        <Pressable
          style={styles.secondaryBtn}
          onPress={async () => {
            try {
              setConnectError(null);
              await connect();
            } catch (error) {
              setConnectError(error instanceof Error ? error.message : "Unable to connect Phantom.");
            }
          }}
        >
          <Text style={styles.secondaryText}>Connect Phantom</Text>
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={async () => {
            try {
              setConnectError(null);
              await connectWeb3AuthWallet();
            } catch (error) {
              setConnectError(error instanceof Error ? error.message : "Unable to connect Web3Auth.");
            }
          }}
        >
          <Text style={styles.secondaryText}>Connect Web3Auth</Text>
        </Pressable>
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
  const [copied, setCopied] = useState(false);
  const wallet = useAppStore((s) => s.wallet);
  const fullAddress = wallet ?? "";
  return (
    <Layout
      title="Deposit USDC"
      subtitle="Send USDC to this Solana address. Balance refreshes after webhook sync."
    >
      <GlassCard style={styles.qrCard}>
        <View style={styles.qrBox}>
          <QrCode color={colors.textPrimary} size={72} />
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
        <Text style={styles.cardLabel}>Exchange instructions</Text>
        <Text style={styles.step}>1. Withdraw USDC (Solana network) from Binance/OKX/Kraken.</Text>
        <Text style={styles.step}>2. Paste the Rizq wallet address above as recipient.</Text>
        <Text style={styles.step}>3. Confirm transaction and return to app.</Text>
      </GlassCard>

      <Pressable style={styles.primaryBtn}>
        <Text style={styles.primaryText}>I have sent it</Text>
      </Pressable>
    </Layout>
  );
}

export function WalletHistoryScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const wallet = useAppStore((s) => s.wallet);
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Contributions", "Payouts"];
  const txQuery = useQuery({
    queryKey: ["wallet-history", wallet],
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
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
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
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
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
    borderBottomColor: "rgba(255,255,255,0.06)",
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
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  address: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
  step: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
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
