import React from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors, radii, typography } from "../../../theme/tokens";
import type { CreateKametiDraft, InviteMethod } from "../store/useCreateKametiStore";

const INVITE_METHODS: InviteMethod[] = [
  "Shareable link",
  "Phone number",
  "Rizq @username",
];

type Props = {
  draft: CreateKametiDraft;
  onChange: (patch: Partial<CreateKametiDraft>) => void;
};

export function Step3Members({ draft, onChange }: Props) {
  const setMaxMembers = (rawValue: string) => {
    const parsed = Number(rawValue.replace(/[^\d]/g, ""));
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(2, Math.min(50, parsed));
    onChange({ maxMembers: clamped });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Member Settings</Text>

      <Text style={styles.label}>{`Max members: ${draft.maxMembers}`}</Text>
      <TextInput
        accessibilityLabel="Maximum members"
        keyboardType="number-pad"
        value={`${draft.maxMembers}`}
        onChangeText={setMaxMembers}
        style={styles.input}
      />
      <View style={styles.rangeWrap}>
        {[2, 10, 20, 30, 40, 50].map((memberCount) => (
          <Text
            key={memberCount}
            style={[
              styles.rangeChip,
              draft.maxMembers === memberCount && styles.rangeChipActive,
            ]}
            onPress={() => onChange({ maxMembers: memberCount })}
          >
            {memberCount}
          </Text>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>KYC required</Text>
        <Switch
          value={draft.kycRequired}
          onValueChange={(value) => onChange({ kycRequired: value })}
          trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
          thumbColor={draft.kycRequired ? colors.brandGreen : "#9aa8b6"}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Nominee required</Text>
        <Switch
          value={draft.nomineeRequired}
          onValueChange={(value) => onChange({ nomineeRequired: value })}
          trackColor={{ false: "#425469", true: "rgba(0,230,118,0.45)" }}
          thumbColor={draft.nomineeRequired ? colors.brandGreen : "#9aa8b6"}
        />
      </View>

      <Text style={styles.label}>Invite Method</Text>
      <View style={styles.optionsWrap}>
        {INVITE_METHODS.map((method) => {
          const active = draft.inviteMethod === method;
          return (
            <Text
              key={method}
              onPress={() => onChange({ inviteMethod: method })}
              style={[styles.optionChip, active && styles.optionChipActive]}
            >
              {method}
            </Text>
          );
        })}
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
    marginBottom: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  input: {
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    fontSize: typography.body,
  },
  rangeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rangeChip: {
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  rangeChipActive: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.15)",
  },
  switchRow: {
    minHeight: 50,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "600",
  },
  optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  optionChipActive: {
    borderColor: "rgba(0,230,118,0.5)",
    backgroundColor: "rgba(0,230,118,0.15)",
  },
});
