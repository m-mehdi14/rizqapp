import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../theme/tokens";

type Props = {
  isFirstStep: boolean;
  isLastStep: boolean;
  nextLabel?: string;
  canProceed: boolean;
  loading?: boolean;
  onBack: () => void;
  onNext: () => void;
};

export function WizardFooter({
  isFirstStep,
  isLastStep,
  nextLabel,
  canProceed,
  loading = false,
  onBack,
  onNext,
}: Props) {
  return (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isFirstStep || loading }}
        disabled={isFirstStep || loading}
        onPress={onBack}
        style={[styles.backButton, (isFirstStep || loading) && styles.disabledButton]}
      >
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canProceed || loading }}
        disabled={!canProceed || loading}
        onPress={onNext}
        style={[styles.nextButton, (!canProceed || loading) && styles.disabledButton]}
      >
        <Text style={styles.nextText}>
          {loading ? "Processing..." : (nextLabel ?? (isLastStep ? "Launch Committee" : "Next"))}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.screenX,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(10,51,40,0.12)",
    backgroundColor: "rgba(245,240,232,0.96)",
  },
  backButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    flex: 2,
    minHeight: 50,
    borderRadius: radii.button,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: "700",
  },
  nextText: {
    color: colors.info,
    fontSize: typography.body,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.45,
  },
});
