import { Router } from "express";
import { getPrisma } from "../db/client";
import { randomUUID } from "node:crypto";

export const nomineesRouter = Router();

let nomineeSchemaEnsured = false;
async function ensureNomineeTables() {
  if (nomineeSchemaEnsured) return;
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS nominee_claims (
      id UUID PRIMARY KEY,
      deceased_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nominee_id UUID REFERENCES nominees(id) ON DELETE SET NULL,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      amount_micro_usdc BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      claimed_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      tx_signature TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS welfare_transfers (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      amount_micro_usdc BIGINT NOT NULL,
      tx_signature TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  nomineeSchemaEnsured = true;
}

nomineesRouter.post("/notify", async (req, res) => {
  try {
    await ensureNomineeTables();
    const prisma = getPrisma();
    const { user_id, reason } = req.body ?? {};
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const nominees = await prisma.nominee.findMany({
      where: { user_id: String(user_id) },
      orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
      select: {
        id: true,
        full_name: true,
        phone_number: true,
        relationship: true,
      },
    });

    if (nominees.length === 0) {
      return res.status(404).json({ error: "no nominee found for user" });
    }

    const primary = nominees[0];
    // SMS provider integration can be plugged in here.
    console.log("[nominee-notify]", {
      nomineeId: primary.id,
      phone: primary.phone_number,
      reason: reason ?? "committee nominee event",
    });

    return res.json({
      ok: true,
      nominee: {
        id: primary.id,
        full_name: primary.full_name,
        relationship: primary.relationship,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

nomineesRouter.get("/claims", async (req, res) => {
  try {
    await ensureNomineeTables();
    const prisma = getPrisma();
    const committeeId = typeof req.query.committee_id === "string" ? req.query.committee_id.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        committee_id: string;
        amount_micro_usdc: bigint;
        status: string;
        notified_at: Date;
        claimed_at: Date | null;
        expires_at: Date | null;
        tx_signature: string | null;
        nominee_name: string | null;
        nominee_phone: string | null;
      }>
    >(
      `
      SELECT
        nc.id,
        nc.committee_id,
        nc.amount_micro_usdc,
        nc.status,
        nc.notified_at,
        nc.claimed_at,
        nc.expires_at,
        nc.tx_signature,
        n.full_name AS nominee_name,
        n.phone_number AS nominee_phone
      FROM nominee_claims nc
      LEFT JOIN nominees n ON n.id = nc.nominee_id
      WHERE ($1 = '' OR nc.committee_id::text = $1)
        AND ($2 = '' OR nc.status = $2)
      ORDER BY nc.created_at DESC
      LIMIT 100
      `,
      committeeId,
      status
    );
    return res.json({
      claims: rows.map((row) => ({
        ...row,
        amount_micro_usdc: Number(row.amount_micro_usdc ?? 0),
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

nomineesRouter.post("/claims/:claimId/claim", async (req, res) => {
  try {
    await ensureNomineeTables();
    const claimId = String(req.params.claimId);
    const txSignature = String(req.body?.tx_signature ?? "").trim();
    if (!txSignature) return res.status(400).json({ error: "tx_signature is required" });

    const prisma = getPrisma();
    const updated = await prisma.$executeRawUnsafe(
      `
      UPDATE nominee_claims
      SET status = 'claimed', claimed_at = NOW(), tx_signature = $1
      WHERE id = $2
        AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
      `,
      txSignature,
      claimId
    );
    if (updated === 0) return res.status(400).json({ error: "claim not pending or already expired/claimed" });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

nomineesRouter.post("/claims/process-expired", async (req, res) => {
  try {
    await ensureNomineeTables();
    const prisma = getPrisma();
    const expired = await prisma.$queryRawUnsafe<
      Array<{ id: string; committee_id: string; amount_micro_usdc: bigint }>
    >(
      `
      SELECT id, committee_id, amount_micro_usdc
      FROM nominee_claims
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      `
    );

    let processed = 0;
    for (const claim of expired) {
      const amount = Number(claim.amount_micro_usdc ?? 0);
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `
          UPDATE nominee_claims
          SET status = 'expired'
          WHERE id = $1
            AND status = 'pending'
          `,
          claim.id
        );
        if (amount > 0) {
          await tx.welfareTransfer.create({
            data: {
              id: randomUUID(),
              committee_id: claim.committee_id,
              amount_micro_usdc: BigInt(amount),
              tx_signature: `wallet-proof-nominee-expired-${claim.id.slice(0, 8)}`,
              reason: "nominee_claim_expired",
            },
          });
        }
      });
      processed += 1;
    }

    return res.json({ ok: true, expired_processed: processed });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
