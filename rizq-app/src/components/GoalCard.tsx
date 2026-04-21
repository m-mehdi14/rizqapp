import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ProgressBar } from "./ProgressBar";
import { USDCAmount } from "./USDCAmount";
import type { Goal } from "../store/useAppStore";
import { GlassCard } from "./GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";

type Props = {
  goal: Goal;
  onDeposit?: () => void;
  onPress?: () => void;
  variant?: "active" | "behind" | "critical" | "resolved";
};

export function GoalCard({
  goal,
  onDeposit,
  onPress,
  variant = "active",
}: Props) {
  const barVariant =
    variant === "critical" ? "danger" : variant === "behind" ? "warning" : "success";
  const [g0, g1] = goalGradient(goal.type);
  const pulse = React.useRef(new Animated.Value(0.7)).current;
  const hasRecentStake = !!goal.lastStakeAt;

  React.useEffect(() => {
    if (!hasRecentStake) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasRecentStake, pulse]);

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <LinearGradient
          colors={[`${g0}22`, "transparent"]}
          style={styles.tint}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.header}>
          <LinearGradient colors={[g0, g1]} style={styles.iconBadge}>
            <Text style={styles.icon}>{goalEmoji(goal.type)}</Text>
          </LinearGradient>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{goal.name}</Text>
            <Text style={styles.meta}>{goal.daysLeft} days left</Text>
          </View>
        </View>

        <ProgressBar value={goal.progress} variant={barVariant} goalType={goal.type} />
        <View style={styles.row}>
          <USDCAmount lamports={goal.savedLamports} size="sm" />
          <Text style={styles.meta}> / </Text>
          <USDCAmount lamports={goal.targetLamports} size="sm" />
        </View>
        <View style={styles.socialRow}>
          {hasRecentStake ? <Animated.View style={[styles.liveDot, { opacity: pulse }]} /> : null}
          <Text style={styles.meta}>
            {goal.yesCount} believers · {goal.noCount} doubters
          </Text>
          {!!goal.streakWeeks && <Text style={styles.streak}>🔥 {goal.streakWeeks}-week streak</Text>}
        </View>
        <Pressable style={styles.deposit} onPress={onDeposit}>
          <Text style={styles.depositText}>Deposit</Text>
        </Pressable>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.card,
    marginBottom: spacing.unit * 2,
    position: "relative",
  },
  tint: { ...StyleSheet.absoluteFill },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.unit * 1.5 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(255,215,64,0.6)",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
  },
  icon: { fontSize: 19 },
  titleWrap: { marginLeft: 10, flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: "600",
  },
  row: { flexDirection: "row", alignItems: "center", marginTop: spacing.unit },
  socialRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.unit, gap: 6 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandGreen,
  },
  meta: { color: colors.textSecondary, fontSize: typography.caption, marginTop: spacing.unit / 2 },
  streak: {
    marginLeft: "auto",
    color: colors.brandGold,
    fontSize: typography.caption,
    backgroundColor: "rgba(255,143,0,0.16)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deposit: {
    marginTop: spacing.unit * 2,
    alignSelf: "flex-start",
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.button,
  },
  depositText: { color: colors.textInverse, fontWeight: "700" },
});
