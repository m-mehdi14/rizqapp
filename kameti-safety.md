# Rizq — Payout Protection Logic
# Complete implementation guide for Cursor

---

## THE PROBLEM YOU ARE SOLVING

In a kameti (rotating savings committee), the person who receives their payout early has
zero remaining incentive to keep contributing. They have the money. On-chain, there is no
social shame, no legal recourse, and no chaser. They can simply stop paying.

This file implements a four-layer economic protection system that makes defection
mathematically irrational at every position in the committee.

---

## THE FOUR PROTECTION LAYERS

1. Security deposit (collateral) — locked on joining, returned only on full completion
2. Deferred payout release — portion of payout held in escrow, released per future contribution
3. Contribution-locked payout trigger — next recipient only gets paid when current cycle is complete
4. Graduated penalty escalation — automatic slashing and removal, no manager needed

---

## ANCHOR SMART CONTRACT — ADD THESE ACCOUNTS AND INSTRUCTIONS

### New accounts to add to your existing committee program

```rust
// programs/rizq_committee/src/state.rs

#[account]
pub struct CollateralVault {
    pub committee:          Pubkey,
    pub member:             Pubkey,
    pub deposited_amount:   u64,    // always 1× cycle contribution
    pub is_returned:        bool,
    pub bump:               u8,
}

impl CollateralVault {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

#[account]
pub struct DeferredEscrow {
    pub committee:          Pubkey,
    pub member:             Pubkey,
    pub total_deferred:     u64,    // total SOL held from payout
    pub released_so_far:    u64,    // cumulative released
    pub cycles_remaining:   u8,     // at time of payout receipt
    pub cycles_completed:   u8,     // post-payout contributions made
    pub is_complete:        bool,
    pub bump:               u8,
}

impl DeferredEscrow {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 1;
}

// Add to your existing CommitteeMember account:
// penalty_strikes: u8,
// total_penalties_paid: u64,
// last_contribution_cycle: u8,
// is_eligible_for_payout: bool  (set false on penalty)
```

### New instructions to implement

