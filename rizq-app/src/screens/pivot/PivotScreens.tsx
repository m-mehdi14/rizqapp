import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import {
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Coins,
  CreditCard,
  Crown,
  GearSix,
  HourglassMedium,
  House,
  IdentificationCard,
  ListChecks,
  Plus,
  ShieldCheck,
  UserCircle,
  UsersThree,
  Wallet,
  WarningCircle,
} from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { SectionHeader } from "../../components/SectionHeader";
import { ScreenShell } from "../../components/ScreenShell";
import { t } from "../../i18n/strings";
import { useAppStore } from "../../store/useAppStore";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { usePhantomWallet } from "../../hooks/usePhantomWallet";
import { useWeb3AuthWallet } from "../../hooks/useWeb3AuthWallet";
import {
  authLogin,
  authRegister,
  markOnboardingComplete,
  saveSessionNominee,
  updateSessionProfile,
  updateSessionKycStatus,
} from "../../api/rizqApi";
import { persistAuthToken } from "../../hooks/useAuthSessionBootstrap";

function useAppNav() {
  return useNavigation<NavigationProp<ParamListBase>>();
}

function useDefaultCommitteeParams() {
  const committees = useAppStore((s) => s.committees);
  const committeeId = committees[0]?.id;
  return committeeId ? { committeeId } : undefined;
}

function Page({
  code,
  title,
  subtitle,
  children,
  variant = "default",
}: {
  code: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  variant?: "default" | "ai" | "celebration";
}) {
  return (
    <ScreenShell variant={variant}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.pageHeaderRow}>
          <Text style={styles.code}>{code}</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Rizq</Text>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </ScrollView>
    </ScreenShell>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryBtn} onPress={onPress}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.secondaryBtn} onPress={onPress}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function Input({ placeholder }: { placeholder: string }) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={styles.input}
    />
  );
}

function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, idx) => {
        const active = idx <= current;
        return <View key={idx} style={[styles.progressDot, active && styles.progressDotOn]} />;
      })}
    </View>
  );
}

function Pill({
  icon,
  label,
  tone = "neutral",
}: {
  icon?: React.ReactNode;
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "success" && styles.pillSuccess,
        tone === "warning" && styles.pillWarning,
        tone === "danger" && styles.pillDanger,
      ]}
    >
      {icon}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <GlassCard style={styles.sectionCard}>
      <View style={styles.sectionRow}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </GlassCard>
  );
}

export const tabIcons = {
  home: House,
  committees: UsersThree,
  ai: ChatCircleText,
  wallet: Wallet,
  profile: UserCircle,
  plus: Plus,
};

// 01-12 Onboarding
export function Onboarding01SplashScreen() {
  const nav = useAppNav();
  const language = useAppStore((s) => s.languagePreference);
  const copy = t(language);
  return (
    <Page code="01" title={copy.appTitle} subtitle={copy.appTagline}>
      <GlassCard style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Shariah-compliant digital committee</Text>
        <Text style={styles.heroBody}>
          Save together with fixed rules, transparent payout order, and escrowed USDC.
        </Text>
      </GlassCard>
      <ProgressDots total={12} current={0} />
      <PrimaryButton label="Start onboarding" onPress={() => nav.navigate("Onboarding02")} />
    </Page>
  );
}

export function Onboarding02WelcomeScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="02"
      title="Welcome to Rizq"
      subtitle="A digital, trustless kameti where every rule is visible before you join."
    >
      <GlassCard style={styles.heroCard}>
        <Text style={styles.heroBody}>
          No hidden terms. Everyone sees the contribution amount, cycle timing, and payout sequence upfront.
        </Text>
      </GlassCard>
      <ProgressDots total={12} current={1} />
      <PrimaryButton label="Next" onPress={() => nav.navigate("Onboarding03")} />
    </Page>
  );
}

export function Onboarding03CommitteeScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="03"
      title="How the committee works"
      subtitle="Members contribute on schedule and one member receives full payout per cycle."
    >
      <GlassCard style={styles.heroCard}>
        <View style={styles.row}>
          <Pill label="10 members" />
          <Pill label="$25 / month" />
          <Pill label="10 cycles" />
        </View>
        <Text style={styles.heroBody}>
          Every cycle, one member receives the pooled payout while everyone else keeps contributing.
        </Text>
      </GlassCard>
      <ProgressDots total={12} current={2} />
      <PrimaryButton label="Next" onPress={() => nav.navigate("Onboarding04")} />
    </Page>
  );
}

