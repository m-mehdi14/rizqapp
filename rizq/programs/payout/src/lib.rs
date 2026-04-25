use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::AccountMeta, instruction::Instruction, program::invoke};
use prediction_pool::program::PredictionPool as PredictionPoolProgram;
use savings_goal::program::SavingsGoal as SavingsGoalProgram;
use savings_goal::SavingsGoal;

declare_id!("AXBFPJPcxx1n2uZM9K1chRZX7dUDPr9mDRabAREKs8Yy");

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