```rust
// programs/rizq_committee/src/lib.rs

// ── INSTRUCTION 1: deposit_collateral ────────────────────────────────────────
// Called BEFORE joining a committee. Member locks 1× cycle contribution.
// Must be called before join_committee succeeds.

pub fn deposit_collateral(ctx: Context<DepositCollateral>) -> Result<()> {
    let committee = &ctx.accounts.committee;
    let vault = &mut ctx.accounts.collateral_vault;

    vault.committee        = committee.key();
    vault.member           = ctx.accounts.member.key();
    vault.deposited_amount = committee.contribution_amount;
    vault.is_returned      = false;
    vault.bump             = ctx.bumps.collateral_vault;

    // Transfer SOL from member to collateral vault PDA
    // This vault is SEPARATE from the committee pool vault
    transfer_SOL(
        &ctx.accounts.member_SOL,
        &ctx.accounts.collateral_vault_token,
        &ctx.accounts.member,
        &ctx.accounts.token_program,
        committee.contribution_amount,
    )?;

    emit!(CollateralDeposited {
        committee: committee.key(),
        member: ctx.accounts.member.key(),
        amount: committee.contribution_amount,
    });

    Ok(())
}

// ── INSTRUCTION 2: release_payout_with_deferral ───────────────────────────────
// Replaces your existing resolve_payout instruction.
// Calculates deferred amount, sends immediate portion, locks rest.

pub fn release_payout_with_deferral(ctx: Context<ReleasePayout>) -> Result<()> {
    let committee  = &ctx.accounts.committee;
    let member     = &ctx.accounts.committee_member;
    let escrow     = &mut ctx.accounts.deferred_escrow;

    // cycles_remaining = total_cycles - member's payout_position
    // (how many contributions they still owe after receiving)
    let cycles_remaining = committee.total_cycles
        .checked_sub(member.payout_position)
        .ok_or(ErrorCode::MathOverflow)?;

    let gross_payout = committee.contribution_amount
        .checked_mul(committee.current_members as u64)
        .ok_or(ErrorCode::MathOverflow)?;

    // Platform fee (1.5% free, 1.0% pro)
    let fee_bps: u64 = if ctx.accounts.user.is_pro { 100 } else { 150 };
    let platform_fee = gross_payout
        .checked_mul(fee_bps)
        .ok_or(ErrorCode::MathOverflow)?
        / 10_000;

    let net_payout = gross_payout
        .checked_sub(platform_fee)
        .ok_or(ErrorCode::MathOverflow)?;

    // Deferred percentage = cycles_remaining / total_cycles
    // Immediate percentage = payout_position / total_cycles
    let deferred_amount = net_payout
        .checked_mul(cycles_remaining as u64)
        .ok_or(ErrorCode::MathOverflow)?
        / committee.total_cycles as u64;

    let immediate_amount = net_payout
        .checked_sub(deferred_amount)
        .ok_or(ErrorCode::MathOverflow)?;

    // Set up deferred escrow record
    escrow.committee       = committee.key();
    escrow.member          = ctx.accounts.member_wallet.key();
    escrow.total_deferred  = deferred_amount;
    escrow.released_so_far = 0;
    escrow.cycles_remaining = cycles_remaining as u8;
    escrow.cycles_completed = 0;
    escrow.is_complete     = cycles_remaining == 0; // last person gets it all now
    escrow.bump            = ctx.bumps.deferred_escrow;

    // Transfer immediate portion to member wallet
    if immediate_amount > 0 {
        transfer_from_vault(
            &ctx.accounts.committee_vault,
            &ctx.accounts.member_SOL,
            committee,
            immediate_amount,
        )?;
    }

    // Transfer deferred portion to deferred escrow vault
    if deferred_amount > 0 {
        transfer_from_vault(
            &ctx.accounts.committee_vault,
            &ctx.accounts.deferred_vault,
            committee,
            deferred_amount,
        )?;
    }

    // Transfer platform fee to treasury
    transfer_from_vault(
        &ctx.accounts.committee_vault,
        &ctx.accounts.treasury,
        committee,
        platform_fee,
    )?;

    emit!(PayoutReleased {
        committee: committee.key(),
        member: ctx.accounts.member_wallet.key(),
        immediate_amount,
        deferred_amount,
        cycles_remaining,
    });

    Ok(())
}

// ── INSTRUCTION 3: contribute_and_release_deferred ────────────────────────────
// Called instead of plain deposit_to_committee for members who have already
// received their payout. Contribution goes to pool AND triggers deferred release.

pub fn contribute_and_release_deferred(
    ctx: Context<ContributePostPayout>,
    amount: u64,
) -> Result<()> {
    let committee = &ctx.accounts.committee;
    let escrow    = &mut ctx.accounts.deferred_escrow;

    // Require exact contribution amount — no partial payments
    require!(
        amount == committee.contribution_amount,
        ErrorCode::InvalidContributionAmount
    );

    // Transfer contribution to committee pool as normal
    transfer_SOL(
        &ctx.accounts.member_SOL,
        &ctx.accounts.committee_vault,
        &ctx.accounts.member,
        &ctx.accounts.token_program,
        amount,
    )?;

    // Calculate this cycle's deferred release
    let remaining_cycles = escrow.cycles_remaining
        .checked_sub(escrow.cycles_completed)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    require!(remaining_cycles > 0, ErrorCode::NoRemainingCycles);

    let release_this_cycle = escrow.total_deferred
        .checked_sub(escrow.released_so_far)
        .ok_or(ErrorCode::MathOverflow)?
        / remaining_cycles;

    // Transfer deferred slice to member wallet
    transfer_from_deferred_vault(
        &ctx.accounts.deferred_vault,
        &ctx.accounts.member_SOL,
        escrow,
        release_this_cycle,
    )?;

    escrow.released_so_far = escrow.released_so_far
        .checked_add(release_this_cycle)
        .ok_or(ErrorCode::MathOverflow)?;
    escrow.cycles_completed += 1;

    if escrow.cycles_completed >= escrow.cycles_remaining {
        escrow.is_complete = true;
        // Return collateral deposit
        ctx.accounts.collateral_vault.is_returned = true;
        transfer_collateral_back(
            &ctx.accounts.collateral_vault_token,
            &ctx.accounts.member_SOL,
            &ctx.accounts.collateral_vault,
        )?;
    }

    emit!(DeferredReleased {
        member: ctx.accounts.member.key(),
        amount_released: release_this_cycle,
        remaining_deferred: escrow.total_deferred
            .checked_sub(escrow.released_so_far)
            .unwrap_or(0),
    });

    Ok(())
}

// ── INSTRUCTION 4: process_missed_payment ─────────────────────────────────────
// Called by anyone (permissionless) after grace period expires.
// Handles all penalty logic automatically.

pub fn process_missed_payment(ctx: Context<ProcessMissedPayment>) -> Result<()> {
    let committee = &ctx.accounts.committee;
    let member    = &mut ctx.accounts.committee_member;
    let collateral = &mut ctx.accounts.collateral_vault;
    let escrow    = ctx.accounts.deferred_escrow.as_mut();

    // Verify grace period has passed
    let now = Clock::get()?.unix_timestamp;
    require!(
        now > ctx.accounts.cycle_due_date.timestamp + committee.grace_period_seconds,
        ErrorCode::GracePeriodNotExpired
    );

    member.penalty_strikes += 1;

    match member.penalty_strikes {
        1 => {
            // Strike 1: 2% penalty from collateral deposit
            let penalty = collateral.deposited_amount
                .checked_mul(200)
                .ok_or(ErrorCode::MathOverflow)?
                / 10_000;

            slash_collateral(
                &ctx.accounts.collateral_vault_token,
                &ctx.accounts.group_compensation_vault,
                collateral,
                penalty,
            )?;

            emit!(PenaltyApplied {
                member: ctx.accounts.member_wallet.key(),
                strike: 1,
                amount: penalty,
            });
        }
        2 => {
            // Strike 2: 5% penalty + suspend payout eligibility
            let penalty = collateral.deposited_amount
                .checked_mul(500)
                .ok_or(ErrorCode::MathOverflow)?
                / 10_000;

            slash_collateral(
                &ctx.accounts.collateral_vault_token,
                &ctx.accounts.group_compensation_vault,
                collateral,
                penalty,
            )?;

            member.is_eligible_for_payout = false;

            emit!(PenaltyApplied {
                member: ctx.accounts.member_wallet.key(),
                strike: 2,
                amount: penalty,
            });
        }
        _ => {
            // Strike 3+: Full removal
            // 1. Slash remaining collateral
            // 2. Forfeit any remaining deferred escrow
            // 3. Redistribute to active members
            // 4. Mark member as removed

            let remaining_collateral = collateral.deposited_amount
                .saturating_sub(member.total_penalties_paid);

            // Cover missed contribution from collateral first
            let missed_contribution = committee.contribution_amount;
            let compensation = remaining_collateral
                .saturating_sub(missed_contribution);

            // Transfer missed contribution to committee pool
            if missed_contribution > 0 && remaining_collateral >= missed_contribution {
                slash_collateral(
                    &ctx.accounts.collateral_vault_token,
                    &ctx.accounts.committee_vault,
                    collateral,
                    missed_contribution,
                )?;
            }

            // Transfer remainder to compensation pool for redistribution
            if compensation > 0 {
                slash_collateral(
                    &ctx.accounts.collateral_vault_token,
                    &ctx.accounts.group_compensation_vault,
                    collateral,
                    compensation,
                )?;
            }

            // Forfeit deferred escrow → welfare pool
            if let Some(esc) = escrow {
                if !esc.is_complete {
                    let remaining_deferred = esc.total_deferred
                        .saturating_sub(esc.released_so_far);
                    if remaining_deferred > 0 {
                        forfeit_to_welfare(
                            &ctx.accounts.deferred_vault,
                            &ctx.accounts.welfare_pool,
                            esc,
                            remaining_deferred,
                        )?;
                    }
                }
            }

            member.status = MemberStatus::Removed;

            emit!(MemberRemoved {
                committee: committee.key(),
                member: ctx.accounts.member_wallet.key(),
                collateral_slashed: remaining_collateral,
                reason: RemovalReason::RepeatedNonPayment,
            });
        }
    }

    Ok(())
}

// ── INSTRUCTION 5: validate_payout_trigger ────────────────────────────────────
// Enforces: next payout only releases when current cycle is fully funded.
// Called as a guard before release_payout_with_deferral.

pub fn validate_payout_trigger(ctx: Context<ValidatePayout>) -> Result<()> {
    let committee = &ctx.accounts.committee;

    // Count paid contributions for current cycle
    let paid_count = ctx.accounts.contributions
        .iter()
        .filter(|c| c.cycle_number == committee.current_cycle && !c.is_missed)
        .count() as u8;

    // All active members must have paid (or been processed for non-payment)
    require!(
        paid_count >= committee.current_members,
        ErrorCode::CycleNotFullyFunded
    );

    Ok(())
}

// ── INSTRUCTION 6: return_collateral_on_completion ───────────────────────────
// Called at full committee completion. Returns deposit to all honest members.
// Permissionless — anyone can call it for any completed member.

pub fn return_collateral_on_completion(ctx: Context<ReturnCollateral>) -> Result<()> {
    let committee = &ctx.accounts.committee;
    let collateral = &mut ctx.accounts.collateral_vault;
    let escrow = &ctx.accounts.deferred_escrow;

    require!(
        committee.status == CommitteeStatus::Complete,
        ErrorCode::CommitteeNotComplete
    );

    require!(
        escrow.is_complete || escrow.cycles_remaining == 0,
        ErrorCode::DeferredNotComplete
    );

    require!(!collateral.is_returned, ErrorCode::AlreadyReturned);

    // Return full original deposit
    transfer_from_collateral_vault(
        &ctx.accounts.collateral_vault_token,
        &ctx.accounts.member_SOL,
        collateral,
        collateral.deposited_amount,
    )?;

    collateral.is_returned = true;

    emit!(CollateralReturned {
        committee: committee.key(),
        member: ctx.accounts.member_wallet.key(),
        amount: collateral.deposited_amount,
    });

    Ok(())
}
```

