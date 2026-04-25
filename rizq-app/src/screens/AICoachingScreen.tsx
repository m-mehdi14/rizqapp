import React from "react";
import { View, Text, StyleSheet, TextInput, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography } from "../theme/tokens";
import { CoachingCard } from "../components/CoachingCard";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { useAppStore } from "../store/useAppStore";
import { fetchCoaching } from "../api/rizqApi";

export function AICoachingScreen() {
  const topCommitteeId = useAppStore((s) => s.committees[0]?.id);
  const userId = useAppStore((s) => s.userId);
  const coachingQuery = useQuery({
    queryKey: ["coaching", topCommitteeId, userId],
    queryFn: () => fetchCoaching(topCommitteeId as string, userId),
    enabled: !!topCommitteeId,
    refetchInterval: 30000,
  });

  return (
    <ScreenShell variant="ai">
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>AI Coaching</Text>
        <Text style={styles.badge}>Powered by Claude</Text>
        <Text style={styles.section}>This Week's Committee Coaching</Text>
        <CoachingCard
          message={
            coachingQuery.data?.message ??
            "Coach is preparing your message. Next coaching drop: Sunday 10 AM PKT."
          }
          dateLabel={
            coachingQuery.data?.created_at
              ? new Date(coachingQuery.data.created_at).toLocaleDateString()
              : `Sunday, ${new Date().toLocaleDateString()}`
          }
          goalHealthScore={4}
        />
      </ScrollView>
      <View style={styles.inputWrap}>
        <GlassCard style={styles.inputCard}>
          <TextInput
            placeholder="Ask the coach anything…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.send}>Send</Text>
        </GlassCard>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
    paddingBottom: spacing.section * 5,
  },
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "600" },
  badge: { color: colors.accentPurple, marginTop: 4 },
  section: {
    marginTop: spacing.section,
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: typography.h2,
    marginBottom: spacing.unit,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  inputWrap: {
    position: "absolute",
    left: spacing.screenX,
    right: spacing.screenX,
    bottom: spacing.section,
  },
  inputCard: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  send: { color: colors.brandPurple, fontWeight: "700", paddingHorizontal: 8 },
});
