import { create } from "zustand";

export type Goal = {
  id: string;
  name: string;
  type?: string;
  progress: number;
  savedLamports: number;
  targetLamports: number;
  daysLeft: number;
  yesCount: number;
  noCount: number;
  streakWeeks?: number;
  lastStakeAt?: string;
};

type AppState = {
  wallet: string | null;
  usdcBalance: number;
  activeGoals: Goal[];
  setWallet: (w: string | null) => void;
  setBalance: (n: number) => void;
  setGoals: (goals: Goal[]) => void;
  addGoal: (g: Goal) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
};

export const useAppStore = create<AppState>((set) => ({
  wallet: null,
  usdcBalance: 0,
  activeGoals: [],
  setWallet: (wallet) => set({ wallet }),
  setBalance: (usdcBalance) => set({ usdcBalance }),
  setGoals: (activeGoals) => set({ activeGoals }),
  addGoal: (goal) =>
    set((s) => ({ activeGoals: [...s.activeGoals, goal] })),
  updateGoal: (id, patch) =>
    set((s) => ({
      activeGoals: s.activeGoals.map((g) =>
        g.id === id ? { ...g, ...patch } : g
      ),
    })),
}));