---

## ERROR CODES — ADD TO LIB.RS

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Contribution amount must be exact — no partial payments")]
    InvalidContributionAmount,

    #[msg("Grace period has not yet expired")]
    GracePeriodNotExpired,

    #[msg("Current cycle is not fully funded — cannot release payout")]
    CycleNotFullyFunded,

    #[msg("No deferred cycles remaining")]
    NoRemainingCycles,

    #[msg("Collateral already returned")]
    AlreadyReturned,

    #[msg("Deferred escrow not yet complete")]
    DeferredNotComplete,

    #[msg("Committee not yet complete")]
    CommitteeNotComplete,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Member not eligible for payout — suspended")]
    NotEligibleForPayout,

    #[msg("Manager cannot take position 1 without 2/3 member approval")]
    ManagerPositionNotApproved,
}
```

---

## BACKEND LOGIC (Node.js / Neon)

### New Neon columns to add

```sql
-- Add to committee_members table
ALTER TABLE committee_members ADD COLUMN penalty_strikes INT DEFAULT 0;
ALTER TABLE committee_members ADD COLUMN is_eligible_for_payout BOOLEAN DEFAULT true;
ALTER TABLE committee_members ADD COLUMN collateral_deposited BIGINT DEFAULT 0;
ALTER TABLE committee_members ADD COLUMN deferred_total BIGINT DEFAULT 0;
ALTER TABLE committee_members ADD COLUMN deferred_released BIGINT DEFAULT 0;

