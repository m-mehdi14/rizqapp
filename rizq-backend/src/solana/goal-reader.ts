import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import type { CommitteeCoachingContext } from "../ai/coaching-agent";

export type CommitteeRow = {
  id: string;
  pda_address?: string | null;
  name?: string | null;
  current_cycle?: number | null;
  total_cycles?: number | null;
  contribution_amount?: number | null;
  next_cycle_date?: string | Date | null;
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

export function derivePaymentStatusFromCycleDate(
  nextCycleDate: Date
): CommitteeCoachingContext["paymentStatus"] {
  const msLeft = nextCycleDate.getTime() - Date.now();
  if (msLeft < 0) return "overdue";
  if (msLeft <= 3 * 86_400_000) return "due_soon";
  return "paid";
}

/**
 * Builds coaching context from committee DB row and optional on-chain signal checks.
 * NOTE: Program account fetch is best-effort until committee account layout is finalized.
 */
export async function fetchCommitteeCoachingContext(
  committeeRow: CommitteeRow,
  languagePref: CommitteeCoachingContext["languagePref"] = "mixed"
): Promise<CommitteeCoachingContext> {
  const connection = new Connection(config.solanaRpcUrl, "confirmed");
  const pkrRate = await fetchPkrRate();
  const nextCycleDate = committeeRow.next_cycle_date
    ? new Date(committeeRow.next_cycle_date)
    : new Date(Date.now() + 7 * 86_400_000);

  try {
    if (!committeeRow.pda_address) {
      throw new Error("missing pda address");
    }
    const pk = new PublicKey(committeeRow.pda_address);
    await connection.getAccountInfo(pk);
  } catch {
    // ignore
  }

  return {
    committeeName: committeeRow.name ?? "Rizq Committee",
    cycleNumber: Math.max(1, Number(committeeRow.current_cycle ?? 1)),
    totalCycles: Math.max(1, Number(committeeRow.total_cycles ?? 1)),
    contributionUSDC:
      Math.max(0, Number(committeeRow.contribution_amount ?? 0)) / 1_000_000,
    nextCycleDateIso: nextCycleDate.toISOString(),
    paymentStatus: derivePaymentStatusFromCycleDate(nextCycleDate),
    languagePref,
    pkrRate,
  };
}
