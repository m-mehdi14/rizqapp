import { API_URL } from "../config";
import type { Goal } from "../store/useAppStore";

type GoalRow = {
  id: string;
  goal_name: string;
  goal_type: string;
  target_usdc: number;
  current_usdc?: number | null;
  yes_count?: number | null;
  no_count?: number | null;
  deadline?: string | null;
  last_week_deposit?: number | null;
};

type CoachingRow = {
  id: string;
  message: string;
  created_at: string;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const runFetch = async (baseUrl: string) =>
    fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });

  let res: Response;
  try {
    res = await runFetch(API_URL);
  } catch (e) {
    // Allow local dev to work when HTTPS URL is configured but backend serves HTTP.
    if (API_URL.startsWith("https://")) {
      res = await runFetch(API_URL.replace("https://", "http://"));
    } else {
      throw e;
    }
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

export function mapGoalRowToGoal(row: GoalRow): Goal {
  const targetLamports = Number(row.target_usdc ?? 0);
  const savedLamports = Number(row.current_usdc ?? 0);
  const deadlineMs = row.deadline ? new Date(row.deadline).getTime() : Date.now();
  const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 86400000));
  const progress =
    targetLamports > 0 ? Math.max(0, Math.min(1, savedLamports / targetLamports)) : 0;
  return {
    id: row.id,
    name: row.goal_name,
    type: row.goal_type,
    progress,
    savedLamports,
    targetLamports,
    daysLeft,
    yesCount: Number(row.yes_count ?? 0),
    noCount: Number(row.no_count ?? 0),
    streakWeeks: Number(row.last_week_deposit ?? 0) > 0 ? 1 : 0,
  };
}

export async function registerUser(wallet: string): Promise<void> {
  await http("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ wallet_address: wallet }),
  });
}

export async function fetchGoals(wallet: string): Promise<Goal[]> {
  const rows = await http<GoalRow[]>(`/api/goals/wallet/${encodeURIComponent(wallet)}`);
  return rows.map(mapGoalRowToGoal);
}

export async function createGoal(input: {
  wallet: string;
  name: string;
  type: string;
  targetLamports: number;
  deadline: string;
}): Promise<Goal> {
  const row = await http<GoalRow>("/api/goals", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: input.wallet,
      pda_address: `mock-${Date.now()}`,
      goal_name: input.name,
      goal_type: input.type,
      target_usdc: input.targetLamports,
      deadline: input.deadline,
    }),
  });
  return mapGoalRowToGoal(row);
}

export async function createStake(input: {
  goalId: string;
  stakerWallet: string;
  amountLamports: number;
  isYes: boolean;
}): Promise<void> {
  await http(`/api/goals/${encodeURIComponent(input.goalId)}/stake`, {
    method: "POST",
    body: JSON.stringify({
      staker_wallet: input.stakerWallet,
      amount_usdc: input.amountLamports,
      is_yes: input.isYes,
      tx_signature: `mock-tx-${Date.now()}`,
    }),
  });
}

export async function fetchCoaching(goalId: string): Promise<CoachingRow | null> {
  return await http<CoachingRow | null>(`/api/goals/${encodeURIComponent(goalId)}/coaching`);
}

export async function fetchPkrRate(): Promise<number> {
  const payload = await http<{ pkr_per_usdc: number }>("/api/rates/pkr-usdc");
  return Number(payload.pkr_per_usdc ?? 280);
}
