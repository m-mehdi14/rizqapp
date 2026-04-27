import { Connection, PublicKey } from "@solana/web3.js";
import { API_URL, SOLANA_RPC_URL, USDC_MINT } from "../config";
import type { Committee, Goal } from "../store/useAppStore";

type CommitteeRow = {
  id: string;
  name: string;
  invite_code?: string | null;
  goal_type?: string | null;
  contribution_amount?: number | string | null;
  current_cycle?: number | null;
  total_cycles?: number | null;
  next_cycle_date?: string | null;
  status?: string | null;
  current_members?: number | null;
  max_members?: number | null;
};

type GoalRow = {
  id: string;
  goal_name: string;
  goal_type: string;
  target_usdc: number;
  current_usdc?: number | null;
  yes_count?: number | null;
  no_count?: number | null;
  deadline?: string | null;
  last_week_deposit?: number | null;
};

type CoachingRow = {
  id: string;
  message: string;
  created_at: string;
};

export type RizqScorePayload = {
  score: number;
  trend_30d: number;
  breakdown: {
    payments_on_time: number;
    committees_completed: number;
    nominee_added: number;
    account_age: number;
    committee_consistency: number;
  };
  stats: {
    contribution_count: number;
    payouts_received: number;
    active_committees: number;
    completed_committees: number;
    account_age_days: number;
    nominee_exists: boolean;
  };
};

export type AiChatPayload = {
  message: string;
};
export type AiChatHistoryRow = {
  id: string;
  role: "user" | "ai";
  message: string;
  created_at: string;
};

export type RegisteredUser = {
  id: string;
  wallet_address: string;
  username?: string | null;
  display_name?: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  display_name?: string | null;
  username?: string | null;
  wallet_address: string;
  kyc_status: string;
  onboarding_completed?: boolean;
  phone_number?: string | null;
  language_pref?: string | null;
};

export type SessionNominee = {
  id: string;
  full_name: string;
  phone_number: string;
  cnic_number: string;
  relationship: string;
};

export type CreateCommitteeInput = {
  managerWallet?: string;
  authToken?: string;
  name: string;
  description?: string;
  purposeType: string;
  contributionAmountUsdc: number;
  frequency: string;
  maxMembers: number;
  totalCycles: number;
  payoutOrderType: string;
  payoutOrderLocked?: boolean;
  gracePeriodDays: number;
  latePenaltyAction: string;
  penaltyGoesTo: string;
  welfareOptInPct: number;
  kycRequired: boolean;
  nomineeRequired: boolean;
};

type CreateCommitteeResponse = {
  committee: CommitteeRow & { invite_code?: string | null };
  invite_code: string;
  invite_link: string;
};

export type JoinInvitePreview = {
  committee_id: string;
  committee_name: string;
  manager_alias: string;
  manager_avatar: string;
  contribution_amount_usdc: number;
  frequency: string;
  payout_position: number;
  kyc_required: boolean;
  nominee_required: boolean;
  grace_period: string;
  penalty_rule: string;
  first_contribution_due_date: string;
  already_joined?: boolean;
};

export type CommitteeContributionRow = {
  id: string;
  user_id: string;
  amount_micro_usdc: number;
  tx_signature: string;
  cycle_number: number | null;
  created_at: string;
};

export type CommitteePayoutRow = {
  id: string;
  recipient_wallet: string;
  amount_micro_usdc: number;
  tx_signature: string;
  cycle_number: number | null;
  claimed_at: string;
};

export type CommitteeDashboardMember = {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  status: "paid" | "pending" | "overdue" | "future";
  payout_position: number;
  membership_status: string;
  history: Array<{ cycle: number; status: "paid" | "pending" | "overdue" | "future" }>;
};

