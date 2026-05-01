use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use savings_goal::program::SavingsGoal as SavingsGoalProgram;
use savings_goal::{self, SavingsGoal};

declare_id!("FXZ1aRhFnQixjtb4WVf8PX3V1sboCrphvfeuuwhuJiRQ");

pub const MIN_CONTRIBUTION: u64 = 5_000_000; // 5 USDC
pub const MAX_MEMBERS: usize = 50;

#[program]
pub mod prediction_pool {
    use super::*;

    /// Initializes a committee pool linked to a savings goal PDA.
    pub fn create_pool(
        ctx: Context<CreatePool>,
        contribution_amount: u64,
        total_cycles: u16,
    ) -> Result<()> {
        let goal = &ctx.accounts.savings_goal;
        require!(
            goal.prediction_pool == Pubkey::default(),
            ErrorCode::GoalAlreadyHasPool
        );
        require!(
            ctx.accounts.owner.key() == goal.owner,
            ErrorCode::Unauthorized
        );
        require!(
            contribution_amount >= MIN_CONTRIBUTION,
            ErrorCode::MinContributionNotMet
        );
        require!(total_cycles > 0, ErrorCode::InvalidCycleConfig);

        let savings_goal_ai = ctx.accounts.savings_goal.to_account_info();
        let owner_ai = ctx.accounts.owner.to_account_info();
        let prediction_pool_ai = ctx.accounts.pool.to_account_info();
        let savings_goal_program_ai = ctx.accounts.savings_goal_program.to_account_info();

        let pool = &mut ctx.accounts.pool;
        pool.goal = goal.key();
        pool.members = Vec::new();
        pool.contribution_amount = contribution_amount;
        pool.current_cycle = 0;
        pool.total_cycles = total_cycles;
        pool.pool_balance = 0;
        pool.is_resolved = false;
        pool.vault = ctx.accounts.vault.key();
        pool.bump = ctx.bumps.pool;

        let cpi_accounts = savings_goal::cpi::accounts::LinkPredictionPool {
            savings_goal: savings_goal_ai,
            owner: owner_ai,
            prediction_pool: prediction_pool_ai,
        };
        let cpi_ctx = CpiContext::new(savings_goal_program_ai, cpi_accounts);
        savings_goal::cpi::link_prediction_pool(cpi_ctx)?;

        emit!(CommitteePoolCreated {
            pool: pool.key(),
            goal: pool.goal,
            contribution_amount,
            total_cycles,
        });
        Ok(())
    }

    /// Adds a committee member and fixes their payout order slot.
    pub fn join_committee(ctx: Context<JoinCommittee>, payout_position: u8) -> Result<()> {
        require!(payout_position > 0, ErrorCode::InvalidPayoutPosition);
        let pool = &mut ctx.accounts.prediction_pool;
        require!(!pool.is_resolved, ErrorCode::PoolResolved);
        require!(pool.members.len() < MAX_MEMBERS, ErrorCode::CommitteeFull);

        let member_key = ctx.accounts.member.key();
        require!(
            !pool.members.iter().any(|m| m.member == member_key),
            ErrorCode::MemberAlreadyJoined
        );
        require!(
            !pool
                .members
                .iter()
                .any(|m| m.payout_position == payout_position),
            ErrorCode::PayoutPositionTaken
        );

        pool.members.push(MemberEntry {
            member: member_key,
            payout_position,
            has_received: false,
        });
        pool.members
            .sort_by_key(|member| member.payout_position);

        emit!(MemberJoined {
            pool: pool.key(),
            member: member_key,
            payout_position,
        });
        Ok(())
    }

