use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::AccountMeta, instruction::Instruction, program::invoke};
use prediction_pool::program::PredictionPool as PredictionPoolProgram;
use savings_goal::program::SavingsGoal as SavingsGoalProgram;
use savings_goal::SavingsGoal;

declare_id!("3whdF5HrQAk83356SMcC6T64hXfYjFDBsh2DoSSba9q8");

/// sha256("global:finalize_committee")[0..8] — must match Anchor-generated discriminator for prediction_pool::finalize_committee
const FINALIZE_COMMITTEE_DISCRIMINATOR: [u8; 8] = [102, 98, 1, 131, 33, 66, 194, 95];

#[program]
pub mod payout {
    use super::*;

    /// Permissionless: forwards to `prediction_pool::finalize_committee`.
    pub fn resolve_goal<'info>(
        ctx: Context<'_, '_, '_, 'info, ResolveGoal<'info>>,
    ) -> Result<()> {
        let mut data = Vec::with_capacity(8);
        data.extend_from_slice(&FINALIZE_COMMITTEE_DISCRIMINATOR);

        let metas = vec![
            AccountMeta::new(ctx.accounts.savings_goal.key(), false),
            AccountMeta::new(ctx.accounts.prediction_pool.key(), false),
            AccountMeta::new_readonly(ctx.accounts.savings_goal_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.prediction_pool_program.key(), false),
        ];

        let ix = Instruction {
            program_id: ctx.accounts.prediction_pool_program.key(),
            accounts: metas,
            data,
        };

        let infos = vec![
            ctx.accounts.savings_goal.to_account_info(),
            ctx.accounts.prediction_pool.to_account_info(),
            ctx.accounts.savings_goal_program.to_account_info(),
            ctx.accounts.prediction_pool_program.to_account_info(),
        ];

        invoke(&ix, &infos)?;
        Ok(())
    }

    /// Safety math preview for committee migration:
    /// computes immediate/deferred split in lamports without moving funds.
    pub fn safety_math_preview(
        _ctx: Context<SafetyMathPreview>,
        net_payout_lamports: u64,
        payout_position: u8,
        total_cycles: u8,
    ) -> Result<()> {
        require!(total_cycles > 0, ErrorCode::InvalidTotalCycles);
        require!(payout_position > 0, ErrorCode::InvalidPayoutPosition);
        require!(payout_position <= total_cycles, ErrorCode::InvalidPayoutPosition);

        let cycles_remaining = total_cycles
            .checked_sub(payout_position)
            .ok_or(ErrorCode::MathOverflow)?;
        let deferred_amount = net_payout_lamports
            .checked_mul(cycles_remaining as u64)
            .ok_or(ErrorCode::MathOverflow)?
            / total_cycles as u64;
        let immediate_amount = net_payout_lamports
            .checked_sub(deferred_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        emit!(SafetyMathComputed {
            net_payout_lamports,
            payout_position,
            total_cycles,
            cycles_remaining,
            immediate_amount,
            deferred_amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ResolveGoal<'info> {
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(
        mut,
        seeds = [b"pool", savings_goal.key().as_ref()],
        bump,
        constraint = prediction_pool.goal == savings_goal.key()
    )]
    pub prediction_pool: Account<'info, prediction_pool::PredictionPool>,
    pub savings_goal_program: Program<'info, SavingsGoalProgram>,
    pub prediction_pool_program: Program<'info, PredictionPoolProgram>,
}

#[derive(Accounts)]
pub struct SafetyMathPreview {}

#[account]
pub struct CollateralVault {
    pub committee: Pubkey,
    pub member: Pubkey,
    pub deposited_amount: u64,
    pub is_returned: bool,
    pub bump: u8,
}

impl CollateralVault {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

#[account]
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

impl DeferredEscrow {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 1;
}

#[event]
pub struct SafetyMathComputed {
    pub net_payout_lamports: u64,
    pub payout_position: u8,
    pub total_cycles: u8,
    pub cycles_remaining: u8,
    pub immediate_amount: u64,
    pub deferred_amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Total cycles must be positive")]
    InvalidTotalCycles,
    #[msg("Invalid payout position")]
    InvalidPayoutPosition,
}
