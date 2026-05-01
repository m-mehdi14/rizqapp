use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

declare_id!("CDmiBaaZtT11r6ANAsv4gRVKqKeQdqVJdgcY2CZxUM7U");

pub const GOAL_NAME_MAX: usize = 64;

#[program]
pub mod savings_goal {
    use super::*;

    pub fn create_goal(
        ctx: Context<CreateGoal>,
        goal_name: String,
        goal_type: GoalType,
        target_amount: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(goal_name.len() <= GOAL_NAME_MAX, ErrorCode::GoalNameTooLong);
        require!(target_amount > 0, ErrorCode::InvalidAmount);

        let goal = &mut ctx.accounts.savings_goal;
        goal.owner = ctx.accounts.owner.key();
        goal.goal_name = goal_name;
        goal.goal_type = goal_type;
        goal.target_amount = target_amount;
        goal.current_amount = 0;
        goal.deadline = deadline;
        goal.is_achieved = false;
        goal.is_resolved = false;
        goal.prediction_pool = Pubkey::default();
        goal.vault = ctx.accounts.vault.key();
        goal.bump = ctx.bumps.savings_goal;

        emit!(GoalCreated {
            goal: goal.key(),
            owner: goal.owner,
        });
        Ok(())
    }

    pub fn deposit_to_goal(ctx: Context<DepositGoal>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        let goal = &mut ctx.accounts.savings_goal;
        require!(!goal.is_resolved, ErrorCode::GoalAlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp < goal.deadline,
            ErrorCode::DeadlinePassed
        );

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;

        goal.current_amount = goal
            .current_amount
            .checked_add(amount)
            .ok_or(ErrorCode::AmountOverflow)?;
        if goal.current_amount >= goal.target_amount {
            goal.is_achieved = true;
        }

        emit!(GoalDeposited {
            goal: goal.key(),
            amount,
            total: goal.current_amount,
        });
        Ok(())
    }

    /// Owner links a created prediction pool PDA to this goal (called after pool init).
    pub fn link_prediction_pool(ctx: Context<LinkPredictionPool>) -> Result<()> {
        let goal = &mut ctx.accounts.savings_goal;
        require!(
            goal.prediction_pool == Pubkey::default(),
            ErrorCode::PoolAlreadyLinked
        );
        goal.prediction_pool = ctx.accounts.prediction_pool.key();
        Ok(())
    }

    /// Called via CPI from `prediction_pool` only (pool PDA must sign).
    pub fn mark_resolved(ctx: Context<MarkResolved>) -> Result<()> {
        let goal = &mut ctx.accounts.savings_goal;
        require!(!goal.is_resolved, ErrorCode::GoalAlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp >= goal.deadline,
            ErrorCode::DeadlineNotReached
        );
        let (expected_pool, _bump) = Pubkey::find_program_address(
            &[b"pool", goal.key().as_ref()],
            &ctx.accounts.prediction_pool_program.key(),
        );
        require_keys_eq!(ctx.accounts.pool_authority.key(), expected_pool);
        goal.is_resolved = true;
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GoalType {
    Eid,
    Wedding,
    Hajj,
    Education,
    Emergency,
    Custom,
}

#[account]
#[derive(InitSpace)]
pub struct SavingsGoal {
    pub owner: Pubkey,
    #[max_len(64)]
    pub goal_name: String,
    pub goal_type: GoalType,
    pub target_amount: u64,
    pub current_amount: u64,
    pub deadline: i64,
    pub is_achieved: bool,
    pub is_resolved: bool,
    pub prediction_pool: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(goal_name: String)]
pub struct CreateGoal<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + SavingsGoal::INIT_SPACE,
        seeds = [b"goal", owner.key().as_ref(), goal_name.as_bytes()],
        bump
    )]
    pub savings_goal: Account<'info, SavingsGoal>,

    #[account(
        init,
        payer = owner,
        token::mint = usdc_mint,
        token::authority = savings_goal,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositGoal<'info> {
    #[account(mut, has_one = owner, has_one = vault)]
    pub savings_goal: Account<'info, SavingsGoal>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct LinkPredictionPool<'info> {
    #[account(mut, has_one = owner)]
    pub savings_goal: Account<'info, SavingsGoal>,
    pub owner: Signer<'info>,
    /// CHECK: prediction pool PDA verified off-chain / by caller
    pub prediction_pool: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MarkResolved<'info> {
    #[account(mut)]
    pub savings_goal: Account<'info, SavingsGoal>,
    /// CHECK: Must be the prediction pool PDA for this goal; validated in `mark_resolved` via
    /// `Pubkey::find_program_address` with seeds `[b"pool", savings_goal.key()]` and `prediction_pool_program`.
    #[account(signer)]
    pub pool_authority: AccountInfo<'info>,
    /// CHECK: prediction_pool program id used for PDA derivation
    pub prediction_pool_program: AccountInfo<'info>,
}

#[event]
pub struct GoalCreated {
    pub goal: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct GoalDeposited {
    pub goal: Pubkey,
    pub amount: u64,
    pub total: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Goal name too long")]
    GoalNameTooLong,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Goal already resolved")]
    GoalAlreadyResolved,
    #[msg("Deposit after deadline")]
    DeadlinePassed,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Pool already linked")]
    PoolAlreadyLinked,
    #[msg("Deadline not reached")]
    DeadlineNotReached,
}
