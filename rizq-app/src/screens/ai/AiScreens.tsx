import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { ChartLineUp, ChatCircleText, Sparkle } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { colors, radii, spacing, typography } from "../../theme/tokens";

const FLOATING_TAB_BAR_CLEARANCE = 108;

function Layout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <ScreenShell variant="ai">
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

export function AiMainScreen() {
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  return (
    <Layout
      title="Rizq AI Coach"
      subtitle="Weekly guidance powered by your committee context, payment behavior, and wallet trends."
    >
      <GlassCard style={styles.messageCard}>
        <View style={styles.row}>
          <Sparkle color={colors.brandPurple} size={18} />
          <Text style={styles.cardTitle}>This week message</Text>
        </View>
        <Text style={styles.messageText}>
          Bhai, apki committee discipline achi ja rahi hai. Pay 24 hours before due date to keep
          your Rizq score strong and reduce last-minute pressure.
        </Text>
      </GlassCard>

      <GlassCard style={styles.healthCard}>
        <Text style={styles.cardTitle}>Committee Health Summary</Text>
        <HealthRow name="Wedding Support" state="Payment due" tone="warning" />
        <HealthRow name="Ramzan Savings" state="On track" tone="success" />
        <HealthRow name="Family Education" state="Overdue member" tone="danger" />
      </GlassCard>

      <View style={styles.promptWrap}>
        {[
          "When is my next committee payment?",
          "How much will I receive this cycle?",
          "Am I on track with my Hajj goal?",
        ].map((q) => (
          <Pressable key={q} style={styles.promptChip} onPress={() => nav.navigate("AiChat")}>
            <Text style={styles.promptText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryBtn} onPress={() => nav.navigate("AiChat")}>
        <Text style={styles.primaryBtnText}>Open AI Chat</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={() => nav.navigate("RizqScore")}>
        <Text style={styles.secondaryBtnText}>Open Rizq Score</Text>
      </Pressable>
    </Layout>
  );
}

export function AiChatScreen() {
  const [draft, setDraft] = useState("");
  return (
    <Layout
      title="AI Chat"
      subtitle="Ask in English, Urdu, or mixed. Response uses your live committee context."
    >
      <GlassCard style={styles.chatBubbleUser}>
        <Text style={styles.chatUser}>When is my next payment due?</Text>
      </GlassCard>
      <GlassCard style={styles.chatBubbleAi}>
        <Text style={styles.chatAi}>
          Your next payment is due on 9 May. Aap 1 din pehle pay kar dein to late risk avoid hoga.
        </Text>
      </GlassCard>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask Rizq AI..."
          placeholderTextColor={colors.textMuted}
          style={styles.chatInput}
        />
        <Pressable style={styles.sendBtn} onPress={() => setDraft("")}>
          <ChatCircleText color={colors.textInverse} size={20} />
        </Pressable>
      </View>
    </Layout>
  );
}

export function RizqScoreScreen() {
  return (
    <Layout
      title="Rizq Score"
      subtitle="Your reliability score from 0-1000 based on contribution behavior and profile completeness."
    >
      <GlassCard style={styles.scoreCard}>
        <Text style={styles.scoreValue}>742</Text>
        <Text style={styles.scoreSub}>+18 this month</Text>
      </GlassCard>
      <GlassCard style={styles.healthCard}>
        <View style={styles.row}>
          <ChartLineUp color={colors.brandGreen} size={18} />
          <Text style={styles.cardTitle}>Factors</Text>
        </View>
        <FactorRow label="On-time payments" value="Excellent" />
        <FactorRow label="Committees completed" value="Strong" />
        <FactorRow label="Nominee profile" value="Pending update" />
        <FactorRow label="Account age" value="Growing" />
      </GlassCard>
      <Pressable style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Share score card</Text>
      </Pressable>
    </Layout>
  );
}

function HealthRow({
  name,
  state,
  tone,
}: {
  name: string;
  state: string;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthName}>{name}</Text>
      <Text
        style={[
          styles.healthState,
          tone === "success" && { color: colors.success },
          tone === "warning" && { color: colors.warning },
          tone === "danger" && { color: colors.danger },
        ]}
      >
        {state}
      </Text>
    </View>
  );
}

function FactorRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthName}>{label}</Text>
      <Text style={styles.healthState}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "800" },
  subtitle: { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  messageCard: { padding: 14, gap: 9 },
  cardTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  messageText: { color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22 },
  healthCard: { padding: 14, gap: 8 },
  healthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  healthName: { color: colors.textSecondary, fontSize: typography.bodySmall, flex: 1 },
  healthState: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
  promptWrap: { gap: 7 },
  promptChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.45)",
    backgroundColor: "rgba(167,139,250,0.13)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  promptText: { color: colors.textPrimary, fontSize: typography.caption },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radii.button,
    backgroundColor: colors.brandPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "700" },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: "600" },
  chatBubbleUser: {
    padding: 12,
    alignSelf: "flex-end",
    backgroundColor: "rgba(167,139,250,0.2)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.42)",
  },
  chatBubbleAi: {
    padding: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chatUser: { color: colors.textPrimary, fontSize: typography.bodySmall },
  chatAi: { color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 21 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  chatInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brandPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCard: {
    alignItems: "center",
    paddingVertical: 18,
    gap: 2,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.1)",
  },
  scoreValue: { color: colors.brandGreen, fontSize: 48, fontWeight: "900", lineHeight: 54 },
  scoreSub: { color: colors.textSecondary, fontSize: typography.bodySmall },
});
