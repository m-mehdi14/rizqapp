import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import type { GoalContext } from "../ai/coaching-agent";

export type GoalRow = {
  id: string;
  pda_address: string;
  owner: string;
  goal_name?: string;
  goal_type?: string;
  target_usdc?: number;
  current_usdc?: number;
  deadline?: string;
  historical_completion_rate?: number;
  yes_count?: number;
  no_count?: number;
  last_week_deposit?: number;
  expo_push_token?: string | null;
};

/** Fetch PKR per USDC — CoinGecko public endpoint when no API key */
export async function fetchPkrRate(): Promise<number> {
  try {
    const url = config.coingeckoApiKey
      ? `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=pkr&x_cg_demo_api_key=${config.coingeckoApiKey}`
      : "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=pkr";
    const res = await fetch(url);
    if (!res.ok) return 280;
    const j = (await res.json()) as { "usd-coin"?: { pkr?: number } };
    return j["usd-coin"]?.pkr ?? 280;
  } catch {
    return 280;
  }
}

/**
 * Reads on-chain goal (placeholder) + merges DB row for coaching context.
 * Replace with Anchor IDL + program.account once IDL is committed.
 */
export async function fetchGoalContext(goalRow: GoalRow): Promise<GoalContext> {
  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const pkrRate = await fetchPkrRate();

  let deadlineTs = Math.floor(Date.now() / 1000) + 86400 * 30;
  if (goalRow.deadline) {
    deadlineTs = Math.floor(new Date(goalRow.deadline).getTime() / 1000);
  }

  const targetUsdc = Number(goalRow.target_usdc ?? 0) / 1_000_000 || 100;
  let currentUsdc = Number(goalRow.current_usdc ?? 0) / 1_000_000;

  try {
    const pk = new PublicKey(goalRow.pda_address);
    await connection.getAccountInfo(pk);
  } catch {
    // ignore
  }

  const pct =
    targetUsdc > 0 ? Math.round((currentUsdc / targetUsdc) * 100) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((deadlineTs * 1000 - Date.now()) / 86400000)
  );

  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const weeklyNeeded =
    targetUsdc > currentUsdc
      ? Math.max(0, (targetUsdc - currentUsdc) / weeksLeft)
      : 0;

  return {
    goalName: goalRow.goal_name ?? "Goal",
    goalType: goalRow.goal_type ?? "Custom",
    targetUSDC: targetUsdc,
    deadline: new Date(deadlineTs * 1000).toISOString(),
    pct,
    daysLeft,
    weeklyNeeded,
    completionRate: goalRow.historical_completion_rate ?? 100,
    pkrRate,
    yesCount: goalRow.yes_count ?? 0,
    noCount: goalRow.no_count ?? 0,
    lastWeekDeposit: Number(goalRow.last_week_deposit ?? 0) / 1_000_000,
  };
}