export function Onboarding04SafetyScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="04"
      title="Safety first"
      subtitle="Nominee flow and welfare pool cover real-life edge cases transparently."
    >
      <GlassCard style={styles.heroCard}>
        <SectionHeader title="Safety Net" />
        <Text style={styles.heroBody}>
          Deceased-member handling, nominee claim windows, and welfare transfer are all traceable on-chain.
        </Text>
      </GlassCard>
      <ProgressDots total={12} current={3} />
      <PrimaryButton label="Continue" onPress={() => nav.navigate("OnboardingAuth")} />
    </Page>
  );
}

export function OnboardingAuthScreen() {
  const nav = useAppNav();
  const setAuthSession = useAppStore((s) => s.setAuthSession);
  const setProfileIdentity = useAppStore((s) => s.setProfileIdentity);
  const setKycStatus = useAppStore((s) => s.setKycStatus);
  const setHasCompletedOnboarding = useAppStore((s) => s.setHasCompletedOnboarding);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim()) {
        throw new Error("Email and password are required");
      }
      if (mode === "register") {
        if (!name.trim()) throw new Error("Name is required");
        return await authRegister({
          name: name.trim(),
          email: email.trim(),
          password: password,
        });
      }
      return await authLogin({
        email: email.trim(),
        password: password,
      });
    },
    onSuccess: async ({ token, user }) => {
      setErrorMessage(null);
      setAuthSession({
        token,
        email: user.email,
        userId: user.id,
      });
      setProfileIdentity({
        displayName: user.display_name ?? undefined,
        username: user.username ?? undefined,
      });
      setKycStatus(user.kyc_status === "verified" ? "verified" : "unverified");
      setHasCompletedOnboarding(Boolean(user.onboarding_completed));
      await persistAuthToken(token);
      if (user.onboarding_completed) {
        return;
      }
      nav.navigate("Onboarding05");
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Authentication failed");
    },
  });

  return (
    <Page
      code="AUTH"
      title={mode === "register" ? "Create your account" : "Welcome back"}
      subtitle="Use email + password to continue. This creates a real authenticated session."
    >
      {mode === "register" ? (
        <TextInput
          placeholder="Full name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      ) : null}
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password (min 8 chars)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton
        label={authMutation.isPending ? "Please wait..." : mode === "register" ? "Register" : "Login"}
        onPress={() => authMutation.mutate()}
      />
      <SecondaryButton
        label={mode === "register" ? "Already have an account? Login" : "New here? Register"}
        onPress={() => {
          setErrorMessage(null);
          setMode(mode === "register" ? "login" : "register");
        }}
      />
    </Page>
  );
}

export function Onboarding05PhoneScreen() {
  const nav = useAppNav();
  const authToken = useAppStore((s) => s.authToken);
  const setPhoneVerificationSkipped = useAppStore((s) => s.setPhoneVerificationSkipped);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const phoneSaveMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("Session missing. Please login again.");
      if (!phoneNumber.trim()) throw new Error("Phone number is required or tap skip.");
      await updateSessionProfile({
        token: authToken,
        phoneNumber: phoneNumber.trim(),
      });
    },
    onSuccess: () => {
      setErrorMessage(null);
      setPhoneVerificationSkipped(false);
      nav.navigate("Onboarding06");
    },
    onError: (error) =>
      setErrorMessage(error instanceof Error ? error.message : "Failed to save phone number"),
  });
  return (
    <Page
      code="05"
      title="Enter phone number"
      subtitle="Pakistan number format with +92 default is used for OTP and alerts."
    >
      <ProgressDots total={12} current={4} />
      <TextInput
        placeholder="+92 3XX XXXXXXX"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton
        label={phoneSaveMutation.isPending ? "Saving..." : "Continue"}
        onPress={() => phoneSaveMutation.mutate()}
      />
      <SecondaryButton
        label="Skip verification for now"
        onPress={() => {
          setPhoneVerificationSkipped(true);
          setErrorMessage(null);
          nav.navigate("Onboarding07");
        }}
      />
    </Page>
  );
}

export function Onboarding06OtpScreen() {
  const nav = useAppNav();
  const phoneVerificationSkipped = useAppStore((s) => s.phoneVerificationSkipped);
  const setPhoneVerificationSkipped = useAppStore((s) => s.setPhoneVerificationSkipped);
  useEffect(() => {
    if (phoneVerificationSkipped) {
      nav.navigate("Onboarding07");
    }
  }, [nav, phoneVerificationSkipped]);
  return (
    <Page code="06" title="Verify OTP" subtitle="Enter your 6-digit code to continue.">
      <ProgressDots total={12} current={5} />
      <Input placeholder="123456" />
      <Pill label="Resend available in 00:60" tone="warning" />
      <PrimaryButton
        label="Verify OTP"
        onPress={() => {
          setPhoneVerificationSkipped(false);
          nav.navigate("Onboarding07");
        }}
      />
      <SecondaryButton
        label="Skip OTP for now"
        onPress={() => {
          setPhoneVerificationSkipped(true);
          nav.navigate("Onboarding07");
        }}
      />
    </Page>
  );
}

