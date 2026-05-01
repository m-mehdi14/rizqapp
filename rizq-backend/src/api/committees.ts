import { Router } from "express";
import { getPrisma } from "../db/client";
import { sendPush } from "../notifications/push";
import { verifyConfirmedCommitteeTx } from "../solana/tx-verifier";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { randomUUID } from "node:crypto";
import { calculateDeferredAmount, calculateReleasePerCycle } from "../lib/deferred";
import { deriveCommitteeSafetyPdas } from "../solana/committee-safety";
import {
  verifyCommitteeSafetyAccountExists,
  verifyDevnetTransactionSucceeded,
  fetchDecodedCommitteeState,
} from "../solana/safety-tx-verify";
import type { Prisma } from "@prisma/client";

export const committeesRouter = Router();

type AuthJwtPayload = {
  sub: string;
  email: string;
};

function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function verifyAuthToken(token: string): AuthJwtPayload {
  const decoded = jwt.verify(token, config.authJwtSecret);
  if (!decoded || typeof decoded !== "object") throw new Error("invalid token");
  const sub = (decoded as { sub?: string }).sub;
  const email = (decoded as { email?: string }).email;
  if (!sub || !email) throw new Error("invalid token");
  return { sub, email };
}

function tryReadClaims(header: string | undefined): AuthJwtPayload | null {
  const token = readBearerToken(header);
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}

