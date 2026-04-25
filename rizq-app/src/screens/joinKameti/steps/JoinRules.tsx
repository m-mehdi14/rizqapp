import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, radii, typography } from "../../../theme/tokens";
import type { JoinInviteData } from "../store/useJoinKametiStore";

type Props = {
  inviteData: JoinInviteData;
  hasAcceptedRules: boolean;
  onToggleAccepted: () => void;
};

export function JoinRules({ inviteData, hasAcceptedRules, onToggleAccepted }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Committee Rules Review</Text>
      <GlassCard style={styles.card}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.rulesText}>
            {`1) Contributions are due ${inviteData.frequency.toLowerCase()} and must be paid before the cycle cutoff.\n\n`}
            {`2) Grace period is ${inviteData.gracePeriod}. After grace ends, system action is: ${inviteData.penaltyRule}.\n\n`}
            {"3) Payout order and committee safety rules are transparent and visible to all members.\n\n"}
            {"4) Missing repeated contributions may reduce trust score and may require manager/member vote for continuation.\n\n"}
            {"5) This committee follows community compliance requirements set by Rizq and committee manager."}
          </Text>
        </ScrollView>
      </GlassCard>

      <Pressable
        onPress={onToggleAccepted}
        style={styles.checkboxRow}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hasAcceptedRules }}
      >
        <View style={[styles.checkbox, hasAcceptedRules && styles.checkboxChecked]}>
          {hasAcceptedRules ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxText}>I have read and understood the rules.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: "700",
  },
  card: {
    padding: 14,
  },
  scroll: {
    maxHeight: 260,
  },
  rulesText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    lineHeight: 22,
  },
  checkboxRow: {
    minHeight: 50,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.bgElevated,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "rgba(0,230,118,0.7)",
    backgroundColor: "rgba(0,230,118,0.16)",
  },
  checkboxTick: {
    color: colors.brandGreen,
    fontSize: 13,
    fontWeight: "900",
  },
  checkboxText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    flex: 1,
  },
});