export type CommitteeDashboardPayload = {
  committee: {
    id: string;
    name: string;
    status: string;
    current_cycle: number;
    total_cycles: number;
    next_cycle_date: string | null;
    contribution_amount_micro_usdc: number;
    max_members: number;
    current_members: number;
    frequency: string;
    invite_code?: string | null;
    is_manager?: boolean;
    current_user_id?: string | null;
  };
  members: CommitteeDashboardMember[];
  payout_schedule: Array<{
    turn: number;
    member_name: string;
    due_date: string;
    completed: boolean;
    is_current_user: boolean;
    member_id: string;
  }>;
  payment_matrix: Array<Array<"paid" | "pending" | "overdue" | "future">>;
  cycle_range: number[];
};

export type CommitteeAnnouncement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string | null;
};

export type WalletTransactionRow = {
  id: string;
  type: "contribution" | "payout";
  committee_id: string;
  committee_name: string;
  amount_micro_usdc: number;
  tx_signature: string;
  cycle_number: number | null;
  created_at: string;
};

function buildApiBaseCandidates(): string[] {
  const cleanedPrimary = API_URL.replace(/\/+$/, "");
  const candidates: string[] = [];
  const add = (url: string) => {
    const cleaned = url.replace(/\/+$/, "");
    if (!candidates.includes(cleaned)) candidates.push(cleaned);
  };

  if (__DEV__) {
    // Android emulator -> host machine localhost mapping.
    add("http://10.0.2.2:3000");
    // iOS simulator / alternate host setups.
    add("http://127.0.0.1:3000");
    add("http://localhost:3000");
  }

  add(cleanedPrimary);
  if (cleanedPrimary.startsWith("https://")) {
    add(cleanedPrimary.replace("https://", "http://"));
  }
  return candidates;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const baseCandidates = buildApiBaseCandidates();
  const runFetch = async (baseUrl: string) => {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  };

  let lastError: unknown = null;
  for (const base of baseCandidates) {
    try {
      const res = await runFetch(base);
      if (!res.ok) {
        let reason = `HTTP ${res.status} for ${path}`;
        try {
          const errorPayload = (await res.json()) as { error?: string };
          if (errorPayload?.error) reason = errorPayload.error;
        } catch {
          // ignore JSON parse failures for non-JSON error payloads
        }
        throw new Error(reason);
      }
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      // Keep trying other base URLs in dev to avoid stale remote backend usage.
      if (!__DEV__) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${path}`);
}

async function authHttp<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return await http<T>(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function mapGoalRowToGoal(row: GoalRow): Goal {
  const targetLamports = Number(row.target_usdc ?? 0);
  const savedLamports = Number(row.current_usdc ?? 0);
  const deadlineMs = row.deadline ? new Date(row.deadline).getTime() : Date.now();
  const daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 86400000));
  const progress =
    targetLamports > 0 ? Math.max(0, Math.min(1, savedLamports / targetLamports)) : 0;
  return {
    id: row.id,
    name: row.goal_name,
    type: row.goal_type,
    progress,
    savedLamports,
    targetLamports,
    daysLeft,
    yesCount: Number(row.yes_count ?? 0),
    noCount: Number(row.no_count ?? 0),
    streakWeeks: Number(row.last_week_deposit ?? 0) > 0 ? 1 : 0,
  };
}

export function mapCommitteeRowToCommittee(row: CommitteeRow): Committee {
  const contributionLamports = Number(row.contribution_amount ?? 0);
  const totalCycles = Math.max(1, Number(row.total_cycles ?? 1));
  const currentCycle = Math.max(1, Number(row.current_cycle ?? 1));
  const savedLamports = Math.max(0, currentCycle - 1) * contributionLamports;
  const targetLamports = totalCycles * contributionLamports;
  const nextDueMs = row.next_cycle_date ? new Date(row.next_cycle_date).getTime() : Date.now();
  const daysLeft = Math.max(0, Math.ceil((nextDueMs - Date.now()) / 86400000));
  const progress =
    targetLamports > 0 ? Math.max(0, Math.min(1, savedLamports / targetLamports)) : 0;

  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code ?? undefined,
    type: row.goal_type ?? "general",
    progress,
    savedLamports,
    targetLamports,
    daysLeft,
    yesCount: 0,
    noCount: 0,
    streakWeeks: currentCycle > 1 ? 1 : 0,
    memberCount: Number(row.current_members ?? 0),
    maxMembers: Number(row.max_members ?? 0),
    currentCycle,
    totalCycles,
    contributionLamports,
    status: row.status ?? "forming",
    nextCycleDate: row.next_cycle_date ?? undefined,
  };
}

export async function registerUser(input: {
  wallet: string;
  username?: string;
  displayName?: string;
  devicePushToken?: string;
}): Promise<RegisteredUser> {
  return await http<RegisteredUser>("/api/users/register", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: input.wallet,
      username: input.username,
      display_name: input.displayName,
      device_push_token: input.devicePushToken,
    }),
  });
}

export async function registerDevicePushToken(input: {
  wallet: string;
  devicePushToken: string;
  username?: string;
  displayName?: string;
}): Promise<void> {
  await registerUser({
    wallet: input.wallet,
    username: input.username,
    displayName: input.displayName,
    devicePushToken: input.devicePushToken,
  });
}

export async function authRegister(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ token: string; user: SessionUser }> {
  return await http<{ token: string; user: SessionUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
    }),
  });
}

export async function authLogin(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: SessionUser }> {
  return await http<{ token: string; user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });
}

export async function authSessionMe(token: string): Promise<SessionUser> {
  const payload = await authHttp<{ ok: true; user: SessionUser }>(
    "/api/auth/session/me",
    token
  );
  return payload.user;
}

export async function linkWalletToSession(input: {
  token: string;
  wallet: string;
}): Promise<SessionUser> {
  const payload = await authHttp<{ ok: true; user: SessionUser }>(
    "/api/auth/session/link-wallet",
    input.token,
    {
      method: "POST",
      body: JSON.stringify({ wallet_address: input.wallet }),
    }
  );
  return payload.user;
}

export async function updateSessionProfile(input: {
  token: string;
  displayName?: string;
  username?: string;
  languagePref?: "english" | "urdu" | "both" | "mixed";
  phoneNumber?: string;
}): Promise<SessionUser> {
  const payload = await authHttp<{ ok: true; user: SessionUser }>(
    "/api/auth/session/profile",
    input.token,
    {
      method: "PATCH",
      body: JSON.stringify({
        display_name: input.displayName,
        username: input.username,
        language_pref: input.languagePref,
        phone_number: input.phoneNumber,
      }),
    }
  );
  return payload.user;
}

export async function saveSessionNominee(input: {
  token: string;
  fullName: string;
  phoneNumber: string;
  cnicNumber: string;
  relationship: string;
}): Promise<SessionNominee> {
  const payload = await authHttp<{ ok: true; nominee: SessionNominee }>(
    "/api/auth/session/nominee",
    input.token,
    {
      method: "POST",
      body: JSON.stringify({
        full_name: input.fullName,
        phone_number: input.phoneNumber,
        cnic_number: input.cnicNumber,
        relationship: input.relationship,
      }),
    }
  );
  return payload.nominee;
}

export async function fetchSessionNominee(input: {
  token: string;
}): Promise<SessionNominee | null> {
  const payload = await authHttp<{ ok: true; nominee: SessionNominee | null }>(
    "/api/auth/session/nominee",
    input.token
  );
  return payload.nominee;
}

export async function updateSessionKycStatus(input: {
  token: string;
  kycStatus: "unverified" | "pending" | "verified";
}): Promise<{ id: string; kyc_status: string }> {
  const payload = await authHttp<{ ok: true; user: { id: string; kyc_status: string } }>(
    "/api/auth/session/kyc-status",
    input.token,
    {
      method: "PATCH",
      body: JSON.stringify({
        kyc_status: input.kycStatus,
      }),
    }
  );
  return payload.user;
}

export async function markOnboardingComplete(input: { token: string }): Promise<void> {
  await authHttp("/api/auth/session/onboarding-complete", input.token, {
    method: "POST",
  });
}

export async function verifyKyc(input: { wallet: string; cnicNumber: string }): Promise<void> {
  await http("/api/auth/verify-kyc", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: input.wallet,
      cnic_number: input.cnicNumber,
    }),
  });
}

export async function fetchCommittees(wallet: string): Promise<Committee[]> {
  const rows = await http<CommitteeRow[]>(
    `/api/committees/wallet/${encodeURIComponent(wallet)}`
  );
  return rows.map(mapCommitteeRowToCommittee);
}

export async function fetchSessionCommittees(token: string): Promise<Committee[]> {
  const rows = await authHttp<CommitteeRow[]>("/api/committees/session/me", token);
  return rows.map(mapCommitteeRowToCommittee);
}

export async function createCommittee(input: CreateCommitteeInput): Promise<{
  committee: Committee;
  inviteCode: string;
  inviteLink: string;
}> {
  const body: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? "",
    purpose_type: input.purposeType,
    contribution_amount_micro_usdc: Math.round(input.contributionAmountUsdc * 1_000_000),
    frequency: input.frequency,
    max_members: input.maxMembers,
    total_cycles: input.totalCycles,
    payout_order_type: input.payoutOrderType,
    payout_order_locked: Boolean(input.payoutOrderLocked ?? false),
    grace_period_days: input.gracePeriodDays,
    late_penalty_action: input.latePenaltyAction,
    penalty_goes_to: input.penaltyGoesTo,
    welfare_opt_in_pct: input.welfareOptInPct,
    kyc_required: input.kycRequired,
    nominee_required: input.nomineeRequired,
  };
  if (input.managerWallet) {
    body.manager_wallet = input.managerWallet;
  }
  const payload = input.authToken
    ? await authHttp<CreateCommitteeResponse>("/api/committees", input.authToken, {
        method: "POST",
        body: JSON.stringify(body),
      })
    : await http<CreateCommitteeResponse>("/api/committees", {
        method: "POST",
        body: JSON.stringify(body),
      });
  return {
    committee: mapCommitteeRowToCommittee(payload.committee),
    inviteCode: payload.invite_code,
    inviteLink: payload.invite_link,
  };
}

export async function fetchCommitteeInvite(
  inviteCode: string,
  options?: { authToken?: string; wallet?: string }
): Promise<JoinInvitePreview> {
  const normalized = inviteCode.trim().toUpperCase();
  const walletQuery =
    options?.wallet && options.wallet.trim().length > 0
      ? `?wallet=${encodeURIComponent(options.wallet.trim())}`
      : "";
  const path = `/api/committees/invite/${encodeURIComponent(normalized)}${walletQuery}`;
  if (options?.authToken) {
    return await authHttp<JoinInvitePreview>(path, options.authToken);
  }
  return await http<JoinInvitePreview>(path);
}

export async function joinCommittee(input: {
  committeeId: string;
  wallet?: string;
  authToken?: string;
}): Promise<{ committee_id: string }> {
  const body: Record<string, unknown> = {};
  if (input.wallet) body.wallet_address = input.wallet;
  return input.authToken
    ? await authHttp<{ committee_id: string }>(
        `/api/committees/${encodeURIComponent(input.committeeId)}/join`,
        input.authToken,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      )
    : await http<{ committee_id: string }>(
        `/api/committees/${encodeURIComponent(input.committeeId)}/join`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
}

// Legacy alias kept while old screens still call fetchGoals.
export async function fetchGoals(wallet: string): Promise<Goal[]> {
  try {
    return await fetchCommittees(wallet);
  } catch {
    // Fallback to older goal endpoint while backend/data migrates.
  }
  const rows = await http<GoalRow[]>(`/api/goals/wallet/${encodeURIComponent(wallet)}`);
  return rows.map(mapGoalRowToGoal);
}

export async function createGoal(input: {
  wallet: string;
  name: string;
  type: string;
  targetLamports: number;
  deadline: string;
}): Promise<Goal> {
  const row = await http<GoalRow>("/api/goals", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: input.wallet,
      pda_address: `mock-${Date.now()}`,
      goal_name: input.name,
      goal_type: input.type,
      target_usdc: input.targetLamports,
      deadline: input.deadline,
    }),
  });
  return mapGoalRowToGoal(row);
}

export async function createCommitteeContribution(input: {
  committeeId: string;
  wallet: string;
  amountLamports: number;
  txSignature: string;
}): Promise<void> {
  await http(`/api/committees/${encodeURIComponent(input.committeeId)}/contributions`, {
    method: "POST",
    body: JSON.stringify({
      wallet_address: input.wallet,
      amount_micro_usdc: input.amountLamports,
      tx_signature: input.txSignature,
    }),
  });
}

// Legacy alias kept for older screens.
export async function createStake(input: {
  goalId: string;
  stakerWallet: string;
  amountLamports: number;
  isYes: boolean;
  txSignature: string;
}): Promise<void> {
  await createCommitteeContribution({
    committeeId: input.goalId,
    wallet: input.stakerWallet,
    amountLamports: input.amountLamports,
    txSignature: input.txSignature,
  });
}

export async function fetchCoaching(
  committeeId: string,
  userId?: string | null
): Promise<CoachingRow | null> {
  const userQuery =
    userId && userId.trim().length > 0
      ? `?user_id=${encodeURIComponent(userId)}`
      : "";
  try {
    return await http<CoachingRow | null>(
      `/api/committees/${encodeURIComponent(committeeId)}/coaching${userQuery}`
    );
  } catch {
    return await http<CoachingRow | null>(
      `/api/goals/${encodeURIComponent(committeeId)}/coaching`
    );
  }
}

export async function fetchRizqScore(userId: string): Promise<RizqScorePayload> {
  return await http<RizqScorePayload>(`/api/ai/rizq-score/${encodeURIComponent(userId)}`);
}

export async function sendAiChatMessage(input: {
  committeeId: string;
  userId: string;
  prompt: string;
}): Promise<AiChatPayload> {
  return await http<AiChatPayload>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      committee_id: input.committeeId,
      user_id: input.userId,
      prompt: input.prompt,
    }),
  });
}

export async function sendGeneralAiChatMessage(input: {
  userId: string;
  prompt: string;
}): Promise<AiChatPayload> {
  return await http<AiChatPayload>("/api/ai/chat/general", {
    method: "POST",
    body: JSON.stringify({
      user_id: input.userId,
      prompt: input.prompt,
    }),
  });
}

export async function fetchAiChatHistory(input: {
  userId: string;
  committeeId?: string | null;
}): Promise<AiChatHistoryRow[]> {
  const committeeQuery =
    input.committeeId && input.committeeId.trim().length > 0
      ? `&committee_id=${encodeURIComponent(input.committeeId)}`
      : "";
  return await http<AiChatHistoryRow[]>(
    `/api/ai/chat/history?user_id=${encodeURIComponent(input.userId)}${committeeQuery}`
  );
}

export async function fetchPkrRate(): Promise<number> {
  const payload = await http<{ pkr_per_usdc: number }>("/api/rates/pkr-usdc");
  return Number(payload.pkr_per_usdc ?? 280);
}

export async function claimCommitteePayout(input: {
  committeeId: string;
  recipientWallet: string;
  amountLamports: number;
  cycleNumber?: number;
  txSignature: string;
}): Promise<void> {
  await http(`/api/committees/${encodeURIComponent(input.committeeId)}/payouts/claim`, {
    method: "POST",
    body: JSON.stringify({
      recipient_wallet: input.recipientWallet,
      amount_micro_usdc: input.amountLamports,
      cycle_number: input.cycleNumber ?? null,
      tx_signature: input.txSignature,
    }),
  });
}

export async function fetchCommitteeHistory(committeeId: string): Promise<{
  contributions: CommitteeContributionRow[];
  payouts: CommitteePayoutRow[];
}> {
  return await http<{
    contributions: CommitteeContributionRow[];
    payouts: CommitteePayoutRow[];
  }>(`/api/committees/${encodeURIComponent(committeeId)}/history`);
}

export async function fetchCommitteeDashboard(
  committeeId: string,
  token?: string
): Promise<CommitteeDashboardPayload> {
  const path = `/api/committees/${encodeURIComponent(committeeId)}/dashboard`;
  if (token) {
    return await authHttp<CommitteeDashboardPayload>(path, token);
  }
  return await http<CommitteeDashboardPayload>(path);
}

export async function reorderCommitteePayout(input: {
  committeeId: string;
  fromIndex: number;
  toIndex: number;
  token: string;
}): Promise<void> {
  await authHttp(`/api/committees/${encodeURIComponent(input.committeeId)}/payout-order`, input.token, {
    method: "POST",
    body: JSON.stringify({
      from_index: input.fromIndex,
      to_index: input.toIndex,
    }),
  });
}

export async function applyCommitteeMemberAction(input: {
  committeeId: string;
  memberId: string;
  action: "suspend" | "activate" | "remove";
  token: string;
}): Promise<void> {
  await authHttp(
    `/api/committees/${encodeURIComponent(input.committeeId)}/members/${encodeURIComponent(input.memberId)}/action`,
    input.token,
    {
      method: "POST",
      body: JSON.stringify({ action: input.action }),
    }
  );
}

export async function updateCommitteeStatus(input: {
  committeeId: string;
  status: "active" | "paused";
  token: string;
}): Promise<void> {
  await authHttp(`/api/committees/${encodeURIComponent(input.committeeId)}/status`, input.token, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status }),
  });
}

export async function requestCommitteeOrderChangeApproval(input: {
  committeeId: string;
  token: string;
  note?: string;
}): Promise<{ ok: boolean; request_id: string; member_count: number; push_sent: number }> {
  return await authHttp<{ ok: boolean; request_id: string; member_count: number; push_sent: number }>(
    `/api/committees/${encodeURIComponent(input.committeeId)}/order-change-requests`,
    input.token,
    {
      method: "POST",
      body: JSON.stringify({ note: input.note ?? "" }),
    }
  );
}

export async function sendCommitteePaymentReminder(input: {
  committeeId: string;
  memberId: string;
  token: string;
  cycleNumber?: number;
  message?: string;
}): Promise<{ ok: boolean; reminder_id: string; member_id: string; message: string; cycle_number: number | null }> {
  return await authHttp<{ ok: boolean; reminder_id: string; member_id: string; message: string; cycle_number: number | null }>(
    `/api/committees/${encodeURIComponent(input.committeeId)}/payment-reminders`,
    input.token,
    {
      method: "POST",
      body: JSON.stringify({
        member_id: input.memberId,
        cycle_number: input.cycleNumber ?? null,
        message: input.message ?? "",
      }),
    }
  );
}

export async function sendCommitteeAnnouncement(input: {
  committeeId: string;
  title: string;
  message: string;
  token: string;
}): Promise<void> {
  await authHttp(`/api/committees/${encodeURIComponent(input.committeeId)}/announce`, input.token, {
    method: "POST",
    body: JSON.stringify({ title: input.title, message: input.message }),
  });
}

export async function fetchCommitteeAnnouncements(
  committeeId: string
): Promise<CommitteeAnnouncement[]> {
  return await http<CommitteeAnnouncement[]>(
    `/api/committees/${encodeURIComponent(committeeId)}/announcements`
  );
}

export async function fetchWalletUsdcBalance(walletAddress: string): Promise<number> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const owner = new PublicKey(walletAddress);
  const mint = new PublicKey(USDC_MINT);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    mint,
  });
  const uiAmount = tokenAccounts.value.reduce((sum, account) => {
    const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
    return sum + Number(amount ?? 0);
  }, 0);
  return uiAmount;
}

export async function fetchWalletSolBalance(walletAddress: string): Promise<number> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const owner = new PublicKey(walletAddress);
  const lamports = await connection.getBalance(owner, "confirmed");
  return lamports / 1_000_000_000;
}

export async function fetchSolUsdcRate(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} for SOL rate`);
  const payload = (await res.json()) as { solana?: { usd?: number } };
  const rate = Number(payload?.solana?.usd ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid SOL price payload");
  }
  return rate;
}

export async function fetchWalletTransactions(walletAddress: string): Promise<WalletTransactionRow[]> {
  return await http<WalletTransactionRow[]>(
    `/api/committees/wallet/${encodeURIComponent(walletAddress)}/transactions`
  );
}
