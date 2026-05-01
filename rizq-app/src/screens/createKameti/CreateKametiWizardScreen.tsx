import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommitteesStackParamList } from "../../navigation/RootNavigator";
import { colors, spacing } from "../../theme/tokens";
import {
  confirmCommitteeSafetyBootstrap,
  createCommittee,
  depositCommitteeCollateral,
} from "../../api/rizqApi";
import { useSolanaTransactionSigner } from "../../hooks/useSolanaTransactionSigner";
import { bootstrapManagerOnChainSafety } from "../../solana/committeeSafetyProgram";
import { COMMITTEE_SAFETY_PROGRAM_ID } from "../../config";
import { useAppStore } from "../../store/useAppStore";
import { StepIndicator } from "./components/StepIndicator";
import { WizardFooter } from "./components/WizardFooter";
import { useCreateKametiStore } from "./store/useCreateKametiStore";
import { Step1Name } from "./steps/Step1Name";
import { Step2Economics } from "./steps/Step2Economics";
import { Step3Members } from "./steps/Step3Members";
import { Step4Payout } from "./steps/Step4Payout";
import { Step5Rules } from "./steps/Step5Rules";
import { Step6Review } from "./steps/Step6Review";

const TOTAL_STEPS = 6;
const FLOATING_TAB_BAR_CLEARANCE = 92;
const WIZARD_FOOTER_HEIGHT = 64;
type Navigation = NativeStackNavigationProp<CommitteesStackParamList>;

