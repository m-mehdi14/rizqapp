import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { ChartLineUp, ChatCircleText, Sparkle } from "phosphor-react-native";
import { GlassCard } from "../../components/GlassCard";
import { ScreenShell } from "../../components/ScreenShell";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchAiChatHistory,
  fetchRizqScore,
  sendAiChatMessage,
  sendGeneralAiChatMessage,
} from "../../api/rizqApi";
import { useAppStore } from "../../store/useAppStore";

const FLOATING_TAB_BAR_CLEARANCE = 108;
const CHAT_INPUT_CLEARANCE = 84;

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
  const committees = useAppStore((s) => s.committees);
  const activeCount = committees.filter((c) => (c.status ?? "").toLowerCase() !== "complete").length;
  const upcomingCommittee = committees.find((c) => Boolean(c.nextCycleDate));
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
        <Text style={styles.cardMessageText}>
          {upcomingCommittee
            ? `Aap ki "${upcomingCommittee.name}" committee pe focus rakhein. Due date se 24 ghantay pehle payment plan karein, score aur trust dono strong rahenge.`
            : "Committee join/create karte hi AI personalized weekly plan aur due-date reminders dega."}
        </Text>
      </GlassCard>

      <GlassCard style={styles.healthCard}>
        <Text style={styles.cardTitle}>Committee Health Summary</Text>
        <HealthRow
          name="Active committees"
          state={`${activeCount}`}
          tone={activeCount > 0 ? "success" : "warning"}
        />
        <HealthRow
          name="Total committees"
          state={`${committees.length}`}
          tone={committees.length > 0 ? "success" : "warning"}
        />
        <HealthRow
          name="AI context readiness"
          state={committees.length > 0 ? "Live data ready" : "Create/join needed"}
          tone={committees.length > 0 ? "success" : "danger"}
        />
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
  const GENERAL_CHAT_ID = "__general__";
  const userId = useAppStore((s) => s.userId);
  const committees = useAppStore((s) => s.committees);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>(
    committees[0]?.id ?? GENERAL_CHAT_ID
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "ai"; body: string; time: string }>
  >([
    {
      id: "welcome",
      role: "ai",
      body: "Assalam o Alaikum! Committee ya payment se related kuch bhi poochna ho, I am here.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const listRef = useRef<FlatList<{ id: string; role: "user" | "ai"; body: string; time: string }>>(null);

  useEffect(() => {
    if (
      selectedCommitteeId !== GENERAL_CHAT_ID &&
      !committees.some((committee) => committee.id === selectedCommitteeId)
    ) {
      setSelectedCommitteeId(committees[0]?.id ?? GENERAL_CHAT_ID);
    } else if (!selectedCommitteeId && committees[0]?.id) {
      setSelectedCommitteeId(committees[0].id);
    }
  }, [committees, selectedCommitteeId, GENERAL_CHAT_ID]);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (!userId) {
        setMessages([
          {
            id: `ctx-auth-${Date.now()}`,
            role: "ai",
            body: "Login required to use AI chat.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        return;
      }
      const isGeneral = selectedCommitteeId === GENERAL_CHAT_ID;
      const selectedName =
        committees.find((committee) => committee.id === selectedCommitteeId)?.name ??
        "selected committee";
      try {
        const rows = await fetchAiChatHistory({
          userId,
          committeeId: isGeneral ? null : selectedCommitteeId,
        });
        if (cancelled) return;
        if (rows.length > 0) {
          setMessages(
            rows.map((row) => ({
              id: row.id,
              role: row.role,
              body: row.message,
              time: new Date(row.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }))
          );
        } else {
          setMessages([
            {
              id: `ctx-${selectedCommitteeId || "none"}-${Date.now()}`,
              role: "ai",
              body: isGeneral
                ? "General AI mode active. Ask anything."
                : `Context switched to "${selectedName}". Ask anything about this committee.`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
        setDraft("");
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 0);
      } catch {
        if (cancelled) return;
        setMessages([
          {
            id: `ctx-err-${Date.now()}`,
            role: "ai",
            body: "Unable to load previous conversation. You can continue chatting.",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [committees, selectedCommitteeId, userId, GENERAL_CHAT_ID]);

  const sendMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!selectedCommitteeId || !userId) {
        throw new Error("Login first to start AI chat.");
      }
      if (selectedCommitteeId === GENERAL_CHAT_ID) {
        return await sendGeneralAiChatMessage({
          userId,
          prompt,
        });
      }
      return await sendAiChatMessage({
        committeeId: selectedCommitteeId,
        userId,
        prompt,
      });
    },
    onSuccess: (payload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          body: payload.message,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    },
    onError: (error) => {
      const text = error instanceof Error ? error.message : "AI response unavailable. Please retry.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "ai",
          body: text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    },
  });

  const canSend = draft.trim().length > 0 && !sendMutation.isPending;
  const headerSubtitle = useMemo(() => {
    if (!userId) return "Login required for AI chat.";
    if (selectedCommitteeId === GENERAL_CHAT_ID) return "General AI mode (no committee rules).";
    if (!selectedCommitteeId) return "Create/join committee to enable live context.";
    const selectedName = committees.find((c) => c.id === selectedCommitteeId)?.name;
    return selectedName
      ? `Live context enabled for ${selectedName}.`
      : "Live context enabled for selected committee.";
  }, [selectedCommitteeId, userId, committees, GENERAL_CHAT_ID]);

  const onSend = () => {
    const prompt = draft.trim();
    if (!prompt || sendMutation.isPending) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        body: prompt,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setDraft("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 30);
    sendMutation.mutate(prompt);
  };

  return (
    <ScreenShell variant="ai">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.chatScreenWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.chatTopArea}>
            <Text style={styles.title}>AI Chat</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.committeeSelector}
            >
              <Pressable
                key={GENERAL_CHAT_ID}
                style={[
                  styles.committeeChip,
                  selectedCommitteeId === GENERAL_CHAT_ID && styles.committeeChipOn,
                ]}
                onPress={() => setSelectedCommitteeId(GENERAL_CHAT_ID)}
              >
                <Text
                  style={[
                    styles.committeeChipText,
                    selectedCommitteeId === GENERAL_CHAT_ID && styles.committeeChipTextOn,
                  ]}
                >
                  General AI
                </Text>
              </Pressable>
              {committees.map((committee) => {
                const isSelected = committee.id === selectedCommitteeId;
                return (
                  <Pressable
                    key={committee.id}
                    style={[styles.committeeChip, isSelected && styles.committeeChipOn]}
                    onPress={() => setSelectedCommitteeId(committee.id)}
                  >
                    <Text style={[styles.committeeChipText, isSelected && styles.committeeChipTextOn]}>
                      {committee.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <GlassCard style={styles.chatCardLarge}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderTitle}>Rizq Assistant</Text>
              <Text style={styles.chatHeaderMeta}>
                {selectedCommitteeId === GENERAL_CHAT_ID
                  ? "General AI assistant mode"
                  : selectedCommitteeId
                    ? "Connected to committee data"
                    : "No committee connected"}
              </Text>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item: message }) => (
                <View
                  style={[
                    styles.messageWrap,
                    message.role === "user" ? styles.messageWrapUser : styles.messageWrapAi,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      message.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAi,
                    ]}
                  >
                    <Text style={styles.chatMessageText}>{message.body}</Text>
                  </View>
                  <Text
                    style={[
                      styles.messageTime,
                      message.role === "user" ? styles.messageTimeUser : styles.messageTimeAi,
                    ]}
                  >
                    {message.time}
                  </Text>
                </View>
              )}
            />

            {sendMutation.isPending ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={colors.brandPurple} />
                <Text style={styles.chatHeaderMeta}>Rizq AI is replying...</Text>
              </View>
            ) : null}
          </GlassCard>

          <View style={styles.inputRowPinned}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Rizq AI..."
              placeholderTextColor={colors.textMuted}
              style={styles.chatInput}
              multiline
              returnKeyType="send"
            />
            <Pressable
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={!canSend}
            >
              <ChatCircleText color={colors.textInverse} size={20} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenShell>
  );
}

export function RizqScoreScreen() {
  const userId = useAppStore((s) => s.userId);
  const scoreQuery = useQuery({
    queryKey: ["rizq-score", userId],
    queryFn: () => fetchRizqScore(userId as string),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
  const score = scoreQuery.data?.score ?? 0;
  const trend30d = scoreQuery.data?.trend_30d ?? 0;
  const breakdown = scoreQuery.data?.breakdown;
  return (
    <Layout
      title="Rizq Score"
      subtitle="Your reliability score from 0-1000 based on contribution behavior and profile completeness."
    >
      <GlassCard style={styles.scoreCard}>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreSub}>
          {trend30d >= 0 ? `+${trend30d}` : trend30d} in last 30 days
        </Text>
      </GlassCard>
      <GlassCard style={styles.healthCard}>
        <View style={styles.row}>
          <ChartLineUp color={colors.brandGreen} size={18} />
          <Text style={styles.cardTitle}>Factors</Text>
        </View>
        <FactorRow label="On-time payments" value={String(breakdown?.payments_on_time ?? 0)} />
        <FactorRow label="Committees completed" value={String(breakdown?.committees_completed ?? 0)} />
        <FactorRow label="Nominee profile" value={String(breakdown?.nominee_added ?? 0)} />
        <FactorRow label="Account age" value={String(breakdown?.account_age ?? 0)} />
        <FactorRow label="Consistency" value={String(breakdown?.committee_consistency ?? 0)} />
      </GlassCard>
      {scoreQuery.isLoading ? <Text style={styles.secondaryBtnText}>Loading score...</Text> : null}
      {scoreQuery.isError ? (
        <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Could not load Rizq Score.</Text>
      ) : null}
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
  cardMessageText: { color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22 },
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
  chatScreenWrap: {
    flex: 1,
    paddingTop: spacing.section,
    paddingHorizontal: spacing.screenX,
    paddingBottom: 12,
    gap: 10,
  },
  chatTopArea: { gap: 6 },
  committeeSelector: { gap: 8, paddingTop: 2 },
  committeeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  committeeChipOn: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.15)",
  },
  committeeChipText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: "600" },
  committeeChipTextOn: { color: colors.brandGreen },
  chatCardLarge: {
    flex: 1,
    minHeight: 420,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.22)",
    backgroundColor: "rgba(8,15,31,0.64)",
  },
  chatHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    gap: 2,
  },
  chatHeaderTitle: { color: colors.textPrimary, fontSize: typography.body, fontWeight: "800" },
  chatHeaderMeta: { color: colors.textSecondary, fontSize: typography.caption },
  chatList: { gap: 8, paddingBottom: 8 },
  messageWrap: { gap: 3, maxWidth: "88%", flexShrink: 1 },
  messageWrapUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  messageWrapAi: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexShrink: 1,
  },
  messageBubbleUser: {
    backgroundColor: "rgba(167,139,250,0.22)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.46)",
    borderBottomRightRadius: 4,
  },
  messageBubbleAi: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderBottomLeftRadius: 4,
  },
  chatMessageText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    lineHeight: 21,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  messageTime: { color: colors.textMuted, fontSize: 11 },
  messageTimeUser: { textAlign: "right" },
  messageTimeAi: { textAlign: "left" },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingBottom: 2 },
  inputRowPinned: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    paddingBottom: 4,
    marginBottom: CHAT_INPUT_CLEARANCE,
  },
  chatInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 132,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brandPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
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