export function Onboarding07KycScreen() {
  const nav = useAppNav();
  const authToken = useAppStore((s) => s.authToken);
  const setKycStatus = useAppStore((s) => s.setKycStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const updateKycMutation = useMutation({
    mutationFn: async (status: "pending" | "unverified") => {
      if (!authToken) throw new Error("Session missing. Please login again.");
      await updateSessionKycStatus({ token: authToken, kycStatus: status });
      return status;
    },
    onSuccess: (status) => {
      setErrorMessage(null);
      setKycStatus(status === "pending" ? "pending" : "unverified");
      nav.navigate(status === "pending" ? "Onboarding08" : "Onboarding09");
    },
    onError: (error) =>
      setErrorMessage(error instanceof Error ? error.message : "Failed to save KYC status"),
  });
  return (
    <Page
      code="07"
      title="KYC verification"
      subtitle="Full legal profile, CNIC docs, and liveness are required."
    >
      <ProgressDots total={12} current={6} />
      <Input placeholder="Full legal name" />
      <Input placeholder="CNIC (XXXXX-XXXXXXX-X)" />
      <SecondaryButton label="Upload CNIC front" />
      <SecondaryButton label="Upload CNIC back" />
      <SecondaryButton label="Selfie liveness check" />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton
        label={updateKycMutation.isPending ? "Saving..." : "Submit KYC"}
        onPress={() => updateKycMutation.mutate("pending")}
      />
      <SecondaryButton
        label="Skip KYC for now"
        onPress={() => {
          setErrorMessage(null);
          setKycStatus("unverified");
          nav.navigate("Onboarding09");
          if (authToken) {
            updateSessionKycStatus({ token: authToken, kycStatus: "unverified" }).catch(
              () => undefined
            );
          }
        }}
      />
    </Page>
  );
}

export function Onboarding08KycPendingScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="08"
      title="KYC pending"
      subtitle="You can continue exploring while verification is in progress."
    >
      <ProgressDots total={12} current={7} />
      <GlassCard style={styles.heroCard}>
        <Text style={styles.heroBody}>
          Committee actions stay locked until verification is complete. You can still browse the app.
        </Text>
      </GlassCard>
      <PrimaryButton label="Continue" onPress={() => nav.navigate("Onboarding09")} />
    </Page>
  );
}

export function Onboarding09NomineeScreen() {
  const nav = useAppNav();
  const authToken = useAppStore((s) => s.authToken);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveNomineeMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("Session missing. Please login again.");
      if (!fullName.trim() || !phoneNumber.trim() || !cnicNumber.trim() || !relationship.trim()) {
        throw new Error("Fill all nominee fields or use Skip for now.");
      }
      await saveSessionNominee({
        token: authToken,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        cnicNumber: cnicNumber.trim(),
        relationship: relationship.trim(),
      });
    },
    onSuccess: () => {
      setErrorMessage(null);
      nav.navigate("Onboarding10");
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save nominee");
    },
  });
  return (
    <Page
      code="09"
      title="Add nominee details"
      subtitle="Nominee flow protects member funds if the primary user cannot claim."
    >
      <ProgressDots total={12} current={8} />
      <TextInput
        placeholder="Nominee full name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        placeholder="Nominee phone"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TextInput
        placeholder="Nominee CNIC"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={cnicNumber}
        onChangeText={setCnicNumber}
      />
      <TextInput
        placeholder="Relationship"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={relationship}
        onChangeText={setRelationship}
      />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton
        label={saveNomineeMutation.isPending ? "Saving..." : "Save & Continue"}
        onPress={() => saveNomineeMutation.mutate()}
      />
      <SecondaryButton label="Skip for now" onPress={() => nav.navigate("Onboarding10")} />
    </Page>
  );
}

