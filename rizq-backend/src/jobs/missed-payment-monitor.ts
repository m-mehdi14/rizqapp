import cron from "node-cron";
import { getPrisma } from "../db/client";
import { config } from "../config";

export function scheduleMissedPaymentMonitor(): void {
  // Every hour.
  cron.schedule("0 * * * *", async () => {
    const prisma = getPrisma();
    try {
      const overdueCommittees = await prisma.committee.findMany({
        where: {
          status: { in: ["forming", "active"] },
          next_cycle_date: { not: null, lte: new Date() },
        },
        select: { id: true },
      });

      for (const committee of overdueCommittees) {
        await fetch(`http://127.0.0.1:${config.port}/api/committees/${committee.id}/penalties/enforce`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-cron": "true",
          },
        }).catch(() => undefined);
      }
    } catch (e) {
      console.error("[missed-payment-monitor] failed:", e);
    }
  });
}
