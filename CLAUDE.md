# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rizq is an AI-powered social savings and prediction market app on Solana, built for the Colosseum Frontier Hackathon 2026 (Superteam Pakistan track). Users set cultural savings goals (Eid, wedding, Hajj), invite friends to stake USDC on whether they'll succeed, and receive weekly bilingual (Urdu/English) AI coaching. All funds are held in Anchor program-controlled escrow; the backend never touches private keys.

**Deadline: May 11, 2026** — currently in Week 3 (prediction pool + AI coaching).

## Monorepo Structure

The repo has three separate sub-projects, each initialized independently:

```
rizq/                      # Anchor workspace (Rust smart contracts)
  programs/
    savings_goal/src/lib.rs
    prediction_pool/src/lib.rs
    payout/src/lib.rs
  tests/                   # Anchor/Mocha TypeScript tests
  Anchor.toml
rizq-backend/              # Node.js + Express API
  src/
    api/        # Express routes
    ai/         # Claude coaching agent + system prompt
    solana/     # On-chain read helpers (goal-reader.ts)
    jobs/       # Cron jobs (weekly-coaching.ts)
    notifications/
    db/         # Supabase client
    config.ts
    index.ts
rizq-app/                  # React Native / Expo mobile app
  src/
    hooks/      # usePhantomWallet and other hooks
    store/      # Zustand global state (useAppStore.ts)
    screens/    # Dashboard, CreateGoal, GoalDetail, PredictionPool, AICoaching, Wallet, GoalComplete, Share
```

## Commands

### Smart Contracts (Anchor/Rust)
```bash
anchor build
anchor deploy --provider.cluster devnet
anchor test                          # runs Mocha tests on local validator
solana program show <PROGRAM_ID> --url devnet
anchor idl fetch <PROGRAM_ID> --provider.cluster devnet > rizq-idl.json
```

### Backend
```bash
cd rizq-backend
npm install
npm run dev      # nodemon + ts-node
```

### Frontend
```bash
cd rizq-app
npm install
npx expo start
```

## Architecture

### Four-Layer Stack (top-to-bottom only)
1. **User layer** — React Native/Expo app; all tx signing via Phantom deeplinks
2. **AI layer** — Anthropic Claude API called only from weekly Sunday cron job (`src/jobs/weekly-coaching.ts`)
3. **Backend** — Node.js/Express; caches off-chain data (push tokens, historical stats); syncs with chain via Helius webhooks (no polling)
4. **Blockchain** — Three Anchor programs holding all funds in PDAs

### Smart Contracts
- **savings_goal**: `SavingsGoal` PDA seeded with `[b"goal", owner_pubkey, goal_name]`; holds USDC vault token account
- **prediction_pool**: `PredictionPool` linked to a goal; tracks yes/no staker entries (max 50 each); holds stake escrow
- **payout**: Permissionless `resolve_goal` callable by anyone after deadline; distributes stakes, takes 1.5% platform fee to treasury

USDC uses 6 decimals: 1 USDC = `1_000_000` lamports. Minimum stake: `1_000_000` (1 USDC).

### AI Coaching
- Model: `claude-sonnet-4-20250514`, `max_tokens: 200`
- Reads on-chain data directly via Anchor client — no trusted backend input
- Output must be ≤80 words (fits push notification preview)
- Bilingual Urdu/English mixing (educated Pakistani register, not formal translation)
- System prompt context: goal progress %, days left, weekly deposit needed, PKR/USDC rate, friends' yes/no counts
- If PKR rate > 280, suggest converting remittances now

### Frontend State
- **Zustand** (`useAppStore`) — wallet, USDC balance, active goals list
- **React Query** — server state (API calls)
- **Supabase real-time** — live goal updates

### Database (Supabase/PostgreSQL)
Tables: `users` (wallet_address, expo_push_token), `goals` (mirrors on-chain + historical stats), `coaching_messages`, `stakes` (mirrors prediction pool).
The `goals` table is a read-optimized mirror; source of truth is always on-chain.

### Helius Webhooks
Register once at startup to listen on both program IDs for `TRANSFER` events. Webhook handler at `POST /webhooks/solana` updates Supabase immediately on tx confirmation.

## Environment Variables

Backend `.env`:
```
ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY,
HELIUS_API_KEY, HELIUS_RPC_URL, SOLANA_NETWORK,
SAVINGS_GOAL_PROGRAM_ID, PREDICTION_POOL_PROGRAM_ID, PAYOUT_PROGRAM_ID,
TREASURY_WALLET, COINGECKO_API_KEY, PORT=3000
```

Expo app `.env` (prefix `EXPO_PUBLIC_`):
```
EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL,
EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_HELIUS_RPC
```

## Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/goals` | Record goal after on-chain tx confirmed |
| GET | `/api/goals/:wallet` | Fetch active goals for wallet |
| POST | `/api/goals/:id/stake` | Record stake, update yes/no counts |
| GET | `/api/goals/:id/coaching` | Latest AI coaching message |
| GET | `/api/rates/pkr-usdc` | CoinGecko PKR/USDC rate |
| POST | `/api/users/register` | Store wallet + expo push token |

## Solana Polyfills (React Native)

`react-native-get-random-values`, `react-native-url-polyfill`, and `buffer` must be imported before any `@solana/web3.js` usage.
