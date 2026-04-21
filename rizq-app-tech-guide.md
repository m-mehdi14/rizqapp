
Rizq
Save Together. Win Together. On Solana.

Technical Architecture & Development Guide
Colosseum Frontier Hackathon 2026  |  Superteam Pakistan Track
Version 1.0  |  April 2026

Document scope
This document is the complete technical reference for building Rizq: an AI-powered social savings and prediction market app on Solana. It covers smart contract design, AI agent integration, frontend development with React Native, backend API, infrastructure setup, a 5-week hackathon sprint roadmap, and the final submission checklist.
 
1. System Overview
Rizq is a consumer mobile application built on Solana that lets users set cultural savings goals (Eid, wedding, Hajj, education), invite friends to stake USDC on whether they will succeed, and receive weekly AI coaching in Urdu and English. Smart contracts hold all funds in escrow, resolve goals at the deadline, and automatically distribute winnings to the correct stakers. The platform charges a 1.5% fee on every prediction pool resolution.

1.1  Product loop
Step 1 — Set goal	User creates a SavingsGoal on-chain: target amount in USDC, deadline, and goal type (Eid / Wedding / Hajj / Custom).
Step 2 — Invite friends	App generates a shareable deep link. Friends open the link and stake USDC on yes (you will hit the goal) or no.
Step 3 — AI coaching	Every Sunday, the AI agent reads on-chain progress and sends a personalised coaching message in Urdu/English via push notification.
Step 4 — Goal resolves	At the deadline, the payout program checks whether current_amount >= target_amount and distributes stakes accordingly.
Step 5 — Share & grow	Goal completion generates a shareable achievement card. Friends recruit new users. The viral loop restarts.

1.2  Architecture layers
The system is organised into four layers that communicate strictly top-to-bottom:

Layer	Components
User layer	React Native app (Expo)  |  Phantom wallet deeplinks  |  Solana Mobile Stack
AI layer	Anthropic Claude API  |  Urdu/English NLP coaching  |  Weekly cron agent
Backend	Node.js + Express API  |  Supabase (PostgreSQL + Auth)  |  Expo Push Notifications  |  CoinGecko exchange rates
Blockchain	Solana Mainnet / Devnet  |  Anchor Programs (Rust)  |  USDC SPL Token  |  Helius RPC

1.3  Technology decisions
Solana	$0.00025 per tx and 400ms finality make micro-stakes viable. Users can bet as little as $1 without fees eating the returns.
Anchor (Rust)	Industry-standard Solana program framework. Provides IDL generation, account validation macros, and type-safe client libraries.
USDC (SPL Token)	Stablecoin denominated goals protect savers from PKR inflation. No PKR devaluation risk while the goal is in progress.
Anthropic Claude	Best-in-class language model for bilingual Urdu/English generation. Free tier sufficient for hackathon scale.
Expo (React Native)	Single codebase for iOS and Android. Expo push notifications handle coaching delivery without a separate messaging service.
Supabase	Managed PostgreSQL with real-time subscriptions, built-in auth, and a generous free tier. No DevOps needed for the hackathon.
Helius RPC	Enhanced Solana RPC with webhooks and transaction parsing. Free tier: 1M credits/month — more than enough for demo scale.
 
2. Smart Contract Architecture
Rizq uses three Anchor programs deployed on the Solana blockchain. All funds are held in program-controlled token accounts; the backend and frontend never touch private keys for escrow funds.

2.1  Environment setup
Install the full Solana development environment before writing any contract code.

# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 2. Install Solana CLI (v1.18+)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
solana --version

# 3. Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
anchor --version

# 4. Configure for devnet
solana config set --url https://api.devnet.solana.com
solana-keygen new --outfile ~/.config/solana/id.json
solana airdrop 2   # Get devnet SOL for deployment

# 5. Create workspace
anchor init rizq
cd rizq


2.2  Program: savings_goal
Account structure
The SavingsGoal account stores all state for one user's goal. It owns a USDC token account that holds the deposited funds.

// programs/savings_goal/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

declare_id!("GOAL_PROGRAM_ID_HERE");

