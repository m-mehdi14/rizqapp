import { Router } from "express";
import { generateCoaching } from "../ai/coaching-agent";
import { getPrisma } from "../db/client";
import { fetchCommitteeCoachingContext } from "../solana/goal-reader";

export const aiRouter = Router();

async function getCommitteeAndUserContext(committeeId: string, userId: string) {
  const prisma = getPrisma();
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: {
      id: true,
      name: true,
      current_cycle: true,
      total_cycles: true,
      contribution_amount: true,
      next_cycle_date: true,
      pda_address: true,
    },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      language_pref: true,
    },
  });
  return {
    committee,
    user,
  };
}

aiRouter.post("/chat", async (req, res) => {
  try {
    const { committee_id, user_id, prompt } = req.body ?? {};
    if (!committee_id || !user_id) {
      return res.status(400).json({ error: "committee_id and user_id are required" });
    }

    const { committee, user } = await getCommitteeAndUserContext(
      String(committee_id),
      String(user_id)
    );
    if (!committee || !user) {
      return res.status(404).json({ error: "committee or user not found" });
    }

    const language =
      user.language_pref === "english" ||
      user.language_pref === "urdu" ||
      user.language_pref === "mixed"
        ? user.language_pref
        : "mixed";
    const contributionAmount =
      typeof committee.contribution_amount === "bigint"
        ? Number(committee.contribution_amount)
        : Number(committee.contribution_amount);
    const coachingContext = await fetchCommitteeCoachingContext(
      {
        id: committee.id,
        name: committee.name,
        current_cycle: committee.current_cycle,
        total_cycles: committee.total_cycles,
        contribution_amount: contributionAmount,
        next_cycle_date: committee.next_cycle_date,
        pda_address: committee.pda_address,
      },
      language
    );

    const message = await generateCoaching(
      coachingContext,
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt
        : "Mera next payment plan banao."
    );

    return res.json({ message });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

aiRouter.post("/coaching/generate", async (req, res) => {
  try {
    const { committee_id, user_id } = req.body ?? {};
    if (!committee_id || !user_id) {
      return res.status(400).json({ error: "committee_id and user_id are required" });
    }

    const prisma = getPrisma();
    const { committee, user } = await getCommitteeAndUserContext(
      String(committee_id),
      String(user_id)
    );
    if (!committee || !user) {
      return res.status(404).json({ error: "committee or user not found" });
    }

    const language =
      user.language_pref === "english" ||
      user.language_pref === "urdu" ||
      user.language_pref === "mixed"
        ? user.language_pref
        : "mixed";
    const contributionAmount =
      typeof committee.contribution_amount === "bigint"
        ? Number(committee.contribution_amount)
        : Number(committee.contribution_amount);
    const coachingContext = await fetchCommitteeCoachingContext(
      {
        id: committee.id,
        name: committee.name,
        current_cycle: committee.current_cycle,
        total_cycles: committee.total_cycles,
        contribution_amount: contributionAmount,
        next_cycle_date: committee.next_cycle_date,
        pda_address: committee.pda_address,
      },
      language
    );
    const message = await generateCoaching(coachingContext);

    await prisma.coachingMessage.create({
      data: {
        user_id: String(user_id),
        committee_id: String(committee_id),
        message,
      },
    });

    return res.json({ ok: true, message });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
