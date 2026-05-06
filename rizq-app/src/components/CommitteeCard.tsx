import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { a11y, colors, radii, spacing, typography } from "../theme/tokens";
import { ProgressBar } from "./ProgressBar";
import { USDCAmount } from "./USDCAmount";
import type { Committee } from "../store/useAppStore";
import { GlassCard } from "./GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";

type Props = {
  committee: Committee;
  onDeposit?: () => void;
  onPress?: () => void;
  variant?: "active" | "behind" | "critical" | "resolved";
};

export function CommitteeCard({
  committee,
  onDeposit,
  onPress,
  variant = "active",
}: Props) {
  const barVariant =
    variant === "critical" ? "danger" : variant === "behind" ? "warning" : "success";
  const [g0, g1] = goalGradient(committee.type);
  const pulse = React.useRef(new Animated.Value(0.7)).current;
  const hasRecentPayment = !!committee.lastStakeAt;
  const currentCycle = committee.currentCycle ?? 1;
  const totalCycles =
    committee.totalCycles ??
    Math.max(1, Math.ceil(committee.targetLamports / Math.max(1, committee.contributionLamports ?? 1)));

  React.useEffect(() => {
    if (!hasRecentPayment) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasRecentPayment, pulse]);

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
            <Text style={styles.icon}>{goalEmoji(committee.type)}</Text>
          </LinearGradient>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{committee.name}</Text>
            <Text style={styles.meta}>Next due in {committee.daysLeft} days</Text>
          </View>
        </View>

        <ProgressBar value={committee.progress} variant={barVariant} goalType={committee.type} />
        <View style={styles.row}>
          <USDCAmount lamports={committee.savedLamports} size="sm" />
          <Text style={styles.meta}> / </Text>
          <USDCAmount lamports={committee.targetLamports} size="sm" />
        </View>
        <View style={styles.socialRow}>
          {hasRecentPayment ? <Animated.View style={[styles.liveDot, { opacity: pulse }]} /> : null}
          <Text style={styles.meta}>
            {committee.memberCount ?? 0}/{committee.maxMembers ?? 0} members · cycle {currentCycle}/{totalCycles}
          </Text>
          {!!committee.streakWeeks && <Text style={styles.streak}>On-time x{committee.streakWeeks}</Text>}
        </View>
        <Pressable style={styles.deposit} onPress={onDeposit}>
          <Text style={styles.depositText}>Pay contribution</Text>
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
    minHeight: a11y.minTapTarget,
    borderRadius: radii.button,
    alignItems: "center",
    justifyContent: "center",
  },
  depositText: { color: colors.textInverse, fontWeight: "700" },
});
