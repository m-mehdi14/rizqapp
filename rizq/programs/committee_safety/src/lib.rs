use anchor_lang::prelude::*;

declare_id!("Cpia1FnXf1iVdaJZgP8CAgrairq851M8oHiyE8G35M41");

#[program]
pub mod committee_safety {
    use super::*;

    pub fn initialize_committee(
        ctx: Context<InitializeCommittee>,
        contribution_amount: u64,
        total_cycles: u8,
        grace_period_seconds: i64,
    ) -> Result<()> {
        require!(contribution_amount > 0, ErrorCode::InvalidAmount);
        require!(total_cycles > 0, ErrorCode::InvalidTotalCycles);
        require!(grace_period_seconds >= 0, ErrorCode::InvalidGracePeriod);

        let committee = &mut ctx.accounts.committee;
        committee.manager = ctx.accounts.manager.key();
        committee.contribution_amount = contribution_amount;
        committee.total_cycles = total_cycles;
        committee.current_cycle = 1;
        committee.current_members = 0;
        committee.grace_period_seconds = grace_period_seconds;
        committee.next_cycle_due_ts = Clock::get()?.unix_timestamp;
        committee.bump = ctx.bumps.committee;
        Ok(())
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let vault = &mut ctx.accounts.collateral_vault;
        require!(vault.deposited_amount == 0, ErrorCode::CollateralAlreadyDeposited);

        vault.committee = committee.key();
        vault.member = ctx.accounts.member.key();
        vault.deposited_amount = committee.contribution_amount;
        vault.is_returned = false;
        vault.bump = ctx.bumps.collateral_vault;

        emit!(CollateralDeposited {
            committee: committee.key(),
            member: ctx.accounts.member.key(),
            amount: committee.contribution_amount,
        });
        Ok(())
    }

    pub fn join_committee(ctx: Context<JoinCommittee>, payout_position: u8) -> Result<()> {
        let committee = &mut ctx.accounts.committee;
        let member = &mut ctx.accounts.member_state;
        let collateral = &ctx.accounts.collateral_vault;

        require!(collateral.deposited_amount >= committee.contribution_amount, ErrorCode::CollateralRequired);
        require!(!collateral.is_returned, ErrorCode::CollateralRequired);
        require!(payout_position > 0 && payout_position <= committee.total_cycles, ErrorCode::InvalidPayoutPosition);

        member.committee = committee.key();
        member.member = ctx.accounts.member.key();
        member.payout_position = payout_position;
        member.penalty_strikes = 0;
        member.total_penalties_paid = 0;
        member.last_contribution_cycle = 0;
        member.is_eligible_for_payout = true;
        member.has_received_payout = false;
        member.bump = ctx.bumps.member_state;

        committee.current_members = committee
            .current_members
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn release_payout_with_deferral(ctx: Context<ReleasePayout>) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let member = &mut ctx.accounts.member_state;
        let escrow = &mut ctx.accounts.deferred_escrow;

        require!(member.is_eligible_for_payout, ErrorCode::MemberNotEligibleForPayout);
        require!(!member.has_received_payout, ErrorCode::PayoutAlreadyReleased);
        require!(
            member.payout_position == committee.current_cycle,
            ErrorCode::NotCurrentPayoutPosition
        );

        let cycles_remaining = committee
            .total_cycles
            .checked_sub(member.payout_position)
            .ok_or(ErrorCode::MathOverflow)?;
        let gross_payout = committee
            .contribution_amount
            .checked_mul(committee.current_members as u64)
            .ok_or(ErrorCode::MathOverflow)?;
        let platform_fee = gross_payout
            .checked_mul(150)
            .ok_or(ErrorCode::MathOverflow)?
            / 10_000;
        let net_payout = gross_payout
            .checked_sub(platform_fee)
            .ok_or(ErrorCode::MathOverflow)?;
        let deferred_amount = net_payout
            .checked_mul(cycles_remaining as u64)
            .ok_or(ErrorCode::MathOverflow)?
            / committee.total_cycles as u64;
        let immediate_amount = net_payout
            .checked_sub(deferred_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        escrow.committee = committee.key();
        escrow.member = member.member;
        escrow.total_deferred = deferred_amount;
        escrow.released_so_far = 0;
        escrow.cycles_remaining = cycles_remaining;
        escrow.cycles_completed = 0;
        escrow.is_complete = cycles_remaining == 0;
        escrow.bump = ctx.bumps.deferred_escrow;

        member.has_received_payout = true;

        emit!(PayoutReleased {
            committee: committee.key(),
            member: member.member,
            immediate_amount,
            deferred_amount,
            cycles_remaining,
        });
        Ok(())
    }

    pub fn contribute_and_release_deferred(
        ctx: Context<ContributeAndReleaseDeferred>,
        amount: u64,
    ) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let member = &mut ctx.accounts.member_state;
        let escrow = &mut ctx.accounts.deferred_escrow;
        require!(amount == committee.contribution_amount, ErrorCode::InvalidAmount);
        require!(member.has_received_payout, ErrorCode::PayoutNotReleasedYet);
        require!(!escrow.is_complete, ErrorCode::EscrowAlreadyComplete);

        let remaining_to_release = escrow
            .total_deferred
            .checked_sub(escrow.released_so_far)
            .ok_or(ErrorCode::MathOverflow)?;
        let remaining_cycles = escrow
            .cycles_remaining
            .checked_sub(escrow.cycles_completed)
            .ok_or(ErrorCode::MathOverflow)?;
        require!(remaining_cycles > 0, ErrorCode::NoRemainingCycles);

        let release_this_cycle = remaining_to_release / remaining_cycles as u64;
        escrow.released_so_far = escrow
            .released_so_far
            .checked_add(release_this_cycle)
            .ok_or(ErrorCode::MathOverflow)?;
        escrow.cycles_completed = escrow
            .cycles_completed
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        escrow.is_complete = escrow.cycles_completed >= escrow.cycles_remaining;

        member.last_contribution_cycle = committee.current_cycle;

        emit!(DeferredReleased {
            committee: committee.key(),
            member: member.member,
            amount_released: release_this_cycle,
            remaining_deferred: escrow
                .total_deferred
                .checked_sub(escrow.released_so_far)
                .ok_or(ErrorCode::MathOverflow)?,
        });
        Ok(())
    }

