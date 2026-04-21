use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use savings_goal::program::SavingsGoal as SavingsGoalProgram;
use savings_goal::{self, SavingsGoal};

declare_id!("BT3W76giGrD5PkR55UE78KPdxpHFWp8a5iHZgzBvLQJK");

pub const MIN_STAKE: u64 = 1_000_000;
pub const MAX_STAKERS_PER_SIDE: usize = 50;

#[program]
pub mod prediction_pool {
    use super::*;

    pub fn create_pool(ctx: Context<CreatePool>) -> Result<()> {
        let goal = &ctx.accounts.savings_goal;
        require!(
            goal.prediction_pool == Pubkey::default(),
            ErrorCode::GoalAlreadyHasPool
        );
        require!(
            ctx.accounts.owner.key() == goal.owner,
            ErrorCode::Unauthorized
        );

        let savings_goal_ai = ctx.accounts.savings_goal.to_account_info();
        let owner_ai = ctx.accounts.owner.to_account_info();
        let prediction_pool_ai = ctx.accounts.pool.to_account_info();
        let savings_goal_program_ai = ctx.accounts.savings_goal_program.to_account_info();

        let pool = &mut ctx.accounts.pool;
        pool.goal = goal.key();
        pool.yes_stakers = Vec::new();
        pool.no_stakers = Vec::new();
        pool.total_yes = 0;
        pool.total_no = 0;
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

        emit!(PoolCreated {
            pool: pool.key(),
            goal: pool.goal,
        });
        Ok(())
    }