#[account]
pub struct SavingsGoal {
    pub owner:           Pubkey,    // wallet that created the goal
    pub goal_name:       String,    // e.g. "Eid Outfit 2026"
    pub goal_type:       GoalType,  // Eid | Wedding | Hajj | Education | Custom
    pub target_amount:   u64,       // in USDC (6 decimals, so 1 USDC = 1_000_000)
    pub current_amount:  u64,       // total deposited so far
    pub deadline:        i64,       // Unix timestamp
    pub is_achieved:     bool,
    pub is_resolved:     bool,
    pub prediction_pool: Pubkey,    // linked PredictionPool address
    pub vault:           Pubkey,    // program-owned USDC token account
    pub bump:            u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GoalType {
    Eid,
    Wedding,
    Hajj,
    Education,
    Emergency,
    Custom,
}

impl SavingsGoal {
    pub const MAX_SIZE: usize = 8 + 32 + 4 + 64 + 1 + 8 + 8 + 8 + 1 + 1 + 32 + 32 + 1;
}


create_goal instruction

#[derive(Accounts)]
#[instruction(goal_name: String)]
pub struct CreateGoal<'info> {
    #[account(
        init,
        payer = owner,
        space = SavingsGoal::MAX_SIZE,
        seeds = [b"goal", owner.key().as_ref(), goal_name.as_bytes()],
        bump
    )]
    pub savings_goal: Account<'info, SavingsGoal>,

    #[account(
        init,
        payer = owner,
        token::mint = usdc_mint,
        token::authority = savings_goal,   // program owns the vault
    )]
    pub vault: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, token::Mint>,
    #[account(mut)] pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_goal(
    ctx: Context<CreateGoal>,
    goal_name: String,
    goal_type: GoalType,
    target_amount: u64,
    deadline: i64,
) -> Result<()> {
    let goal = &mut ctx.accounts.savings_goal;
    goal.owner          = ctx.accounts.owner.key();
    goal.goal_name      = goal_name;
    goal.goal_type      = goal_type;
    goal.target_amount  = target_amount;
    goal.current_amount = 0;
    goal.deadline       = deadline;
    goal.is_achieved    = false;
    goal.is_resolved    = false;
    goal.vault          = ctx.accounts.vault.key();
    goal.bump           = ctx.bumps.savings_goal;
    Ok(())
}


deposit_to_goal instruction

pub fn deposit_to_goal(ctx: Context<DepositGoal>, amount: u64) -> Result<()> {
    let goal = &mut ctx.accounts.savings_goal;
    require!(!goal.is_resolved, ErrorCode::GoalAlreadyResolved);
    require!(
        Clock::get()?.unix_timestamp < goal.deadline,
        ErrorCode::DeadlinePassed
    );
    // Transfer USDC from user wallet to program vault
    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from:      ctx.accounts.user_usdc_account.to_account_info(),
                to:        ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        amount,
    )?;
    goal.current_amount += amount;
    if goal.current_amount >= goal.target_amount {
        goal.is_achieved = true;
    }
    emit!(GoalDeposited { goal: goal.key(), amount, total: goal.current_amount });
    Ok(())
}


2.3  Program: prediction_pool
Account structure

// programs/prediction_pool/src/lib.rs