    pub fn process_missed_payment(ctx: Context<ProcessMissedPayment>) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let member = &mut ctx.accounts.member_state;
        let collateral = &mut ctx.accounts.collateral_vault;
        let now = Clock::get()?.unix_timestamp;
        require!(
            now > committee.next_cycle_due_ts + committee.grace_period_seconds,
            ErrorCode::GracePeriodNotElapsed
        );
        require!(
            member.last_contribution_cycle < committee.current_cycle,
            ErrorCode::AlreadyPaidCurrentCycle
        );

        member.penalty_strikes = member
            .penalty_strikes
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
        match member.penalty_strikes {
            1 => {
                let p = collateral.deposited_amount * 2 / 100;
                member.total_penalties_paid = member
                    .total_penalties_paid
                    .checked_add(p)
                    .ok_or(ErrorCode::MathOverflow)?;
                emit!(PenaltyApplied {
                    committee: committee.key(),
                    member: member.member,
                    strike_number: 1,
                    amount: p,
                    action_taken: PenaltyAction::Warning,
                });
            }
            2 => {
                let p = collateral.deposited_amount * 5 / 100;
                member.total_penalties_paid = member
                    .total_penalties_paid
                    .checked_add(p)
                    .ok_or(ErrorCode::MathOverflow)?;
                member.is_eligible_for_payout = false;
                emit!(PenaltyApplied {
                    committee: committee.key(),
                    member: member.member,
                    strike_number: 2,
                    amount: p,
                    action_taken: PenaltyAction::Suspend,
                });
            }
            _ => {
                member.is_eligible_for_payout = false;
                emit!(PenaltyApplied {
                    committee: committee.key(),
                    member: member.member,
                    strike_number: member.penalty_strikes,
                    amount: collateral.deposited_amount,
                    action_taken: PenaltyAction::Remove,
                });
            }
        }
        Ok(())
    }

    pub fn validate_payout_trigger(ctx: Context<ValidatePayoutTrigger>) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let member = &ctx.accounts.member_state;
        require!(
            member.last_contribution_cycle >= committee.current_cycle || !member.is_eligible_for_payout,
            ErrorCode::CycleNotComplete
        );
        Ok(())
    }

    pub fn return_collateral_on_completion(ctx: Context<ReturnCollateralOnCompletion>) -> Result<()> {
        let committee = &ctx.accounts.committee;
        let member = &ctx.accounts.member_state;
        let vault = &mut ctx.accounts.collateral_vault;
        require!(committee.current_cycle >= committee.total_cycles, ErrorCode::CommitteeNotCompleted);
        require!(member.penalty_strikes < 3, ErrorCode::MemberRemoved);
        require!(!vault.is_returned, ErrorCode::CollateralAlreadyReturned);
        vault.is_returned = true;
        emit!(CollateralReturned {
            committee: committee.key(),
            member: member.member,
            amount: vault.deposited_amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCommittee<'info> {
    #[account(
        init,
        payer = manager,
        space = 8 + CommitteeState::INIT_SPACE,
        seeds = [b"committee", manager.key().as_ref()],
        bump
    )]
    pub committee: Account<'info, CommitteeState>,
    #[account(mut)]
    pub manager: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub committee: Account<'info, CommitteeState>,
    #[account(
        init,
        payer = member,
        space = 8 + CollateralVault::INIT_SPACE,
        seeds = [b"collateral", committee.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub collateral_vault: Account<'info, CollateralVault>,
    #[account(mut)]
    pub member: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinCommittee<'info> {
    #[account(mut)]
    pub committee: Account<'info, CommitteeState>,
    #[account(
        mut,
        seeds = [b"collateral", committee.key().as_ref(), member.key().as_ref()],
        bump = collateral_vault.bump
    )]
    pub collateral_vault: Account<'info, CollateralVault>,
    #[account(
        init,
        payer = member,
        space = 8 + CommitteeMemberState::INIT_SPACE,
        seeds = [b"member", committee.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub member_state: Account<'info, CommitteeMemberState>,
    #[account(mut)]
    pub member: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleasePayout<'info> {
    pub committee: Account<'info, CommitteeState>,
    #[account(mut)]
    pub member_state: Account<'info, CommitteeMemberState>,
    #[account(
        init,
        payer = member_wallet,
        space = 8 + DeferredEscrow::INIT_SPACE,
        seeds = [b"escrow", committee.key().as_ref(), member_wallet.key().as_ref()],
        bump
    )]
    pub deferred_escrow: Account<'info, DeferredEscrow>,
    #[account(mut)]
    pub member_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ContributeAndReleaseDeferred<'info> {
    pub committee: Account<'info, CommitteeState>,
    #[account(mut)]
    pub member_state: Account<'info, CommitteeMemberState>,
    #[account(mut)]
    pub deferred_escrow: Account<'info, DeferredEscrow>,
}