export function Onboarding10WalletSetupScreen() {
  const nav = useAppNav();
  const { connect } = usePhantomWallet();
  const { connectWeb3AuthWallet, isConfigured: web3AuthConfigured } = useWeb3AuthWallet();
  const wallet = useAppStore((s) => s.wallet);
  const walletProvider = useAppStore((s) => s.walletProvider);
  const [connecting, setConnecting] = useState(false);
  const [connectingEmbedded, setConnectingEmbedded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (wallet) {
      setConnecting(false);
      setErrorMessage(null);
    }
  }, [wallet]);
  return (
    <Page
      code="10"
      title="Wallet setup"
      subtitle="Use Phantom deeplink or create an embedded wallet."
    >
      <ProgressDots total={12} current={9} />
      <SectionCard
        icon={<Wallet color={colors.brandPurple} size={18} />}
        title="Connect Phantom wallet"
        body="Best for users who already use Phantom and prefer external signing."
      />
      <PrimaryButton
        label={wallet ? "Wallet connected" : connecting ? "Waiting for Phantom..." : "Connect Phantom now"}
        onPress={() => {
          if (wallet || connecting) return;
          setConnecting(true);
          setErrorMessage(null);
          connect()
            .then((connectedWallet) => {
              if (!connectedWallet) {
                setErrorMessage(
                  "No callback received from Phantom. Open Phantom and approve, then return to Rizq."
                );
              }
            })
            .finally(() => setTimeout(() => setConnecting(false), 1500));
        }}
      />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <SectionCard
        icon={<ShieldCheck color={colors.info} size={18} />}
        title="Connect Web3Auth in-app wallet"
        body="Best no-switch UX. Login and sign directly inside Rizq."
      />
      <PrimaryButton
        label={connectingEmbedded ? "Connecting Web3Auth..." : "Use in-app wallet (Web3Auth)"}
        onPress={() => {
          if (connectingEmbedded) return;
          if (!web3AuthConfigured) {
            setErrorMessage("Web3Auth is not configured. Set RIZQ_WEB3AUTH_CLIENT_ID.");
            return;
          }
          setConnectingEmbedded(true);
          setErrorMessage(null);
          connectWeb3AuthWallet()
            .then(() => undefined)
            .catch(() => setErrorMessage("Unable to connect Web3Auth wallet right now."))
            .finally(() => setConnectingEmbedded(false));
        }}
      />
      {wallet ? (
        <SecondaryButton
          label={`Continue (${walletProvider === "embedded" ? "In-App Wallet" : "Phantom"})`}
          onPress={() => nav.navigate("Onboarding11")}
        />
      ) : null}
    </Page>
  );
}

export function Onboarding11ProfileScreen() {
  const nav = useAppNav();
  const authToken = useAppStore((s) => s.authToken);
  const setLanguagePreference = useAppStore((s) => s.setLanguagePreference);
  const setProfileIdentity = useAppStore((s) => s.setProfileIdentity);
  const languagePreference = useAppStore((s) => s.languagePreference);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("Session missing. Please login again.");
      const user = await updateSessionProfile({
        token: authToken,
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        languagePref: languagePreference,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      return user;
    },
    onSuccess: (user) => {
      setErrorMessage(null);
      setProfileIdentity({
        displayName: user.display_name ?? undefined,
        username: user.username ?? undefined,
      });
      nav.navigate("Onboarding12");
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Profile save failed");
    },
  });
  return (
    <Page code="11" title="Profile setup" subtitle="Choose display name and language preference.">
      <ProgressDots total={12} current={10} />
      <TextInput
        placeholder="Display name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        placeholder="@username (optional)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Phone number (optional)"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <SecondaryButton label="Language: English" onPress={() => setLanguagePreference("english")} />
      <SecondaryButton label="Language: Urdu" onPress={() => setLanguagePreference("urdu")} />
      <SecondaryButton label="Language: Both" onPress={() => setLanguagePreference("both")} />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton label={saveProfileMutation.isPending ? "Saving..." : "Continue"} onPress={() => saveProfileMutation.mutate()} />
    </Page>
  );
}

export function Onboarding12StartScreen() {
  const authToken = useAppStore((s) => s.authToken);
  const setCompleted = useAppStore((s) => s.setHasCompletedOnboarding);
  const language = useAppStore((s) => s.languagePreference);
  const copy = t(language);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error("Session missing. Please login again.");
      await markOnboardingComplete({ token: authToken });
    },
    onSuccess: () => {
      setErrorMessage(null);
      setCompleted(true);
    },
    onError: (error) =>
      setErrorMessage(error instanceof Error ? error.message : "Failed to complete onboarding"),
  });
  return (
    <Page
      code="12"
      title="Choose your path"
      subtitle="All paths lead to the main dashboard and committee tools."
    >
      <ProgressDots total={12} current={11} />
      <SectionCard
        icon={<UsersThree color={colors.brandGreen} size={18} />}
        title={copy.startCommittee}
        body="Create committee rules, payout order, and launch when ready."
      />
      <SectionCard
        icon={<CheckCircle color={colors.info} size={18} />}
        title={copy.joinCommittee}
        body="Join via invite link, review terms, and start contributing."
      />
      <SectionCard
        icon={<House color={colors.brandGold} size={18} />}
        title={copy.exploreFirst}
        body="Browse dashboard and settings before your first committee action."
      />
      {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
      <PrimaryButton
        label={completeMutation.isPending ? "Saving..." : "Enter app"}
        onPress={() => completeMutation.mutate()}
      />
    </Page>
  );
}

