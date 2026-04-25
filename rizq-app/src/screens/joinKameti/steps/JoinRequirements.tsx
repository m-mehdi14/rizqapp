import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, radii, typography } from "../../../theme/tokens";
import type { JoinInviteData } from "../store/useJoinKametiStore";

type Props = {
  inviteData: JoinInviteData;
  userHasKYC: boolean;
  userHasNominee: boolean;
  onCompleteProfile: () => void;
};

export function JoinRequirements({
  inviteData,
  userHasKYC,
  userHasNominee,
  onCompleteProfile,
}: Props) {
  const requiredKYCComplete = !inviteData.kycRequired || userHasKYC;
  const requiredNomineeComplete = !inviteData.nomineeRequired || userHasNominee;
  const allDone = requiredKYCComplete && requiredNomineeComplete;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KYC & Nominee Check</Text>
      <GlassCard style={styles.card}>
        <ChecklistItem
          label="KYC verification"
          required={inviteData.kycRequired}
          completed={requiredKYCComplete}
        />
        <ChecklistItem
          label="Nominee setup"
          required={inviteData.nomineeRequired}
          completed={requiredNomineeComplete}
        />
      </GlassCard>

      <View style={[styles.statusCard, allDone ? styles.statusDone : styles.statusIncomplete]}>
        <Text style={[styles.statusTitle, allDone ? styles.statusTitleDone : styles.statusTitleIncomplete]}>
          {allDone ? "Complete" : "Incomplete"}
        </Text>
        <Text style={styles.statusBody}>
          {allDone
            ? "All required profile items are complete. You can proceed."
            : "You need to complete missing profile requirements before joining this committee."}
        </Text>
      </View>

      {!allDone ? (
        <Pressable
          onPress={onCompleteProfile}
          style={styles.profileButton}
          accessibilityRole="button"
        >
          <Text style={styles.profileButtonText}>Complete Profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChecklistItem({
  label,
  required,
  completed,
}: {
  label: string;
  required: boolean;
  completed: boolean;
}) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.statusDot, completed ? styles.dotDone : styles.dotMissing]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemMeta}>
          {required ? (completed ? "Required - Complete" : "Required - Missing") : "Not required"}
        </Text>
      </View>
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
    gap: 10,
  },
  itemRow: {
    minHeight: 50,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDone: { backgroundColor: colors.success },
  dotMissing: { backgroundColor: colors.warning },
  itemLabel: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  statusCard: {
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
  },
  statusDone: {
    borderColor: "rgba(0,230,118,0.4)",
    backgroundColor: "rgba(0,230,118,0.08)",
  },
  statusIncomplete: {
    borderColor: "rgba(255,179,0,0.45)",
    backgroundColor: "rgba(255,179,0,0.12)",
  },
  statusTitle: {
    fontSize: typography.body,
    fontWeight: "800",
    marginBottom: 4,
  },
  statusTitleDone: { color: colors.success },
  statusTitleIncomplete: { color: colors.warning },
  statusBody: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
  },
  profileButton: {
    minHeight: 48,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: typography.body,
  },
});
