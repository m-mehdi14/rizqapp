import React from "react";
import { Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { GoalCard } from "../components/GoalCard";
import type { GoalsStackParamList } from "../navigation/RootNavigator";
import { ScreenShell } from "../components/ScreenShell";
import { SectionHeader } from "../components/SectionHeader";

type Nav = NativeStackNavigationProp<GoalsStackParamList, "GoalsHome">;

export function GoalsHomeScreen() {
  const goals = useAppStore((s) => s.activeGoals);
  const navigation = useNavigation<Nav>();

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Goals</Text>
        <SectionHeader title="Active Goals" />
        {goals.length === 0 ? (
          <Pressable style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>🌙 Your first goal is waiting.</Text>
            <Text style={styles.empty}>Create a goal and let friends stake on your journey.</Text>
          </Pressable>
        ) : (
          goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onPress={() =>
                navigation.navigate("GoalDetail", { goalId: g.id })
              }
            />
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

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
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: spacing.card,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  emptyTitle: { color: colors.textPrimary, fontWeight: "700", marginBottom: 6 },
  empty: { color: colors.textSecondary, lineHeight: 20 },
});
