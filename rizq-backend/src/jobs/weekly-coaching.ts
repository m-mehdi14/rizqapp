import cron from "node-cron";
import { getPrisma } from "../db/client";
import { generateCoaching } from "../ai/coaching-agent";
import { fetchGoalContext } from "../solana/goal-reader";
import { getPushTokenFromUser, sendPush } from "../notifications/push";

export function scheduleWeeklyCoaching(): void {
  // Sunday 05:00 UTC (~10:00 PKT)
  cron.schedule("0 5 * * 0", async () => {
    console.log("[coaching-job] Starting weekly run...");
    let prisma: ReturnType<typeof getPrisma>;
    try {
      prisma = getPrisma();
    } catch (e) {
      console.error("[coaching-job] DATABASE_URL not configured:", e);
      return;
    }
    const goals = await prisma.goal.findMany({
      where: { is_resolved: false },
      include: { ownerUser: true },
    });
    for (const goal of goals) {
      try {
        const ctx = await fetchGoalContext(goal as never);
        const message = await generateCoaching(ctx);
        await prisma.coachingMessage.create({
          data: {
            goal_id: goal.id,
            user_id: goal.owner,
            message,
            created_at: new Date(),
          },
        });
        const token = getPushTokenFromUser(goal.ownerUser as never);
        await sendPush(token, "Weekly Rizq update", message);
      } catch (err) {
        console.error(`[coaching-job] Failed for goal ${goal.id}:`, err);
      }
    }
    console.log("[coaching-job] Done.");
  });
}
