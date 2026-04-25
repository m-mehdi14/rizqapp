import cron from "node-cron";
import { getPrisma } from "../db/client";
import { generateCoaching } from "../ai/coaching-agent";
import { fetchCommitteeCoachingContext } from "../solana/goal-reader";
import { sendPush } from "../notifications/push";

export function scheduleWeeklyCoaching(): void {
  // Sunday 05:00 UTC (~10:00 PKT)
  cron.schedule("0 5 * * 0", async () => {
    console.log("[coaching-job] Starting weekly run...");
    const prisma = getPrisma();
    try {
      const members = await prisma.committeeMember.findMany({
        where: {
          status: "active",
          committee: { status: { in: ["forming", "active"] } },
        },
        select: {
          user_id: true,
          committee_id: true,
          user: {
            select: {
              language_pref: true,
              device_push_token: true,
            },
          },
          committee: {
            select: {
              name: true,
              current_cycle: true,
              total_cycles: true,
              contribution_amount: true,
              next_cycle_date: true,
              pda_address: true,
            },
          },
        },
      });

      for (const member of members) {
        const language =
          member.user.language_pref === "english" ||
          member.user.language_pref === "urdu" ||
          member.user.language_pref === "mixed"
            ? member.user.language_pref
            : "mixed";
        const contributionAmount =
          typeof member.committee.contribution_amount === "bigint"
            ? Number(member.committee.contribution_amount)
            : Number(member.committee.contribution_amount);
        const ctx = await fetchCommitteeCoachingContext(
          {
            id: member.committee_id,
            pda_address: member.committee.pda_address,
            name: member.committee.name,
            current_cycle: member.committee.current_cycle,
            total_cycles: member.committee.total_cycles,
            contribution_amount: contributionAmount,
            next_cycle_date: member.committee.next_cycle_date,
          },
          language
        );
        const message = await generateCoaching(ctx);

        await prisma.coachingMessage.create({
          data: {
            user_id: member.user_id,
            committee_id: member.committee_id,
            message,
          },
        });

        await sendPush(member.user.device_push_token, "Rizq weekly update", message);
      }
    } catch (e) {
      console.error("[coaching-job] failed:", e);
      return;
    }
    console.log("[coaching-job] Done.");
  });
}
