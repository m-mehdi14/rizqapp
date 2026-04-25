import { create } from "zustand";

export type Committee = {
  id: string;
  name: string;
  inviteCode?: string;
  type?: string;
  progress: number;
  savedLamports: number;
  targetLamports: number;
  daysLeft: number;
  yesCount: number;
  noCount: number;
  streakWeeks?: number;
  lastStakeAt?: string;
  memberCount?: number;
  maxMembers?: number;
  currentCycle?: number;
  totalCycles?: number;
  contributionLamports?: number;
  status?: string;
  nextCycleDate?: string;
};
// Legacy alias to keep older goal-based screens compiling during migration.
export type Goal = Committee;

type AppState = {
  authToken: string | null;
  authEmail: string | null;
  userId: string | null;
  displayName: string;
  username: string;
  wallet: string | null;
  walletProvider: "phantom" | "embedded" | null;
  hasCompletedOnboarding: boolean;
  kycStatus: "unverified" | "pending" | "verified";
  phoneVerificationSkipped: boolean;
  languagePreference: "english" | "urdu" | "both";
  usdcBalance: number;
  committees: Committee[];
  activeGoals: Goal[];
  setUserId: (id: string | null) => void;
  setAuthSession: (input: {
    token: string | null;
    email?: string | null;
    userId?: string | null;
  }) => void;
  setProfileIdentity: (input: { displayName?: string; username?: string }) => void;
  setWallet: (w: string | null) => void;
  setWalletProvider: (provider: "phantom" | "embedded" | null) => void;
  setWalletConnection: (
    wallet: string | null,
    provider?: "phantom" | "embedded" | null
  ) => void;
  setHasCompletedOnboarding: (v: boolean) => void;
  setKycStatus: (status: AppState["kycStatus"]) => void;
  setPhoneVerificationSkipped: (v: boolean) => void;
  setLanguagePreference: (v: AppState["languagePreference"]) => void;
  setBalance: (n: number) => void;
  setCommittees: (committees: Committee[]) => void;
  addCommittee: (c: Committee) => void;
  updateCommittee: (id: string, patch: Partial<Committee>) => void;
  // Legacy actions kept for compatibility with old goal-based screens.
  setGoals: (goals: Goal[]) => void;
  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  clearSession: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  authToken: null,
  authEmail: null,
  userId: null,
  displayName: "",
  username: "",
  wallet: null,
  walletProvider: null,
  hasCompletedOnboarding: false,
  kycStatus: "unverified",
  phoneVerificationSkipped: false,
  languagePreference: "both",
  usdcBalance: 0,
  committees: [],
  activeGoals: [],
  setUserId: (userId) => set({ userId }),
  setAuthSession: ({ token, email, userId }) =>
    set((state) => ({
      authToken: token,
      authEmail: email ?? state.authEmail,
      userId: userId ?? state.userId,
    })),
  setProfileIdentity: ({ displayName, username }) =>
    set((state) => ({
      displayName: displayName ?? state.displayName,
      username: username ?? state.username,
    })),
  setWallet: (wallet) => set({ wallet }),
  setWalletProvider: (walletProvider) => set({ walletProvider }),
  setWalletConnection: (wallet, provider) =>
    set((state) => ({
      wallet,
      walletProvider: provider ?? (wallet ? state.walletProvider : null),
    })),
  setHasCompletedOnboarding: (hasCompletedOnboarding) =>
    set({ hasCompletedOnboarding }),
  setKycStatus: (kycStatus) => set({ kycStatus }),
  setPhoneVerificationSkipped: (phoneVerificationSkipped) => set({ phoneVerificationSkipped }),
  setLanguagePreference: (languagePreference) => set({ languagePreference }),
  setBalance: (usdcBalance) => set({ usdcBalance }),
  setCommittees: (committees) => set({ committees, activeGoals: committees }),
  addCommittee: (committee) =>
    set((s) => {
      const next = [...s.committees, committee];
      return { committees: next, activeGoals: next };
    }),
  updateCommittee: (id, patch) =>
    set((s) => ({
      committees: s.committees.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      activeGoals: s.activeGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    })),
  setGoals: (goals) => set({ committees: goals, activeGoals: goals }),
  addGoal: (goal) =>
    set((s) => {
      const next = [...s.committees, goal];
      return { committees: next, activeGoals: next };
    }),
  updateGoal: (id, patch) =>
    set((s) => ({
      committees: s.committees.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      activeGoals: s.activeGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    })),
  clearSession: () =>
    set({
      authToken: null,
      authEmail: null,
      userId: null,
      wallet: null,
      walletProvider: null,
      committees: [],
      activeGoals: [],
      hasCompletedOnboarding: false,
    }),
}));
