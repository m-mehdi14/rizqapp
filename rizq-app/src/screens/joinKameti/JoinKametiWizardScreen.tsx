import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CommitteesStackParamList } from "../../navigation/RootNavigator";
import { colors, spacing } from "../../theme/tokens";
import {
  depositCommitteeCollateral,
  fetchCommitteeInvite,
  fetchCommitteeJoinSlot,
  fetchCommittees,
  fetchSessionCommittees,
  joinCommittee,
  updateSessionKycStatus,
  verifyKyc,
} from "../../api/rizqApi";
import { COMMITTEE_SAFETY_PROGRAM_ID } from "../../config";
import { useSolanaTransactionSigner } from "../../hooks/useSolanaTransactionSigner";
import { memberDepositAndJoinOnChain } from "../../solana/committeeSafetyProgram";
import { useAppStore } from "../../store/useAppStore";
import { StepIndicator } from "../createKameti/components/StepIndicator";
import { WizardFooter } from "../createKameti/components/WizardFooter";
import { JoinConfirm } from "./steps/JoinConfirm";
import { JoinPreview } from "./steps/JoinPreview";
import { JoinRequirements } from "./steps/JoinRequirements";
import { JoinRules } from "./steps/JoinRules";
import {
  mapJoinInvitePreviewToJoinInviteData,
  useJoinKametiStore,
} from "./store/useJoinKametiStore";

const TOTAL_STEPS = 4;
const FLOATING_TAB_BAR_CLEARANCE = 92;
const WIZARD_FOOTER_HEIGHT = 64;
type Navigation = NativeStackNavigationProp<CommitteesStackParamList>;

function normalizeInviteInput(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const byPath = raw.match(/invite\/([A-Za-z0-9_-]{4,})/i);
  if (byPath?.[1]) return byPath[1].toUpperCase();
  return raw.toUpperCase();
}

