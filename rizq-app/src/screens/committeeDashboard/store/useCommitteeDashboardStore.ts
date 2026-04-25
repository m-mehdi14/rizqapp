import { create } from "zustand";

export type MemberPaymentStatus = "paid" | "pending" | "overdue" | "future";
export type TxType = "Contribution" | "Payout" | "Penalty";

export type Committee = {
  id: string;
  name: string;
  type: "Wedding" | "Hajj" | "Education" | "General";
  cycleCurrent: number;
  cycleTotal: number;
  userPayoutMonth: number;
  userPayoutInDays: number;
  health: "green" | "amber" | "red";
  nextPaymentAmount: number;
  nextPaymentDueDate: string;
  daysRemaining: number;
  hasPaidCurrentCycle: boolean;
  paidAt?: string;
  poolCurrentUSDC: number;
  poolTargetUSDC: number;
  paidMembersCount: number;
  totalMembersCount: number;
};

export type Member = {
  id: string;
  name: string;
  avatar: string;
  status: MemberPaymentStatus;
  payoutTurn: number;
  history: Array<{ cycle: number; status: MemberPaymentStatus; amount: number; date: string }>;
};

export type PayoutTurn = {
  turn: number;
  memberName: string;
  dueDate: string;
  paidDate?: string;
  completed: boolean;
  isCurrentUser: boolean;
};

export type TransactionEvent = {
  id: string;
  type: TxType;
  amount: number;
  date: string;
  explorerUrl: string;
};

type DashboardState = {
  mockCommittee: Committee;
  mockMembers: Member[];
  mockPayoutSchedule: PayoutTurn[];
  mockTransactions: TransactionEvent[];
  paymentMatrix: MemberPaymentStatus[][];
  announcementText: string;
  setAnnouncementText: (text: string) => void;
  markUserPaid: () => void;
  reorderPayout: (from: number, to: number) => void;
};

const initialCommittee: Committee = {
  id: "cm-1",
  name: "Wedding Support Kameti",
  type: "Wedding",
  cycleCurrent: 3,
  cycleTotal: 10,
  userPayoutMonth: 5,
  userPayoutInDays: 62,
  health: "amber",
  nextPaymentAmount: 50,
  nextPaymentDueDate: "2026-05-09",
  daysRemaining: 4,
  hasPaidCurrentCycle: false,
  poolCurrentUSDC: 500,
  poolTargetUSDC: 1000,
  paidMembersCount: 5,
  totalMembersCount: 10,
};

const initialMembers: Member[] = [
  { id: "m1", name: "Ali Khan", avatar: "AK", status: "paid", payoutTurn: 1, history: [{ cycle: 1, status: "paid", amount: 50, date: "2026-03-01" }, { cycle: 2, status: "paid", amount: 50, date: "2026-04-01" }] },
  { id: "m2", name: "Sara Noor", avatar: "SN", status: "pending", payoutTurn: 2, history: [{ cycle: 1, status: "paid", amount: 50, date: "2026-03-01" }, { cycle: 2, status: "pending", amount: 50, date: "2026-04-04" }] },
  { id: "m3", name: "Umar Rizvi", avatar: "UR", status: "overdue", payoutTurn: 3, history: [{ cycle: 1, status: "paid", amount: 50, date: "2026-03-01" }, { cycle: 2, status: "overdue", amount: 50, date: "2026-04-10" }] },
  { id: "m4", name: "You", avatar: "YU", status: "pending", payoutTurn: 5, history: [{ cycle: 1, status: "paid", amount: 50, date: "2026-03-02" }, { cycle: 2, status: "paid", amount: 50, date: "2026-04-02" }] },
  { id: "m5", name: "Amina Zaid", avatar: "AZ", status: "future", payoutTurn: 7, history: [{ cycle: 1, status: "future", amount: 50, date: "-" }, { cycle: 2, status: "future", amount: 50, date: "-" }] },
];

const initialPayoutSchedule: PayoutTurn[] = [
  { turn: 1, memberName: "Ali Khan", dueDate: "2026-03-15", paidDate: "2026-03-15", completed: true, isCurrentUser: false },
  { turn: 2, memberName: "Sara Noor", dueDate: "2026-04-15", paidDate: "2026-04-15", completed: true, isCurrentUser: false },
  { turn: 3, memberName: "Umar Rizvi", dueDate: "2026-05-15", completed: false, isCurrentUser: false },
  { turn: 4, memberName: "Hina Raza", dueDate: "2026-06-15", completed: false, isCurrentUser: false },
  { turn: 5, memberName: "You", dueDate: "2026-07-15", completed: false, isCurrentUser: true },
];

const initialTransactions: TransactionEvent[] = [
  { id: "t1", type: "Contribution", amount: 50, date: "2026-05-01", explorerUrl: "https://explorer.solana.com/tx/mock1?cluster=devnet" },
  { id: "t2", type: "Payout", amount: 500, date: "2026-04-15", explorerUrl: "https://explorer.solana.com/tx/mock2?cluster=devnet" },
  { id: "t3", type: "Penalty", amount: 10, date: "2026-04-10", explorerUrl: "https://explorer.solana.com/tx/mock3?cluster=devnet" },
];

const initialMatrix: MemberPaymentStatus[][] = [
  ["paid", "paid", "paid", "future", "future"],
  ["paid", "pending", "pending", "future", "future"],
  ["paid", "paid", "overdue", "future", "future"],
  ["paid", "paid", "pending", "future", "future"],
  ["future", "future", "future", "future", "future"],
];

export const useCommitteeDashboardStore = create<DashboardState>((set) => ({
  mockCommittee: initialCommittee,
  mockMembers: initialMembers,
  mockPayoutSchedule: initialPayoutSchedule,
  mockTransactions: initialTransactions,
  paymentMatrix: initialMatrix,
  announcementText: "",
  setAnnouncementText: (text) => set({ announcementText: text }),
  markUserPaid: () =>
    set((state) => ({
      mockCommittee: {
        ...state.mockCommittee,
        hasPaidCurrentCycle: true,
        paidAt: "2026-05-02 11:42 PKT",
        paidMembersCount: Math.min(
          state.mockCommittee.totalMembersCount,
          state.mockCommittee.paidMembersCount + 1,
        ),
      },
      mockMembers: state.mockMembers.map((m) =>
        m.name === "You" ? { ...m, status: "paid" } : m,
      ),
    })),
  reorderPayout: (from, to) =>
    set((state) => {
      if (from === to || from < 0 || to < 0 || from >= state.mockPayoutSchedule.length || to >= state.mockPayoutSchedule.length) {
        return state;
      }
      const next = [...state.mockPayoutSchedule];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { mockPayoutSchedule: next.map((entry, index) => ({ ...entry, turn: index + 1 })) };
    }),
}));