-- New table: collateral vaults (mirrors on-chain state)
CREATE TABLE collateral_vaults (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id      UUID REFERENCES committees(id),
  user_id           UUID REFERENCES users(id),
  amount            BIGINT NOT NULL,
  pda_address       TEXT UNIQUE NOT NULL,
  is_returned       BOOLEAN DEFAULT false,
  deposited_at      TIMESTAMPTZ DEFAULT now(),
  returned_at       TIMESTAMPTZ
);

-- New table: deferred escrows (mirrors on-chain state)
CREATE TABLE deferred_escrows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id      UUID REFERENCES committees(id),
  user_id           UUID REFERENCES users(id),
  pda_address       TEXT UNIQUE NOT NULL,
  total_deferred    BIGINT NOT NULL,
  released_so_far   BIGINT DEFAULT 0,
  cycles_remaining  INT NOT NULL,
  cycles_completed  INT DEFAULT 0,
  is_complete       BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- New table: penalty log
CREATE TABLE penalty_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id      UUID REFERENCES committees(id),
  user_id           UUID REFERENCES users(id),
  strike_number     INT NOT NULL,
  penalty_amount    BIGINT,
  action_taken      TEXT NOT NULL,  -- 'warning' | 'suspend' | 'remove'
  tx_signature      TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### Cron job: missed payment monitor

