import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { CreateKametiDraft, PurposeType } from "../store/useCreateKametiStore";
import { colors, radii, typography } from "../../../theme/tokens";

const PURPOSES: PurposeType[] = [
  "Hajj/Umrah",
  "Wedding fund",
  "Education",
  "General savings",
  "Custom",
];

type Props = {
  draft: CreateKametiDraft;
  onChange: (patch: Partial<CreateKametiDraft>) => void;
};

export function Step1Name({ draft, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 1: Name & Purpose</Text>
      <TextInput
        accessibilityLabel="Committee Name"
        placeholder="Committee name"
        placeholderTextColor={colors.textMuted}
        value={draft.committeeName}
        onChangeText={(text) => onChange({ committeeName: text })}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel="Description"
        placeholder="Optional description"
        placeholderTextColor={colors.textMuted}
        value={draft.description}
        onChangeText={(text) => onChange({ description: text })}
        style={[styles.input, styles.multiline]}
        multiline
      />
      <Text style={styles.label}>Purpose Type</Text>
      <View style={styles.optionsWrap}>
        {PURPOSES.map((purpose) => {
          const active = draft.purposeType === purpose;
          return (
            <Text
              key={purpose}
              onPress={() => onChange({ purposeType: purpose })}
              style={[styles.optionChip, active && styles.optionChipActive]}
            >
              {purpose}
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
  multiline: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
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