export function CreateKametiWizardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const authToken = useAppStore((s) => s.authToken);
  const addCommittee = useAppStore((s) => s.addCommittee);
  const { signAndSendPrepared } = useSolanaTransactionSigner();
  const { draft, updateDraft, resetDraft } = useCreateKametiStore();
  const [step, setStep] = useState(1);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const contentBottomSpacing =
    WIZARD_FOOTER_HEIGHT + FLOATING_TAB_BAR_CLEARANCE + insets.bottom + 28;
  const launchMutation = useMutation({
    mutationFn: async () => {
      const payoutOrderType =
        draft.payoutOrder === "Random lottery (Solana VRF)"
          ? "random"
          : draft.payoutOrder === "First joined = first paid"
            ? "first_joined"
            : "manager";
      const latePenaltyAction =
        draft.missedPaymentAction === "Remove member"
          ? "remove"
          : draft.missedPaymentAction === "Suspend payout turn"
            ? "suspend"
            : "warning";
      const penaltyDestination =
        draft.penaltyDestination === "Redistribute to members"
          ? "redistribute"
          : draft.penaltyDestination === "Rizq Welfare Pool"
            ? "welfare"
            : "none";
      const amountPerMember = Number(draft.amountPerMember || 0);
      if (amountPerMember < 5) throw new Error("Minimum contribution is 5 USDC");
      const result = await createCommittee({
        managerWallet: wallet ?? undefined,
        authToken: authToken ?? undefined,
        name: draft.committeeName.trim(),
        description: draft.description.trim(),
        purposeType: draft.purposeType,
        contributionAmountUsdc: amountPerMember,
        frequency: draft.paymentFrequency,
        maxMembers: draft.maxMembers,
        totalCycles: draft.maxMembers,
        payoutOrderType,
        payoutOrderLocked: !draft.managerCanChangeOrder,
        gracePeriodDays: Number(draft.gracePeriod.split(" ")[0] ?? 3),
        latePenaltyAction,
        penaltyGoesTo: penaltyDestination,
        welfareOptInPct: draft.welfareOptIn ? 1 : 0,
        kycRequired: draft.kycRequired,
        nomineeRequired: draft.nomineeRequired,
      });

      const isRandomPayoutOrder = payoutOrderType === "random";
      let managerOnChainDepositSig: string | null = null;

      if (
        !isRandomPayoutOrder &&
        COMMITTEE_SAFETY_PROGRAM_ID &&
        wallet &&
        authToken &&
        typeof amountPerMember === "number"
      ) {
        try {
          const graceDays = Number(String(draft.gracePeriod).split(" ")[0] ?? 3);
          const { initializeSig, depositSig, joinSig } = await bootstrapManagerOnChainSafety({
            managerWalletAddress: wallet,
            contributionAmountMicro: Math.round(amountPerMember * 1_000_000),
            totalCycles: draft.maxMembers,
            gracePeriodDays: graceDays,
            signAndSendPrepared,
          });
          await confirmCommitteeSafetyBootstrap({
            committeeId: result.committee.id,
            token: authToken,
            initializeTxSignature: initializeSig,
            depositTxSignature: depositSig,
            joinTxSignature: joinSig,
          });
          managerOnChainDepositSig = depositSig;
        } catch (error) {
          console.warn("[committee_safety] on-chain bootstrap failed:", error);
        }
      }

      /* Same as join flow: backend collateral row must exist for penalties / dashboard.
         - After on-chain bootstrap: use real deposit tx so verifier matches committee PDAs.
         - Random payout or no chain: wallet-proof record (mirror-only) like members. */
      if (wallet && authToken) {
        const collateralSig =
          managerOnChainDepositSig ??
          `wallet-proof-collateral-${Date.now()}-${wallet.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
        try {
          await depositCommitteeCollateral({
            committeeId: result.committee.id,
            txSignature: collateralSig,
            wallet,
            authToken,
          });
        } catch (error) {
          console.warn("[collateral] manager collateral record failed:", error);
        }
      }

      return result;
    },
    onSuccess: async (result) => {
      setLaunchError(null);
      addCommittee(result.committee);
      resetDraft();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["committees", wallet] }),
        queryClient.invalidateQueries({ queryKey: ["committees-session", authToken] }),
      ]);
      navigation.navigate("CreateCommitteeSuccess", {
        inviteLink: result.inviteLink,
        committeeId: result.committee.id,
        inviteCode: result.inviteCode,
      });
    },
    onError: (error) => {
      setLaunchError(error instanceof Error ? error.message : "Failed to create committee");
    },
  });

  const canProceed = useMemo(() => {
    if (step === 1) return draft.committeeName.trim().length > 1;
    if (step === 2) return Number(draft.amountPerMember) >= 5;
    return true;
  }, [draft.amountPerMember, draft.committeeName, step]);

  const currentStep = useMemo(() => {
    if (step === 1) return <Step1Name draft={draft} onChange={updateDraft} />;
    if (step === 2) return <Step2Economics draft={draft} onChange={updateDraft} />;
    if (step === 3) return <Step3Members draft={draft} onChange={updateDraft} />;
    if (step === 4) return <Step4Payout draft={draft} onChange={updateDraft} />;
    if (step === 5) return <Step5Rules draft={draft} onChange={updateDraft} />;
    return <Step6Review draft={draft} />;
  }, [draft, step, updateDraft]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screenX,
          paddingBottom: contentBottomSpacing,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator step={step} totalSteps={TOTAL_STEPS} />
        {currentStep}
      </ScrollView>

      <View style={{ marginBottom: FLOATING_TAB_BAR_CLEARANCE, paddingBottom: insets.bottom + 8 }}>
        {launchMutation.isPending ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator color={colors.brandGreen} />
          </View>
        ) : null}
        {launchError ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{launchError}</Text>
          </View>
        ) : null}
        <WizardFooter
          isFirstStep={step === 1}
          isLastStep={step === TOTAL_STEPS}
          canProceed={canProceed}
          loading={launchMutation.isPending}
          onBack={() => setStep((prev) => Math.max(1, prev - 1))}
          onNext={() => {
            if (step === TOTAL_STEPS) {
              launchMutation.mutate();
              return;
            }
            setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  loadingBar: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,14,26,0.95)",
  },
  errorBar: {
    minHeight: 24,
    paddingHorizontal: spacing.screenX,
    justifyContent: "center",
  },
  errorText: { color: colors.danger, fontSize: 12 },
});