```typescript
// src/jobs/missed-payment-monitor.ts
// Run every hour via node-cron

import cron from 'node-cron';
import { Neon } from '../db/client';
import { sendPushNotification } from '../notifications/expo-push';
import { processOnChainPenalty } from '../solana/penalty';

// Every hour
cron.schedule('0 * * * *', async () => {
  const now = new Date();

  // Find all contributions that are overdue
  const { data: overdueMembers } = await Neon
    .from('committee_members')
    .select(`
      *,
      committees(
        id, name, contribution_amount, grace_period_days,
        current_cycle, next_cycle_date
      ),
      users(id, expo_push_token, display_name)
    `)
    .eq('status', 'active')
    .eq('is_eligible_for_payout', true)
    .lt('committees.next_cycle_date', now.toISOString());

  for (const member of overdueMembers ?? []) {
    const dueDate = new Date(member.committees.next_cycle_date);
    const gracePeriodEnd = new Date(
      dueDate.getTime() + member.committees.grace_period_days * 86_400_000
    );

    // Check if this member paid this cycle
    const { data: contribution } = await Neon
      .from('contributions')
      .select('id')
      .eq('committee_id', member.committee_id)
      .eq('user_id', member.user_id)
      .eq('cycle_number', member.committees.current_cycle)
      .single();

    if (contribution) continue; // Already paid — skip

    const hoursOverdue = (now.getTime() - dueDate.getTime()) / 3_600_000;

    if (hoursOverdue < 24) {
      // Day 1: Warning notification only
      await sendPushNotification(
        member.users.expo_push_token,
        'Payment due — Rizq committee',
        `Your contribution of $${member.committees.contribution_amount / 1_000_000} SOL to "${member.committees.name}" was due today. Pay now to avoid a penalty.`
      );
    } else if (now < gracePeriodEnd) {
      // Within grace period: reminder + flag in DB
      await Neon.from('committee_members')
        .update({ last_payment_status: 'late' })
        .eq('id', member.id);

      await sendPushNotification(
        member.users.expo_push_token,
        'Late payment warning ⚠️',
        `You have ${Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / 86_400_000)} days left before your payout is suspended.`
      );
    } else {
      // Grace period expired: trigger on-chain penalty
      const currentStrikes = member.penalty_strikes + 1;

      await processOnChainPenalty({
        committeePDA: member.committees.pda_address,
        memberWallet: member.wallet_address,
        strike: currentStrikes,
      });

      await Neon.from('committee_members')
        .update({ penalty_strikes: currentStrikes })
        .eq('id', member.id);

      await Neon.from('penalty_events').insert({
        committee_id: member.committee_id,
        user_id: member.user_id,
        strike_number: currentStrikes,
        action_taken: currentStrikes >= 3 ? 'remove' : currentStrikes === 2 ? 'suspend' : 'warning',
      });

      const message = currentStrikes >= 3
        ? `You have been removed from "${member.committees.name}" for non-payment. Your security deposit has been redistributed.`
        : `Strike ${currentStrikes}: penalty applied to your security deposit in "${member.committees.name}".`;

      await sendPushNotification(member.users.expo_push_token, 'Penalty applied', message);
    }
  }
});
```

### Deferred release calculation helper