#[account]
pub struct PredictionPool {
    pub goal:          Pubkey,
    pub yes_stakers:   Vec<StakeEntry>,  // friends who believe
    pub no_stakers:    Vec<StakeEntry>,  // doubters
    pub total_yes:     u64,
    pub total_no:      u64,
    pub is_resolved:   bool,
    pub vault:         Pubkey,   // escrow for all stakes
    pub bump:          u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakeEntry {
    pub staker: Pubkey,
    pub amount: u64,
}

impl PredictionPool {
    // Space for up to 50 stakers each side
    pub const MAX_SIZE: usize = 8 + 32 + (4 + 50 * 40) + (4 + 50 * 40) + 8 + 8 + 1 + 32 + 1;
}


stake_on_goal instruction

pub fn stake_on_goal(
    ctx: Context<StakeGoal>,
    amount: u64,
    is_yes: bool,   // true = believing, false = doubting
) -> Result<()> {
    let pool = &mut ctx.accounts.prediction_pool;
    require!(!pool.is_resolved, ErrorCode::PoolResolved);
    require!(amount >= 1_000_000, ErrorCode::MinStakeNotMet);  // min $1 USDC

    // Transfer stake into pool vault
    transfer(/* ... CpiContext ... */, amount)?;

    let entry = StakeEntry { staker: ctx.accounts.staker.key(), amount };
    if is_yes {
        pool.yes_stakers.push(entry);
        pool.total_yes += amount;
    } else {
        pool.no_stakers.push(entry);
        pool.total_no += amount;
    }
    emit!(NewStake { pool: pool.key(), staker: ctx.accounts.staker.key(), amount, is_yes });
    Ok(())
}


2.4  Program: payout
resolve_goal instruction

// Called by anyone after deadline — permissionless resolution
pub fn resolve_goal(ctx: Context<ResolvePayout>) -> Result<()> {
    let goal = &ctx.accounts.savings_goal;
    let pool = &mut ctx.accounts.prediction_pool;

    require!(
        Clock::get()?.unix_timestamp >= goal.deadline,
        ErrorCode::DeadlineNotReached
    );
    require!(!pool.is_resolved, ErrorCode::PoolAlreadyResolved);

    let achieved = goal.current_amount >= goal.target_amount;
    let total_pool = pool.total_yes + pool.total_no;

    // Platform fee: 1.5% of total pool
    let platform_fee = total_pool * 150 / 10_000;
    let distributable = total_pool - platform_fee;

    let (winners, losers_total, winners_total) = if achieved {
        (&pool.yes_stakers, pool.total_no, pool.total_yes)
    } else {
        (&pool.no_stakers, pool.total_yes, pool.total_no)
    };

    // Each winner gets back their stake + pro-rata share of losers' pool
    for entry in winners.iter() {
        let winnings = if winners_total > 0 {
            entry.amount + (entry.amount * losers_total / winners_total)
        } else {
            entry.amount  // no one bet the other side, refund
        };
        let payout = std::cmp::min(winnings, distributable);
        // transfer payout to entry.staker ...
    }

    // Transfer platform fee to treasury
    // transfer(/* ... */, platform_fee)?;

    pool.is_resolved = true;
    emit!(GoalResolved { goal: goal.key(), achieved, platform_fee });
    Ok(())
}


2.5  Instructions reference
Instruction	Program	Description
create_goal	savings_goal	Initialise a new SavingsGoal PDA and program-owned vault token account.
deposit_to_goal	savings_goal	Transfer USDC from owner wallet to vault. Increments current_amount.
create_pool	prediction_pool	Initialise a PredictionPool linked to a SavingsGoal.
stake_on_goal	prediction_pool	Friend stakes USDC yes/no. Funds held in pool vault.
resolve_goal	payout	Permissionless. Checks deadline, distributes stakes, takes platform fee.
claim_winnings	payout	Each winner calls this to receive their payout after resolution.
 
3. AI Coaching Agent
The AI agent is the heart of Rizq's differentiation. It reads each user's on-chain savings data every Sunday, generates a personalised coaching message in natural Urdu/English, and delivers it via Expo push notification. The agent is implemented as a scheduled Node.js job calling the Anthropic Claude API.

3.1  Agent design principles
•	Personalised — every message references the user's specific goal name, progress percentage, days remaining, and how many friends are betting on them.
•	Bilingual — mixes English and Urdu naturally the way educated Pakistanis speak, not formal translations.
•	Actionable — one specific saving action per week, not generic advice.
•	Contextual — references PKR/USDC exchange rate to suggest optimal conversion timing.
•	Brief — maximum 80 words so it fits in a push notification preview.

3.2  System prompt engineering

// src/ai/coaching-agent.ts

function buildSystemPrompt(ctx: GoalContext): string {
  return `
You are Rizq, an AI savings coach for Pakistani users.
You write in a warm, encouraging voice mixing English and Urdu naturally
(the way educated Pakistanis actually speak — not formal translations).

User context:
- Goal: ${ctx.goalName} (${ctx.goalType})
- Target: $${ctx.targetUSDC} USDC by ${ctx.deadline}
- Progress: ${ctx.pct}% complete (${ctx.daysLeft} days left)
- Weekly deposit needed: $${ctx.weeklyNeeded} USDC
- Past goal completion rate: ${ctx.completionRate}%
- Current PKR/USDC rate: ${ctx.pkrRate}
- Friends betting YES: ${ctx.yesCount}  |  NO: ${ctx.noCount}
- Last week deposit: $${ctx.lastWeekDeposit} USDC

Rules:
1. Give ONE specific saving action for this week (not generic advice).
2. Reference the friends betting — it creates social accountability.
3. If PKR rate is above 280, suggest it is a good week to convert.
4. Maximum 80 words. Natural Urdu phrases welcome (yaar, bhai, theek hai).
5. Be honest — if the user is behind, say so directly but kindly.
6. Never mention competitors. Never give financial advice.
7. End with an encouraging one-liner in either language.
  `
}


3.3  Coaching job (weekly cron)

// src/jobs/weekly-coaching.ts
import Anthropic from '@anthropic-ai/sdk';
import cron from 'node-cron';
import { supabase } from '../db/client';
import { fetchGoalContext } from '../solana/goal-reader';
import { sendPush } from '../notifications/expo-push';

const client = new Anthropic();   // reads ANTHROPIC_API_KEY from env

async function generateCoaching(ctx: GoalContext): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: buildSystemPrompt(ctx),
    messages: [{ role: 'user', content: 'Generate my weekly coaching message.' }],
  });
  return (msg.content[0] as any).text;
}

