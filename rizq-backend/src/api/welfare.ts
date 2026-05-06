import { Router } from "express";
import { getPrisma } from "../db/client";

export const welfareRouter = Router();

welfareRouter.get("/ledger", async (req, res) => {
  try {
    const prisma = getPrisma();
    const committeeId = typeof req.query.committee_id === "string" ? req.query.committee_id.trim() : "";
    const source = typeof req.query.source === "string" ? req.query.source.trim().toLowerCase() : "all";
    const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 50) || 50));
    const fromDate = typeof req.query.from === "string" && req.query.from.trim().length > 0 ? new Date(req.query.from) : null;
    const toDate = typeof req.query.to === "string" && req.query.to.trim().length > 0 ? new Date(req.query.to) : null;
    const validFrom = fromDate && Number.isFinite(fromDate.getTime()) ? fromDate : null;
    const validTo = toDate && Number.isFinite(toDate.getTime()) ? toDate : null;
    const sourceFilter =
      source === "all"
        ? ""
        : source === "nominee_expired"
          ? "AND COALESCE(w.reason, '') ILIKE 'nominee_claim_expired%'"
          : source === "penalty"
            ? "AND COALESCE(w.reason, '') ILIKE 'late_payment_penalty%'"
            : source === "deceased_fallback"
              ? "AND COALESCE(w.reason, '') ILIKE 'deceased_no_nominee_fallback%'"
              : "AND COALESCE(w.reason, '') ILIKE '%' || $3 || '%'";
    const dateFilter = `
      AND ($4::timestamptz IS NULL OR w.created_at >= $4::timestamptz)
      AND ($5::timestamptz IS NULL OR w.created_at <= $5::timestamptz)
    `;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        committee_id: string;
        committee_name: string;
        amount_micro_usdc: bigint;
        tx_signature: string;
        reason: string | null;
        created_at: Date;
      }>
    >(
      `
      SELECT
        w.id,
        w.committee_id,
        c.name AS committee_name,
        w.amount_micro_usdc,
        w.tx_signature,
        w.reason,
        w.created_at
      FROM welfare_transfers w
      JOIN committees c ON c.id = w.committee_id
      WHERE ($1 = '' OR w.committee_id::text = $1)
        ${sourceFilter}
        ${dateFilter}
      ORDER BY w.created_at DESC
      LIMIT $2
      `,
      committeeId,
      limit,
      source,
      validFrom?.toISOString() ?? null,
      validTo?.toISOString() ?? null
    );

    const totalsRows = await prisma.$queryRawUnsafe<Array<{ total_amount_micro: bigint; transfer_count: bigint }>>(
      `
      SELECT
        COALESCE(SUM(w.amount_micro_usdc), 0) AS total_amount_micro,
        COUNT(*) AS transfer_count
      FROM welfare_transfers w
      WHERE ($1 = '' OR w.committee_id::text = $1)
        ${sourceFilter}
        ${dateFilter}
      `,
      committeeId,
      limit,
      source,
      validFrom?.toISOString() ?? null,
      validTo?.toISOString() ?? null
    );

    const byCommittee = await prisma.$queryRawUnsafe<
      Array<{ committee_id: string; committee_name: string; total_amount_micro: bigint; transfer_count: bigint }>
    >(
      `
      SELECT
        w.committee_id,
        c.name AS committee_name,
        COALESCE(SUM(w.amount_micro_usdc), 0) AS total_amount_micro,
        COUNT(*) AS transfer_count
      FROM welfare_transfers w
      JOIN committees c ON c.id = w.committee_id
      WHERE ($1 = '' OR w.committee_id::text = $1)
        ${sourceFilter}
        ${dateFilter}
      GROUP BY w.committee_id, c.name
      ORDER BY total_amount_micro DESC
      `,
      committeeId,
      limit,
      source,
      validFrom?.toISOString() ?? null,
      validTo?.toISOString() ?? null
    );

    return res.json({
      entries: rows.map((row) => ({
        id: row.id,
        committee_id: row.committee_id,
        committee_name: row.committee_name,
        amount_micro_usdc: Number(row.amount_micro_usdc ?? 0),
        tx_signature: row.tx_signature,
        proof_url: `https://explorer.solana.com/tx/${encodeURIComponent(row.tx_signature)}?cluster=devnet`,
        reason: row.reason ?? "unspecified",
        created_at: row.created_at,
      })),
      totals: {
        total_amount_micro_usdc: Number(totalsRows[0]?.total_amount_micro ?? 0),
        transfer_count: Number(totalsRows[0]?.transfer_count ?? 0),
      },
      grouped_by_committee: byCommittee.map((row) => ({
        committee_id: row.committee_id,
        committee_name: row.committee_name,
        total_amount_micro_usdc: Number(row.total_amount_micro ?? 0),
        transfer_count: Number(row.transfer_count ?? 0),
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

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
