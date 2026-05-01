import { create } from "zustand";
import type { JoinInvitePreview } from "../../../api/rizqApi";

export type JoinInviteData = {
  committeeName: string;
  managerAlias: string;
  managerAvatar: string;
  contributionAmountUSDC: number;
  frequency: "Weekly" | "Monthly" | "Bi-monthly" | "Quarterly";
  payoutPosition: number;
  managerWallet: string | null;
  payoutOrderType: string | null;
  kycRequired: boolean;
  nomineeRequired: boolean;
  gracePeriod: "1 day" | "3 days" | "7 days";
  penaltyRule: "Warning" | "Suspend payout turn" | "Remove member";
  firstContributionDueDate: string;
};

export const mockInviteData: JoinInviteData = {
  committeeName: "Rizq Friends Wedding Circle",
  managerAlias: "@hamza_rizq",
  managerAvatar: "HR",
  contributionAmountUSDC: 50,
  frequency: "Monthly",
  payoutPosition: 4,
  managerWallet: null,
  payoutOrderType: null,
  kycRequired: true,
  nomineeRequired: true,
  gracePeriod: "3 days",
  penaltyRule: "Suspend payout turn",
  firstContributionDueDate: "2026-05-05",
};

export function mapJoinInvitePreviewToJoinInviteData(preview: JoinInvitePreview): JoinInviteData {
  const normalizedFrequency = String(preview.frequency).toLowerCase();
  const frequency: JoinInviteData["frequency"] = normalizedFrequency.includes("week")
    ? "Weekly"
    : normalizedFrequency.includes("quarter")
      ? "Quarterly"
      : normalizedFrequency.includes("bi")
        ? "Bi-monthly"
        : "Monthly";

  const gracePeriod: JoinInviteData["gracePeriod"] =
    preview.grace_period === "1 day"
      ? "1 day"
      : preview.grace_period === "7 days"
        ? "7 days"
        : "3 days";

  const penaltyRule: JoinInviteData["penaltyRule"] =
    preview.penalty_rule === "Warning" ||
    preview.penalty_rule === "Suspend payout turn" ||
    preview.penalty_rule === "Remove member"
      ? preview.penalty_rule
      : "Suspend payout turn";

  return {
    committeeName: preview.committee_name,
    managerAlias: preview.manager_alias,
    managerAvatar: preview.manager_avatar,
    contributionAmountUSDC: preview.contribution_amount_usdc,
    frequency,
    payoutPosition: preview.payout_position,
    managerWallet: preview.manager_wallet?.trim() ?? null,
    payoutOrderType: preview.payout_order_type?.trim() ?? null,
    kycRequired: preview.kyc_required,
    nomineeRequired: preview.nominee_required,
    gracePeriod,
    penaltyRule,
    firstContributionDueDate: preview.first_contribution_due_date,
  };
}

type JoinKametiState = {
  hasAcceptedRules: boolean;
  userHasKYC: boolean;
  userHasNominee: boolean;
  setHasAcceptedRules: (value: boolean) => void;
  setUserHasKYC: (value: boolean) => void;
  setUserHasNominee: (value: boolean) => void;
  resetJoinState: () => void;
};

const initialState = {
  hasAcceptedRules: false,
  userHasKYC: false,
  userHasNominee: false,
};

export const useJoinKametiStore = create<JoinKametiState>((set) => ({
  ...initialState,
  setHasAcceptedRules: (value) => set({ hasAcceptedRules: value }),
  setUserHasKYC: (value) => set({ userHasKYC: value }),
  setUserHasNominee: (value) => set({ userHasNominee: value }),
  resetJoinState: () => set(initialState),
}));
