import React from "react";
import { Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { colors, spacing, typography } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { CommitteeCard } from "../components/CommitteeCard";
import { ScreenShell } from "../components/ScreenShell";
import { SectionHeader } from "../components/SectionHeader";
import type { Committee } from "../store/useAppStore";

export function CommitteesOverviewScreen() {
  const goals = useAppStore((s) => s.committees as Committee[]);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Committees</Text>
        <SectionHeader title="Active Committees" />
        {goals.length === 0 ? (
          <Pressable style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Your first committee is waiting.</Text>
            <Text style={styles.empty}>Create a committee and invite your members.</Text>
          </Pressable>
        ) : (
          goals.map((g) => (
            <CommitteeCard
              key={g.id}
              committee={g}
              onPress={() =>
                navigation.navigate("CommitteesTab", {
                  screen: "MemberDashboard",
                  params: { committeeId: g.id },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

// Backward-compatible export while navigation cleanup is in-progress.
export const GoalsHomeScreen = CommitteesOverviewScreen;

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h1,
    fontWeight: "600",
    marginBottom: spacing.unit * 2,
  },
  emptyWrap: {
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.14)",
    borderRadius: 16,
    padding: spacing.card,
    backgroundColor: "rgba(10,51,40,0.04)",
  },
  emptyTitle: { color: colors.textPrimary, fontWeight: "700", marginBottom: 6 },
  empty: { color: colors.textSecondary, lineHeight: 20 },
});
