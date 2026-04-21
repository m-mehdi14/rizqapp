import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";
import { GoalCard } from "../components/GoalCard";
import { createGoal } from "../api/rizqApi";
import { useAppStore } from "../store/useAppStore";

const TYPES = ["Eid", "Wedding", "Hajj", "Education", "Emergency", "Custom"] as const;

export function CreateGoalScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState<string>(TYPES[0]);
  const [goalName, setGoalName] = useState("My Goal");
  const [amount, setAmount] = useState("100");
  const [deadlineWeeks] = useState(8);
  const amt = Number(amount) || 0;
  const weekly = deadlineWeeks > 0 ? amt / deadlineWeeks : 0;
  const createGoalMutation = useMutation({
    mutationFn: async () => {
      if (!wallet) throw new Error("Connect wallet first");
      return createGoal({
        wallet,
        name: goalName,
        type: goalType,
        targetLamports: Math.round(amt * 1_000_000),
        deadline: new Date(Date.now() + deadlineWeeks * 7 * 86400000).toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["goals", wallet] });
      navigation.dispatch(
        CommonActions.navigate({
          name: "GoalsTab",
        })
      );
      setStep(1);
    },
  });

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Create goal — step {step} of 3</Text>
        {step === 1 && (
          <View style={styles.grid}>
            {TYPES.map((t) => {
              const [g0, g1] = goalGradient(t);
              return (
                <Pressable
                  key={t}
                  onPress={() => setGoalType(t)}
                  style={[
                    styles.typeCard,
                    { borderColor: goalType === t ? g0 : "rgba(255,255,255,0.12)" },
                    goalType === t && styles.typeCardOn,
                  ]}
                >
                  <View style={[styles.emojiWrap, { backgroundColor: `${g0}33` }]}>
                    <Text style={styles.typeIcon}>{goalEmoji(t)}</Text>
                  </View>
                  <Text style={styles.typeText}>{t}</Text>
                  <Text style={styles.typeHint}>
                    {t === "Eid" ? "Celebrate in style" : t === "Wedding" ? "Your big day" : "Build your plan"}
                  </Text>
                  <View style={[styles.typeGlow, { backgroundColor: `${g1}22` }]} />
                </Pressable>
              );
            })}
          </View>
        )}
        {step === 2 && (
          <>
            <Text style={styles.label}>Goal name</Text>
            <TextInput
              value={goalName}
              onChangeText={setGoalName}
              style={styles.nameInput}
              placeholder="Eid Outfit 2026"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>How much do you want to save?</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                placeholder="100"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.usdc}>USDC</Text>
            </View>
            <Text style={styles.pkr}>≈ PKR {(amt * 278).toLocaleString()}</Text>
            <View style={styles.presets}>
              {[10, 100, 500, 1000].map((n) => (
                <Pressable key={n} style={styles.preset} onPress={() => setAmount(String(n))}>
                  <Text style={styles.presetText}>${n >= 1000 ? "1k+" : n}</Text>
                </Pressable>
              ))}
            </View>
            <GlassCard style={styles.meaningCard}>
              <Text style={styles.meaningText}>
                💡 At ${amt || 0} USDC, you&apos;d need to save ${weekly.toFixed(2)} each week.
                That&apos;s one less lunch out.
              </Text>
            </GlassCard>
          </>
        )}
        {step === 3 && (
          <GoalCard
            goal={{
              id: "preview",
              name: goalName || `${goalType} Goal`,
              type: goalType,
              progress: 0,
              savedLamports: 0,
              targetLamports: amt * 1_000_000,
              daysLeft: deadlineWeeks * 7,
              yesCount: 0,
              noCount: 0,
            }}
            onPress={() => {}}
          />
        )}
        <Pressable
          style={styles.next}
          onPress={() => {
            if (step < 3) {
              setStep((s) => Math.min(3, s + 1));
              return;
            }
            createGoalMutation.mutate();
          }}
          disabled={createGoalMutation.isPending}
        >
          <Text style={styles.nextText}>
            {step === 3
              ? createGoalMutation.isPending
                ? "Creating..."
                : "Create (Phantom)"
              : "Next"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.screenX,
    paddingTop: spacing.section,
  },
  title: { color: colors.textPrimary, fontSize: typography.h1, fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: spacing.section,
  },
  typeCard: {
    width: "47%",
    minHeight: 120,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  typeCardOn: { borderWidth: 2 },
  emojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIcon: { fontSize: 22 },
  typeText: { color: colors.textPrimary, fontWeight: "700", marginTop: 12 },
  typeHint: { color: colors.textSecondary, marginTop: 4, fontSize: 12 },
  typeGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -40,
    top: -50,
  },
  label: { color: colors.textSecondary, marginTop: spacing.section },
  nameInput: {
    marginTop: 8,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
  },
  amountRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  currency: { color: colors.textPrimary, fontSize: 36, fontWeight: "700" },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
  },
  usdc: { color: colors.textSecondary, fontWeight: "600" },
  pkr: { color: colors.textSecondary, marginTop: 6, marginBottom: 10 },
  presets: { flexDirection: "row", gap: 8, marginVertical: 10 },
  preset: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  presetText: { color: colors.textPrimary, fontSize: 12 },
  meaningCard: { padding: spacing.card, marginTop: 10 },
  meaningText: { color: colors.textSecondary, lineHeight: 20 },
  next: {
    marginTop: spacing.section,
    backgroundColor: colors.brandGreen,
    paddingVertical: 14,
    borderRadius: radii.button,
    alignItems: "center",
  },
  nextText: { color: colors.textInverse, fontWeight: "700" },
});