// Home H1-H6
export function HomeDashboardScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  const language = useAppStore((s) => s.languagePreference);
  const copy = t(language);
  return (
    <Page
      code="H1-H6"
      title="Home Dashboard"
      subtitle="Header, balance, urgent actions, AI widget, committees strip, and quick actions."
    >
      <GlassCard style={styles.balanceCard}>
        <View style={styles.sectionRow}>
          <Wallet color={colors.brandGreen} size={18} />
          <Text style={styles.sectionTitle}>Total Balance</Text>
        </View>
        <Text style={styles.balanceValue}>$248.50 USDC</Text>
        <Text style={styles.balanceSub}>≈ PKR 69,342 · 1 USDC = 279.0 PKR</Text>
        <View style={styles.row}>
          <Pill label="Available $120" tone="success" />
          <Pill label="Locked $108" />
          <Pill label="Pending $20" tone="warning" />
        </View>
      </GlassCard>

      <SectionHeader title="Urgent Actions" />
      <SectionCard
        icon={<WarningCircle color={colors.warning} size={18} />}
        title="Payment due in 2 days"
        body="Wedding Fund · Cycle 3 · Pay $25 before grace starts."
      />

      <SectionHeader title="Rizq AI This Week" />
      <SectionCard
        icon={<ChatCircleText color={colors.brandPurple} size={18} />}
        title="Weekly coaching"
        body='Bhai, this week keep one fixed transfer day and pay early — your payout turn is close.'
      />

      <SectionHeader title="My Committees" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalStrip}>
        {[
          { name: "Wedding Fund", cycle: "Cycle 3/10", due: "Due in 2d", tone: "warning" as const },
          { name: "Hajj Group", cycle: "Cycle 1/12", due: "On track", tone: "success" as const },
          { name: "Education Pool", cycle: "Cycle 4/8", due: "Overdue", tone: "danger" as const },
        ].map((item) => (
          <GlassCard key={item.name} style={styles.committeeCard}>
            <Text style={styles.committeeName}>{item.name}</Text>
            <Text style={styles.committeeMeta}>{item.cycle}</Text>
            <Pill label={item.due} tone={item.tone} />
          </GlassCard>
        ))}
      </ScrollView>

      <SectionHeader title="Quick Actions" />
      <View style={styles.row}>
        <PrimaryButton
          label="Pay Now"
          onPress={() => nav.navigate("PayContribution", committeeParams)}
        />
        <PrimaryButton label={copy.committees} onPress={() => nav.navigate("CommitteesHub")} />
      </View>
      <View style={styles.row}>
        <PrimaryButton label="Join Committee" onPress={() => nav.navigate("JoinCommittee")} />
        <PrimaryButton label="Invite Friend" onPress={() => nav.navigate("JoinCommittee")} />
      </View>
    </Page>
  );
}

// Committees C/J/D/M + payments + edge
export function CommitteesHubScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  return (
    <Page
      code="C1 / J1"
      title="Committees Hub"
      subtitle="Committees I manage and committees I am a member of."
    >
      <SectionCard
        icon={<UsersThree color={colors.brandGreen} size={18} />}
        title="Committees I manage"
        body="2 active · 1 paused · next payout Friday"
      />
      <SectionCard
        icon={<CheckCircle color={colors.info} size={18} />}
        title="Committees I joined"
        body="3 active · 1 payment due · 1 payout pending claim"
      />
      <PrimaryButton label="Create Committee (C1-C7)" onPress={() => nav.navigate("CreateCommittee")} />
      <PrimaryButton label="Join Committee (J1-J4)" onPress={() => nav.navigate("JoinCommittee")} />
      <SecondaryButton
        label="Open Member Dashboard (D1-D6)"
        onPress={() => nav.navigate("MemberDashboard", committeeParams)}
      />
      <SecondaryButton
        label="Open Manager Dashboard (M1-M6)"
        onPress={() => nav.navigate("ManagerDashboard", committeeParams)}
      />
      <SecondaryButton
        label="Payment Screens (P1-P3)"
        onPress={() => nav.navigate("PayContribution", committeeParams)}
      />
      <SecondaryButton
        label="Payout Screens (R1-R3)"
        onPress={() => nav.navigate("PayoutNotification", committeeParams)}
      />
      <SecondaryButton label="Edge Case Flows (E1-E12)" onPress={() => nav.navigate("EdgeCases")} />
    </Page>
  );
}