let committeeSchemaEnsured = false;
async function ensureCommitteeTables() {
  if (committeeSchemaEnsured) return;
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committees (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      goal_type TEXT NOT NULL DEFAULT 'General savings',
      manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
      contribution_amount BIGINT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      max_members INTEGER NOT NULL DEFAULT 10,
      current_members INTEGER NOT NULL DEFAULT 0,
      total_cycles INTEGER NOT NULL DEFAULT 1,
      current_cycle INTEGER NOT NULL DEFAULT 1,
      payout_order_type TEXT NOT NULL DEFAULT 'manager',
      payout_order_locked BOOLEAN NOT NULL DEFAULT false,
      grace_period_days INTEGER NOT NULL DEFAULT 3,
      late_penalty_action TEXT NOT NULL DEFAULT 'warning',
      penalty_goes_to TEXT NOT NULL DEFAULT 'welfare',
      welfare_opt_in_pct NUMERIC(10,2) DEFAULT 0,
      kyc_required BOOLEAN NOT NULL DEFAULT true,
      nominee_required BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'forming',
      pda_address TEXT UNIQUE,
      vault_address TEXT,
      invite_code TEXT UNIQUE,
      platform_fee_pct NUMERIC(10,2) DEFAULT 1.5,
      next_cycle_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committees
    ADD COLUMN IF NOT EXISTS safety_committee_pda TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committees
    ADD COLUMN IF NOT EXISTS safety_initialized_tx TEXT
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_members (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payout_position INTEGER,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'active',
      has_received BOOLEAN NOT NULL DEFAULT false,
      received_at TIMESTAMPTZ,
      received_amount BIGINT,
      UNIQUE (committee_id, user_id),
      UNIQUE (committee_id, payout_position)
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS penalty_strikes INTEGER NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS total_penalties_paid BIGINT NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS last_contribution_cycle INTEGER
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS is_eligible_for_payout BOOLEAN NOT NULL DEFAULT true
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS collateral_deposited BIGINT NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS deferred_total BIGINT NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS deferred_released BIGINT NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS member_state_pda TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS collateral_vault_pda TEXT
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE committee_members
    ADD COLUMN IF NOT EXISTS deferred_escrow_pda TEXT
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_collateral_vaults (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      member_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      deposited_amount BIGINT NOT NULL,
      tx_signature TEXT NOT NULL,
      is_returned BOOLEAN NOT NULL DEFAULT false,
      returned_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (committee_id, member_user_id)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_deferred_escrows (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      member_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_deferred BIGINT NOT NULL DEFAULT 0,
      released_so_far BIGINT NOT NULL DEFAULT 0,
      cycles_remaining INTEGER NOT NULL DEFAULT 0,
      cycles_completed INTEGER NOT NULL DEFAULT 0,
      is_complete BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (committee_id, member_user_id)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_penalty_events (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      strike_number INTEGER NOT NULL,
      penalty_amount BIGINT NOT NULL DEFAULT 0,
      action_taken TEXT NOT NULL,
      tx_signature TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_contributions (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_micro_usdc BIGINT NOT NULL,
      tx_signature TEXT NOT NULL,
      cycle_number INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_payouts (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      recipient_wallet TEXT NOT NULL,
      amount_micro_usdc BIGINT NOT NULL,
      tx_signature TEXT NOT NULL,
      cycle_number INTEGER,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_announcements (
      id TEXT PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_order_change_requests (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
      proposed_order JSONB NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS committee_payment_reminders (
      id UUID PRIMARY KEY,
      committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
      cycle_number INTEGER,
      message TEXT NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS coaching_messages (
      id UUID PRIMARY KEY,
      goal_id UUID,
      committee_id UUID,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE coaching_messages
    ADD COLUMN IF NOT EXISTS committee_id UUID
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_contributions_committee_created
      ON committee_contributions (committee_id, created_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_payouts_committee_claimed
      ON committee_payouts (committee_id, claimed_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_announcements_committee_created
      ON committee_announcements (committee_id, created_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_order_change_requests_committee_created
      ON committee_order_change_requests (committee_id, created_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_payment_reminders_committee_created
      ON committee_payment_reminders (committee_id, created_at DESC)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_collateral_committee_member
      ON committee_collateral_vaults (committee_id, member_user_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_deferred_committee_member
      ON committee_deferred_escrows (committee_id, member_user_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_committee_penalty_events_committee_created
      ON committee_penalty_events (committee_id, created_at DESC)
  `);
  committeeSchemaEnsured = true;
}

function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function mapFrequencyToDays(frequency: string | undefined): number {
  const normalized = String(frequency ?? "").toLowerCase();
  if (normalized.includes("week")) return 7;
  if (normalized.includes("bi")) return 14;
  if (normalized.includes("quarter")) return 90;
  return 30;
}

function shuffleInPlace<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function allocateInviteCode(prisma: ReturnType<typeof getPrisma>): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const candidate = makeInviteCode();
    const existing = await prisma.committee.findUnique({
      where: { invite_code: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${makeInviteCode()}${Date.now().toString(36).slice(-2)}`;
}

function normalizeMemberName(input: { display_name: string | null; username: string | null; wallet_address: string }): string {
  if (input.display_name && input.display_name.trim().length > 0) return input.display_name.trim();
  if (input.username && input.username.trim().length > 0) return `@${input.username.trim()}`;
  return `${input.wallet_address.slice(0, 4)}...${input.wallet_address.slice(-4)}`;
}

function serializeCommitteeForJson<T extends { contribution_amount: bigint | number | null }>(
  committee: T
): Omit<T, "contribution_amount"> & { contribution_amount: number } {
  return {
    ...committee,
    contribution_amount: Number(committee.contribution_amount ?? 0),
  };
}

function isInternalProofSignature(signature: string): boolean {
  return signature.startsWith("wallet-proof-");
}

function safetyTxScopeKeysForMember(params: {
  safetyCommitteePda: string | null;
  legacyPda: string | null;
  legacyVault: string | null;
  managerWallet: string | null;
  memberWallet: string;
}): string[] {
  const out: string[] = [];
  if (params.safetyCommitteePda) out.push(params.safetyCommitteePda);
  if (params.legacyPda) out.push(params.legacyPda);
  if (params.legacyVault) out.push(params.legacyVault);
  const pid = config.committeeSafetyProgramId?.trim();
  if (params.safetyCommitteePda && params.managerWallet && pid) {
    const pdas = deriveCommitteeSafetyPdas({
      programId: pid,
      managerWallet: params.managerWallet,
      memberWallet: params.memberWallet,
    });
    out.push(pdas.memberStatePda, pdas.deferredEscrowPda, pdas.collateralVaultPda);
  }
  return [...new Set(out.map((k) => k.trim()).filter((k) => k.length > 0))];
}

type CommitteePenaltyCtx = {
  id: string;
  current_cycle: number;
  late_penalty_action: string;
  penalty_goes_to: string;
};

async function runPenaltyStrikeDbEffects(
  tx: Prisma.TransactionClient,
  committee: CommitteePenaltyCtx,
  member: { id: string; user_id: string },
  params: {
    nextStrike: number;
    penaltyAmount: number;
    newTotalPenaltiesPaid: number;
    penaltyTxSignature: string | null;
  }
): Promise<void> {
  const { nextStrike, penaltyAmount, newTotalPenaltiesPaid, penaltyTxSignature } = params;
  const shouldSuspend = nextStrike >= 2 || committee.late_penalty_action === "suspend";
  const shouldRemove = nextStrike >= 3 || committee.late_penalty_action === "remove";
  const actionTaken = shouldRemove ? "remove" : shouldSuspend ? "suspend" : "warning";
  await tx.$executeRawUnsafe(
    `
    UPDATE committee_members
    SET
      penalty_strikes = $1,
      total_penalties_paid = $2,
      is_eligible_for_payout = $3,
      status = $4
    WHERE id = $5
    `,
    nextStrike,
    newTotalPenaltiesPaid,
    nextStrike >= 2 ? false : true,
    shouldRemove ? "removed" : shouldSuspend ? "suspended" : "active",
    member.id
  );
  await tx.$executeRawUnsafe(
    `
    INSERT INTO committee_penalty_events
      (id, committee_id, user_id, strike_number, penalty_amount, action_taken, tx_signature)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
    `,
    randomUUID(),
    committee.id,
    member.user_id,
    nextStrike,
    penaltyAmount,
    actionTaken,
    penaltyTxSignature
  );
  if (shouldRemove) {
    await tx.committee.update({
      where: { id: committee.id },
      data: { current_members: { decrement: 1 } },
    });
  }
  if (penaltyAmount > 0 && committee.penalty_goes_to === "welfare") {
    await tx.welfareTransfer.create({
      data: {
        committee_id: committee.id,
        amount_micro_usdc: BigInt(penaltyAmount),
        tx_signature: penaltyTxSignature ?? `wallet-proof-penalty-fallback-${Date.now()}`,
        reason: `late_penalty_strike_${nextStrike}`,
      },
    });
  }
  if (shouldRemove) {
    const deferredRows = await tx.$queryRawUnsafe<
      Array<{ id: string; total_deferred: bigint; released_so_far: bigint; is_complete: boolean }>
    >(
      `
      SELECT id, total_deferred, released_so_far, is_complete
      FROM committee_deferred_escrows
      WHERE committee_id = $1 AND member_user_id = $2
      LIMIT 1
      `,
      committee.id,
      member.user_id
    );
    const deferred = deferredRows[0];
    if (deferred && !deferred.is_complete) {
      const remainingDeferred = Math.max(
        0,
        Number(deferred.total_deferred ?? 0) - Number(deferred.released_so_far ?? 0)
      );
      await tx.$executeRawUnsafe(
        `
        UPDATE committee_deferred_escrows
        SET
          released_so_far = total_deferred,
          cycles_completed = cycles_remaining,
          is_complete = true,
          updated_at = NOW()
        WHERE id = $1
        `,
        deferred.id
      );
      if (remainingDeferred > 0 && committee.penalty_goes_to === "welfare") {
        await tx.welfareTransfer.create({
          data: {
            committee_id: committee.id,
            amount_micro_usdc: BigInt(remainingDeferred),
            tx_signature: `wallet-proof-forfeit-${committee.current_cycle}-${member.user_id.slice(0, 8)}-${Date.now()}`,
            reason: "forfeit_remaining_deferred_on_remove",
          },
        });
      }
    }
  }
}

async function enforceLatePenaltiesForCommittee(
  committeeId: string
): Promise<{
  overdue: boolean;
  checked_members: number;
  penalized_members: number;
}> {
  const prisma = getPrisma();
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: {
      id: true,
      current_cycle: true,
      next_cycle_date: true,
      grace_period_days: true,
      late_penalty_action: true,
      penalty_goes_to: true,
    },
  });
  if (!committee) throw new Error("committee not found");
  if (!committee.next_cycle_date) {
    return { overdue: false, checked_members: 0, penalized_members: 0 };
  }

  const graceMs = Math.max(1, Number(committee.grace_period_days ?? 3)) * 86400000;
  const overdueAt = committee.next_cycle_date.getTime() + graceMs;
  if (Date.now() <= overdueAt) {
    return { overdue: false, checked_members: 0, penalized_members: 0 };
  }

  const members = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      status: string;
      penalty_strikes: number;
      total_penalties_paid: bigint;
    }>
  >(
    `
    SELECT id, user_id, status, penalty_strikes, total_penalties_paid
    FROM committee_members
    WHERE committee_id = $1 AND status IN ('active', 'suspended')
    `,
    committee.id
  );
  if (members.length === 0) {
    return { overdue: true, checked_members: 0, penalized_members: 0 };
  }

  const paidRows = await prisma.committeeContribution.findMany({
    where: {
      committee_id: committee.id,
      cycle_number: committee.current_cycle,
    },
    select: { user_id: true },
    distinct: ["user_id"],
  });
  const paidUserIds = new Set(paidRows.map((row) => row.user_id));

  let penalizedMembers = 0;
  for (const member of members) {
    if (paidUserIds.has(member.user_id)) continue;
    penalizedMembers += 1;
    const nextStrike = Number(member.penalty_strikes ?? 0) + 1;
    const depositedRow = await prisma.$queryRawUnsafe<Array<{ deposited_amount: bigint; is_returned: boolean }>>(
      `
      SELECT deposited_amount, is_returned
      FROM committee_collateral_vaults
      WHERE committee_id = $1 AND member_user_id = $2
      LIMIT 1
      `,
      committee.id,
      member.user_id
    );
    const depositedAmount = depositedRow[0] ? Number(depositedRow[0].deposited_amount ?? 0) : 0;
    const isReturned = depositedRow[0]?.is_returned === true;
    const alreadyPaidPenalty = Number(member.total_penalties_paid ?? 0);
    const collateralRemaining = Math.max(0, depositedAmount - alreadyPaidPenalty);

    let penaltyAmount = 0;
    if (!isReturned && collateralRemaining > 0) {
      if (nextStrike === 1) penaltyAmount = Math.floor((depositedAmount * 2) / 100);
      else if (nextStrike === 2) penaltyAmount = Math.floor((depositedAmount * 5) / 100);
      else penaltyAmount = collateralRemaining;
      penaltyAmount = Math.min(collateralRemaining, Math.max(0, penaltyAmount));
    }

    const penaltyTxSignature =
      penaltyAmount > 0
        ? `wallet-proof-penalty-${committee.current_cycle}-${member.user_id.slice(0, 8)}-${Date.now()}`
        : null;
    await prisma.$transaction(async (tx) => {
      await runPenaltyStrikeDbEffects(tx, committee, member, {
        nextStrike,
        penaltyAmount,
        newTotalPenaltiesPaid: alreadyPaidPenalty + penaltyAmount,
        penaltyTxSignature,
      });
    });
  }

  return {
    overdue: true,
    checked_members: members.length,
    penalized_members: penalizedMembers,
  };
}

async function assertManagerAccess(committeeId: string, authHeader: string | undefined): Promise<string> {
  const claims = tryReadClaims(authHeader);
  if (!claims) throw new Error("missing token");
  const prisma = getPrisma();
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { manager_id: true },
  });
  if (!committee) throw new Error("committee not found");
  if (!committee.manager_id || committee.manager_id !== claims.sub) throw new Error("forbidden");
  return claims.sub;
}

committeesRouter.post("/", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const {
      manager_wallet,
      name,
      description,
      purpose_type,
      contribution_amount_micro_usdc,
      frequency,
      max_members,
      total_cycles,
      payout_order_type,
      payout_order_locked,
      grace_period_days,
      late_penalty_action,
      penalty_goes_to,
      welfare_opt_in_pct,
      kyc_required,
      nominee_required,
    } = req.body ?? {};

    if (!name || contribution_amount_micro_usdc == null) {
      return res.status(400).json({
        error: "name and contribution_amount_micro_usdc are required",
      });
    }

    const claims = tryReadClaims(req.headers.authorization);
    let managerWallet =
      typeof manager_wallet === "string" && manager_wallet.trim().length > 0
        ? manager_wallet.trim()
        : "";
    let managerUserIdFromSession: string | null = null;

    if (!managerWallet && claims?.sub) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, wallet_address: true },
      });
      if (sessionUser?.wallet_address) {
        managerWallet = sessionUser.wallet_address;
        managerUserIdFromSession = sessionUser.id;
      }
    }
    if (!managerWallet) return res.status(400).json({ error: "manager_wallet is required" });
    const committeeName = String(name).trim();
    if (!committeeName) return res.status(400).json({ error: "name is required" });

    const contributionAmount = Number(contribution_amount_micro_usdc);
    if (!Number.isFinite(contributionAmount) || contributionAmount < 5_000_000) {
      return res.status(400).json({ error: "minimum contribution is 5 USDC" });
    }

    const maxMembers = Math.max(2, Math.min(50, Number(max_members ?? 10)));
    const totalCycles = Math.max(1, Number(total_cycles ?? maxMembers));
    const frequencyText = typeof frequency === "string" && frequency.trim() ? frequency.trim() : "monthly";
    const inviteCode = await allocateInviteCode(prisma);
    const nextCycleDate = new Date(Date.now() + mapFrequencyToDays(frequencyText) * 86_400_000);

    const manager =
      managerUserIdFromSession != null
        ? await prisma.user.findUnique({
            where: { id: managerUserIdFromSession },
            select: { id: true, wallet_address: true, username: true, display_name: true },
          })
        : null;
    const resolvedManager =
      manager ??
      (await prisma.user.upsert({
        where: { wallet_address: managerWallet },
        update: {},
        create: { wallet_address: managerWallet },
        select: { id: true, wallet_address: true, username: true, display_name: true },
      }));
    const derivedSafetyPdas =
      config.committeeSafetyProgramId && config.committeeSafetyProgramId.trim().length > 0
        ? (() => {
            try {
              return deriveCommitteeSafetyPdas({
                programId: config.committeeSafetyProgramId,
                managerWallet: resolvedManager.wallet_address,
                memberWallet: resolvedManager.wallet_address,
              });
            } catch {
              return null;
            }
          })()
        : null;

    const committee = await prisma.$transaction(async (tx) => {
      const created = await tx.committee.create({
        data: {
          name: committeeName,
          description:
            typeof description === "string" && description.trim().length > 0
              ? description.trim()
              : null,
          goal_type:
            typeof purpose_type === "string" && purpose_type.trim().length > 0
              ? purpose_type.trim()
              : "General savings",
          manager_id: resolvedManager.id,
          contribution_amount: BigInt(Math.round(contributionAmount)),
          frequency: frequencyText,
          max_members: maxMembers,
          current_members: 1,
          total_cycles: totalCycles,
          current_cycle: 1,
          payout_order_type:
            typeof payout_order_type === "string" && payout_order_type.trim().length > 0
              ? payout_order_type.trim().toLowerCase()
              : "manager",
          payout_order_locked: Boolean(payout_order_locked ?? false),
          grace_period_days: Math.max(1, Number(grace_period_days ?? 3)),
          late_penalty_action:
            typeof late_penalty_action === "string" && late_penalty_action.trim().length > 0
              ? late_penalty_action.trim()
              : "warning",
          penalty_goes_to:
            typeof penalty_goes_to === "string" && penalty_goes_to.trim().length > 0
              ? penalty_goes_to.trim()
              : "welfare",
          welfare_opt_in_pct:
            welfare_opt_in_pct == null ? 0 : Number(welfare_opt_in_pct),
          kyc_required: Boolean(kyc_required ?? true),
          nominee_required: Boolean(nominee_required ?? false),
          status: "active",
          invite_code: inviteCode,
          next_cycle_date: nextCycleDate,
        },
        select: {
          id: true,
          name: true,
          goal_type: true,
          contribution_amount: true,
          current_cycle: true,
          total_cycles: true,
          next_cycle_date: true,
          status: true,
          current_members: true,
          max_members: true,
          invite_code: true,
        },
      });

      await tx.committeeMember.create({
        data: {
          committee_id: created.id,
          user_id: resolvedManager.id,
          payout_position: 1,
          status: "active",
        },
      });
      if (derivedSafetyPdas?.committeePda) {
        await tx.$executeRawUnsafe(
          `UPDATE committees SET safety_committee_pda = $1 WHERE id = $2`,
          derivedSafetyPdas.committeePda,
          created.id
        );
      }
      if (derivedSafetyPdas) {
        await tx.$executeRawUnsafe(
          `
          UPDATE committee_members
          SET
            member_state_pda = $1,
            collateral_vault_pda = $2,
            deferred_escrow_pda = $3
          WHERE committee_id = $4 AND user_id = $5
          `,
          derivedSafetyPdas.memberStatePda,
          derivedSafetyPdas.collateralVaultPda,
          derivedSafetyPdas.deferredEscrowPda,
          created.id,
          resolvedManager.id
        );
      }

      return created;
    });

    return res.status(201).json({
      committee: serializeCommitteeForJson(committee),
      invite_code: committee.invite_code,
      invite_link: `https://rizq.app/invite/${committee.invite_code}`,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/invite/:inviteCode", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const inviteCode = String(req.params.inviteCode).trim().toUpperCase();
    const committee = await prisma.committee.findFirst({
      where: { invite_code: inviteCode, status: { in: ["active", "forming"] } },
      select: {
        id: true,
        name: true,
        contribution_amount: true,
        frequency: true,
        current_members: true,
        max_members: true,
        kyc_required: true,
        nominee_required: true,
        grace_period_days: true,
        late_penalty_action: true,
        next_cycle_date: true,
        payout_order_type: true,
        manager: {
          select: { username: true, display_name: true, wallet_address: true },
        },
      },
    });
    if (!committee) return res.status(404).json({ error: "invite not found" });

    const managerAlias =
      committee.manager?.username?.trim() ||
      committee.manager?.display_name?.trim() ||
      `${committee.manager?.wallet_address.slice(0, 4) ?? "mgr"}...${
        committee.manager?.wallet_address.slice(-4) ?? ""
      }`;

    const claims = tryReadClaims(req.headers.authorization);
    const walletQuery =
      typeof req.query.wallet === "string" && req.query.wallet.trim().length > 0
        ? req.query.wallet.trim()
        : null;
    const viewer =
      claims?.sub != null
        ? await prisma.user.findUnique({
            where: { id: claims.sub },
            select: { id: true },
          })
        : walletQuery
          ? await prisma.user.findUnique({
              where: { wallet_address: walletQuery },
              select: { id: true },
            })
          : null;

    const alreadyJoined = viewer
      ? Boolean(
          await prisma.committeeMember.findFirst({
            where: {
              committee_id: committee.id,
              user_id: viewer.id,
              status: { in: ["active", "suspended"] },
            },
            select: { id: true },
          })
        )
      : false;

    return res.json({
      committee_id: committee.id,
      committee_name: committee.name,
      manager_alias: managerAlias.startsWith("@") ? managerAlias : `@${managerAlias}`,
      manager_avatar: managerAlias.replace("@", "").slice(0, 2).toUpperCase(),
      contribution_amount_usdc: Number(committee.contribution_amount) / 1_000_000,
      frequency: committee.frequency,
      payout_position: Math.min(committee.current_members + 1, committee.max_members),
      kyc_required: committee.kyc_required,
      nominee_required: committee.nominee_required,
      grace_period: `${committee.grace_period_days} days`,
      penalty_rule: committee.late_penalty_action,
      first_contribution_due_date: committee.next_cycle_date?.toISOString().slice(0, 10) ?? "",
      already_joined: alreadyJoined,
      manager_wallet: committee.manager?.wallet_address ?? null,
      payout_order_type: committee.payout_order_type,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/join-slot", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const claims = tryReadClaims(req.headers.authorization);
    if (!claims?.sub) return res.status(401).json({ error: "missing token" });
    const prisma = getPrisma();
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { id: true, max_members: true },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });
    const maxPosition = await prisma.committeeMember.aggregate({
      where: { committee_id: committeeId },
      _max: { payout_position: true },
    });
    const nextPosition = (maxPosition._max.payout_position ?? 0) + 1;
    if (nextPosition > committee.max_members) {
      return res.status(400).json({ error: "committee is full" });
    }
    return res.json({ payout_position: nextPosition });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/safety/bootstrap", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    try {
      await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    if (!config.committeeSafetyProgramId?.trim()) {
      return res.status(400).json({ error: "COMMITTEE_SAFETY_PROGRAM_ID not configured" });
    }

    const {
      initialize_tx_signature,
      deposit_tx_signature,
      join_tx_signature,
    } = req.body ?? {};

    const initSig = typeof initialize_tx_signature === "string" ? initialize_tx_signature.trim() : "";
    const depSig = typeof deposit_tx_signature === "string" ? deposit_tx_signature.trim() : "";
    const joinSig = typeof join_tx_signature === "string" ? join_tx_signature.trim() : "";

    if (!initSig && !depSig && !joinSig) {
      return res.status(400).json({ error: "provide at least one tx signature" });
    }

    const prisma = getPrisma();
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        manager_id: true,
        safety_committee_pda: true,
        contribution_amount: true,
        total_cycles: true,
        grace_period_days: true,
      },
    });
    if (!committee?.manager_id) return res.status(404).json({ error: "committee not found" });

    const managerUser = await prisma.user.findUnique({
      where: { id: committee.manager_id },
      select: { wallet_address: true },
    });
    const managerWallet = managerUser?.wallet_address?.trim();
    if (!managerWallet) {
      return res.status(400).json({ error: "manager wallet required for safety verification" });
    }

    const expectedCommitteePda = deriveCommitteeSafetyPdas({
      programId: config.committeeSafetyProgramId,
      managerWallet,
      memberWallet: managerWallet,
    }).committeePda;

    if (committee.safety_committee_pda && committee.safety_committee_pda !== expectedCommitteePda) {
      return res.status(400).json({ error: "committee safety PDA mismatch" });
    }

    const sigsToVerify = [initSig, depSig, joinSig].filter((s) => s.length > 0);
    for (const sig of sigsToVerify) {
      await verifyDevnetTransactionSucceeded(sig);
    }

    if (initSig) {
      const ok = await verifyCommitteeSafetyAccountExists(expectedCommitteePda);
      if (!ok) {
        return res.status(400).json({
          error: "committee state account not found after initialize transaction",
        });
      }
      try {
        const decoded = await fetchDecodedCommitteeState(expectedCommitteePda);
        if (decoded.manager !== managerWallet) {
          return res.status(400).json({ error: "on-chain committee manager does not match DB manager wallet" });
        }
        if (decoded.contributionAmountMicro !== BigInt(committee.contribution_amount)) {
          return res.status(400).json({ error: "on-chain contribution_amount does not match committee record" });
        }
        if (decoded.totalCycles !== committee.total_cycles) {
          return res.status(400).json({ error: "on-chain total_cycles does not match committee record" });
        }
        const expectedGraceSec = BigInt(Math.max(0, committee.grace_period_days)) * 86400n;
        if (decoded.gracePeriodSeconds !== expectedGraceSec) {
          return res.status(400).json({ error: "on-chain grace period does not match committee grace_period_days" });
        }
        if (joinSig && decoded.currentMembers < 1) {
          return res.status(400).json({
            error: "on-chain committee shows no members after join transaction",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "decode failed";
        return res.status(400).json({ error: `committee state decode failed: ${msg}` });
      }
    }

    const recorded =
      initSig ||
      depSig ||
      joinSig;
    await prisma.$executeRawUnsafe(
      `
      UPDATE committees
      SET
        safety_initialized_tx = $1,
        safety_committee_pda = $2
      WHERE id = $3
      `,
      recorded,
      expectedCommitteePda,
      committeeId
    );

    return res.json({
      ok: true,
      committee_id: committeeId,
      safety_committee_pda: expectedCommitteePda,
      recorded_tx: recorded,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "server error";
    if (
      msg.includes("transaction") ||
      msg.includes("not found") ||
      msg.includes("failed")
    ) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/session/me", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const claims = tryReadClaims(req.headers.authorization);
    if (!claims) return res.status(401).json({ error: "missing token" });

    const memberships = await prisma.committeeMember.findMany({
      where: {
        user_id: claims.sub,
        status: { in: ["active", "suspended"] },
      },
      select: {
        committee: {
          select: {
            id: true,
            name: true,
            goal_type: true,
            contribution_amount: true,
            current_cycle: true,
            total_cycles: true,
            next_cycle_date: true,
            status: true,
            current_members: true,
            max_members: true,
            invite_code: true,
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    return res.json(memberships.map((m) => serializeCommitteeForJson(m.committee)));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/join", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const { wallet_address } = req.body ?? {};
    const claims = tryReadClaims(req.headers.authorization);

    let wallet = typeof wallet_address === "string" ? String(wallet_address).trim() : "";
    let user =
      claims?.sub
        ? await prisma.user.findUnique({
            where: { id: claims.sub },
            select: { id: true, kyc_status: true, wallet_address: true },
          })
        : null;
    if (!user && !wallet) {
      return res.status(400).json({ error: "wallet_address is required" });
    }
    if (!user) {
      user = await prisma.user.upsert({
        where: { wallet_address: wallet },
        update: {},
        create: { wallet_address: wallet },
        select: { id: true, kyc_status: true, wallet_address: true },
      });
    }
    wallet = user.wallet_address;

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        name: true,
        max_members: true,
        current_members: true,
        manager_id: true,
        kyc_required: true,
        nominee_required: true,
        payout_order_type: true,
        status: true,
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });
    if (committee.status === "paused") {
      return res.status(400).json({ error: "committee is paused" });
    }
    if (committee.current_members >= committee.max_members) {
      return res.status(400).json({ error: "committee is full" });
    }

    const existingMembership = await prisma.committeeMember.findFirst({
      where: { committee_id: committee.id, user_id: user.id },
      select: { id: true, payout_position: true, status: true },
    });
    if (existingMembership) {
      return res.json({
        ok: true,
        committee_id: committee.id,
        member_id: existingMembership.id,
        payout_position: existingMembership.payout_position,
        already_joined: true,
      });
    }

    if (committee.kyc_required && user.kyc_status !== "verified") {
      return res.status(400).json({ error: "kyc_required" });
    }

    if (committee.nominee_required) {
      const nominee = await prisma.nominee.findFirst({
        where: { user_id: user.id },
        select: { id: true },
      });
      if (!nominee) {
        return res.status(400).json({ error: "nominee_required" });
      }
    }

    const collateral = await prisma.$queryRawUnsafe<Array<{ id: string; is_returned: boolean }>>(
      `
      SELECT id, is_returned
      FROM committee_collateral_vaults
      WHERE committee_id = $1 AND member_user_id = $2
      LIMIT 1
      `,
      committee.id,
      user.id
    );
    if (collateral.length === 0 || collateral[0].is_returned) {
      return res.status(400).json({ error: "collateral_required" });
    }

    const committeeManagerWallet = committee.manager_id
      ? (
          await prisma.user.findUnique({
            where: { id: committee.manager_id },
            select: { wallet_address: true },
          })
        )?.wallet_address ?? null
      : null;
    const memberSafetyPdas =
      config.committeeSafetyProgramId &&
      config.committeeSafetyProgramId.trim().length > 0 &&
      committeeManagerWallet
        ? (() => {
            try {
              return deriveCommitteeSafetyPdas({
                programId: config.committeeSafetyProgramId,
                managerWallet: committeeManagerWallet,
                memberWallet: wallet,
              });
            } catch {
              return null;
            }
          })()
        : null;

    const joined = await prisma.$transaction(async (tx) => {
      const maxPosition = await tx.committeeMember.aggregate({
        where: { committee_id: committee.id },
        _max: { payout_position: true },
      });
      const nextPosition = (maxPosition._max.payout_position ?? 0) + 1;
      const member = await tx.committeeMember.create({
        data: {
          committee_id: committee.id,
          user_id: user.id,
          payout_position: nextPosition,
          status: "active",
        },
        select: { id: true, payout_position: true },
      });
      if (memberSafetyPdas) {
        await tx.$executeRawUnsafe(
          `
          UPDATE committee_members
          SET
            member_state_pda = $1,
            collateral_vault_pda = $2,
            deferred_escrow_pda = $3
          WHERE id = $4
          `,
          memberSafetyPdas.memberStatePda,
          memberSafetyPdas.collateralVaultPda,
          memberSafetyPdas.deferredEscrowPda,
          member.id
        );
      }
      await tx.committee.update({
        where: { id: committee.id },
        data: { current_members: { increment: 1 } },
      });

      if (committee.payout_order_type === "random") {
        const allMembers = await tx.committeeMember.findMany({
          where: { committee_id: committee.id, status: { in: ["active", "suspended"] } },
          orderBy: { joined_at: "asc" },
          select: { id: true },
        });
        const shuffled = shuffleInPlace(allMembers);
        await tx.committeeMember.updateMany({
          where: { committee_id: committee.id },
          data: { payout_position: null },
        });
        for (let i = 0; i < shuffled.length; i += 1) {
          await tx.committeeMember.update({
            where: { id: shuffled[i].id },
            data: { payout_position: i + 1 },
          });
        }
      }

      return member;
    });

    return res.status(201).json({
      ok: true,
      committee_id: committee.id,
      member_id: joined.id,
      payout_position: joined.payout_position,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/collateral/deposit", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const { wallet_address, tx_signature } = req.body ?? {};
    const claims = tryReadClaims(req.headers.authorization);

    let wallet = typeof wallet_address === "string" ? String(wallet_address).trim() : "";
    let user =
      claims?.sub
        ? await prisma.user.findUnique({
            where: { id: claims.sub },
            select: { id: true, wallet_address: true },
          })
        : null;
    if (!user && !wallet) {
      return res.status(400).json({ error: "wallet_address is required" });
    }
    if (!user) {
      user = await prisma.user.upsert({
        where: { wallet_address: wallet },
        update: {},
        create: { wallet_address: wallet },
        select: { id: true, wallet_address: true },
      });
    }
    wallet = user.wallet_address;

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        manager_id: true,
        contribution_amount: true,
        pda_address: true,
        vault_address: true,
        safety_committee_pda: true,
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });

    const signature = String(tx_signature ?? "").trim();
    if (!signature) return res.status(400).json({ error: "tx_signature is required" });

    if (!isInternalProofSignature(signature)) {
      try {
        const scopePda = committee.safety_committee_pda ?? committee.pda_address;
        await verifyConfirmedCommitteeTx({
          txSignature: signature,
          requiredWallet: wallet,
          committeePda: scopePda,
          committeeVault: committee.vault_address,
        });
      } catch (error) {
        return res.status(400).json({
          error: "Invalid or unconfirmed transaction signature",
          detail: error instanceof Error ? error.message : "verification failed",
        });
      }
    }

    const collateralId = randomUUID();
    const committeeManagerWallet = committee.manager_id
      ? (
          await prisma.user.findUnique({
            where: { id: committee.manager_id },
            select: { wallet_address: true },
          })
        )?.wallet_address ?? null
      : null;
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO committee_collateral_vaults
        (id, committee_id, member_user_id, deposited_amount, tx_signature, is_returned)
      VALUES
        ($1, $2, $3, $4, $5, false)
      ON CONFLICT (committee_id, member_user_id)
      DO UPDATE SET
        deposited_amount = EXCLUDED.deposited_amount,
        tx_signature = EXCLUDED.tx_signature,
        is_returned = false,
        returned_at = NULL
      `,
      collateralId,
      committee.id,
      user.id,
      Number(committee.contribution_amount ?? 0),
      signature
    );
    await prisma.$executeRawUnsafe(
      `
      UPDATE committee_members
      SET collateral_deposited = $1, collateral_vault_pda = COALESCE(collateral_vault_pda, $4)
      WHERE committee_id = $2 AND user_id = $3
      `,
      Number(committee.contribution_amount ?? 0),
      committee.id,
      user.id,
      (() => {
        try {
          if (!committeeManagerWallet || !config.committeeSafetyProgramId) return null;
          return deriveCommitteeSafetyPdas({
            programId: config.committeeSafetyProgramId,
            managerWallet: committeeManagerWallet,
            memberWallet: wallet,
          }).collateralVaultPda;
        } catch {
          return null;
        }
      })()
    );

    return res.json({
      ok: true,
      committee_id: committee.id,
      member_user_id: user.id,
      deposited_amount: Number(committee.contribution_amount ?? 0),
      tx_signature: signature,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/wallet/:wallet", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const wallet = String(req.params.wallet);
    const user = await prisma.user.findUnique({
      where: { wallet_address: wallet },
      select: { id: true },
    });
    if (!user) return res.json([]);

    const memberships = await prisma.committeeMember.findMany({
      where: {
        user_id: user.id,
        status: { in: ["active", "suspended"] },
      },
      select: {
        committee: {
          select: {
            id: true,
            name: true,
            goal_type: true,
            contribution_amount: true,
            current_cycle: true,
            total_cycles: true,
            next_cycle_date: true,
            status: true,
            current_members: true,
            max_members: true,
            invite_code: true,
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    const rows = memberships.map((m) => serializeCommitteeForJson(m.committee));
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/wallet/:wallet/transactions", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const wallet = String(req.params.wallet).trim();
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    const user = await prisma.user.findUnique({
      where: { wallet_address: wallet },
      select: { id: true },
    });
    if (!user) return res.json([]);

    const memberships = await prisma.committeeMember.findMany({
      where: {
        user_id: user.id,
      },
      select: {
        committee_id: true,
      },
    });
    const committeeIds = Array.from(new Set(memberships.map((m) => m.committee_id)));
    if (committeeIds.length === 0) return res.json([]);

    const [committees, contributions, payouts] = await Promise.all([
      prisma.committee.findMany({
        where: { id: { in: committeeIds } },
        select: { id: true, name: true },
      }),
      prisma.committeeContribution.findMany({
        where: {
          committee_id: { in: committeeIds },
          user_id: user.id,
        },
        orderBy: { created_at: "desc" },
        take: 150,
        select: {
          id: true,
          committee_id: true,
          amount_micro_usdc: true,
          tx_signature: true,
          cycle_number: true,
          created_at: true,
        },
      }),
      prisma.committeePayout.findMany({
        where: {
          committee_id: { in: committeeIds },
          OR: [{ recipient_user_id: user.id }, { recipient_wallet: wallet }],
        },
        orderBy: { claimed_at: "desc" },
        take: 150,
        select: {
          id: true,
          committee_id: true,
          amount_micro_usdc: true,
          tx_signature: true,
          cycle_number: true,
          claimed_at: true,
        },
      }),
    ]);

    const committeeNameById = new Map(committees.map((c) => [c.id, c.name]));
    const events = [
      ...contributions.map((row) => ({
        id: `c-${row.id}`,
        type: "contribution" as const,
        committee_id: row.committee_id,
        committee_name: committeeNameById.get(row.committee_id) ?? "Committee",
        amount_micro_usdc: Number(row.amount_micro_usdc),
        tx_signature: row.tx_signature,
        cycle_number: row.cycle_number,
        created_at: row.created_at.toISOString(),
        timestamp: row.created_at.getTime(),
      })),
      ...payouts.map((row) => ({
        id: `p-${row.id}`,
        type: "payout" as const,
        committee_id: row.committee_id,
        committee_name: committeeNameById.get(row.committee_id) ?? "Committee",
        amount_micro_usdc: Number(row.amount_micro_usdc),
        tx_signature: row.tx_signature,
        cycle_number: row.cycle_number,
        created_at: row.claimed_at.toISOString(),
        timestamp: row.claimed_at.getTime(),
      })),
    ];
    events.sort((a, b) => b.timestamp - a.timestamp);

    return res.json(events.map(({ timestamp: _timestamp, ...item }) => item));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/dashboard", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        name: true,
        manager_id: true,
        status: true,
        current_cycle: true,
        total_cycles: true,
        next_cycle_date: true,
        contribution_amount: true,
        max_members: true,
        current_members: true,
        frequency: true,
        invite_code: true,
        safety_committee_pda: true,
        manager: { select: { wallet_address: true } },
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });

    const members = await prisma.committeeMember.findMany({
      where: { committee_id: committeeId },
      orderBy: [{ payout_position: "asc" }, { joined_at: "asc" }],
      select: {
        id: true,
        payout_position: true,
        status: true,
        user_id: true,
        penalty_strikes: true,
        is_eligible_for_payout: true,
        has_received: true,
        collateral_deposited: true,
        deferred_total: true,
        deferred_released: true,
        member_state_pda: true,
        collateral_vault_pda: true,
        deferred_escrow_pda: true,
        user: {
          select: {
            display_name: true,
            username: true,
            wallet_address: true,
          },
        },
      },
    });

    const cycleMin = Math.max(1, committee.current_cycle - 4);
    const cycleRange = Array.from({ length: 5 }, (_, i) => cycleMin + i);
    const contributions = await prisma.committeeContribution.findMany({
      where: {
        committee_id: committeeId,
        cycle_number: { gte: cycleMin, lte: committee.current_cycle },
      },
      select: {
        user_id: true,
        cycle_number: true,
        amount_micro_usdc: true,
        created_at: true,
      },
    });
    const now = Date.now();
    const isCurrentCycleOverdue =
      committee.next_cycle_date != null && new Date(committee.next_cycle_date).getTime() < now;

    const claims = tryReadClaims(req.headers.authorization);
    const currentUserId = claims?.sub ?? null;
    const isManager = Boolean(currentUserId && committee.manager_id === currentUserId);

    const memberRows = members.map((member) => {
      const name = normalizeMemberName({
        display_name: member.user.display_name,
        username: member.user.username,
        wallet_address: member.user.wallet_address,
      });
      const contributionHistory = cycleRange.map((cycle) => {
        const paid = contributions.some(
          (item) => item.user_id === member.user_id && item.cycle_number === cycle
        );
        let status: "paid" | "pending" | "overdue" | "future" = "future";
        if (cycle < committee.current_cycle) status = paid ? "paid" : "overdue";
        else if (cycle === committee.current_cycle)
          status = paid ? "paid" : isCurrentCycleOverdue ? "overdue" : "pending";
        return { cycle, status };
      });
      const paidCurrent = contributionHistory.find((item) => item.cycle === committee.current_cycle)?.status === "paid";
      const currentStatus = paidCurrent ? "paid" : isCurrentCycleOverdue ? "overdue" : "pending";
      return {
        id: member.id,
        user_id: member.user_id,
        name,
        avatar: name.slice(0, 2).toUpperCase(),
        status: currentStatus,
        payout_position: member.payout_position ?? 0,
        membership_status: member.status,
        history: contributionHistory,
        wallet_address: isManager ? member.user.wallet_address : null,
      };
    });

    const paymentMatrix = memberRows.map((member) => member.history.map((h) => h.status));
    const payoutSchedule = memberRows.map((member) => ({
      turn: member.payout_position,
      member_name: member.name,
      due_date: committee.next_cycle_date?.toISOString().slice(0, 10) ?? "",
      completed: member.payout_position < committee.current_cycle,
      is_current_user: currentUserId != null && member.user_id === currentUserId,
      member_id: member.id,
    }));
    const currentMember = members.find((member) => member.user_id === currentUserId);
    const safetyProgramId =
      config.committeeSafetyProgramId && config.committeeSafetyProgramId.trim().length > 0
        ? config.committeeSafetyProgramId.trim()
        : null;
    const deferredTotal = Number(currentMember?.deferred_total ?? 0);
    const deferredReleased = Number(currentMember?.deferred_released ?? 0);
    const hasReceivedPayout = Boolean(currentMember?.has_received ?? false);
    const payoutTurnMatches =
      currentMember != null &&
      Number(currentMember.payout_position ?? 0) === committee.current_cycle;
    const safety = currentMember
      ? {
          onchain_enabled: config.safetyOnchainEnabled,
          safety_program_id: safetyProgramId,
          committee_pda: committee.safety_committee_pda ?? null,
          member_state_pda: currentMember.member_state_pda ?? null,
          collateral_vault_pda: currentMember.collateral_vault_pda ?? null,
          deferred_escrow_pda: currentMember.deferred_escrow_pda ?? null,
          penalty_strikes: Number(currentMember.penalty_strikes ?? 0),
          is_eligible_for_payout: Boolean(currentMember.is_eligible_for_payout ?? true),
          has_received_payout: hasReceivedPayout,
          /** Post–first-payout cycle: use `contribute_and_release_deferred` on devnet when enabled */
          use_on_chain_deferred_contribution:
            Boolean(config.safetyOnchainEnabled) &&
            Boolean(committee.safety_committee_pda) &&
            hasReceivedPayout &&
            deferredTotal > deferredReleased,
          /** Current cycle turn: use `release_payout_with_deferral` before DB claim when enabled */
          use_on_chain_payout_release:
            Boolean(config.safetyOnchainEnabled) &&
            Boolean(committee.safety_committee_pda) &&
            payoutTurnMatches,
          collateral_deposited_micro_usdc: Number(currentMember.collateral_deposited ?? 0),
          deferred_total_micro_usdc: deferredTotal,
          deferred_released_micro_usdc: deferredReleased,
        }
      : null;

    return res.json({
      committee: {
        id: committee.id,
        name: committee.name,
        status: committee.status,
        current_cycle: committee.current_cycle,
        total_cycles: committee.total_cycles,
        next_cycle_date: committee.next_cycle_date,
        contribution_amount_micro_usdc: Number(committee.contribution_amount),
        max_members: committee.max_members,
        current_members: committee.current_members,
        frequency: committee.frequency,
        invite_code: committee.invite_code,
        is_manager: isManager,
        current_user_id: currentUserId,
        manager_wallet: committee.manager?.wallet_address ?? null,
        safety,
      },
      members: memberRows,
      payout_schedule: payoutSchedule,
      payment_matrix: paymentMatrix,
      cycle_range: cycleRange,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/payout-order", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const { from_index, to_index } = req.body ?? {};
    const fromIndex = Number(from_index);
    const toIndex = Number(to_index);
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
      return res.status(400).json({ error: "from_index and to_index are required" });
    }
    try {
      await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    const prisma = getPrisma();
    const committeeMeta = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { payout_order_locked: true },
    });
    if (!committeeMeta) return res.status(404).json({ error: "committee not found" });
    if (committeeMeta.payout_order_locked) {
      return res.status(400).json({ error: "payout order is locked for this committee" });
    }
    await prisma.$transaction(async (tx) => {
      const rows = await tx.committeeMember.findMany({
        where: { committee_id: committeeId, status: { in: ["active", "suspended"] } },
        orderBy: [{ payout_position: "asc" }, { joined_at: "asc" }],
        select: { id: true },
      });
      if (rows.length === 0) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= rows.length || toIndex >= rows.length) {
        throw new Error("index out of range");
      }
      const reordered = [...rows];
      const [item] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, item);
      await tx.committeeMember.updateMany({
        where: { committee_id: committeeId },
        data: { payout_position: null },
      });
      for (let i = 0; i < reordered.length; i += 1) {
        await tx.committeeMember.update({
          where: { id: reordered[i].id },
          data: { payout_position: i + 1 },
        });
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("index out of range")) {
      return res.status(400).json({ error: "index out of range" });
    }
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/members/:memberId/action", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const memberId = String(req.params.memberId);
    const action = String(req.body?.action ?? "").trim().toLowerCase();
    if (!["suspend", "activate", "remove"].includes(action)) {
      return res.status(400).json({ error: "action must be suspend, activate, or remove" });
    }
    try {
      await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }
    const prisma = getPrisma();
    if (action === "remove") {
      await prisma.$transaction(async (tx) => {
        await tx.committeeMember.delete({ where: { id: memberId } });
        await tx.committee.update({
          where: { id: committeeId },
          data: { current_members: { decrement: 1 } },
        });
      });
    } else {
      await prisma.committeeMember.update({
        where: { id: memberId },
        data: { status: action === "suspend" ? "suspended" : "active" },
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.patch("/:id/status", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const status = String(req.body?.status ?? "").trim().toLowerCase();
    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ error: "status must be active or paused" });
    }
    try {
      await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }
    const prisma = getPrisma();
    await prisma.committee.update({
      where: { id: committeeId },
      data: { status },
    });
    return res.json({ ok: true, status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/order-change-requests", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const note = String(req.body?.note ?? "").trim() || null;
    let requestedBy: string;
    try {
      requestedBy = await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    const prisma = getPrisma();
    const committeeMeta = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: { payout_order_locked: true },
    });
    if (!committeeMeta) return res.status(404).json({ error: "committee not found" });
    if (committeeMeta.payout_order_locked) {
      return res.status(400).json({ error: "payout order is locked for this committee" });
    }
    const rows = await prisma.committeeMember.findMany({
      where: { committee_id: committeeId, status: { in: ["active", "suspended"] } },
      orderBy: [{ payout_position: "asc" }, { joined_at: "asc" }],
      select: {
        id: true,
        payout_position: true,
        user: {
          select: {
            display_name: true,
            username: true,
            wallet_address: true,
            device_push_token: true,
          },
        },
      },
    });
    if (rows.length === 0) {
      return res.status(400).json({ error: "no members to request approval from" });
    }

    const proposedOrder = rows.map((row, index) => ({
      member_id: row.id,
      current_position: row.payout_position ?? index + 1,
      member_name: normalizeMemberName({
        display_name: row.user.display_name,
        username: row.user.username,
        wallet_address: row.user.wallet_address,
      }),
    }));

    const requestId = randomUUID();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO committee_order_change_requests (id, committee_id, requested_by, proposed_order, note)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      requestId,
      committeeId,
      requestedBy,
      JSON.stringify(proposedOrder),
      note
    );

    const announcementTitle = "Payout Order Change Approval";
    const announcementMessage =
      note != null && note.length > 0
        ? `Manager requested approval for payout order changes. Note: ${note}`
        : "Manager requested approval for payout order changes. Review in dashboard.";

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO committee_announcements (id, committee_id, created_by, title, message)
      VALUES ($1, $2, $3, $4, $5)
      `,
      randomUUID(),
      committeeId,
      requestedBy,
      announcementTitle,
      announcementMessage
    );

    let sent = 0;
    for (const member of rows) {
      const token = member.user.device_push_token;
      if (!token) continue;
      await sendPush(token, announcementTitle, announcementMessage);
      sent += 1;
    }

    return res.json({
      ok: true,
      request_id: requestId,
      member_count: rows.length,
      push_sent: sent,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/payment-reminders", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const memberId = String(req.body?.member_id ?? "").trim();
    const cycleNumber =
      req.body?.cycle_number == null || req.body?.cycle_number === ""
        ? null
        : Number(req.body.cycle_number);
    if (!memberId) {
      return res.status(400).json({ error: "member_id is required" });
    }
    if (cycleNumber != null && (!Number.isInteger(cycleNumber) || cycleNumber <= 0)) {
      return res.status(400).json({ error: "cycle_number must be a positive integer" });
    }
    let managerUserId: string;
    try {
      managerUserId = await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    const prisma = getPrisma();
    const member = await prisma.committeeMember.findFirst({
      where: { id: memberId, committee_id: committeeId },
      select: {
        id: true,
        user: {
          select: {
            display_name: true,
            username: true,
            wallet_address: true,
            device_push_token: true,
          },
        },
      },
    });
    if (!member) {
      return res.status(404).json({ error: "member not found" });
    }

    const memberName = normalizeMemberName({
      display_name: member.user.display_name,
      username: member.user.username,
      wallet_address: member.user.wallet_address,
    });
    const defaultMessage =
      cycleNumber != null
        ? `Reminder: Please complete your Cycle ${cycleNumber} committee payment.`
        : "Reminder: Please complete your committee contribution.";
    const message = String(req.body?.message ?? defaultMessage).trim() || defaultMessage;
    const reminderId = randomUUID();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO committee_payment_reminders (id, committee_id, member_id, cycle_number, message, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      reminderId,
      committeeId,
      member.id,
      cycleNumber,
      message,
      managerUserId
    );

    const title = "Committee Payment Reminder";
    const pushMessage = `${memberName}: ${message}`;
    if (member.user.device_push_token) {
      await sendPush(member.user.device_push_token, title, pushMessage);
    }

    return res.json({
      ok: true,
      reminder_id: reminderId,
      member_id: member.id,
      message,
      cycle_number: cycleNumber,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/contributions", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const { wallet_address, amount_micro_usdc, tx_signature } = req.body ?? {};
    if (!wallet_address || amount_micro_usdc == null || !tx_signature) {
      return res
        .status(400)
        .json({ error: "wallet_address, amount_micro_usdc and tx_signature are required" });
    }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        name: true,
        pda_address: true,
        vault_address: true,
        current_cycle: true,
        manager_id: true,
        safety_committee_pda: true,
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });

    const user = await prisma.user.findUnique({
      where: { wallet_address: String(wallet_address) },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: "user not found" });

    const committeeManagerWallet = committee.manager_id
      ? (
          await prisma.user.findUnique({
            where: { id: committee.manager_id },
            select: { wallet_address: true },
          })
        )?.wallet_address ?? null
      : null;

    const membership = await prisma.committeeMember.findFirst({
      where: {
        committee_id: committee.id,
        user_id: user.id,
        status: { in: ["active", "suspended"] },
      },
      select: { id: true },
    });
    if (!membership) {
      return res.status(403).json({ error: "wallet is not an active committee member" });
    }

    const amount = Number(amount_micro_usdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount_micro_usdc must be a positive number" });
    }
    const signature = String(tx_signature).trim();
    if (!signature) {
      return res.status(400).json({ error: "tx_signature is required" });
    }

    const existing = await prisma.committeeContribution.findFirst({
      where: { committee_id: committee.id, tx_signature: signature },
      select: { id: true, tx_signature: true },
    });
    if (existing) {
      return res.json({
        ok: true,
        committee_id: committee.id,
        amount_micro_usdc: Math.round(amount),
        tx_signature: existing.tx_signature,
        duplicate: true,
      });
    }

    if (!isInternalProofSignature(signature)) {
      try {
        const scopeExtra = safetyTxScopeKeysForMember({
          safetyCommitteePda: committee.safety_committee_pda,
          legacyPda: committee.pda_address,
          legacyVault: committee.vault_address,
          managerWallet: committeeManagerWallet,
          memberWallet: String(wallet_address),
        });
        await verifyConfirmedCommitteeTx({
          txSignature: signature,
          requiredWallet: String(wallet_address),
          committeePda: committee.safety_committee_pda ?? committee.pda_address,
          committeeVault: committee.vault_address,
          additionalScopeKeys: scopeExtra,
        });
      } catch (error) {
        return res.status(400).json({
          error: "Invalid or unconfirmed transaction signature",
          detail: error instanceof Error ? error.message : "verification failed",
        });
      }
    }

    const alreadyPaidThisCycle = await prisma.committeeContribution.findFirst({
      where: {
        committee_id: committee.id,
        user_id: user.id,
        cycle_number: committee.current_cycle,
      },
      select: { id: true },
    });
    if (alreadyPaidThisCycle) {
      return res.status(409).json({
        error: `Contribution for cycle ${committee.current_cycle} already recorded for this member`,
      });
    }

    await prisma.committeeContribution.create({
      data: {
        committee_id: committee.id,
        user_id: user.id,
        amount_micro_usdc: BigInt(Math.round(amount)),
        tx_signature: signature,
        cycle_number: committee.current_cycle,
      },
    });

    await prisma.$executeRawUnsafe(
      `
      UPDATE committee_members
      SET
        last_contribution_cycle = $1,
        member_state_pda = COALESCE(member_state_pda, $4),
        deferred_escrow_pda = COALESCE(deferred_escrow_pda, $5)
      WHERE committee_id = $2 AND user_id = $3
      `,
      committee.current_cycle,
      committee.id,
      user.id,
      (() => {
        try {
          if (!committeeManagerWallet || !config.committeeSafetyProgramId) return null;
          return deriveCommitteeSafetyPdas({
            programId: config.committeeSafetyProgramId,
            managerWallet: committeeManagerWallet,
            memberWallet: String(wallet_address),
          }).memberStatePda;
        } catch {
          return null;
        }
      })(),
      (() => {
        try {
          if (!committeeManagerWallet || !config.committeeSafetyProgramId) return null;
          return deriveCommitteeSafetyPdas({
            programId: config.committeeSafetyProgramId,
            managerWallet: committeeManagerWallet,
            memberWallet: String(wallet_address),
          }).deferredEscrowPda;
        } catch {
          return null;
        }
      })()
    );

    let deferredReleaseAmount = 0;
    const escrowRows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        total_deferred: bigint;
        released_so_far: bigint;
        cycles_remaining: number;
        cycles_completed: number;
        is_complete: boolean;
      }>
    >(
      `
      SELECT id, total_deferred, released_so_far, cycles_remaining, cycles_completed, is_complete
      FROM committee_deferred_escrows
      WHERE committee_id = $1 AND member_user_id = $2
      LIMIT 1
      `,
      committee.id,
      user.id
    );
    const escrow = escrowRows[0];
    if (escrow && !escrow.is_complete && escrow.cycles_completed < escrow.cycles_remaining) {
      deferredReleaseAmount = calculateReleasePerCycle({
        totalDeferred: Number(escrow.total_deferred),
        releasedSoFar: Number(escrow.released_so_far),
        cyclesCompleted: escrow.cycles_completed,
        cyclesRemaining: escrow.cycles_remaining,
      });
      const nextReleasedSoFar = Number(escrow.released_so_far) + deferredReleaseAmount;
      const nextCyclesCompleted = escrow.cycles_completed + 1;
      const isComplete = nextCyclesCompleted >= escrow.cycles_remaining;
      await prisma.$executeRawUnsafe(
        `
        UPDATE committee_deferred_escrows
        SET
          released_so_far = $1,
          cycles_completed = $2,
          is_complete = $3,
          updated_at = NOW()
        WHERE id = $4
        `,
        nextReleasedSoFar,
        nextCyclesCompleted,
        isComplete,
        escrow.id
      );
      await prisma.$executeRawUnsafe(
        `
        UPDATE committee_members
        SET deferred_released = COALESCE(deferred_released, 0) + $1
        WHERE committee_id = $2 AND user_id = $3
        `,
        deferredReleaseAmount,
        committee.id,
        user.id
      );
    }

    return res.json({
      ok: true,
      committee_id: committee.id,
      amount_micro_usdc: Math.round(amount),
      tx_signature: signature,
      deferred_released_micro_usdc: deferredReleaseAmount,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/payouts/claim", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    await enforceLatePenaltiesForCommittee(committeeId);
    const { recipient_wallet, amount_micro_usdc, tx_signature } = req.body ?? {};
    if (!recipient_wallet || amount_micro_usdc == null || !tx_signature) {
      return res
        .status(400)
        .json({ error: "recipient_wallet, amount_micro_usdc and tx_signature are required" });
    }

    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        pda_address: true,
        vault_address: true,
        current_cycle: true,
        total_cycles: true,
        frequency: true,
        next_cycle_date: true,
        contribution_amount: true,
        manager_id: true,
        safety_committee_pda: true,
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });
    const committeeManagerWallet = committee.manager_id
      ? (
          await prisma.user.findUnique({
            where: { id: committee.manager_id },
            select: { wallet_address: true },
          })
        )?.wallet_address ?? null
      : null;

    const amount = Number(amount_micro_usdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "amount_micro_usdc must be a positive number" });
    }
    const signature = String(tx_signature).trim();
    if (!signature) {
      return res.status(400).json({ error: "tx_signature is required" });
    }
    const recipientWallet = String(recipient_wallet);

    const existing = await prisma.committeePayout.findFirst({
      where: { committee_id: committee.id, tx_signature: signature },
      select: { id: true, tx_signature: true },
    });
    if (existing) {
      return res.json({
        ok: true,
        committee_id: committee.id,
        recipient_wallet: recipientWallet,
        amount_micro_usdc: Math.round(amount),
        tx_signature: existing.tx_signature,
        duplicate: true,
      });
    }

    if (!isInternalProofSignature(signature)) {
      try {
        const scopeExtra = safetyTxScopeKeysForMember({
          safetyCommitteePda: committee.safety_committee_pda,
          legacyPda: committee.pda_address,
          legacyVault: committee.vault_address,
          managerWallet: committeeManagerWallet,
          memberWallet: recipientWallet,
        });
        await verifyConfirmedCommitteeTx({
          txSignature: signature,
          requiredWallet: recipientWallet,
          committeePda: committee.safety_committee_pda ?? committee.pda_address,
          committeeVault: committee.vault_address,
          additionalScopeKeys: scopeExtra,
        });
      } catch (error) {
        return res.status(400).json({
          error: "Invalid or unconfirmed transaction signature",
          detail: error instanceof Error ? error.message : "verification failed",
        });
      }
    }

    const recipient = await prisma.user.findUnique({
      where: { wallet_address: recipientWallet },
      select: { id: true },
    });
    if (!recipient?.id) {
      return res.status(404).json({ error: "recipient user not found" });
    }

    const recipientMembership = await prisma.committeeMember.findFirst({
      where: {
        committee_id: committee.id,
        user_id: recipient.id,
        status: { in: ["active", "suspended"] },
      },
      select: { id: true, payout_position: true },
    });
    if (!recipientMembership) {
      return res.status(403).json({ error: "recipient is not an active committee member" });
    }
    if ((recipientMembership.payout_position ?? 0) !== committee.current_cycle) {
      return res.status(403).json({
        error: `payout can only be claimed by current cycle turn holder (cycle ${committee.current_cycle})`,
      });
    }

    const existingCyclePayout = await prisma.committeePayout.findFirst({
      where: {
        committee_id: committee.id,
        cycle_number: committee.current_cycle,
      },
      select: { id: true },
    });
    if (existingCyclePayout) {
      return res.status(409).json({
        error: `payout for cycle ${committee.current_cycle} is already claimed`,
      });
    }

    const activeMembersCount = await prisma.committeeMember.count({
      where: { committee_id: committee.id, status: "active" },
    });
    const cyclePaidContributorRows = await prisma.committeeContribution.findMany({
      where: {
        committee_id: committee.id,
        cycle_number: committee.current_cycle,
      },
      select: { user_id: true },
      distinct: ["user_id"],
    });
    const cyclePaidContributors = cyclePaidContributorRows.length;
    if (cyclePaidContributors < activeMembersCount) {
      return res.status(409).json({
        error: `payout is not ready: ${cyclePaidContributors}/${activeMembersCount} active members paid cycle ${committee.current_cycle}`,
      });
    }

    const cycleContributionAggregate = await prisma.committeeContribution.aggregate({
      where: {
        committee_id: committee.id,
        cycle_number: committee.current_cycle,
      },
      _sum: {
        amount_micro_usdc: true,
      },
    });
    const grossCycleAmount = Number(cycleContributionAggregate._sum.amount_micro_usdc ?? 0);
    if (!Number.isFinite(grossCycleAmount) || grossCycleAmount <= 0) {
      return res.status(409).json({ error: "payout is not ready: cycle pool is empty" });
    }
    const platformFee = Math.round(grossCycleAmount * 0.015);
    const netPayoutAmount = Math.max(0, grossCycleAmount - platformFee);
    if (netPayoutAmount <= 0) {
      return res.status(409).json({ error: "payout is not ready: net amount is zero" });
    }

    const { immediateAmount, deferredAmount, cyclesRemaining } = calculateDeferredAmount({
      netPayout: netPayoutAmount,
      payoutPosition: Number(recipientMembership.payout_position ?? 1),
      totalCycles: Number(committee.total_cycles ?? 1),
    });

    await prisma.$transaction(async (tx) => {
      await tx.committeePayout.create({
        data: {
          committee_id: committee.id,
          recipient_user_id: recipient.id,
          recipient_wallet: recipientWallet,
          amount_micro_usdc: BigInt(immediateAmount),
          tx_signature: signature,
          cycle_number: committee.current_cycle,
        },
      });

      await tx.committeeMember.updateMany({
        where: {
          committee_id: committee.id,
          user_id: recipient.id,
        },
        data: {
          has_received: true,
          received_amount: BigInt(immediateAmount),
          received_at: new Date(),
        },
      });
      await tx.$executeRawUnsafe(
        `
        INSERT INTO committee_deferred_escrows
          (id, committee_id, member_user_id, total_deferred, released_so_far, cycles_remaining, cycles_completed, is_complete, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, 0, $5, 0, $6, NOW(), NOW())
        ON CONFLICT (committee_id, member_user_id)
        DO UPDATE SET
          total_deferred = EXCLUDED.total_deferred,
          released_so_far = 0,
          cycles_remaining = EXCLUDED.cycles_remaining,
          cycles_completed = 0,
          is_complete = EXCLUDED.is_complete,
          updated_at = NOW()
        `,
        randomUUID(),
        committee.id,
        recipient.id,
        deferredAmount,
        cyclesRemaining,
        deferredAmount <= 0
      );
      await tx.$executeRawUnsafe(
        `
        UPDATE committee_members
        SET
          deferred_total = $1,
          deferred_released = 0,
          member_state_pda = COALESCE(member_state_pda, $4),
          deferred_escrow_pda = COALESCE(deferred_escrow_pda, $5)
        WHERE committee_id = $2 AND user_id = $3
        `,
        deferredAmount,
        committee.id,
        recipient.id,
        (() => {
          try {
            if (!committeeManagerWallet || !config.committeeSafetyProgramId) return null;
            return deriveCommitteeSafetyPdas({
              programId: config.committeeSafetyProgramId,
              managerWallet: committeeManagerWallet,
              memberWallet: recipientWallet,
            }).memberStatePda;
          } catch {
            return null;
          }
        })(),
        (() => {
          try {
            if (!committeeManagerWallet || !config.committeeSafetyProgramId) return null;
            return deriveCommitteeSafetyPdas({
              programId: config.committeeSafetyProgramId,
              managerWallet: committeeManagerWallet,
              memberWallet: recipientWallet,
            }).deferredEscrowPda;
          } catch {
            return null;
          }
        })()
      );

      const nextCycle = committee.current_cycle + 1;
      const completed = nextCycle > committee.total_cycles;
      const currentNextCycleDate =
        committee.next_cycle_date ?? new Date(Date.now() + mapFrequencyToDays(committee.frequency) * 86400000);
      const nextCycleDate = new Date(
        currentNextCycleDate.getTime() + mapFrequencyToDays(committee.frequency) * 86400000
      );
      await tx.committee.update({
        where: { id: committee.id },
        data: completed
          ? {
              current_cycle: committee.total_cycles,
              status: "completed",
            }
          : {
              current_cycle: nextCycle,
              next_cycle_date: nextCycleDate,
            },
      });
    });

    return res.json({
      ok: true,
      committee_id: committee.id,
      recipient_wallet: recipientWallet,
      amount_micro_usdc: immediateAmount,
      deferred_amount_micro_usdc: deferredAmount,
      tx_signature: signature,
      cycle_number: committee.current_cycle,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/penalties/enforce", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const isInternalCron = String(req.headers["x-internal-cron"] ?? "").toLowerCase() === "true";
    if (!isInternalCron) {
      try {
        await assertManagerAccess(committeeId, req.headers.authorization);
      } catch (error) {
        const message = error instanceof Error ? error.message : "forbidden";
        if (message === "missing token") return res.status(401).json({ error: "missing token" });
        if (message === "committee not found") return res.status(404).json({ error: message });
        return res.status(403).json({ error: "manager access required" });
      }
    }
    const result = await enforceLatePenaltiesForCommittee(committeeId);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/penalties/on-chain", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    try {
      await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    const { wallet_address, tx_signature } = req.body ?? {};
    const targetWallet =
      typeof wallet_address === "string" ? wallet_address.trim() : "";
    const signature = typeof tx_signature === "string" ? tx_signature.trim() : "";
    if (!targetWallet || !signature) {
      return res.status(400).json({ error: "wallet_address and tx_signature are required" });
    }
    if (isInternalProofSignature(signature)) {
      return res.status(400).json({ error: "provide a confirmed Solana transaction signature" });
    }

    const prisma = getPrisma();
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        id: true,
        current_cycle: true,
        next_cycle_date: true,
        grace_period_days: true,
        late_penalty_action: true,
        penalty_goes_to: true,
        safety_committee_pda: true,
        manager_id: true,
      },
    });
    if (!committee) return res.status(404).json({ error: "committee not found" });

    if (!config.safetyOnchainEnabled || !committee.safety_committee_pda?.trim()) {
      return res.status(400).json({ error: "on-chain committee safety is not active for this committee" });
    }

    const managerWallet = committee.manager_id
      ? (
          await prisma.user.findUnique({
            where: { id: committee.manager_id },
            select: { wallet_address: true },
          })
        )?.wallet_address ?? null
      : null;
    if (!managerWallet) {
      return res.status(400).json({ error: "manager wallet required" });
    }

    if (!committee.next_cycle_date) {
      return res.status(400).json({ error: "committee has no cycle schedule" });
    }
    const graceMs = Math.max(1, Number(committee.grace_period_days ?? 3)) * 86400000;
    const overdueAt = committee.next_cycle_date.getTime() + graceMs;
    if (Date.now() <= overdueAt) {
      return res.status(400).json({ error: "grace period has not elapsed for this cycle" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { wallet_address: targetWallet },
      select: { id: true },
    });
    if (!targetUser) return res.status(404).json({ error: "target user not found" });

    const memberRows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        user_id: string;
        status: string;
        penalty_strikes: number;
        total_penalties_paid: bigint;
      }>
    >(
      `
      SELECT id, user_id, status, penalty_strikes, total_penalties_paid
      FROM committee_members
      WHERE committee_id = $1 AND user_id = $2 AND status IN ('active', 'suspended')
      LIMIT 1
      `,
      committee.id,
      targetUser.id
    );
    const member = memberRows[0];
    if (!member) {
      return res.status(404).json({ error: "member not found on committee" });
    }

    const paidThisCycle = await prisma.committeeContribution.findFirst({
      where: {
        committee_id: committee.id,
        user_id: targetUser.id,
        cycle_number: committee.current_cycle,
      },
      select: { id: true },
    });
    if (paidThisCycle) {
      return res.status(400).json({ error: "member already contributed for the current cycle" });
    }

    const scopeExtra = safetyTxScopeKeysForMember({
      safetyCommitteePda: committee.safety_committee_pda,
      legacyPda: null,
      legacyVault: null,
      managerWallet,
      memberWallet: targetWallet,
    });
    try {
      await verifyConfirmedCommitteeTx({
        txSignature: signature,
        requiredWallet: managerWallet,
        committeePda: committee.safety_committee_pda,
        committeeVault: null,
        additionalScopeKeys: scopeExtra,
      });
    } catch (error) {
      return res.status(400).json({
        error: "Invalid or unconfirmed transaction signature",
        detail: error instanceof Error ? error.message : "verification failed",
      });
    }

    const nextStrike = Number(member.penalty_strikes ?? 0) + 1;
    const depositedRow = await prisma.$queryRawUnsafe<Array<{ deposited_amount: bigint; is_returned: boolean }>>(
      `
      SELECT deposited_amount, is_returned
      FROM committee_collateral_vaults
      WHERE committee_id = $1 AND member_user_id = $2
      LIMIT 1
      `,
      committee.id,
      member.user_id
    );
    const depositedAmount = depositedRow[0] ? Number(depositedRow[0].deposited_amount ?? 0) : 0;
    const isReturned = depositedRow[0]?.is_returned === true;
    const alreadyPaidPenalty = Number(member.total_penalties_paid ?? 0);
    const collateralRemaining = Math.max(0, depositedAmount - alreadyPaidPenalty);

    let penaltyAmount = 0;
    if (!isReturned && collateralRemaining > 0) {
      if (nextStrike === 1) penaltyAmount = Math.floor((depositedAmount * 2) / 100);
      else if (nextStrike === 2) penaltyAmount = Math.floor((depositedAmount * 5) / 100);
      else penaltyAmount = collateralRemaining;
      penaltyAmount = Math.min(collateralRemaining, Math.max(0, penaltyAmount));
    }

    const penaltyCtx: CommitteePenaltyCtx = {
      id: committee.id,
      current_cycle: committee.current_cycle,
      late_penalty_action: committee.late_penalty_action,
      penalty_goes_to: committee.penalty_goes_to,
    };

    await prisma.$transaction(async (tx) => {
      await runPenaltyStrikeDbEffects(tx, penaltyCtx, member, {
        nextStrike,
        penaltyAmount,
        newTotalPenaltiesPaid: alreadyPaidPenalty + penaltyAmount,
        penaltyTxSignature: signature,
      });
    });

    return res.json({
      ok: true,
      committee_id: committee.id,
      target_wallet: targetWallet,
      strike_number: nextStrike,
      penalty_amount_micro_usdc: penaltyAmount,
      tx_signature: signature,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/penalties", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const committeeId = String(req.params.id);
    const prisma = getPrisma();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        user_id: string;
        strike_number: number;
        penalty_amount: bigint;
        action_taken: string;
        tx_signature: string | null;
        created_at: Date;
      }>
    >(
      `
      SELECT id, user_id, strike_number, penalty_amount, action_taken, tx_signature, created_at
      FROM committee_penalty_events
      WHERE committee_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      committeeId
    );
    return res.json(
      rows.map((row) => ({
        ...row,
        penalty_amount: Number(row.penalty_amount ?? 0),
        created_at: row.created_at.toISOString(),
      }))
    );
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/history", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);

    const [contributions, payouts] = await Promise.all([
      prisma.committeeContribution.findMany({
        where: { committee_id: committeeId },
        orderBy: { created_at: "desc" },
        take: 50,
        select: {
          id: true,
          user_id: true,
          amount_micro_usdc: true,
          tx_signature: true,
          cycle_number: true,
          created_at: true,
        },
      }),
      prisma.committeePayout.findMany({
        where: { committee_id: committeeId },
        orderBy: { claimed_at: "desc" },
        take: 50,
        select: {
          id: true,
          recipient_wallet: true,
          amount_micro_usdc: true,
          tx_signature: true,
          cycle_number: true,
          claimed_at: true,
        },
      }),
    ]);

    return res.json({
      contributions: contributions.map((item) => ({
        ...item,
        amount_micro_usdc: Number(item.amount_micro_usdc),
      })),
      payouts: payouts.map((item) => ({
        ...item,
        amount_micro_usdc: Number(item.amount_micro_usdc),
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.post("/:id/announce", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const { title, message } = req.body ?? {};
    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }
    let createdBy: string;
    try {
      createdBy = await assertManagerAccess(committeeId, req.headers.authorization);
    } catch (error) {
      const message = error instanceof Error ? error.message : "forbidden";
      if (message === "missing token") return res.status(401).json({ error: "missing token" });
      if (message === "committee not found") return res.status(404).json({ error: message });
      return res.status(403).json({ error: "manager access required" });
    }

    const members = await prisma.committeeMember.findMany({
      where: {
        committee_id: committeeId,
        status: "active",
      },
      select: {
        user_id: true,
        user: {
          select: {
            device_push_token: true,
          },
        },
      },
    });

    let sent = 0;
    for (const member of members) {
      const token = member.user.device_push_token;
      if (!token) continue;
      await sendPush(token, String(title), String(message));
      sent += 1;
    }

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO committee_announcements (id, committee_id, created_by, title, message)
      VALUES ($1, $2, $3, $4, $5)
      `,
      randomUUID(),
      committeeId,
      createdBy,
      String(title),
      String(message)
    );

    return res.json({
      ok: true,
      committee_id: committeeId,
      recipients: members.length,
      sent,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/announcements", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; title: string; message: string; created_at: Date; created_by: string | null }>
    >(
      `
      SELECT id, title, message, created_at, created_by
      FROM committee_announcements
      WHERE committee_id = $1
      ORDER BY created_at DESC
      LIMIT 30
      `,
      committeeId
    );
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

committeesRouter.get("/:id/coaching", async (req, res) => {
  try {
    await ensureCommitteeTables();
    const prisma = getPrisma();
    const committeeId = String(req.params.id);
    const userId =
      typeof req.query.user_id === "string" && req.query.user_id.trim().length > 0
        ? req.query.user_id
        : null;

    const latest = await prisma.coachingMessage.findFirst({
      where: {
        committee_id: committeeId,
        ...(userId ? { user_id: userId } : {}),
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        message: true,
        created_at: true,
      },
    });

    return res.json(latest ?? null);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

async function buildCommitteeContractPayload(committeeId: string) {
  await ensureCommitteeTables();
  const prisma = getPrisma();
  const row = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: {
      id: true,
      name: true,
      pda_address: true,
      vault_address: true,
      contribution_amount: true,
      current_cycle: true,
      total_cycles: true,
      status: true,
    },
  });
  if (!row) return null;
  const contribution =
    typeof row.contribution_amount === "bigint"
      ? Number(row.contribution_amount)
      : Number(row.contribution_amount);
  return {
    committee_id: row.id,
    committee_name: row.name,
    status: row.status,
    cycle: `${row.current_cycle}/${row.total_cycles}`,
    contribution_micro_usdc: contribution,
    contribution_usdc: contribution / 1_000_000,
    onchain: {
      pda_address: row.pda_address,
      vault_address: row.vault_address,
    },
  };
}

committeesRouter.get("/:id/contract", async (req, res) => {
  try {
    const payload = await buildCommitteeContractPayload(String(req.params.id));
    if (!payload) return res.status(404).json({ error: "committee not found" });
    return res.json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

// Prompt typo compatibility: `/api/committees/:id/reactnativert`.
committeesRouter.get("/:id/reactnativert", async (req, res) => {
  try {
    const payload = await buildCommitteeContractPayload(String(req.params.id));
    if (!payload) return res.status(404).json({ error: "committee not found" });
    return res.json(payload);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});