// Every Sunday at 10:00am PKT (05:00 UTC)
cron.schedule('0 5 * * 0', async () => {
  console.log('[coaching-job] Starting weekly run...');
  const { data: goals } = await supabase
    .from('active_goals')
    .select('*')
    .eq('is_resolved', false);

  for (const goal of goals ?? []) {
    try {
      const ctx = await fetchGoalContext(goal);
      const message = await generateCoaching(ctx);
      await supabase.from('coaching_messages').insert({
        goal_id: goal.id,
        user_id: goal.owner,
        message,
        created_at: new Date().toISOString(),
      });
      await sendPush(goal.expo_push_token, 'Weekly Rizq update', message);
    } catch (err) {
      console.error(`[coaching-job] Failed for goal ${goal.id}:`, err);
    }
  }
  console.log('[coaching-job] Done.');
});


3.4  On-chain data reader
The agent reads goal data directly from Solana using the Anchor client — no trusted backend input is required.

// src/solana/goal-reader.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { HELIUS_RPC_URL, SAVINGS_GOAL_PROGRAM_ID } from '../config';

export async function fetchGoalContext(goalRow: GoalRow): Promise<GoalContext> {
  const connection = new Connection(HELIUS_RPC_URL, 'confirmed');
  const program = new Program(IDL, SAVINGS_GOAL_PROGRAM_ID, /* provider */);

  const goalPDA = new PublicKey(goalRow.pda_address);
  const goalAccount = await program.account.savingsGoal.fetch(goalPDA);

  const pkrRate = await fetchPkrRate();   // CoinGecko
  const daysLeft = Math.ceil(
    (goalAccount.deadline.toNumber() - Date.now() / 1000) / 86400
  );
  const pct = Math.round(
    (goalAccount.currentAmount.toNumber() / goalAccount.targetAmount.toNumber()) * 100
  );

  return {
    goalName: goalAccount.goalName,
    goalType: goalAccount.goalType,
    targetUSDC: goalAccount.targetAmount.toNumber() / 1_000_000,
    currentUSDC: goalAccount.currentAmount.toNumber() / 1_000_000,
    pct,
    daysLeft,
    pkrRate,
    weeklyNeeded: /* calc */ 0,
    completionRate: goalRow.historical_completion_rate,
    yesCount: goalRow.yes_count,
    noCount: goalRow.no_count,
    lastWeekDeposit: goalRow.last_week_deposit,
    expoToken: goalRow.expo_push_token,
  };
}