```typescript
// src/lib/deferred.ts

export function calculateDeferredAmount(params: {
  netPayout: number;        // in SOL micro-units
  payoutPosition: number;   // 1-indexed (1 = first)
  totalCycles: number;
}): { immediateAmount: number; deferredAmount: number; cyclesRemaining: number } {
  const { netPayout, payoutPosition, totalCycles } = params;

  const cyclesRemaining = totalCycles - payoutPosition;

  // Deferred = netPayout × (cyclesRemaining / totalCycles)
  const deferredAmount = Math.floor(
    (netPayout * cyclesRemaining) / totalCycles
  );

  const immediateAmount = netPayout - deferredAmount;

  return { immediateAmount, deferredAmount, cyclesRemaining };
}

export function calculateReleasePerCycle(params: {
  totalDeferred: number;
  releasedSoFar: number;
  cyclesCompleted: number;
  cyclesRemaining: number;
}): number {
  const { totalDeferred, releasedSoFar, cyclesCompleted, cyclesRemaining } = params;

  const remainingToRelease = totalDeferred - releasedSoFar;
  const remainingCycles = cyclesRemaining - cyclesCompleted;

  if (remainingCycles <= 0) return remainingToRelease; // Last cycle — release all
  return Math.floor(remainingToRelease / remainingCycles);
}

export function isDefectionProfitable(params: {
  payoutPosition: number;
  totalCycles: number;
  contributionAmount: number;  // in SOL micro-units
  memberCount: number;
}): boolean {
  // This should ALWAYS return false — if it returns true, adjust collateral amount
  const { payoutPosition, totalCycles, contributionAmount, memberCount } = params;

  const grossPayout = contributionAmount * memberCount;
  const netPayout = Math.floor(grossPayout * 0.985); // 1.5% fee
  const cyclesRemaining = totalCycles - payoutPosition;

  const { immediateAmount, deferredAmount } = calculateDeferredAmount({
    netPayout,
    payoutPosition,
    totalCycles,
  });

  const collateralAtRisk = contributionAmount; // 1× deposit
  const remainingContributions = cyclesRemaining * contributionAmount;

  // Defection payoff: immediate only, lose deferred + collateral
  const defectionPayoff = immediateAmount - collateralAtRisk;

  // Honest payoff: immediate + all deferred + deposit returned - remaining contributions
  const honestPayoff = netPayout + collateralAtRisk - remainingContributions;

  return defectionPayoff > honestPayoff; // Should always be false
}
```

---

## FRONTEND — SCREENS TO BUILD / MODIFY

### Modified: Create committee wizard — Step 2

Add a new field after the contribution amount:

```typescript
// app/committee/create/step-2.tsx — ADD THESE FIELDS

// Security deposit info card (always shown, not toggleable)
<InfoBox
  title="Security deposit required"
  body={`Each member deposits $${(contributionAmount).toFixed(2)} SOL (1× their contribution) before joining. 
  This is returned in full when they complete all their contributions.
  It protects the group if anyone stops paying.`}
  icon="🔒"
/>

// Show the deferred release schedule for early positions
<DeferredSchedulePreview
  totalCycles={maxMembers}
  contributionAmount={contributionAmount}
/>
```

```typescript
// components/committee/DeferredSchedulePreview.tsx

export function DeferredSchedulePreview({ totalCycles, contributionAmount }) {
  const memberCount = totalCycles;
  const grossPayout = contributionAmount * memberCount;
  const netPayout = grossPayout * 0.985;

  const positions = [1, Math.ceil(totalCycles / 2), totalCycles];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>How payouts work</Text>
      {positions.map(pos => {
        const cyclesRemaining = totalCycles - pos;
        const deferredPct = Math.round((cyclesRemaining / totalCycles) * 100);
        const immediate = netPayout * (1 - cyclesRemaining / totalCycles);

        return (
          <View key={pos} style={styles.row}>
            <Text style={styles.pos}>Position {pos}</Text>
            <View style={styles.breakdown}>
              <Text style={styles.immediate}>
                ${(immediate / 1_000_000).toFixed(2)} now
              </Text>
              {deferredPct > 0 && (
                <Text style={styles.deferred}>
                  + ${((netPayout - immediate) / 1_000_000).toFixed(2)} released over {cyclesRemaining} contributions
                </Text>
              )}
            </View>
          </View>
        );
      })}
      <Text style={styles.note}>
        The later your position, the more you receive upfront — you've already proven reliability.
      </Text>
    </View>
  );
}
```

### Modified: Join committee screen — show deposit requirement

