import { Router } from "express";
import { getPrisma } from "../db/client";

export const goalsRouter = Router();

goalsRouter.post("/", async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      wallet_address,
      pda_address,
      goal_name,
      goal_type,
      target_usdc,
      deadline,
    } = req.body ?? {};
    if (!wallet_address || !pda_address || !goal_name || !goal_type || !target_usdc) {
      return res.status(400).json({ error: "missing fields" });
    }
    const owner = await prisma.user.upsert({
      where: { wallet_address },
      update: {},
      create: { wallet_address },
      select: { id: true },
    });
    const data = await prisma.goal.create({
      data: {
        owner: owner.id,
        pda_address,
        goal_name,
        goal_type,
        target_usdc: Number(target_usdc),
        deadline: deadline ? new Date(deadline) : new Date(),
      },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

goalsRouter.get("/wallet/:wallet", async (req, res) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { wallet_address: req.params.wallet },
      select: { id: true },
    });
    if (!user) {
      return res.json([]);
    }
    const data = await prisma.goal.findMany({
      where: { owner: user.id, is_resolved: false },
    });
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

goalsRouter.post("/:id/stake", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { staker_wallet, amount_usdc, is_yes, tx_signature } = req.body ?? {};
    if (!staker_wallet || amount_usdc == null || is_yes == null || !tx_signature) {
      return res.status(400).json({ error: "missing fields" });
    }
    const yesFlag =
      typeof is_yes === "boolean"
        ? is_yes
        : is_yes === "true" || is_yes === "1" || is_yes === 1;
    await prisma.stake.create({
      data: {
        goal_id: req.params.id,
        staker_wallet,
        amount_usdc: Number(amount_usdc),
        is_yes: yesFlag,
        tx_signature,
      },
    });
    await prisma.goal.update({
      where: { id: req.params.id },
      data: yesFlag
        ? { yes_count: { increment: 1 } }
        : { no_count: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

goalsRouter.get("/:id/coaching", async (req, res) => {
  try {
    const prisma = getPrisma();
    const data = await prisma.coachingMessage.findFirst({
      where: { goal_id: req.params.id },
      orderBy: { created_at: "desc" },
    });
    res.json(data ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

goalsRouter.get("/:id/pool", async (_req, res) => {
  res.json({ stakers: [] });
});

goalsRouter.post("/:id/share", async (req, res) => {
  const base = process.env.PUBLIC_APP_URL ?? "https://rizq.app";
  res.json({ url: `${base}/goal/${req.params.id}` });
});