3.5  Sample AI output
Eid goal, 34% complete, 5 friends betting: Bhai, 34% ho gaya — solid progress! Your 5 friends are cheering you on (2 bet against you though, so prove them wrong). This week: skip one lunch out and deposit the difference. PKR rate is decent right now — if you have remittances coming, convert today. Aik step at a time, Eid pe khush rahein!
 
4. Backend API
The backend is a lightweight Node.js/Express server. Its only job is to serve as a bridge between the React Native app and Solana, provide AI coaching, and store user-specific data that does not belong on-chain (push tokens, historical stats, sharing metadata).

4.1  Project setup

mkdir rizq-backend && cd rizq-backend
npm init -y
npm install express @coral-xyz/anchor @solana/web3.js @solana/spl-token \
            @anthropic-ai/sdk @supabase/supabase-js node-cron cors dotenv
npm install -D typescript @types/node @types/express ts-node nodemon

# Directory structure
src/
  api/          # Express routes
  ai/           # Coaching agent
  solana/       # On-chain read helpers
  jobs/         # Cron jobs
  notifications/ # Expo push
  db/           # Supabase client
  config.ts
  index.ts


4.2  Database schema (Supabase/PostgreSQL)

-- users: stores Supabase auth users + Solana wallet
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT UNIQUE NOT NULL,
  username        TEXT,
  expo_push_token TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- goals: mirrors on-chain SavingsGoal for fast querying
CREATE TABLE goals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner                   UUID REFERENCES users(id),
  pda_address             TEXT UNIQUE NOT NULL,
  goal_name               TEXT NOT NULL,
  goal_type               TEXT NOT NULL,
  target_usdc             BIGINT NOT NULL,
  current_usdc            BIGINT DEFAULT 0,
  deadline                TIMESTAMPTZ NOT NULL,
  is_achieved             BOOLEAN DEFAULT false,
  is_resolved             BOOLEAN DEFAULT false,
  yes_count               INT DEFAULT 0,
  no_count                INT DEFAULT 0,
  historical_completion_rate FLOAT DEFAULT 100.0,
  last_week_deposit       BIGINT DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- coaching_messages: stores AI-generated messages
CREATE TABLE coaching_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID REFERENCES goals(id),
  user_id     UUID REFERENCES users(id),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- stakes: mirrors on-chain prediction pool
CREATE TABLE stakes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id         UUID REFERENCES goals(id),
  staker_wallet   TEXT NOT NULL,
  amount_usdc     BIGINT NOT NULL,
  is_yes          BOOLEAN NOT NULL,
  tx_signature    TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);


4.3  Key API endpoints
Method	Endpoint	Description
POST	/api/goals	Create goal record in DB after on-chain tx confirmed.
GET	/api/goals/:wallet	Fetch all active goals for a wallet address.
POST	/api/goals/:id/stake	Record a stake after on-chain confirmation. Updates yes/no counts.
GET	/api/goals/:id/coaching	Fetch latest AI coaching message for a goal.
GET	/api/goals/:id/pool	Return all stakers and amounts for a prediction pool.
POST	/api/users/register	Register user, store wallet + expo push token.
GET	/api/rates/pkr-usdc	Return current PKR/USDC rate from CoinGecko.
POST	/api/goals/:id/share	Generate shareable deep-link for a goal.
 
5. Frontend — React Native / Expo
The Rizq mobile app targets iOS and Android from a single TypeScript codebase using Expo. All blockchain interactions go through Phantom wallet deeplinks on mobile. The app uses Zustand for local state, React Query for server state, and Supabase real-time subscriptions for live goal updates.

5.1  Project setup

npx create-expo-app rizq-app --template expo-template-blank-typescript
cd rizq-app

# Core dependencies
npx expo install expo-linking expo-notifications expo-image
npm install @solana/web3.js @coral-xyz/anchor @solana/spl-token
npm install @supabase/supabase-js zustand @tanstack/react-query
npm install react-native-safe-area-context react-native-screens
npm install @react-navigation/native @react-navigation/stack