export function JoinKametiWizardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const routeInviteCode = normalizeInviteInput(
    (route.params as { inviteCode?: string } | undefined)?.inviteCode ?? ""
  );
  const queryClient = useQueryClient();
  const wallet = useAppStore((s) => s.wallet);
  const authToken = useAppStore((s) => s.authToken);
  const kycStatus = useAppStore((s) => s.kycStatus);
  const setKycStatus = useAppStore((s) => s.setKycStatus);
  const addCommittee = useAppStore((s) => s.addCommittee);
  const { signAndSendPrepared } = useSolanaTransactionSigner();
  const {
    hasAcceptedRules,
    setHasAcceptedRules,
    userHasKYC,
    userHasNominee,
    setUserHasKYC,
    setUserHasNominee,
    resetJoinState,
  } = useJoinKametiStore();
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState(routeInviteCode);
  const [inviteData, setInviteData] = useState<ReturnType<typeof mapJoinInvitePreviewToJoinInviteData> | null>(null);
  const [inviteCommitteeId, setInviteCommitteeId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  const contentBottomSpacing =
    WIZARD_FOOTER_HEIGHT + FLOATING_TAB_BAR_CLEARANCE + insets.bottom + 28;

  const loadInviteMutation = useMutation({
    mutationFn: async (code: string) => {
      const payload = await fetchCommitteeInvite(code, {
        authToken: authToken ?? undefined,
        wallet: wallet ?? undefined,
      });
      return payload;
    },
    onSuccess: (payload) => {
      const joined = Boolean(payload.already_joined);
      setAlreadyJoined(joined);
      setJoinError(
        joined
          ? "You are already a member of this committee. Open it directly from here."
          : null
      );
      setInviteData(mapJoinInvitePreviewToJoinInviteData(payload));
      setInviteCommitteeId(payload.committee_id);
      if (joined) setStep(1);
    },
    onError: (error) => {
      setAlreadyJoined(false);
      setJoinError(error instanceof Error ? error.message : "Invite code not found");
      setInviteData(null);
      setInviteCommitteeId(null);
    },
  });

  React.useEffect(() => {
    if (!routeInviteCode) return;
    const normalized = normalizeInviteInput(routeInviteCode);
    setInviteCode(normalized);
    setJoinError(null);
    void loadInviteMutation.mutateAsync(normalized);
  }, [authToken, loadInviteMutation, routeInviteCode, wallet]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!inviteCommitteeId) throw new Error("Load invite first");
      if (!wallet && !authToken) throw new Error("Connect wallet or sign in first");
      const signatureBase = (wallet ?? authToken ?? "session").replace(/[^a-zA-Z0-9]/g, "");
      let collateralSignature = `wallet-proof-collateral-${Date.now()}-${signatureBase.slice(0, 20)}`;

      const orderType = (inviteData?.payoutOrderType ?? "").toLowerCase();
      const canChainMemberJoin =
        Boolean(wallet) &&
        Boolean(authToken) &&
        Boolean(COMMITTEE_SAFETY_PROGRAM_ID) &&
        Boolean(inviteData?.managerWallet) &&
        orderType !== "random";

      if (canChainMemberJoin) {
        const slot = await fetchCommitteeJoinSlot({
          committeeId: inviteCommitteeId,
          token: authToken as string,
        });
        const { depositSig } = await memberDepositAndJoinOnChain({
          managerWalletAddress: inviteData!.managerWallet as string,
          memberWalletAddress: wallet as string,
          payoutPosition: slot.payout_position,
          signAndSendPrepared,
        });
        collateralSignature = depositSig;
      }

      await depositCommitteeCollateral({
        committeeId: inviteCommitteeId,
        txSignature: collateralSignature,
        wallet: wallet ?? undefined,
        authToken: authToken ?? undefined,
      });
      return await joinCommittee({
        committeeId: inviteCommitteeId,
        wallet: wallet ?? undefined,
        authToken: authToken ?? undefined,
      });
    },
    onSuccess: async (result) => {
      setJoinError(null);
      const committees = authToken
        ? await queryClient.fetchQuery({
            queryKey: ["committees-session", authToken],
            queryFn: async () => await fetchSessionCommittees(authToken),
          })
        : await queryClient.fetchQuery({
            queryKey: ["committees", wallet],
            queryFn: async () => await fetchCommittees(wallet as string),
          });
      const joined = committees.find((committee) => committee.id === result.committee_id);
      if (joined) addCommittee(joined);
      resetJoinState();
      navigation.navigate("JoinCommitteeSuccess", { committeeId: result.committee_id });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to join committee";
      if (message.includes("kyc_required")) {
        setJoinError("This committee requires verified KYC.");
      } else if (message.includes("nominee_required")) {
        setJoinError("This committee requires a nominee profile.");
      } else if (message.includes("collateral_required")) {
        setJoinError("Collateral deposit is required before joining this committee.");
      } else {
        setJoinError(message);
      }
    },
  });

  const handleCompleteProfile = useCallback(async () => {
    if (wallet) {
      try {
        await verifyKyc({
          wallet,
          cnicNumber: `demo-${wallet.slice(0, 8)}`,
        });
        setKycStatus("verified");
      } catch {
        // Non-blocking for now; join API will still enforce server-side if required.
      }
    } else if (authToken) {
      try {
        await updateSessionKycStatus({
          token: authToken,
          kycStatus: "verified",
        });
        setKycStatus("verified");
      } catch {
        // Non-blocking for now; join API will still enforce server-side if required.
      }
    }
    setUserHasKYC(true);
    setUserHasNominee(true);
  }, [authToken, setKycStatus, setUserHasKYC, setUserHasNominee, wallet]);

  const requirementsMet = useMemo(() => {
    const kycOk = !(inviteData?.kycRequired ?? true) || userHasKYC;
    const nomineeOk = !(inviteData?.nomineeRequired ?? false) || userHasNominee;
    return kycOk && nomineeOk;
  }, [inviteData?.kycRequired, inviteData?.nomineeRequired, userHasKYC, userHasNominee]);

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(inviteData && inviteCommitteeId) && !alreadyJoined;
    if (step === 2) return hasAcceptedRules;
    if (step === 3) return requirementsMet;
    return true;
  }, [alreadyJoined, hasAcceptedRules, inviteCommitteeId, inviteData, requirementsMet, step]);

  const nextLabel = step === 1 ? "Continue" : step === 2 ? "Accept Rules" : step === 3 ? "Proceed" : "Confirm & Join";

  const currentStep = useMemo(() => {
    if (step === 1) {
      return (
        <JoinPreview
          inviteData={inviteData}
          inviteCode={inviteCode}
          loading={loadInviteMutation.isPending}
          errorMessage={joinError ?? undefined}
          alreadyJoined={alreadyJoined}
          onOpenCommittee={() => {
            if (!inviteCommitteeId) return;
            navigation.navigate("MemberDashboard", { committeeId: inviteCommitteeId });
          }}
          onChangeInviteCode={(value) => setInviteCode(value)}
          onLoadInvite={() => {
            if (!inviteCode.trim()) return;
            loadInviteMutation.mutate(normalizeInviteInput(inviteCode));
          }}
        />
      );
    }
    if (step === 2) {
      if (!inviteData) return null;
      return (
        <JoinRules
          inviteData={inviteData}
          hasAcceptedRules={hasAcceptedRules}
          onToggleAccepted={() => setHasAcceptedRules(!hasAcceptedRules)}
        />
      );
    }
    if (step === 3) {
      if (!inviteData) return null;
      return (
        <JoinRequirements
          inviteData={inviteData}
          userHasKYC={userHasKYC}
          userHasNominee={userHasNominee}
          onCompleteProfile={() => {
            handleCompleteProfile().catch(() => undefined);
          }}
        />
      );
    }
    return inviteData ? <JoinConfirm inviteData={inviteData} /> : null;
  }, [
    handleCompleteProfile,
    hasAcceptedRules,
    inviteCode,
    inviteData,
    joinError,
    loadInviteMutation,
    navigation,
    alreadyJoined,
    inviteCommitteeId,
    setHasAcceptedRules,
    step,
    userHasKYC,
    userHasNominee,
  ]);

  React.useEffect(() => {
    setUserHasKYC(kycStatus === "verified");
  }, [kycStatus, setUserHasKYC]);

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
        {joinMutation.isPending ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator color={colors.brandGreen} />
          </View>
        ) : null}
        <WizardFooter
          isFirstStep={step === 1}
          isLastStep={step === TOTAL_STEPS}
          nextLabel={nextLabel}
          canProceed={canProceed}
          loading={joinMutation.isPending}
          onBack={() => setStep((prev) => Math.max(1, prev - 1))}
          onNext={() => {
            if (step === TOTAL_STEPS) {
              joinMutation.mutate();
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
    backgroundColor: "rgba(245,240,232,0.96)",
  },
});