export function CreateCommitteeScreen() {
  return (
    <Page
      code="C1-C7"
      title="Create Committee Wizard"
      subtitle="Name, rules, members, payout order, safety constraints, and launch review."
    >
      <SectionCard
        icon={<ListChecks color={colors.brandGreen} size={18} />}
        title="C2-C6 Steps"
        body="Amount/frequency, member count, order method, grace period, penalty and welfare options."
      />
      <SectionCard
        icon={<ShieldCheck color={colors.brandPurple} size={18} />}
        title="C7 Launch"
        body="Final summary and on-chain launch via committee_vault, payout_schedule, and safety_rules."
      />
    </Page>
  );
}

export function JoinCommitteeScreen() {
  const kyc = useAppStore((s) => s.kycStatus);
  const copy = t(useAppStore((s) => s.languagePreference));
  return (
    <Page
      code="J1-J4"
      title="Join Committee"
      subtitle="Invite preview, rule acknowledgment, KYC/nominee checks, and confirmation."
    >
      <SectionCard
        icon={<IdentificationCard color={colors.brandGold} size={18} />}
        title="KYC Gate"
        body={kyc === "verified" ? "KYC verified: committee actions allowed." : copy.kycRequired}
      />
      <SecondaryButton label="I have read and understood the rules" />
      <PrimaryButton label="Confirm Join" onPress={() => undefined} />
    </Page>
  );
}

export function MemberDashboardScreen() {
  return (
    <Page
      code="D1-D6"
      title="Member Dashboard"
      subtitle="Contribution status, pool progress, members list, payout schedule, and transaction history."
    >
      <SectionCard
        icon={<HourglassMedium color={colors.warning} size={18} />}
        title="Contribution Status"
        body="Next due amount, countdown, and Pay Now action with on-chain proof links."
      />
      <SectionCard
        icon={<UsersThree color={colors.info} size={18} />}
        title="Pool & Members"
        body="Paid/pending/overdue indicators and cycle completion progress."
      />
    </Page>
  );
}

export function ManagerDashboardScreen() {
  return (
    <Page
      code="M1-M6"
      title="Manager Dashboard"
      subtitle="Payment grid, announcements, member controls, payout order, and emergency actions."
    >
      <SectionCard
        icon={<ListChecks color={colors.brandGreen} size={18} />}
        title="Payment Matrix"
        body="Cycle-by-cycle grid with paid, pending, overdue, and future states."
      />
      <SectionCard
        icon={<WarningCircle color={colors.danger} size={18} />}
        title="Emergency Controls"
        body="Pause committee and export history (PDF/CSV) without moving escrow funds."
      />
    </Page>
  );
}

export function PayContributionScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  return (
    <Page
      code="P1"
      title="Pay Contribution"
      subtitle="Contribution payment with due date and Phantom signing."
    >
      <Input placeholder="Fixed amount (USDC)" />
      <Input placeholder="Due date" />
      <PrimaryButton label="Pay Now" onPress={() => nav.navigate("LatePayment", committeeParams)} />
      <SecondaryButton
        label="View late-state example (P2)"
        onPress={() => nav.navigate("LatePayment", committeeParams)}
      />
    </Page>
  );
}

export function LatePaymentScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  return (
    <Page
      code="P2"
      title="Late Payment (Grace)"
      subtitle="Amber warning with remaining grace days."
    >
      <SectionCard
        icon={<WarningCircle color={colors.warning} size={18} />}
        title="Grace active"
        body="Payout turn is still recoverable if contribution is paid before expiry."
      />
      <PrimaryButton
        label="Go to overdue state (P3)"
        onPress={() => nav.navigate("OverduePayment", committeeParams)}
      />
    </Page>
  );
}

export function OverduePaymentScreen() {
  return (
    <Page
      code="P3"
      title="Overdue Payment"
      subtitle="Grace expired; payout turn suspended until settlement."
    >
      <SectionCard
        icon={<WarningCircle color={colors.danger} size={18} />}
        title="Suspension active"
        body="Member can still pay and request reinstatement."
      />
    </Page>
  );
}

export function PayoutNotificationScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  return (
    <Page
      code="R1"
      title="Payout Notification"
      subtitle="Payout available alert with deep-link into claim flow."
    >
      <PrimaryButton
        label="Open Claim Screen (R2)"
        onPress={() => nav.navigate("PayoutClaim", committeeParams)}
      />
    </Page>
  );
}

