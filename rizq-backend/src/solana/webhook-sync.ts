import { getPrisma } from "../db/client";

type WebhookAction = "contribution" | "payout";

type NormalizedCommitteeEvent = {
  action: WebhookAction;
  committeeId?: string;
  committeePda?: string;
  walletAddress: string;
  amountMicroUsdc: number;
  txSignature: string;
  cycleNumber?: number;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferAction(raw: Record<string, unknown>): WebhookAction | null {
  const action = asString(raw.action)?.toLowerCase();
  if (action === "contribution" || action === "payout") return action;

  const eventType = asString(raw.eventType)?.toLowerCase();
  if (eventType?.includes("contribution")) return "contribution";
  if (eventType?.includes("payout") || eventType?.includes("claim")) return "payout";

  const description = asString(raw.description)?.toLowerCase();
  if (description?.includes("contribution")) return "contribution";
  if (description?.includes("payout") || description?.includes("claim")) return "payout";
  return null;
}

function normalizeEvent(input: unknown): NormalizedCommitteeEvent | null {
  const root = asRecord(input);
  if (!root) return null;
  const action = inferAction(root);
  if (!action) return null;

  const amount =
    asNumber(root.amount_micro_usdc) ??
    asNumber(root.amountMicroUsdc) ??
    asNumber(root.amount_usdc) ??
    0;
  const wallet =
    asString(root.wallet_address) ??
    asString(root.walletAddress) ??
    asString(root.recipient_wallet) ??
    asString(root.recipientWallet);
  const tx =
    asString(root.tx_signature) ??
    asString(root.txSignature) ??
    asString(root.signature) ??
    asString(root.transactionSignature) ??
    `webhook-${Date.now()}`;
  const cycle =
    asNumber(root.cycle_number) ??
    asNumber(root.cycleNumber) ??
    asNumber(root.current_cycle) ??
    undefined;

  if (!wallet || amount <= 0) return null;
  return {
    action,
    committeeId: asString(root.committee_id) ?? asString(root.committeeId) ?? undefined,
    committeePda: asString(root.committee_pda) ?? asString(root.committeePda) ?? undefined,
    walletAddress: wallet,
    amountMicroUsdc: Math.round(amount),
    txSignature: tx,
    cycleNumber: typeof cycle === "number" ? Math.round(cycle) : undefined,
  };
}

async function resolveCommitteeId(event: NormalizedCommitteeEvent): Promise<string | null> {
  const prisma = getPrisma();
  if (event.committeeId) return event.committeeId;
  if (!event.committeePda) return null;
  const committee = await prisma.committee.findFirst({
    where: { pda_address: event.committeePda },
    select: { id: true },
  });
  return committee?.id ?? null;
}

export async function syncCommitteeWebhookPayload(payload: unknown): Promise<number> {
  const events = Array.isArray(payload) ? payload : [payload];
  const prisma = getPrisma();
  let processed = 0;

  for (const raw of events) {
    const event = normalizeEvent(raw);
    if (!event) continue;

    const committeeId = await resolveCommitteeId(event);
    if (!committeeId) continue;

    if (event.action === "contribution") {
      const user = await prisma.user.findUnique({
        where: { wallet_address: event.walletAddress },
        select: { id: true },
      });
      if (!user) continue;
      const alreadyExists = await prisma.committeeContribution.findFirst({
        where: {
          committee_id: committeeId,
          tx_signature: event.txSignature,
        },
        select: { id: true },
      });
      if (alreadyExists) continue;
      await prisma.committeeContribution.create({
        data: {
          committee_id: committeeId,
          user_id: user.id,
          amount_micro_usdc: BigInt(event.amountMicroUsdc),
          tx_signature: event.txSignature,
          cycle_number: event.cycleNumber,
        },
      });
      processed += 1;
      continue;
    }

    const recipientUser = await prisma.user.findUnique({
      where: { wallet_address: event.walletAddress },
      select: { id: true },
    });
    const alreadyExists = await prisma.committeePayout.findFirst({
      where: {
        committee_id: committeeId,
        tx_signature: event.txSignature,
      },
      select: { id: true },
    });
    if (alreadyExists) continue;
    await prisma.committeePayout.create({
      data: {
        committee_id: committeeId,
        recipient_user_id: recipientUser?.id,
        recipient_wallet: event.walletAddress,
        amount_micro_usdc: BigInt(event.amountMicroUsdc),
        tx_signature: event.txSignature,
        cycle_number: event.cycleNumber,
      },
    });
    processed += 1;
  }

  return processed;
}