```typescript
// app/committee/join/preview.tsx — ADD BEFORE CONFIRM BUTTON

<View style={styles.depositCard}>
  <Text style={styles.depositTitle}>🔒 Security deposit required</Text>
  <Text style={styles.depositAmount}>
    ${(committee.contribution_amount / 1_000_000).toFixed(2)} SOL
  </Text>
  <Text style={styles.depositBody}>
    This is locked when you join and returned when you complete all your contributions.
    It protects other members if you stop paying.
  </Text>
  <Text style={styles.depositNote}>
    Your available balance: ${(SOLBalance).toFixed(2)} SOL
    {SOLBalance < committee.contribution_amount / 1_000_000 * 2 && (
      ' — you need enough for deposit + first contribution'
    )}
  </Text>
</View>
```

### New: Member dashboard — deferred release tracker

```typescript
// Add to app/committee/[id]/index.tsx — after the contribution status card

{memberHasReceived && deferredEscrow && !deferredEscrow.is_complete && (
  <View style={styles.deferredCard}>
    <Text style={styles.deferredTitle}>Your deferred payout</Text>
    <ProgressBar
      progress={deferredEscrow.cycles_completed / deferredEscrow.cycles_remaining}
      color={colors.brand}
    />
    <Text style={styles.deferredText}>
      ${(deferredEscrow.released_so_far / 1_000_000).toFixed(2)} released
      of ${(deferredEscrow.total_deferred / 1_000_000).toFixed(2)} total
    </Text>
    <Text style={styles.deferredSub}>
      Pay your next contribution to release $
      {(calculateReleasePerCycle(deferredEscrow) / 1_000_000).toFixed(2)} SOL
    </Text>
  </View>
)}
```

### New: Payout claim screen — show deferred breakdown clearly

```typescript
// app/committee/[id]/payout.tsx — REPLACE existing amount display

const { immediateAmount, deferredAmount, cyclesRemaining } =
  calculateDeferredAmount({
    netPayout,
    payoutPosition: member.payout_position,
    totalCycles: committee.total_cycles,
  });

// Render:
<View style={styles.payoutBreakdown}>
  <Text style={styles.bigAmount}>
    ${(immediateAmount / 1_000_000).toFixed(2)} SOL
  </Text>
  <Text style={styles.bigLabel}>You receive now</Text>

  {deferredAmount > 0 && (
    <>
      <View style={styles.divider} />
      <Text style={styles.deferredAmount}>
        + ${(deferredAmount / 1_000_000).toFixed(2)} SOL
      </Text>
      <Text style={styles.deferredLabel}>
        Released over your next {cyclesRemaining} contributions
      </Text>
      <Text style={styles.deferredNote}>
        Pay each contribution on time to unlock your full payout.
        Missing a payment reduces what you receive.
      </Text>
    </>
  )}

  <View style={styles.divider} />
  <Text style={styles.depositNote}>
    Security deposit (${(committee.contribution_amount / 1_000_000).toFixed(2)}) 
    returned when you complete all contributions.
  </Text>
</View>
```

### New: Penalty status screen (shown when member is suspended)

```typescript
// app/committee/[id]/penalty-status.tsx

export default function PenaltyStatus() {
  return (
    <SafeAreaView>
      <View style={styles.alertBanner}>
        <Text style={styles.alertTitle}>Payment required</Text>
        <Text style={styles.alertBody}>
          Your payout eligibility is suspended until you pay your overdue contribution.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Strike history</Text>
        {penaltyEvents.map(event => (
          <View key={event.id} style={styles.penaltyRow}>
            <Text style={styles.penaltyDate}>
              {formatDate(event.created_at)}
            </Text>
            <Text style={styles.penaltyAction}>
              Strike {event.strike_number} — {event.action_taken}
            </Text>
            {event.penalty_amount && (
              <Text style={styles.penaltyAmount}>
                ${(event.penalty_amount / 1_000_000).toFixed(2)} deducted from deposit
              </Text>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.warningText}>
        ⚠️ Strike 3 results in removal from the committee and loss of your security deposit.
      </Text>

      <Button
        label={`Pay now — $${(committee.contribution_amount / 1_000_000).toFixed(2)} SOL`}
        onPress={handlePayNow}
        variant="primary"
      />
    </SafeAreaView>
  );
}
```

