import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { Crown, GearSix, IdentificationCard, ShieldCheck, UserCircle } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { persistAuthToken } from "../../hooks/useAuthSessionBootstrap";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const FLOATING_TAB_BAR_CLEARANCE = 108;

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

export function ProfileMainScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const displayName = useAppStore((s) => s.displayName);
  const username = useAppStore((s) => s.username);
  const wallet = useAppStore((s) => s.wallet);
  const kycStatus = useAppStore((s) => s.kycStatus);
  const language = useAppStore((s) => s.languagePreference);
  return (
    <Layout
      title="Profile"
      subtitle="Manage your account, identity, preferences, and Pro plan."
    >
      <GlassCard style={styles.profileCard}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <UserCircle color={colors.textPrimary} size={38} />
          </View>
          <View>
            <Text style={styles.name}>{displayName || "Rizq User"}</Text>
            <Text style={styles.handle}>{username ? `@${username}` : "@new-user"}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          Wallet: {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "Not connected"} •
          KYC: {kycStatus} • Language: {language}
        </Text>
      </GlassCard>

      <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("SettingsMain")}>
        <Text style={styles.primaryText}>Open Settings</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => nav.navigate("ProLanding")}>
        <Text style={styles.secondaryText}>Rizq Pro</Text>
      </Pressable>
    </Layout>
  );
}

export function SettingsMainScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const wallet = useAppStore((s) => s.wallet);
  const setWalletConnection = useAppStore((s) => s.setWalletConnection);
  const { connectWeb3AuthWallet, logoutWeb3AuthWallet } = useWeb3AuthWallet();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const clearSession = useAppStore((s) => s.clearSession);
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <Layout
      title="Settings"
      subtitle="Account, identity & safety, notifications, preferences, support, and legal."
    >
      <GlassCard style={styles.card}>
        <Section icon={<UserCircle color={colors.info} size={16} />} title="Account" body="Display name, username, profile photo, and account deletion controls." />
        <Section icon={<IdentificationCard color={colors.warning} size={16} />} title="Identity & Safety" body="KYC status, nominee details, wallet management, and security lock settings." />
        <Section icon={<GearSix color={colors.textSecondary} size={16} />} title="App Preferences" body="Language, currency display, theme, and AI coach language." />
      </GlassCard>

      <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("WalletMain")}>
        <Text style={styles.primaryText}>Open Wallet</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => nav.navigate("SettingsHub")}>
        <Text style={styles.secondaryText}>Open full settings screens</Text>
      </Pressable>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>Wallet Provider</Text>
        <Text style={styles.help}>
          {wallet
            ? `Connected: In-App Wallet (${wallet.slice(0, 4)}...${wallet.slice(-4)})`
            : "No wallet connected"}
        </Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={async () => {
              try {
                setSettingsError(null);
                await connectWeb3AuthWallet();
              } catch (error) {
                setSettingsError(error instanceof Error ? error.message : "Unable to connect in-app wallet.");
              }
            }}
          >
            <Text style={styles.secondaryText}>Use in-app wallet</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.dangerBtn}
          onPress={async () => {
            setSettingsError(null);
            await logoutWeb3AuthWallet().catch(() => undefined);
            setWalletConnection(null, null);
          }}
        >
          <Text style={styles.dangerText}>Disconnect Wallet</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Payment reminder notifications</Text>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
            thumbColor={notifEnabled ? colors.brandGreen : "#9aa8b6"}
          />
        </View>
        <Text style={styles.help}>Advance warning: 24h before due date</Text>
      </GlassCard>

      <Pressable
        style={styles.dangerBtn}
        onPress={() => {
          persistAuthToken(null)
            .then(() => {
              clearSession();
              nav.reset({ index: 0, routes: [{ name: "ProfileMain" }] });
            })
            .catch(() => {
              clearSession();
              nav.reset({ index: 0, routes: [{ name: "ProfileMain" }] });
            });
        }}
      >
        <Text style={styles.dangerText}>Logout</Text>
      </Pressable>
    </Layout>
  );
}