# Polyfills needed for Solana web3 in React Native
npm install react-native-get-random-values react-native-url-polyfill
npm install buffer


5.2  Phantom wallet integration
On mobile, Rizq uses Phantom's Universal Deeplink API. The app generates a keypair for encryption, sends the connection request, and handles the redirect with the user's public key.

// src/hooks/usePhantomWallet.ts
import * as Linking from 'expo-linking';
import { PublicKey } from '@solana/web3.js';
import { encodeBase58, decodeBase58 } from '@/utils/encoding';
import nacl from 'tweetnacl';

const PHANTOM_APP_URL = 'https://phantom.app/ul/v1';
const DAPP_URL = 'https://rizq.app';

export function usePhantomWallet() {
  const dappKeyPair = useMemo(() => nacl.box.keyPair(), []);

  const connect = async () => {
    const redirectUrl = Linking.createURL('/onConnect');
    const params = new URLSearchParams({
      app_url:                    DAPP_URL,
      redirect_link:              redirectUrl,
      dapp_encryption_public_key: encodeBase58(dappKeyPair.publicKey),
    });
    await Linking.openURL(`${PHANTOM_APP_URL}/connect?${params}`);
  };

  const handleDeepLink = ({ url }: { url: string }) => {
    const parsed = Linking.parse(url);
    if (parsed.path === '/onConnect') {
      // Decrypt phantom_encryption_public_key + data from query params
      // Store wallet public key in Zustand
    }
  };

  useEffect(() => {
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  return { connect };
}


5.3  Screen breakdown
Home / Dashboard	Active goals with USDC progress bars. Friend betting status (X believers, Y doubters). AI coaching card. Quick deposit button.
Create goal	Goal type selector (icon grid). Amount slider ($10–$10,000 USDC). Calendar deadline picker. Preview panel. Submit → Phantom deeplink → on-chain tx.
Goal detail	Full progress bar. Days remaining countdown. Friend staker list with amounts. Link to invite more friends. Deposit button.
Prediction pool	Yes/No positions visualised as a bar. Total pool size. Individual staker avatars. Stake button → Phantom deeplink → on-chain.
AI coaching	Full weekly message in large text. Chat interface to ask the AI follow-up questions (Claude API call). Goal health score indicator.
Wallet	USDC balance. PKR equivalent at current rate. Deposit (USDC in via exchange links). Transaction history from Helius API.
Goal complete	Celebration animation. Final stats (days taken, friends who bet right). Winnings breakdown. Shareable achievement card (image export). Start new goal CTA.
Share / Invite	Auto-generated deep link. WhatsApp / Telegram share sheet. QR code for in-person sharing. Preview of what the friend sees on open.

5.4  Global state (Zustand)

// src/store/useAppStore.ts
import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

interface AppState {
  wallet:       PublicKey | null;
  usdcBalance:  number;
  activeGoals:  Goal[];
  setWallet:    (wallet: PublicKey) => void;
  setBalance:   (balance: number) => void;
  addGoal:      (goal: Goal) => void;
  updateGoal:   (id: string, updates: Partial<Goal>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  wallet:      null,
  usdcBalance: 0,
  activeGoals: [],
  setWallet:   (wallet) => set({ wallet }),
  setBalance:  (usdcBalance) => set({ usdcBalance }),
  addGoal:     (goal) => set((s) => ({ activeGoals: [...s.activeGoals, goal] })),
  updateGoal:  (id, updates) => set((s) => ({
    activeGoals: s.activeGoals.map(g => g.id === id ? { ...g, ...updates } : g)
  })),
}));

 
6. Infrastructure & Configuration

6.1  Environment variables

# .env — backend
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
HELIUS_API_KEY=your-helius-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
SOLANA_NETWORK=devnet   # change to mainnet-beta for production
SAVINGS_GOAL_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
PREDICTION_POOL_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
PAYOUT_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
TREASURY_WALLET=YOUR_FEE_COLLECTION_WALLET
COINGECKO_API_KEY=your-key
PORT=3000

# .env — Expo app
EXPO_PUBLIC_API_URL=https://api.rizq.app
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=...


6.2  Deploying Anchor programs

# Build all programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show <PROGRAM_ID> --url devnet

# Update program IDs in declare_id!() and config
# Run anchor build again after updating IDs

# Generate TypeScript client types from IDL
anchor idl fetch <PROGRAM_ID> --provider.cluster devnet > rizq-idl.json


6.3  Helius webhooks
Helius webhooks notify the backend in real time when a deposit transaction is confirmed, so the database and push notifications update immediately without polling.

// Register webhook via Helius API (run once at startup)
const response = await fetch('https://api.helius.xyz/v0/webhooks?api-key=' + HELIUS_API_KEY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    webhookURL: 'https://api.rizq.app/webhooks/solana',
    transactionTypes: ['TRANSFER'],
    accountAddresses: [SAVINGS_GOAL_PROGRAM_ID, PREDICTION_POOL_PROGRAM_ID],
    webhookType: 'enhanced',
  })
});