    /// Member pays one cycle contribution into committee escrow.
    pub fn pay_contribution(ctx: Context<PayContribution>, amount: u64) -> Result<()> {
        require!(amount >= MIN_CONTRIBUTION, ErrorCode::MinContributionNotMet);
        let pool = &mut ctx.accounts.prediction_pool;
        require!(!pool.is_resolved, ErrorCode::PoolResolved);

        let goal = &ctx.accounts.savings_goal;
        require!(
            Clock::get()?.unix_timestamp < goal.deadline,
            ErrorCode::ContributionAfterDeadline
        );
        require!(
            pool.members
                .iter()
                .any(|member| member.member == ctx.accounts.member.key()),
            ErrorCode::NotCommitteeMember
        );
        require!(
            amount >= pool.contribution_amount,
            ErrorCode::AmountBelowContribution
        );

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.member_usdc.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.member.to_account_info(),
                },
            ),
            amount,
        )?;

        pool.pool_balance = pool
            .pool_balance
            .checked_add(amount)
            .ok_or(ErrorCode::AmountOverflow)?;

        emit!(ContributionPaid {
            pool: pool.key(),
            member: ctx.accounts.member.key(),
            amount,
        });
        Ok(())
    }

    /// Pays the full current committee cycle pot to the next member in payout order.
    pub fn claim_cycle_payout(ctx: Context<ClaimCyclePayout>) -> Result<()> {
        let pool_ai = ctx.accounts.prediction_pool.to_account_info();
        let (goal_key, bump, pool_balance, current_cycle, members_len, expected_member) = {
            let pool = &ctx.accounts.prediction_pool;
            (
                pool.goal,
                pool.bump,
                pool.pool_balance,
                pool.current_cycle,
                pool.members.len(),
                pool.members
                    .get(usize::from(pool.current_cycle))
                    .map(|member| member.member),
            )
        };
        require!(!ctx.accounts.prediction_pool.is_resolved, ErrorCode::PoolResolved);
        require!(pool_balance > 0, ErrorCode::NoFundsAvailable);

        let current_index = usize::from(current_cycle);
        require!(current_index < members_len, ErrorCode::NoMorePayoutRecipients);
        let expected_member = expected_member.ok_or(ErrorCode::NoMorePayoutRecipients)?;
        require_keys_eq!(ctx.accounts.recipient.key(), expected_member);

        let payout_amount = pool_balance;
        let pool_seeds: &[&[u8]] = &[b"pool", goal_key.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[pool_seeds];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault.to_account_info(),
                    to: ctx.accounts.recipient_usdc.to_account_info(),
                    authority: pool_ai.clone(),
                },
                signer_seeds,
            ),
            payout_amount,
        )?;

        let pool = &mut ctx.accounts.prediction_pool;
        pool.pool_balance = 0;
        if let Some(member) = pool.members.get_mut(current_index) {
            member.has_received = true;
        }
        pool.current_cycle = pool
            .current_cycle
            .checked_add(1)
            .ok_or(ErrorCode::AmountOverflow)?;

        emit!(PayoutClaimed {
            pool: pool.key(),
            recipient: ctx.accounts.recipient.key(),
            cycle: pool.current_cycle,
            amount: payout_amount,
        });
        Ok(())
    }

    /// Marks committee as resolved once all cycles are completed.
    pub fn finalize_committee(ctx: Context<FinalizeCommittee>) -> Result<()> {
        let pool_ai = ctx.accounts.prediction_pool.to_account_info();
        let (goal_key, bump, current_cycle, total_cycles, is_resolved) = {
            let pool = &ctx.accounts.prediction_pool;
            (
                pool.goal,
                pool.bump,
                pool.current_cycle,
                pool.total_cycles,
                pool.is_resolved,
            )
        };
        require!(!is_resolved, ErrorCode::PoolResolved);
        require!(current_cycle >= total_cycles, ErrorCode::CyclesNotCompleted);

        let pool_seeds: &[&[u8]] = &[b"pool", goal_key.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[pool_seeds];

        let cpi_accounts = savings_goal::cpi::accounts::MarkResolved {
            savings_goal: ctx.accounts.savings_goal.to_account_info(),
            pool_authority: pool_ai.clone(),
            prediction_pool_program: ctx.accounts.prediction_pool_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.savings_goal_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        savings_goal::cpi::mark_resolved(cpi_ctx)?;

        let pool = &mut ctx.accounts.prediction_pool;
        pool.is_resolved = true;
        emit!(CommitteeResolved {
            pool: pool.key(),
            cycles_completed: pool.current_cycle,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct MemberEntry {
    pub member: Pubkey,
    pub payout_position: u8,
    pub has_received: bool,
}

#[account]
#[derive(InitSpace)]
pub struct PredictionPool {
    pub goal: Pubkey,
    #[max_len(50)]
    pub members: Vec<MemberEntry>,
    pub contribution_amount: u64,
    pub current_cycle: u16,
    pub total_cycles: u16,
    pub pool_balance: u64,
    pub is_resolved: bool,
    pub vault: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + PredictionPool::INIT_SPACE,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, PredictionPool>,
    #[account(
        init,
        payer = owner,
        token::mint = usdc_mint,
        token::authority = pool,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub savings_goal_program: Program<'info, SavingsGoalProgram>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinCommittee<'info> {
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump,
        constraint = prediction_pool.goal == savings_goal.key()
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
    pub member: Signer<'info>,
}

#[derive(Accounts)]
pub struct PayContribution<'info> {
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump,
        constraint = prediction_pool.goal == savings_goal.key()
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
    #[account(mut, address = prediction_pool.vault)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub member_usdc: Account<'info, TokenAccount>,
    pub member: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimCyclePayout<'info> {
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump,
        constraint = prediction_pool.goal == savings_goal.key()
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
    #[account(mut, address = prediction_pool.vault)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient: Signer<'info>,
    #[account(mut)]
    pub recipient_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FinalizeCommittee<'info> {
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump,
        constraint = prediction_pool.goal == savings_goal.key()
    )]
    pub prediction_pool: Account<'info, PredictionPool>,
    pub savings_goal_program: Program<'info, SavingsGoalProgram>,
    /// CHECK: must be this program's id (used in savings_goal PDA check)
    #[account(address = crate::ID)]
    pub prediction_pool_program: AccountInfo<'info>,
}

#[event]
pub struct CommitteePoolCreated {
    pub pool: Pubkey,
    pub goal: Pubkey,
    pub contribution_amount: u64,
    pub total_cycles: u16,
}

#[event]
pub struct MemberJoined {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub payout_position: u8,
}

#[event]
pub struct ContributionPaid {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PayoutClaimed {
    pub pool: Pubkey,
    pub recipient: Pubkey,
    pub cycle: u16,
    pub amount: u64,
}

#[event]
pub struct CommitteeResolved {
    pub pool: Pubkey,
    pub cycles_completed: u16,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Goal already linked to a pool")]
    GoalAlreadyHasPool,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Minimum contribution not met")]
    MinContributionNotMet,
    #[msg("Invalid cycle configuration")]
    InvalidCycleConfig,
    #[msg("Pool already resolved")]
    PoolResolved,
    #[msg("Cannot pay contribution after goal deadline")]
    ContributionAfterDeadline,
    #[msg("Committee member limit reached")]
    CommitteeFull,
    #[msg("Member already joined this committee")]
    MemberAlreadyJoined,
    #[msg("Payout position is already taken")]
    PayoutPositionTaken,
    #[msg("Payout position must be greater than zero")]
    InvalidPayoutPosition,
    #[msg("Signer is not a committee member")]
    NotCommitteeMember,
    #[msg("Amount is below committee contribution amount")]
    AmountBelowContribution,
    #[msg("No funds available in committee pool")]
    NoFundsAvailable,
    #[msg("No more payout recipients configured")]
    NoMorePayoutRecipients,
    #[msg("All committee cycles are not completed yet")]
    CyclesNotCompleted,
    #[msg("Amount overflow")]
    AmountOverflow,
}