    pub fn stake_on_goal(ctx: Context<StakeGoal>, amount: u64, is_yes: bool) -> Result<()> {
        require!(amount >= MIN_STAKE, ErrorCode::MinStakeNotMet);
        let pool = &mut ctx.accounts.prediction_pool;
        require!(!pool.is_resolved, ErrorCode::PoolResolved);

        let goal = &ctx.accounts.savings_goal;
        require!(
            Clock::get()?.unix_timestamp < goal.deadline,
            ErrorCode::StakeAfterDeadline
        );

        if is_yes {
            require!(
                pool.yes_stakers.len() < MAX_STAKERS_PER_SIDE,
                ErrorCode::SideFull
            );
        } else {
            require!(
                pool.no_stakers.len() < MAX_STAKERS_PER_SIDE,
                ErrorCode::SideFull
            );
        }

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staker_usdc.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                    authority: ctx.accounts.staker.to_account_info(),
                },
            ),
            amount,
        )?;

        let entry = StakeEntry {
            staker: ctx.accounts.staker.key(),
            amount,
        };
        if is_yes {
            pool.yes_stakers.push(entry);
            pool.total_yes = pool
                .total_yes
                .checked_add(amount)
                .ok_or(ErrorCode::AmountOverflow)?;
        } else {
            pool.no_stakers.push(entry);
            pool.total_no = pool
                .total_no
                .checked_add(amount)
                .ok_or(ErrorCode::AmountOverflow)?;
        }

        emit!(NewStake {
            pool: pool.key(),
            staker: ctx.accounts.staker.key(),
            amount,
            is_yes,
        });
        Ok(())
    }

    /// Permissionless resolution after goal deadline. Pass winner ATAs in `remaining_accounts`
    /// in the same order as the winning `StakeEntry` list (yes side if achieved else no side).
    pub fn resolve_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, ResolvePool<'info>>,
    ) -> Result<()> {
        require!(
            !ctx.accounts.prediction_pool.is_resolved,
            ErrorCode::PoolResolved
        );

        let goal = &ctx.accounts.savings_goal;
        require!(
            Clock::get()?.unix_timestamp >= goal.deadline,
            ErrorCode::DeadlineNotReached
        );

        let achieved = goal.current_amount >= goal.target_amount;
        let total_pool = ctx
            .accounts
            .prediction_pool
            .total_yes
            .checked_add(ctx.accounts.prediction_pool.total_no)
            .ok_or(ErrorCode::AmountOverflow)?;

        let platform_fee = total_pool
            .checked_mul(150)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(ErrorCode::AmountOverflow)?;
        let distributable = total_pool
            .checked_sub(platform_fee)
            .ok_or(ErrorCode::AmountOverflow)?;

        let (winners, losers_total, winners_total) = if achieved {
            (
                ctx.accounts.prediction_pool.yes_stakers.clone(),
                ctx.accounts.prediction_pool.total_no,
                ctx.accounts.prediction_pool.total_yes,
            )
        } else {
            (
                ctx.accounts.prediction_pool.no_stakers.clone(),
                ctx.accounts.prediction_pool.total_yes,
                ctx.accounts.prediction_pool.total_no,
            )
        };

        require_eq!(
            ctx.remaining_accounts.len(),
            winners.len(),
            ErrorCode::WrongRemainingAccounts
        );

        let goal_key = ctx.accounts.prediction_pool.goal;
        let bump = ctx.accounts.prediction_pool.bump;
        let pool_ai = ctx.accounts.prediction_pool.to_account_info();
        let pool_seeds: &[&[u8]] = &[b"pool", goal_key.as_ref(), &[bump]];
        let signer_seeds: &[&[&[u8]]] = &[pool_seeds];

        let pool_vault_ai = ctx.accounts.pool_vault.to_account_info();
        let treasury_ai = ctx.accounts.treasury.to_account_info();
        let token_program_ai = ctx.accounts.token_program.to_account_info();
        let usdc_mint_key = ctx.accounts.usdc_mint.key();

        let winner_ais: Vec<AccountInfo> = ctx.remaining_accounts[..winners.len()].to_vec();

        if platform_fee > 0 {
            transfer(
                CpiContext::new_with_signer(
                    token_program_ai.clone(),
                    Transfer {
                        from: pool_vault_ai.clone(),
                        to: treasury_ai.clone(),
                        authority: pool_ai.clone(),
                    },
                    signer_seeds,
                ),
                platform_fee,
            )?;
        }

        let mut remaining = distributable;
        for (i, entry) in winners.iter().enumerate() {
            let dest_ai = winner_ais[i].clone();
            {
                let mut data: &[u8] = &dest_ai.try_borrow_data()?;
                let dest = TokenAccount::try_deserialize(&mut data)?;
                require!(dest.mint == usdc_mint_key, ErrorCode::BadMint);
                require!(dest.owner == entry.staker, ErrorCode::BadWinnerAta);
            }

            let winnings: u64 = if winners_total > 0 {
                let w = (entry.amount as u128)
                    .checked_add(
                        (entry.amount as u128)
                            .checked_mul(losers_total as u128)
                            .and_then(|x| x.checked_div(winners_total as u128))
                            .ok_or(ErrorCode::AmountOverflow)?,
                    )
                    .ok_or(ErrorCode::AmountOverflow)?;
                u64::try_from(w).map_err(|_| error!(ErrorCode::AmountOverflow))?
            } else {
                entry.amount
            };

            let payout = std::cmp::min(winnings, remaining);
            if payout == 0 {
                continue;
            }
            remaining = remaining
                .checked_sub(payout)
                .ok_or(ErrorCode::AmountOverflow)?;

            transfer(
                CpiContext::new_with_signer(
                    token_program_ai.clone(),
                    Transfer {
                        from: pool_vault_ai.clone(),
                        to: dest_ai,
                        authority: pool_ai.clone(),
                    },
                    signer_seeds,
                ),
                payout,
            )?;
        }

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

        emit!(GoalResolved {
            pool: pool.key(),
            achieved,
            platform_fee,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct StakeEntry {
    pub staker: Pubkey,
    pub amount: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PredictionPool {
    pub goal: Pubkey,
    #[max_len(50)]
    pub yes_stakers: Vec<StakeEntry>,
    #[max_len(50)]
    pub no_stakers: Vec<StakeEntry>,
    pub total_yes: u64,
    pub total_no: u64,
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
pub struct StakeGoal<'info> {
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
    pub staker_usdc: Account<'info, TokenAccount>,
    pub staker: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolvePool<'info> {
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
    pub treasury: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    pub savings_goal_program: Program<'info, SavingsGoalProgram>,
    /// CHECK: must be this program's id (used in savings_goal PDA check)
    #[account(address = crate::ID)]
    pub prediction_pool_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub goal: Pubkey,
}

#[event]
pub struct NewStake {
    pub pool: Pubkey,
    pub staker: Pubkey,
    pub amount: u64,
    pub is_yes: bool,
}

#[event]
pub struct GoalResolved {
    pub pool: Pubkey,
    pub achieved: bool,
    pub platform_fee: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Goal already linked to a pool")]
    GoalAlreadyHasPool,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Minimum stake not met")]
    MinStakeNotMet,
    #[msg("Pool already resolved")]
    PoolResolved,
    #[msg("Cannot stake after goal deadline")]
    StakeAfterDeadline,
    #[msg("Side is full")]
    SideFull,
    #[msg("Amount overflow")]
    AmountOverflow,
    #[msg("Deadline not reached")]
    DeadlineNotReached,
    #[msg("Remaining winner ATAs must match winners count")]
    WrongRemainingAccounts,
    #[msg("Winner ATA mint mismatch")]
    BadMint,
    #[msg("Winner ATA owner mismatch")]
    BadWinnerAta,
}
