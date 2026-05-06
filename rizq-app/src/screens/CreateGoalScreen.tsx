import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { ScreenShell } from "../components/ScreenShell";
import { GlassCard } from "../components/GlassCard";
import { goalEmoji, goalGradient } from "../theme/goalTheme";
import { CommitteeCard } from "../components/CommitteeCard";
import { useAppStore, type Committee } from "../store/useAppStore";

const TYPES = ["Eid", "Wedding", "Hajj", "Education", "Emergency", "Custom"] as const;

export function CommitteeQuickCreateScreen() {
  const navigation = useNavigation();
  const addCommittee = useAppStore((s) => s.addCommittee);
  const [step, setStep] = useState(1);
  const [committeeType, setCommitteeType] = useState<string>(TYPES[0]);
  const [committeeName, setCommitteeName] = useState("My Committee");
  const [amount, setAmount] = useState("100");
  const [deadlineWeeks] = useState(8);
  const amt = Number(amount) || 0;
  const weekly = deadlineWeeks > 0 ? amt / deadlineWeeks : 0;

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.title}>Create committee — step {step} of 3</Text>
        {step === 1 && (
          <View style={styles.grid}>
            {TYPES.map((t) => {
              const [g0, g1] = goalGradient(t);
              return (
                <Pressable
                  key={t}
                  onPress={() => setCommitteeType(t)}
                  style={[
                    styles.typeCard,
                    { borderColor: committeeType === t ? g0 : "rgba(10,51,40,0.18)" },
                    committeeType === t && styles.typeCardOn,
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
            <Text style={styles.label}>Committee name</Text>
            <TextInput
              value={committeeName}
              onChangeText={setCommitteeName}
              style={styles.nameInput}
              placeholder="Hajj 2026 Circle"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Contribution per cycle</Text>
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
                At ${amt || 0} USDC per cycle, each member contributes ${weekly.toFixed(2)} weekly equivalent.
              </Text>
            </GlassCard>
          </>
        )}
        {step === 3 && (
          <CommitteeCard
            committee={{
              id: "preview",
              name: committeeName || `${committeeType} Committee`,
              type: committeeType,
              progress: 0,
              savedLamports: 0,
              targetLamports: amt * 1_000_000,
              daysLeft: deadlineWeeks * 7,
              yesCount: 0,
              noCount: 0,
              memberCount: 1,
              maxMembers: 10,
              currentCycle: 1,
              totalCycles: deadlineWeeks,
              contributionLamports: amt * 1_000_000,
              status: "forming",
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
            const draft: Committee = {
              id: `draft-${Date.now()}`,
              name: committeeName || `${committeeType} Committee`,
              type: committeeType,
              progress: 0,
              savedLamports: 0,
              targetLamports: amt * 1_000_000,
              daysLeft: deadlineWeeks * 7,
              yesCount: 0,
              noCount: 0,
              memberCount: 1,
              maxMembers: 10,
              currentCycle: 1,
              totalCycles: deadlineWeeks,
              contributionLamports: amt * 1_000_000,
              status: "forming",
            };
            addCommittee(draft);
            navigation.dispatch(
              CommonActions.navigate({
                name: "CommitteesTab",
                params: { screen: "CreateCommittee" },
              })
            );
            setStep(1);
          }}
        >
          <Text style={styles.nextText}>
            {step === 3 ? "Continue to full wizard" : "Next"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

// Backward-compatible export while route names are being migrated.
export const CreateGoalScreen = CommitteeQuickCreateScreen;

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
    backgroundColor: "rgba(10,51,40,0.04)",
    borderWidth: 1,
    borderColor: "rgba(10,51,40,0.16)",
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
    borderColor: "rgba(10,51,40,0.16)",
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
    borderColor: "rgba(10,51,40,0.16)",
    backgroundColor: "rgba(10,51,40,0.04)",
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
