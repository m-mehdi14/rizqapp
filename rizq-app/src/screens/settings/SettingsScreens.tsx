import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { useAppStore } from "../../store/useAppStore";
import { a11y, colors, radii, spacing, typography } from "../../theme/tokens";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { claimNomineeClaim, fetchNomineeClaims, fetchSessionNominee, fetchWelfareLedger, saveSessionNominee } from "../../api/rizqApi";

const FLOATING_TAB_BAR_CLEARANCE = 108;

function SettingsLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
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

function SettingsRow({
  label,
  helper,
  onPress,
  danger,
}: {
  label: string;
  helper?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
        {helper ? <Text style={styles.rowHelper}>{helper}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

export function SettingsProfileScreen() {
  const displayName = useAppStore((s) => s.displayName);
  const username = useAppStore((s) => s.username);
  const setProfileIdentity = useAppStore((s) => s.setProfileIdentity);
  const [name, setName] = useState(displayName);
  const [handle, setHandle] = useState(username);
  return (
    <SettingsLayout title="Profile" subtitle="Update public profile details shown to committee members.">
      <GlassCard style={styles.card}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Display name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={handle}
          onChangeText={setHandle}
          placeholder="@username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={styles.input}
        />
        <Pressable
          style={styles.primaryBtn}
          onPress={() => setProfileIdentity({ displayName: name.trim(), username: handle.trim().replace(/^@/, "") })}
        >
          <Text style={styles.primaryText}>Save profile</Text>
        </Pressable>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsKycStatusScreen() {
  const kycStatus = useAppStore((s) => s.kycStatus);
  return (
    <SettingsLayout title="KYC Status" subtitle="Identity verification is required for committee participation.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Current status: {kycStatus}</Text>
        <Text style={styles.rowHelper}>If your status is pending, checks may take 1-2 hours.</Text>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsNomineeScreen() {
  const authToken = useAppStore((s) => s.authToken);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [relation, setRelation] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useQuery({
    queryKey: ["session-nominee", authToken],
    enabled: Boolean(authToken),
    queryFn: async () => {
      const nominee = await fetchSessionNominee({ token: authToken as string });
      if (!nominee) return null;
      setName(nominee.full_name);
      setPhone(nominee.phone_number);
      setCnic(nominee.cnic_number);
      setRelation(nominee.relationship);
      return nominee;
    },
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("Please sign in first");
      if (!name.trim() || !phone.trim() || !cnic.trim() || !relation.trim()) {
        throw new Error("Please complete all nominee fields");
      }
      return await saveSessionNominee({
        token: authToken,
        fullName: name.trim(),
        phoneNumber: phone.trim(),
        cnicNumber: cnic.trim(),
        relationship: relation.trim(),
      });
    },
    onSuccess: () => {
      setStatus("Nominee saved");
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Failed to save nominee");
    },
  });
  return (
    <SettingsLayout title="Nominee" subtitle="Your nominee can claim funds in edge-case scenarios.">
      <GlassCard style={styles.card}>
        <TextInput value={name} onChangeText={setName} placeholder="Nominee full name" placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="+92..." placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={cnic} onChangeText={setCnic} placeholder="CNIC number" placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={relation} onChangeText={setRelation} placeholder="Relationship" placeholderTextColor={colors.textMuted} style={styles.input} />
        {status ? <Text style={styles.rowHelper}>{status}</Text> : null}
        <Pressable style={styles.primaryBtn} onPress={() => saveMutation.mutate()}>
          <Text style={styles.primaryText}>Save nominee</Text>
        </Pressable>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsWalletManagementScreen() {
  const wallet = useAppStore((s) => s.wallet);
  return (
    <SettingsLayout title="Wallet Management" subtitle="Manage your in-app wallet connection and copy your address.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>
          {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-6)}` : "No wallet connected"}
        </Text>
        <Text style={styles.rowHelper}>For security, private keys never leave your device.</Text>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsNotificationsScreen() {
  const [paymentReminder, setPaymentReminder] = useState(true);
  const [announcements, setAnnouncements] = useState(true);
  const { devicePushToken, saveDevicePushToken } = usePushNotifications();
  const [tokenInput, setTokenInput] = useState(devicePushToken ?? "");
  return (
    <SettingsLayout title="Notifications" subtitle="Choose what updates you receive from committees and Rizq AI.">
      <GlassCard style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Payment reminders</Text>
          <Switch value={paymentReminder} onValueChange={setPaymentReminder} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Committee announcements</Text>
          <Switch value={announcements} onValueChange={setAnnouncements} />
        </View>
        <TextInput
          value={tokenInput}
          onChangeText={setTokenInput}
          placeholder="Device push token"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          style={styles.input}
        />
        <Pressable style={styles.primaryBtn} onPress={() => saveDevicePushToken(tokenInput)}>
          <Text style={styles.primaryText}>Save push token</Text>
        </Pressable>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsPreferencesScreen() {
  const language = useAppStore((s) => s.languagePreference);
  const setLanguagePreference = useAppStore((s) => s.setLanguagePreference);
  const choices = useMemo(() => ["english", "urdu", "both"] as const, []);
  return (
    <SettingsLayout title="Preferences" subtitle="Set language and display preferences for app content.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowHelper}>Language</Text>
        <View style={styles.choiceRow}>
          {choices.map((choice) => (
            <Pressable
              key={choice}
              onPress={() => setLanguagePreference(choice)}
              style={[styles.choice, language === choice && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, language === choice && styles.choiceTextOn]}>{choice}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsSecurityScreen() {
  const [biometricLock, setBiometricLock] = useState(false);
  return (
    <SettingsLayout title="Security" subtitle="Protect access to your account and sensitive wallet actions.">
      <GlassCard style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.rowLabel}>Biometric lock for app open</Text>
          <Switch value={biometricLock} onValueChange={setBiometricLock} />
        </View>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsCommunityScreen() {
  const [source, setSource] = useState<"all" | "nominee_expired" | "penalty" | "deceased_fallback">("all");
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const now = Date.now();
  const fromIso = new Date(now - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(now).toISOString();
  const ledgerQuery = useQuery({
    queryKey: ["welfare-ledger", source, rangeDays],
    queryFn: async () => await fetchWelfareLedger({ source, limit: 100, fromIso, toIso }),
    staleTime: 20_000,
    onSuccess: () => setLastSyncedAt(new Date().toLocaleTimeString()),
  });
  const totalUsdc = (ledgerQuery.data?.totals.total_amount_micro_usdc ?? 0) / 1_000_000;
  const grouped = ledgerQuery.data?.grouped_by_committee ?? [];

  const onShareSnapshot = async () => {
    const lines = [
      "Rizq Welfare Ledger Snapshot",
      `Range: last ${rangeDays} days`,
      `Source: ${source}`,
      `Total inflow: $${totalUsdc.toFixed(2)} USDC`,
      `Transfers: ${ledgerQuery.data?.totals.transfer_count ?? 0}`,
      "",
      "Top committees:",
      ...grouped.slice(0, 8).map((row) => `- ${row.committee_name}: $${(row.total_amount_micro_usdc / 1_000_000).toFixed(2)} (${row.transfer_count})`),
    ];
    await Share.share({ title: "Welfare Snapshot", message: lines.join("\n") });
  };

  return (
    <SettingsLayout title="Community" subtitle="Transparency around the welfare pool and community support.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Welfare pool visibility</Text>
        <Text style={styles.rowHelper}>Every transfer can be audited via on-chain transaction history.</Text>
        <View style={styles.choiceRow}>
          {[
            { key: "all", label: "All" },
            { key: "nominee_expired", label: "Nominee expiry" },
            { key: "penalty", label: "Penalty" },
            { key: "deceased_fallback", label: "No nominee fallback" },
          ].map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSource(item.key as typeof source)}
              style={[styles.choice, source === item.key && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, source === item.key && styles.choiceTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.choiceRow}>
          {[7, 30, 90].map((days) => (
            <Pressable
              key={`range-${days}`}
              onPress={() => setRangeDays(days as 7 | 30 | 90)}
              style={[styles.choice, rangeDays === days && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, rangeDays === days && styles.choiceTextOn]}>{`${days}d`}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Ledger snapshot</Text>
        <Text style={styles.rowHelper}>{`Total: $${totalUsdc.toFixed(2)} USDC · ${ledgerQuery.data?.totals.transfer_count ?? 0} transfers`}</Text>
        <Text style={styles.rowHelper}>{lastSyncedAt ? `Last synced: ${lastSyncedAt}` : "Not synced yet"}</Text>
        <Pressable style={styles.primaryBtn} onPress={onShareSnapshot}>
          <Text style={styles.primaryText}>Share snapshot</Text>
        </Pressable>
      </GlassCard>
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Committee grouping</Text>
        {ledgerQuery.isLoading ? (
          <View style={styles.skeletonWrap}>
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
          </View>
        ) : null}
        {(grouped ?? []).slice(0, 8).map((row) => (
          <View key={row.committee_id} style={styles.ledgerRow}>
            <Text style={styles.rowLabel}>{row.committee_name}</Text>
            <Text style={styles.rowHelper}>
              {`$${(row.total_amount_micro_usdc / 1_000_000).toFixed(2)} USDC · ${row.transfer_count} transfers`}
            </Text>
          </View>
        ))}
      </GlassCard>
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Ledger entries</Text>
        <Text style={styles.rowHelper}>
          {ledgerQuery.isLoading
            ? "Loading transfers..."
            : `Showing ${ledgerQuery.data?.entries.length ?? 0} entries with proof links.`}
        </Text>
        {(ledgerQuery.data?.entries ?? []).map((entry) => (
          <View key={entry.id} style={styles.ledgerRow}>
            <Text style={styles.rowLabel}>{entry.committee_name}</Text>
            <Text style={styles.rowHelper}>
              ${(entry.amount_micro_usdc / 1_000_000).toFixed(2)} USDC · {entry.reason}
            </Text>
            <Text style={styles.rowHelper}>{new Date(entry.created_at).toLocaleString()}</Text>
            <Pressable onPress={() => Linking.openURL(entry.proof_url).catch(() => undefined)}>
              <Text style={styles.ledgerLink}>Open on-chain proof</Text>
            </Pressable>
          </View>
        ))}
        {!ledgerQuery.isLoading && (ledgerQuery.data?.entries.length ?? 0) === 0 ? (
          <Text style={styles.rowHelper}>No welfare entries yet for this filter.</Text>
        ) : null}
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsNomineeClaimsScreen() {
  const [status, setStatus] = useState<"pending" | "claimed" | "expired">("pending");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const claimsQuery = useQuery({
    queryKey: ["nominee-claims", status],
    queryFn: async () => await fetchNomineeClaims({ status }),
    staleTime: 20_000,
    onSuccess: () => setLastSyncedAt(new Date().toLocaleTimeString()),
  });
  const claimMutation = useMutation({
    mutationFn: async (claimId: string) =>
      await claimNomineeClaim({
        claimId,
        txSignature: `wallet-proof-nominee-claim-${Date.now()}`,
      }),
    onSuccess: () => {
      claimsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert("Claim failed", error instanceof Error ? error.message : "Unable to submit claim");
    },
  });

  return (
    <SettingsLayout title="Nominee Claims" subtitle="Track pending, claimed, and expired nominee windows.">
      <GlassCard style={styles.card}>
        <View style={styles.choiceRow}>
          {(["pending", "claimed", "expired"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setStatus(item)}
              style={[styles.choice, status === item && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, status === item && styles.choiceTextOn]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.rowHelper}>{lastSyncedAt ? `Last synced: ${lastSyncedAt}` : "Not synced yet"}</Text>
      </GlassCard>
      <GlassCard style={styles.card}>
        {claimsQuery.isLoading ? (
          <View style={styles.skeletonWrap}>
            <View style={styles.skeletonRow} />
            <View style={styles.skeletonRow} />
          </View>
        ) : null}
        {(claimsQuery.data ?? []).map((claim) => {
          const amount = claim.amount_micro_usdc / 1_000_000;
          const msRemaining = claim.expires_at ? new Date(claim.expires_at).getTime() - Date.now() : 0;
          const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
          return (
            <View key={claim.id} style={styles.ledgerRow}>
              <Text style={styles.rowLabel}>{claim.nominee_name ?? "Nominee claim"}</Text>
              <Text style={styles.rowHelper}>{`$${amount.toFixed(2)} USDC · ${claim.status.toUpperCase()}`}</Text>
              <Text style={styles.rowHelper}>
                {claim.status === "pending" ? `${daysRemaining} day(s) left` : `Updated ${new Date(claim.notified_at).toLocaleDateString()}`}
              </Text>
              {claim.tx_signature ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://explorer.solana.com/tx/${encodeURIComponent(claim.tx_signature as string)}?cluster=devnet`
                    ).catch(() => undefined)
                  }
                >
                  <Text style={styles.ledgerLink}>Open proof</Text>
                </Pressable>
              ) : null}
              {claim.status === "pending" ? (
                <Pressable
                  style={[styles.primaryBtn, claimMutation.isPending && { opacity: 0.5 }]}
                  disabled={claimMutation.isPending}
                  onPress={() => claimMutation.mutate(claim.id)}
                >
                  <Text style={styles.primaryText}>Mark claimed</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {!claimsQuery.isLoading && (claimsQuery.data?.length ?? 0) === 0 ? (
          <Text style={styles.rowHelper}>No claims found for selected status.</Text>
        ) : null}
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsSupportScreen() {
  const [message, setMessage] = useState("");
  return (
    <SettingsLayout title="Support" subtitle="Need help? Send a message to support.">
      <GlassCard style={styles.card}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { minHeight: 90 }]}
          multiline
        />
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Send request</Text>
        </Pressable>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsAboutScreen() {
  return (
    <SettingsLayout title="About & Legal" subtitle="Version, legal terms, and policy information.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Rizq App</Text>
        <Text style={styles.rowHelper}>Digital committee app on Solana devnet.</Text>
      </GlassCard>
    </SettingsLayout>
  );
}

export function SettingsHubScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <SettingsLayout title="Settings" subtitle="Account, safety, wallet, app preferences, and support.">
      <GlassCard style={styles.card}>
        <SettingsRow label="Profile" onPress={() => nav.navigate("SettingsProfile")} />
        <SettingsRow label="KYC Status" onPress={() => nav.navigate("SettingsKycStatus")} />
        <SettingsRow label="Nominee" onPress={() => nav.navigate("SettingsNominee")} />
        <SettingsRow label="Wallet Management" onPress={() => nav.navigate("SettingsWalletManagement")} />
        <SettingsRow label="Notifications" onPress={() => nav.navigate("SettingsNotifications")} />
        <SettingsRow label="Preferences" onPress={() => nav.navigate("SettingsPreferences")} />
        <SettingsRow label="Security" onPress={() => nav.navigate("SettingsSecurity")} />
        <SettingsRow label="Community" onPress={() => nav.navigate("SettingsCommunity")} />
        <SettingsRow label="Nominee Claims" onPress={() => nav.navigate("SettingsNomineeClaims")} />
        <SettingsRow label="Support" onPress={() => nav.navigate("SettingsSupport")} />
        <SettingsRow label="About & Legal" onPress={() => nav.navigate("SettingsAbout")} />
      </GlassCard>
    </SettingsLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall },
  card: { padding: 14, gap: 10 },
  row: {
    minHeight: a11y.minTapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,51,40,0.1)",
  },
  rowLabel: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  rowHelper: { color: colors.textSecondary, fontSize: typography.caption },
  rowChevron: { color: colors.textSecondary, fontSize: 22, lineHeight: 22 },
  rowDanger: { color: colors.danger },
  input: {
    minHeight: a11y.minTapTarget,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: a11y.highContrastBorder,
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  primaryBtn: {
    minHeight: a11y.minTapTarget,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.textInverse, fontSize: typography.bodySmall, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  choiceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  choice: {
    minWidth: 110,
    minHeight: a11y.minTapTarget,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: a11y.highContrastBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceOn: { borderColor: "rgba(29,158,117,0.55)", backgroundColor: "rgba(29,158,117,0.14)" },
  choiceText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  choiceTextOn: { color: colors.brandGreen },
  ledgerRow: {
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.14)",
    borderRadius: radii.input,
    backgroundColor: "rgba(10,51,40,0.03)",
    padding: 10,
    gap: 4,
  },
  ledgerLink: {
    color: colors.brandGreen,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  skeletonWrap: { gap: 8 },
  skeletonRow: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(10,51,40,0.08)",
  },
});