export function PayoutClaimScreen() {
  const nav = useAppNav();
  const committeeParams = useDefaultCommitteeParams();
  return (
    <Page
      code="R2"
      title="Claim Payout"
      subtitle="Shows gross pool, platform fee, and net payout before signing."
      variant="celebration"
    >
      <SectionCard
        icon={<Coins color={colors.brandGold} size={18} />}
        title="Fee breakdown"
        body="Gross pool / Platform fee (1.0-1.5%) / Net transfer to wallet."
      />
      <PrimaryButton
        label="Claim & Continue (R3)"
        onPress={() => nav.navigate("PostPayout", committeeParams)}
      />
    </Page>
  );
}

export function PostPayoutScreen() {
  return (
    <Page
      code="R3"
      title="Post-Payout Summary"
      subtitle="Updated balances, cycle stats, and shareable milestone card."
      variant="celebration"
    >
      <SectionCard
        icon={<CheckCircle color={colors.success} size={18} />}
        title="Payout confirmed"
        body="On-chain receipt and current cycle status are updated."
      />
    </Page>
  );
}

export function EdgeCasesScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="E1-E12"
      title="Edge Case Flows"
      subtitle="Missed payments, leave settlement, nominee process, welfare, and manager removal votes."
    >
      <SecondaryButton label="Welfare Pool Transparency (E10)" onPress={() => nav.navigate("WelfarePool")} />
      <SecondaryButton label="Manager Removal Vote (E11-E12)" onPress={() => nav.navigate("ManagerVote")} />
      <SectionCard
        icon={<ShieldCheck color={colors.brandPurple} size={18} />}
        title="Nominee protection"
        body="30-day nominee claim, reminders, and welfare transfer if unclaimed."
      />
    </Page>
  );
}

export function WelfarePoolScreen() {
  return (
    <Page
      code="E10"
      title="Welfare Pool"
      subtitle="On-chain transparency for incoming and outgoing welfare transfers."
    >
      <SectionCard
        icon={<Coins color={colors.brandGold} size={18} />}
        title="Pool transparency"
        body="Source breakdown: nominee funds, fee opt-ins, and penalties."
      />
    </Page>
  );
}

export function ManagerVoteScreen() {
  return (
    <Page
      code="E11-E12"
      title="Manager Removal Vote"
      subtitle="2/3 vote threshold and autonomous continuation on success."
    >
      <SectionCard
        icon={<UsersThree color={colors.info} size={18} />}
        title="Governance vote"
        body="Single vote per wallet with live tally and immutable on-chain logs."
      />
    </Page>
  );
}

// AI A1-A4
export function AiMainScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="A1"
      title="Rizq AI Coach"
      subtitle="Weekly coaching, committee health summary, and quick prompts."
      variant="ai"
    >
      <SectionCard
        icon={<ChatCircleText color={colors.brandPurple} size={18} />}
        title="Weekly message"
        body="Bilingual message with committee-specific context and next action."
      />
      <PrimaryButton label="Open AI Chat (A2)" onPress={() => nav.navigate("AiChat")} />
      <SecondaryButton label="Open Rizq Score (A4)" onPress={() => nav.navigate("RizqScore")} />
    </Page>
  );
}

export function AiChatScreen() {
  return (
    <Page
      code="A2"
      title="AI Chat"
      subtitle="Conversation with full on-chain context injection."
      variant="ai"
    >
      <Input placeholder="Ask: When is my next payment due?" />
      <PrimaryButton label="Send message" onPress={() => undefined} />
    </Page>
  );
}

export function RizqScoreScreen() {
  return (
    <Page
      code="A4"
      title="Rizq Score"
      subtitle="Score 0-1000 from payment discipline, committee completion, and profile readiness."
      variant="ai"
    >
      <SectionCard
        icon={<ChartLineUp color={colors.brandGreen} size={18} />}
        title="Score factors"
        body="On-time payments, completed committees, nominee completion, and account age."
      />
    </Page>
  );
}

// Wallet W1-W4
export function WalletMainScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="W1"
      title="Wallet"
      subtitle="USDC balance, PKR equivalent, and transaction overview."
    >
      <SectionCard
        icon={<Wallet color={colors.brandGreen} size={18} />}
        title="Balance breakdown"
        body="Available / locked in committee vaults / pending payouts."
      />
      <PrimaryButton label="Deposit USDC (W2)" onPress={() => nav.navigate("WalletDeposit")} />
      <SecondaryButton label="Transaction History (W3)" onPress={() => nav.navigate("WalletHistory")} />
    </Page>
  );
}

export function WalletDepositScreen() {
  return (
    <Page
      code="W2"
      title="Deposit USDC"
      subtitle="Wallet address with QR and exchange guidance."
    >
      <Input placeholder="Wallet address" />
      <SecondaryButton label="I have sent it - check webhook sync" />
    </Page>
  );
}

