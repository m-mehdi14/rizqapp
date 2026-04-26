import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { usePushNotifications } from "../../hooks/usePushNotifications";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  return (
    <SettingsLayout title="Nominee" subtitle="Your nominee can claim funds in edge-case scenarios.">
      <GlassCard style={styles.card}>
        <TextInput value={name} onChangeText={setName} placeholder="Nominee full name" placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="+92..." placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={relation} onChangeText={setRelation} placeholder="Relationship" placeholderTextColor={colors.textMuted} style={styles.input} />
        <Pressable style={styles.primaryBtn}>
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
  return (
    <SettingsLayout title="Community" subtitle="Transparency around the welfare pool and community support.">
      <GlassCard style={styles.card}>
        <Text style={styles.rowLabel}>Welfare pool visibility</Text>
        <Text style={styles.rowHelper}>Every transfer can be audited via on-chain transaction history.</Text>
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
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowLabel: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "700" },
  rowHelper: { color: colors.textSecondary, fontSize: typography.caption },
  rowChevron: { color: colors.textSecondary, fontSize: 22, lineHeight: 22 },
  rowDanger: { color: colors.danger },
  input: {
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.textInverse, fontSize: typography.bodySmall, fontWeight: "700" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceOn: { borderColor: "rgba(0,230,118,0.55)", backgroundColor: "rgba(0,230,118,0.14)" },
  choiceText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "700" },
  choiceTextOn: { color: colors.brandGreen },
});
