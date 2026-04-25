import { Router } from "express";
import { getPrisma } from "../db/client";

export const welfareRouter = Router();

welfareRouter.post("/transfer", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { committee_id, amount_micro_usdc, tx_signature, reason } = req.body ?? {};
    if (!committee_id || amount_micro_usdc == null || !tx_signature) {
      return res.status(400).json({
        error: "committee_id, amount_micro_usdc and tx_signature are required",
      });
    }

    await prisma.welfareTransfer.create({
      data: {
        committee_id: String(committee_id),
        amount_micro_usdc: BigInt(Number(amount_micro_usdc)),
        tx_signature: String(tx_signature),
        reason:
          typeof reason === "string" && reason.trim().length > 0
            ? reason.trim()
            : "unclaimed funds transfer",
      },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