export function WalletHistoryScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="W3"
      title="Transaction History"
      subtitle="Filter by contributions, payouts, deposits, and withdrawals."
    >
      <SecondaryButton label="Open transaction detail (W4)" onPress={() => nav.navigate("WalletDetail")} />
    </Page>
  );
}

export function WalletDetailScreen() {
  return (
    <Page
      code="W4"
      title="Transaction Detail"
      subtitle="On-chain proof view with hash and explorer link."
    >
      <SectionCard
        icon={<CreditCard color={colors.info} size={18} />}
        title="Proof of payment"
        body="Type, amount, committee, cycle, from/to addresses, tx hash."
      />
    </Page>
  );
}

// Profile, settings, pro S1-S11 / PR1-PR4
export function ProfileMainScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="Profile"
      title="Profile"
      subtitle="Account snapshot with quick access to settings and Rizq Pro."
    >
      <PrimaryButton label="Open Settings (S1-S11)" onPress={() => nav.navigate("SettingsMain")} />
      <PrimaryButton label="Rizq Pro (PR1-PR4)" onPress={() => nav.navigate("ProLanding")} />
    </Page>
  );
}

export function SettingsMainScreen() {
  return (
    <Page
      code="S1-S11"
      title="Settings"
      subtitle="Account, identity, wallet, notifications, security, support, and legal."
    >
      {[
        "S1 Account + sections",
        "S2 Profile edit",
        "S3 KYC status",
        "S4 Nominee",
        "S5 Wallet management",
        "S6 Notifications",
        "S7 App preferences",
        "S8 Welfare pool",
        "S9 Security",
        "S10 Support",
        "S11 About & legal",
      ].map((item) => (
        <SectionCard
          key={item}
          icon={<GearSix color={colors.textSecondary} size={16} />}
          title={item}
          body="Screen scaffold wired for the pivot flow."
        />
      ))}
    </Page>
  );
}

export function ProLandingScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="PR1-PR2"
      title="Rizq Pro"
      subtitle="Upgrade options, limits, and monthly/annual pricing."
    >
      <SectionCard
        icon={<Crown color={colors.brandGold} size={18} />}
        title="Plan comparison"
        body="Free 1.5% payout fee vs Pro 1.0% payout fee with higher limits."
      />
      <PrimaryButton label="Subscribe with USDC" onPress={() => nav.navigate("ProPaymentConfirmed")} />
    </Page>
  );
}

export function ProPaymentConfirmedScreen() {
  const nav = useAppNav();
  return (
    <Page
      code="PR3"
      title="Pro Activated"
      subtitle="Subscription receipt with renewal timeline and unlocked features."
      variant="celebration"
    >
      <PrimaryButton label="Manage Renewal (PR4)" onPress={() => nav.navigate("ProRenewal")} />
    </Page>
  );
}

export function ProRenewalScreen() {
  return (
    <Page
      code="PR4"
      title="Renewal & Cancellation"
      subtitle="Auto-renew, grace period, and cancellation controls."
    >
      <SectionCard
        icon={<Crown color={colors.brandGold} size={18} />}
        title="Renewal policy"
        body="7-day advance reminder and 7-day grace if wallet balance is low."
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
    paddingBottom: spacing.section * 2,
    gap: 12,
  },
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  code: {
    color: colors.brandGold,
    fontSize: typography.caption,
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressDotOn: {
    backgroundColor: colors.brandGreen,
  },
  heroCard: {
    padding: spacing.card,
    marginBottom: 4,
  },
  heroEyebrow: {
    color: colors.brandGold,
    fontSize: typography.caption,
    letterSpacing: 0.9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroBody: {
    color: colors.textPrimary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  pill: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pillSuccess: {
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.12)",
  },
  pillWarning: {
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  pillDanger: {
    borderColor: "rgba(255,82,82,0.45)",
    backgroundColor: "rgba(255,82,82,0.12)",
  },
  pillText: {
    color: colors.textPrimary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  balanceCard: {
    padding: spacing.card,
  },
  balanceValue: {
    color: colors.textPrimary,
    fontSize: typography.hero,
    fontWeight: "800",
    marginTop: 8,
  },
  balanceSub: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    marginBottom: 10,
  },
  horizontalStrip: {
    gap: 10,
    paddingBottom: 6,
  },
  committeeCard: {
    width: 170,
    padding: 12,
    gap: 8,
  },
  committeeName: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.body,
  },
  committeeMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  primaryBtn: {
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: typography.body,
  },
  secondaryBtn: {
    borderRadius: radii.button,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: typography.bodySmall,
  },
  input: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: typography.body,
  },
  authError: {
    color: colors.danger,
    fontSize: typography.bodySmall,
  },
  sectionCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    gap: 8,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
});