export function ProLandingScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const [annual, setAnnual] = useState(true);
  return (
    <Layout
      title="Rizq Pro"
      subtitle="Lower payout fee, higher limits, daily AI, and priority support."
    >
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <Crown color={colors.brandGold} size={18} />
          <Text style={styles.sectionTitle}>Plan comparison</Text>
        </View>
        <CompareRow feature="Payout fee" free="1.5%" pro="1.0%" />
        <CompareRow feature="Committee limit" free="2 active" pro="Unlimited" />
        <CompareRow feature="Max members" free="10" pro="50" />
        <CompareRow feature="AI access" free="Weekly only" pro="Full chat + daily insights" />
      </GlassCard>

      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggle, !annual && styles.toggleOn]} onPress={() => setAnnual(false)}>
          <Text style={[styles.toggleText, !annual && styles.toggleTextOn]}>Monthly</Text>
        </Pressable>
        <Pressable style={[styles.toggle, annual && styles.toggleOn]} onPress={() => setAnnual(true)}>
          <Text style={[styles.toggleText, annual && styles.toggleTextOn]}>Annual (save 25%)</Text>
        </Pressable>
      </View>

      <GlassCard style={styles.priceCard}>
        <Text style={styles.price}>{annual ? "$44.99/year" : "$4.99/month"}</Text>
        <Text style={styles.help}>Payable in USDC from your in-app wallet.</Text>
      </GlassCard>

      <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("ProPaymentConfirmed")}>
        <Text style={styles.primaryText}>Subscribe with USDC</Text>
      </Pressable>
    </Layout>
  );
}

export function ProPaymentConfirmedScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <Layout
      title="Rizq Pro Activated"
      subtitle="All Pro limits are unlocked instantly."
    >
      <GlassCard style={styles.successCard}>
        <ShieldCheck color={colors.success} size={18} />
        <Text style={styles.successTitle}>Payment confirmed</Text>
        <Text style={styles.help}>Receipt ID: RZQ-PRO-2026-0512 • Next renewal: 2027-05-12</Text>
      </GlassCard>

      <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("ProRenewal")}>
        <Text style={styles.primaryText}>Manage renewal</Text>
      </Pressable>
    </Layout>
  );
}

export function ProRenewalScreen() {
  const [autoRenew, setAutoRenew] = useState(true);
  const [cancelText, setCancelText] = useState("");
  return (
    <Layout
      title="Renewal & Cancellation"
      subtitle="Auto-renews from wallet balance. Cancel anytime before period ends."
    >
      <GlassCard style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Auto-renew Pro plan</Text>
          <Switch
            value={autoRenew}
            onValueChange={setAutoRenew}
            trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
            thumbColor={autoRenew ? colors.brandGreen : "#9aa8b6"}
          />
        </View>
        <Text style={styles.help}>7-day reminder before renewal. 7-day grace if balance is low.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>Cancel subscription</Text>
        <Text style={styles.help}>Type CANCEL to confirm. Pro stays active until billing end.</Text>
        <TextInput
          style={styles.input}
          value={cancelText}
          onChangeText={setCancelText}
          placeholder="Type CANCEL"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          style={[styles.dangerBtn, cancelText !== "CANCEL" && { opacity: 0.45 }]}
          disabled={cancelText !== "CANCEL"}
        >
          <Text style={styles.dangerText}>Cancel Pro</Text>
        </Pressable>
      </GlassCard>
    </Layout>
  );
}

function Section({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.row}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function CompareRow({
  feature,
  free,
  pro,
}: {
  feature: string;
  free: string;
  pro: string;
}) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareFeature}>{feature}</Text>
      <Text style={styles.compareCell}>{free}</Text>
      <Text style={[styles.compareCell, { color: colors.brandGreen }]}>{pro}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileCard: { padding: 14, gap: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  handle: { color: colors.textSecondary, fontSize: typography.caption },
  meta: { color: colors.textSecondary, fontSize: typography.bodySmall },
  primaryBtn: {
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
  },
  secondaryText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  card: { padding: 14, gap: 10 },
  sectionRow: { gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  sectionBody: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  switchText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600", flex: 1 },
  help: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 19 },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compareFeature: { flex: 1.2, color: colors.textSecondary, fontSize: typography.caption },
  compareCell: { flex: 1, color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggle: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOn: { borderColor: "rgba(0,230,118,0.5)", backgroundColor: "rgba(0,230,118,0.14)" },
  toggleText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  toggleTextOn: { color: colors.brandGreen },
  priceCard: { padding: 14, alignItems: "center", gap: 3 },
  price: { color: colors.brandGreen, fontSize: 34, fontWeight: "900" },
  successCard: {
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.12)",
  },
  successTitle: { color: colors.success, fontSize: typography.body, fontWeight: "800" },
  input: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  dangerBtn: {
    minHeight: 44,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.5)",
    backgroundColor: "rgba(255,82,82,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerText: { color: colors.danger, fontWeight: "700", fontSize: typography.bodySmall },
});