// Handle incoming webhook in Express
app.post('/webhooks/solana', async (req, res) => {
  const { type, tokenTransfers } = req.body[0];
  if (type === 'TRANSFER') {
    // Parse which goal was deposited to and update DB
    await syncGoalFromChain(tokenTransfers);
  }
  res.sendStatus(200);
});

 
7. Testing

7.1  Smart contract tests (Anchor / Mocha)

// tests/savings_goal.ts
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { assert } from 'chai';

describe('savings_goal', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SavingsGoal as Program<SavingsGoal>;

  it('creates a goal', async () => {
    const [goalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('goal'), provider.wallet.publicKey.toBuffer(), Buffer.from('EidTest')],
      program.programId
    );
    await program.methods
      .createGoal('EidTest', { eid: {} }, new BN(100_000_000), new BN(deadline))
      .accounts({ savingsGoal: goalPDA, /* ... */ })
      .rpc();
    const goal = await program.account.savingsGoal.fetch(goalPDA);
    assert.equal(goal.goalName, 'EidTest');
    assert.equal(goal.targetAmount.toNumber(), 100_000_000);  // $100 USDC
  });

  it('deposits to goal', async () => { /* ... */ });
  it('rejects deposit after deadline', async () => { /* ... */ });
  it('resolves and distributes correctly', async () => { /* ... */ });
  it('refunds if no one bet the other side', async () => { /* ... */ });
});

# Run tests on local validator
anchor test


