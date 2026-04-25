import { create } from "zustand";

export type PurposeType =
  | "Hajj/Umrah"
  | "Wedding fund"
  | "Education"
  | "General savings"
  | "Custom";

export type PaymentFrequency =
  | "Weekly"
  | "Monthly"
  | "Bi-monthly"
  | "Quarterly";

export type InviteMethod = "Shareable link" | "Phone number" | "Rizq @username";
export type PayoutOrder =
  | "Manager sets order"
  | "Random lottery (Solana VRF)"
  | "First joined = first paid";

export type GracePeriod = "1 day" | "3 days" | "7 days";
export type MissedPaymentAction =
  | "Warning"
  | "Suspend payout turn"
  | "Remove member";

export type PenaltyDestination =
  | "No penalty"
  | "Redistribute to members"
  | "Rizq Welfare Pool";

export type CreateKametiDraft = {
  committeeName: string;
  description: string;
  purposeType: PurposeType;
  amountPerMember: string;
  paymentFrequency: PaymentFrequency;
  maxMembers: number;
  kycRequired: boolean;
  nomineeRequired: boolean;
  inviteMethod: InviteMethod;
  payoutOrder: PayoutOrder;
  managerCanChangeOrder: boolean;
  gracePeriod: GracePeriod;
  missedPaymentAction: MissedPaymentAction;
  penaltyDestination: PenaltyDestination;
  welfareOptIn: boolean;
};

type CreateKametiState = {
  draft: CreateKametiDraft;
  updateDraft: (patch: Partial<CreateKametiDraft>) => void;
  resetDraft: () => void;
};

const initialDraft: CreateKametiDraft = {
  committeeName: "",
  description: "",
  purposeType: "General savings",
  amountPerMember: "50",
  paymentFrequency: "Monthly",
  maxMembers: 10,
  kycRequired: true,
  nomineeRequired: false,
  inviteMethod: "Shareable link",
  payoutOrder: "Manager sets order",
  managerCanChangeOrder: false,
  gracePeriod: "3 days",
  missedPaymentAction: "Suspend payout turn",
  penaltyDestination: "No penalty",
  welfareOptIn: false,
};

export const useCreateKametiStore = create<CreateKametiState>((set) => ({
  draft: initialDraft,
  updateDraft: (patch) =>
    set((state) => ({
      draft: { ...state.draft, ...patch },
    })),
  resetDraft: () => set({ draft: initialDraft }),
}));
