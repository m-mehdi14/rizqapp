import cron from "node-cron";
import { getPrisma } from "../db/client";
import { config } from "../config";

let isSweepRunning = false;

export async function runMissedPaymentSweep(): Promise<void> {
  if (isSweepRunning) return;
  isSweepRunning = true;
  const prisma = getPrisma();
  try {
    const overdueCommittees = await prisma.committee.findMany({
      where: {
        status: { in: ["forming", "active"] },
        next_cycle_date: { not: null, lte: new Date() },
      },
      select: { id: true },
    });

    let enforceFailures = 0;
    for (const committee of overdueCommittees) {
      const response = await fetch(`http://127.0.0.1:${config.port}/api/committees/${committee.id}/penalties/enforce`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-cron": "true",
        },
      }).catch(() => null);
      if (!response || !response.ok) enforceFailures += 1;
    }

    const nomineeResp = await fetch(`http://127.0.0.1:${config.port}/api/nominees/claims/process-expired`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-cron": "true",
      },
    }).catch(() => null);

    console.log(
      `[missed-payment-monitor] sweep completed: committees=${overdueCommittees.length}, enforce_failures=${enforceFailures}, nominee_ok=${Boolean(nomineeResp?.ok)}`
    );
  } catch (e) {
    console.error("[missed-payment-monitor] failed:", e);
  } finally {
    isSweepRunning = false;
  }
}

export function scheduleMissedPaymentMonitor(): void {
  // Every 15 minutes for faster overdue penalty enforcement.
  cron.schedule("*/15 * * * *", async () => {
    await runMissedPaymentSweep();
  });
}