#[derive(Accounts)]
pub struct ProcessMissedPayment<'info> {
    pub committee: Account<'info, CommitteeState>,
    #[account(mut)]
    pub member_state: Account<'info, CommitteeMemberState>,
    #[account(mut)]
    pub collateral_vault: Account<'info, CollateralVault>,
}

#[derive(Accounts)]
pub struct ValidatePayoutTrigger<'info> {
    pub committee: Account<'info, CommitteeState>,
    pub member_state: Account<'info, CommitteeMemberState>,
}

#[derive(Accounts)]
pub struct ReturnCollateralOnCompletion<'info> {
    pub committee: Account<'info, CommitteeState>,
    pub member_state: Account<'info, CommitteeMemberState>,
    #[account(mut)]
    pub collateral_vault: Account<'info, CollateralVault>,
}

#[account]
#[derive(InitSpace)]
pub struct CommitteeState {
    pub manager: Pubkey,
    pub contribution_amount: u64,
    pub total_cycles: u8,
    pub current_cycle: u8,
    pub current_members: u8,
    pub grace_period_seconds: i64,
    pub next_cycle_due_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CommitteeMemberState {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub payout_position: u8,
    pub penalty_strikes: u8,
    pub total_penalties_paid: u64,
    pub last_contribution_cycle: u8,
    pub is_eligible_for_payout: bool,
    pub has_received_payout: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CollateralVault {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub deposited_amount: u64,
    pub is_returned: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DeferredEscrow {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub total_deferred: u64,
    pub released_so_far: u64,
    pub cycles_remaining: u8,
    pub cycles_completed: u8,
    pub is_complete: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PenaltyAction {
    Warning,
    Suspend,
    Remove,
}

#[event]
pub struct CollateralDeposited {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PayoutReleased {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub immediate_amount: u64,
    pub deferred_amount: u64,
    pub cycles_remaining: u8,
}

#[event]
pub struct DeferredReleased {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub amount_released: u64,
    pub remaining_deferred: u64,
}

#[event]
pub struct PenaltyApplied {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub strike_number: u8,
    pub amount: u64,
    pub action_taken: PenaltyAction,
}

#[event]
pub struct CollateralReturned {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid total cycles")]
    InvalidTotalCycles,
    #[msg("Invalid grace period")]
    InvalidGracePeriod,
    #[msg("Collateral already deposited")]
    CollateralAlreadyDeposited,
    #[msg("Collateral required before joining")]
    CollateralRequired,
    #[msg("Invalid payout position")]
    InvalidPayoutPosition,
    #[msg("Member not eligible for payout")]
    MemberNotEligibleForPayout,
    #[msg("Payout already released")]
    PayoutAlreadyReleased,
    #[msg("Not current payout position")]
    NotCurrentPayoutPosition,
    #[msg("Payout not released yet")]
    PayoutNotReleasedYet,
    #[msg("Escrow already complete")]
    EscrowAlreadyComplete,
    #[msg("No remaining cycles")]
    NoRemainingCycles,
    #[msg("Grace period not elapsed")]
    GracePeriodNotElapsed,
    #[msg("Already paid current cycle")]
    AlreadyPaidCurrentCycle,
    #[msg("Cycle is not complete")]
    CycleNotComplete,
    #[msg("Committee is not completed")]
    CommitteeNotCompleted,
    #[msg("Member removed")]
    MemberRemoved,
    #[msg("Collateral already returned")]
    CollateralAlreadyReturned,
}