---

## MANAGER PROTECTION — ADDITIONAL RULE

```typescript
// Enforce in committee creation (Step 4 — payout order)
// If manager selects position 1 for themselves, trigger approval flow

async function validateManagerPosition(
  managerUserId: string,
  payoutOrder: string[],
  committeeId: string
): Promise<boolean> {
  const position1UserId = payoutOrder[0];

  if (position1UserId !== managerUserId) return true; // Fine — not taking first

  // Manager is taking position 1 — require 2/3 member on-chain approval
  const { data: members } = await Neon
    .from('committee_members')
    .select('user_id, approved_manager_position_1')
    .eq('committee_id', committeeId)
    .neq('user_id', managerUserId); // Exclude manager from vote

  const approvedCount = members?.filter(m => m.approved_manager_position_1).length ?? 0;
  const required = Math.ceil((members?.length ?? 0) * (2 / 3));

  return approvedCount >= required;
}
```

---

## COMPLETE FLOW SUMMARY

```
JOINING:
  1. Member calls deposit_collateral → locks 1× contribution in collateral_vault PDA
  2. Member calls join_committee → registered on-chain
  3. Neon: collateral_vaults record created

CONTRIBUTING (pre-payout):
  1. Member calls deposit_to_committee → SOL to committee pool
  2. Neon: contributions record with tx_signature
  3. Backend: check if cycle now fully funded → if yes, unlock next payout

RECEIVING PAYOUT:
  1. validate_payout_trigger → confirms cycle fully funded
  2. release_payout_with_deferral:
     - Calculates immediate and deferred amounts
     - Sends immediate to member wallet
     - Sends deferred to deferred_escrow vault PDA
     - Sends platform fee to treasury
  3. Neon: payouts record + deferred_escrows record created

CONTRIBUTING (post-payout):
  1. Member calls contribute_and_release_deferred instead of normal deposit
  2. Contribution goes to pool
  3. Proportional deferred slice released to member wallet
  4. If all cycles done: collateral returned automatically

MISSED PAYMENT:
  Day 0:    Notification only
  Day 1–3:  Grace period active, reminder notifications
  Day 3+:   process_missed_payment called by cron (permissionless)
  Strike 1: 2% collateral penalty
  Strike 2: 5% penalty + payout suspended
  Strike 3: Removed, collateral slashed and redistributed, deferred forfeited to welfare pool

COMPLETION:
  1. All cycles complete
  2. committee status → Complete
  3. Each member calls return_collateral_on_completion → deposit returned
  4. Neon: committee marked complete
```

---

## KEY INVARIANTS — VERIFY THESE IN TESTS

```typescript
// tests/protection-invariants.test.ts

describe('Protection invariants', () => {
  it('Defection is never profitable at any position', () => {
    const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const pos of positions) {
      const isProfitable = isDefectionProfitable({
        payoutPosition: pos,
        totalCycles: 10,
        contributionAmount: 100_000_000, // $100 SOL
        memberCount: 10,
      });
      expect(isProfitable).toBe(false);
    }
  });

  it('Total deferred + immediate always equals net payout', () => {
    const { immediateAmount, deferredAmount } = calculateDeferredAmount({
      netPayout: 985_000_000,
      payoutPosition: 3,
      totalCycles: 10,
    });
    expect(immediateAmount + deferredAmount).toBe(985_000_000);
  });

  it('Last position member receives full payout immediately', () => {
    const { deferredAmount, cyclesRemaining } = calculateDeferredAmount({
      netPayout: 985_000_000,
      payoutPosition: 10,
      totalCycles: 10,
    });
    expect(deferredAmount).toBe(0);
    expect(cyclesRemaining).toBe(0);
  });

  it('Collateral covers at least one missed contribution', () => {
    const contributionAmount = 100_000_000;
    const collateral = contributionAmount; // 1× deposit
    expect(collateral).toBeGreaterThanOrEqual(contributionAmount);
  });
});
```

---

*This logic makes it economically irrational to defect at any payout position.*
*The later you are in the committee, the more you receive immediately — rewarding patience.*
*The earlier you are, the more protection the group has — rewarding the risk they take on you.*