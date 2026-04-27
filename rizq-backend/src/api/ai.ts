import { Router } from "express";
import { randomUUID } from "crypto";
import { generateCoaching, generateGeneralChat } from "../ai/coaching-agent";
import { getPrisma } from "../db/client";
import { fetchCommitteeCoachingContext } from "../solana/goal-reader";

export const aiRouter = Router();
let ensuredAiChatTable = false;

function clampScore(value: number, min = 0, max = 1000): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

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

async function ensureAiChatTable() {
  if (ensuredAiChatTable) return;
  const prisma = getPrisma();
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      committee_id UUID NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE ai_chat_messages
      ALTER COLUMN committee_id DROP NOT NULL
    `);
  } catch {
    // Some DBs may already have committee_id nullable or not support this on current shape.
  }
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_committee_created
    ON ai_chat_messages (user_id, committee_id, created_at DESC)
  `);
  ensuredAiChatTable = true;
}

async function saveChatPair(input: {
  userId: string;
  committeeId?: string | null;
  userMessage: string;
  aiMessage: string;
}) {
  const prisma = getPrisma();
  await ensureAiChatTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ai_chat_messages (id, user_id, committee_id, role, message)
      VALUES ($1::uuid, $2::uuid, $3::uuid, 'user', $4),
             ($5::uuid, $2::uuid, $3::uuid, 'ai', $6)
    `,
    randomUUID(),
    input.userId,
    input.committeeId ?? null,
    input.userMessage,
    randomUUID(),
    input.aiMessage
  );
}

async function loadChatHistory(input: {
  userId: string;
  committeeId?: string | null;
  limit?: number;
}) {
  const prisma = getPrisma();
  await ensureAiChatTable();
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT id, role, message, created_at
      FROM ai_chat_messages
      WHERE user_id = $1::uuid
        AND (
          ($2::uuid IS NULL AND committee_id IS NULL)
          OR committee_id = $2::uuid
        )
      ORDER BY created_at DESC
      LIMIT $3
    `,
    input.userId,
    input.committeeId ?? null,
    Math.max(1, Math.min(100, input.limit ?? 30))
  )) as Array<{ id: string; role: string; message: string; created_at: Date }>;
  return rows.reverse();
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

    const normalizedPrompt =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt.trim()
        : "Mera next payment plan banao.";

    await saveChatPair({
      userId: String(user_id),
      committeeId: String(committee_id),
      userMessage: normalizedPrompt,
      aiMessage: message,
    });

    return res.json({ message });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

aiRouter.post("/chat/general", async (req, res) => {
  try {
    const { user_id, prompt } = req.body ?? {};
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const normalizedPrompt =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt.trim()
        : "Give me practical financial guidance for this week.";
    const historyRows = await loadChatHistory({
      userId: String(user_id),
      committeeId: null,
      limit: 14,
    });
    const message = await generateGeneralChat(
      normalizedPrompt,
      historyRows.map((row) => ({
        role: row.role === "user" ? "user" : "ai",
        message: row.message,
      }))
    );
    await saveChatPair({
      userId: String(user_id),
      committeeId: null,
      userMessage: normalizedPrompt,
      aiMessage: message,
    });
    return res.json({ message });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

aiRouter.get("/chat/history", async (req, res) => {
  try {
    const userId =
      typeof req.query.user_id === "string" && req.query.user_id.trim().length > 0
        ? req.query.user_id.trim()
        : null;
    if (!userId) return res.status(400).json({ error: "user_id is required" });
    const committeeId =
      typeof req.query.committee_id === "string" && req.query.committee_id.trim().length > 0
        ? req.query.committee_id.trim()
        : null;
    const rows = await loadChatHistory({
      userId,
      committeeId,
      limit: 60,
    });
    return res.json(
      rows.map((row) => ({
        id: row.id,
        role: row.role === "user" ? "user" : "ai",
        message: row.message,
        created_at: row.created_at.toISOString(),
      }))
    );
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

aiRouter.get("/rizq-score/:userId", async (req, res) => {
  try {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, wallet_address: true, created_at: true },
    });
    if (!user) return res.status(404).json({ error: "user not found" });

    const [
      contributionCount,
      recent30Contributions,
      prev30Contributions,
      payoutCount,
      nomineeExists,
      membershipStats,
    ] = await Promise.all([
      prisma.committeeContribution.count({ where: { user_id: user.id } }),
      prisma.committeeContribution.count({
        where: {
          user_id: user.id,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.committeeContribution.count({
        where: {
          user_id: user.id,
          created_at: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.committeePayout.count({
        where: {
          OR: [{ recipient_user_id: user.id }, { recipient_wallet: user.wallet_address }],
        },
      }),
      prisma.nominee.count({ where: { user_id: user.id } }),
      prisma.committeeMember.findMany({
        where: { user_id: user.id },
        select: { status: true, committee: { select: { status: true } } },
      }),
    ]);

    const activeCommittees = membershipStats.filter(
      (row) => row.status === "active" && row.committee.status !== "complete"
    ).length;
    const completedCommittees = membershipStats.filter(
      (row) => row.committee.status === "complete"
    ).length;
    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - user.created_at.getTime()) / (24 * 60 * 60 * 1000))
    );

    const paymentsScore = Math.min(
      450,
      contributionCount * 30 + recent30Contributions * 8
    );
    const completionScore = Math.min(
      250,
      completedCommittees * 90 + payoutCount * 25
    );
    const nomineeScore = nomineeExists > 0 ? 120 : 0;
    const accountAgeScore = Math.min(120, Math.floor(accountAgeDays / 7) * 4);
    const consistencyScore = Math.min(60, activeCommittees * 15);
    const trendScore = clampScore((recent30Contributions - prev30Contributions) * 8, -50, 60);

    const totalScore = clampScore(
      paymentsScore +
        completionScore +
        nomineeScore +
        accountAgeScore +
        consistencyScore +
        trendScore
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { rizq_score: totalScore },
    });

    return res.json({
      score: totalScore,
      trend_30d: trendScore,
      breakdown: {
        payments_on_time: clampScore(paymentsScore, 0, 450),
        committees_completed: clampScore(completionScore, 0, 250),
        nominee_added: clampScore(nomineeScore, 0, 120),
        account_age: clampScore(accountAgeScore, 0, 120),
        committee_consistency: clampScore(consistencyScore, 0, 60),
      },
      stats: {
        contribution_count: contributionCount,
        payouts_received: payoutCount,
        active_committees: activeCommittees,
        completed_committees: completedCommittees,
        account_age_days: accountAgeDays,
        nominee_exists: nomineeExists > 0,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