7.2  End-to-end demo flow
Run this full flow on devnet to verify the entire product works before recording the submission video.
1.	Create a wallet on devnet. Airdrop 2 SOL and get devnet USDC from spl-token-faucet.
2.	Open the app. Connect Phantom. Verify USDC balance shows.
3.	Create a goal: 'Eid Outfit', $50 USDC, deadline 30 days out. Confirm tx in Phantom.
4.	Copy the share link. Open on a second device (friend's wallet). Stake $5 yes.
5.	Deposit $50 USDC to the goal. Confirm tx. Verify progress bar shows 100%.
6.	Fast-forward deadline on devnet using clock override or wait. Call resolve_goal.
7.	Claim winnings from friend's wallet. Verify payout received.
8.	Check that platform treasury received 1.5% fee.
9.	Trigger weekly coaching job manually. Verify push notification delivered.
 
8. 5-Week Hackathon Roadmap
The hackathon runs from April 6 to May 11, 2026. This sprint plan targets a fully functional demo by May 7, leaving four days for video recording and submission polish.

Week 1  Apr 6–12  — Foundation
•	Install Solana CLI, Rust, Anchor CLI. Configure devnet keypair. Airdrop SOL.
•	Write and compile savings_goal program. Deploy to devnet. Verify with Anchor tests.
•	Bootstrap Expo app (npx create-expo-app). Add navigation, Zustand store.
•	Implement Phantom deeplink connect flow. Display wallet address on home screen.
•	Set up Supabase project. Create users and goals tables. Connect from backend.

Week 2  Apr 13–19  — Core product
•	Build Create Goal screen: goal type picker, amount slider, deadline calendar.
•	Wire up create_goal Anchor instruction through Phantom deeplink signing.
•	Goal Dashboard screen: fetch active goals from Supabase, display progress bars.
•	Implement deposit_to_goal instruction. Test USDC transfer on devnet.
•	Generate shareable deep link per goal. Implement Expo deep link handler.
•	Set up Helius webhook to sync on-chain deposits to Supabase in real time.

Week 3  Apr 20–26  — AI + predictions
•	Write and deploy prediction_pool program to devnet.
•	Build stake_on_goal instruction. Test yes/no staking with two devnet wallets.
•	Build Prediction Pool screen: staker list, yes/no bar, stake button.
•	Integrate Anthropic Claude API. Implement buildSystemPrompt and generateCoaching.
•	Set up weekly cron job. Test coaching generation with mock goal context.
•	Expo push notifications: register token on login, send coaching via cron.
•	Build AI Coaching screen in app to display weekly message and chat.

Week 4  Apr 27–May 3  — Resolution + polish
•	Write and deploy payout program. Implement resolve_goal and claim_winnings.
•	Build goal resolution flow in app: auto-detect when deadline passes, show result.
•	Goal Complete screen: animation, winnings breakdown, shareable achievement card.
•	Add CoinGecko PKR/USDC rate widget to wallet screen.
•	Full UI polish: goal type icons, progress animations, dark mode, empty states.
•	Add error handling throughout: failed txns, network errors, wallet disconnect.

Week 5  May 4–11  — Demo + submission
•	Run full end-to-end test on devnet. Fix any remaining bugs.
•	Record 3-minute pitch video: hook (30s), problem (30s), demo (90s), market (30s).
•	Record 2-minute technical demo: show real Solana txns, AI coaching, payout flow.
•	Write GitHub README: architecture diagram, setup instructions, program IDs.
•	Submit to Colosseum arena (colosseum.com/frontier) by May 11.
•	Submit separately to Superteam Pakistan local track on Superteam Earn.

9. Submission Checklist
Colosseum requires the following for a valid submission. Complete every item before May 11.

Required by Colosseum
10.	GitHub repository with all source code committed during the hackathon period (Apr 6–May 11).
11.	GitHub repository README with: project description, problem statement, how it works, setup instructions, deployed program IDs on devnet.
12.	3-minute video pitch deck: problem, solution, demo, market, business model, team.
13.	2-minute technical demo video: live app using real Solana devnet transactions.
14.	Colosseum arena submission form at colosseum.com/frontier — fill every field completely.

Recommended for Superteam Pakistan track
15.	Submit separately to Superteam Pakistan side track on superteam.fun/earn.
16.	Contact Superteam Pakistan manager before submission to confirm your team is registered.
17.	Attend any online demo day or BuildStation events hosted by Superteam Pakistan.

Pitch video structure (3 minutes)
0:00–0:20	Hook — one sentence that states the problem with emotion. Show a WhatsApp screenshot of a real kameti group.
0:20–0:50	Problem — Pakistan stats, $5B committees, no trust infrastructure, no cross-border option.
0:50–2:20	Product demo — live walkthrough: create goal, friend stakes, AI message in Urdu, goal resolves, payout.
2:20–2:40	Market — TAM $1T, Pakistan first, global south expansion (India, Nigeria, Indonesia).
2:40–3:00	Business model + team. End with the big vision line.

Final checks before submitting
•	All programs deployed on devnet with correct program IDs in the codebase.
•	Demo video shows real on-chain transactions (Solana Explorer links visible on screen).
•	AI coaching demo shows bilingual Urdu/English output — this is your differentiator.
•	GitHub repo has a clean commit history showing work was done during the hackathon.
•	Pitch video opens with the cultural savings insight — not a technical explanation.
•	Revenue model slide shows the 1.5% fee model — no token, no tokenomics.
•	Team section highlights Pakistan builder credibility and cultural context.

Key insight: The demo that wins is not the most technically complex — it is the one that makes judges feel the problem in the first 30 seconds. Start with the kameti WhatsApp screenshot. End with the global south vision. Everything else is in between.

Built for Colosseum Frontier Hackathon 2026  |  Superteam Pakistan Track
