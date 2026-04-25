import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { GlassCard } from "../../../components/GlassCard";
import { colors, radii, typography } from "../../../theme/tokens";
import type { JoinInviteData } from "../store/useJoinKametiStore";

type Props = {
  inviteData: JoinInviteData | null;
  inviteCode: string;
  loading: boolean;
  errorMessage?: string;
  onChangeInviteCode: (value: string) => void;
  onLoadInvite: () => void;
  alreadyJoined?: boolean;
  onOpenCommittee?: () => void;
};

export function JoinPreview({
  inviteData,
  inviteCode,
  loading,
  errorMessage,
  onChangeInviteCode,
  onLoadInvite,
  alreadyJoined,
  onOpenCommittee,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Committee Invitation</Text>
      <GlassCard style={styles.inputCard}>
        <Text style={styles.inputLabel}>Enter invite code or paste link</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={inviteCode}
            onChangeText={onChangeInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="e.g. 8H2K9QRT"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable
            style={[styles.loadButton, loading && styles.loadButtonDisabled]}
            onPress={onLoadInvite}
            disabled={loading || inviteCode.trim().length < 4}
          >
            <Text style={styles.loadButtonText}>{loading ? "Loading..." : "Load"}</Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {alreadyJoined ? (
          <Pressable style={styles.alreadyButton} onPress={onOpenCommittee}>
            <Text style={styles.alreadyButtonText}>You are already in this committee - Open dashboard</Text>
          </Pressable>
        ) : null}
      </GlassCard>
      {inviteData ? (
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{inviteData.managerAvatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.committeeName}>{inviteData.committeeName}</Text>
            <Text style={styles.managerAlias}>{`Managed by ${inviteData.managerAlias}`}</Text>
          </View>
        </View>

        <View style={styles.metaWrap}>
          <MetaItem label="Contribution" value={`$${inviteData.contributionAmountUSDC} USDC`} />
          <MetaItem label="Frequency" value={inviteData.frequency} />
          <MetaItem label="Your payout position" value={`#${inviteData.payoutPosition}`} />
        </View>

        <View style={styles.badgeWrap}>
          {inviteData.kycRequired ? <Badge label="KYC Required" tone="warning" /> : null}
          {inviteData.nomineeRequired ? <Badge label="Nominee Required" tone="info" /> : null}
        </View>
      </GlassCard>
      ) : (
        <GlassCard style={styles.emptyStateCard}>
          <Text style={styles.emptyStateText}>
            Paste a valid invite code to preview committee details.
          </Text>
        </GlassCard>
      )}
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: "warning" | "info" }) {
  return (
    <Text
      style={[
        styles.badge,
        tone === "warning" ? styles.badgeWarning : styles.badgeInfo,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.h2,
    fontWeight: "700",
  },
  inputCard: {
    padding: 12,
    gap: 8,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    color: colors.textPrimary,
  },
  loadButton: {
    minHeight: 44,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  loadButtonDisabled: { opacity: 0.55 },
  loadButtonText: { color: colors.textInverse, fontWeight: "700" },
  errorText: { color: colors.danger, fontSize: typography.caption },
  alreadyButton: {
    marginTop: 2,
    minHeight: 40,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.45)",
    backgroundColor: "rgba(0,230,118,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  alreadyButtonText: { color: colors.brandGreen, fontSize: typography.caption, fontWeight: "700" },
  card: {
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(64,196,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(64,196,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "800",
  },
  committeeName: {
    color: colors.textPrimary,
    fontSize: typography.h3,
    fontWeight: "700",
  },
  managerAlias: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    marginTop: 2,
  },
  metaWrap: {
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  metaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  badgeWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: typography.caption,
    fontWeight: "700",
  },
  badgeWarning: {
    color: "#FFB300",
    backgroundColor: "rgba(255,179,0,0.15)",
    borderColor: "rgba(255,179,0,0.4)",
    borderWidth: 1,
  },
  badgeInfo: {
    color: "#40C4FF",
    backgroundColor: "rgba(64,196,255,0.15)",
    borderColor: "rgba(64,196,255,0.4)",
    borderWidth: 1,
  },
  emptyStateCard: {
    padding: 14,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
});
