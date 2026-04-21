use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::AccountMeta, instruction::Instruction, program::invoke};
use anchor_spl::token::{Mint, Token, TokenAccount};
use prediction_pool::program::PredictionPool as PredictionPoolProgram;
use savings_goal::program::SavingsGoal as SavingsGoalProgram;
use savings_goal::SavingsGoal;

declare_id!("AXBFPJPcxx1n2uZM9K1chRZX7dUDPr9mDRabAREKs8Yy");

/// sha256("global:resolve_pool")[0..8] — must match Anchor-generated discriminator for prediction_pool::resolve_pool
const RESOLVE_POOL_DISCRIMINATOR: [u8; 8] = [191, 164, 190, 142, 178, 198, 162, 249];

#[program]
pub mod payout {
    use super::*;

    /// Permissionless: forwards to `prediction_pool::resolve_pool` with the same accounts + remaining winner ATAs.
    pub fn resolve_goal<'info>(
        ctx: Context<'_, '_, '_, 'info, ResolveGoal<'info>>,
    ) -> Result<()> {
        let mut data = Vec::with_capacity(8);
        data.extend_from_slice(&RESOLVE_POOL_DISCRIMINATOR);

        let mut metas = vec![
            AccountMeta::new(ctx.accounts.savings_goal.key(), false),
            AccountMeta::new(ctx.accounts.prediction_pool.key(), false),
            AccountMeta::new(ctx.accounts.pool_vault.key(), false),
            AccountMeta::new(ctx.accounts.treasury.key(), false),
            AccountMeta::new_readonly(ctx.accounts.usdc_mint.key(), false),
            AccountMeta::new_readonly(ctx.accounts.savings_goal_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.prediction_pool_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
        ];
        for acc in ctx.remaining_accounts.iter() {
            metas.push(AccountMeta::new(acc.key(), false));
        }

        let ix = Instruction {
            program_id: ctx.accounts.prediction_pool_program.key(),
            accounts: metas,
            data,
        };

        let mut infos = vec![
            ctx.accounts.savings_goal.to_account_info(),
            ctx.accounts.prediction_pool.to_account_info(),
            ctx.accounts.pool_vault.to_account_info(),
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.usdc_mint.to_account_info(),
            ctx.accounts.savings_goal_program.to_account_info(),
            ctx.accounts.prediction_pool_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ];
        infos.extend(ctx.remaining_accounts.iter().cloned());

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
    #[account(mut, address = prediction_pool.vault)]
    pub pool_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub savings_goal_program: Program<'info, SavingsGoalProgram>,
    pub prediction_pool_program: Program<'info, PredictionPoolProgram>,
    pub token_program: Program<'info, Token>,
}
