# Rizq Monorepo

Rizq is an AI-powered social savings + prediction market app on Solana.

This repository contains all core projects in one publishable monorepo:

- `rizq/` — Anchor smart contracts (`savings_goal`, `prediction_pool`, `payout`)
- `rizq-backend/` — Node.js + Express API (Prisma ORM + Neon PostgreSQL)
- `rizq-app/` — React Native mobile app

---

## Repository Structure

```text
rizqapp/
├─ rizq/               # Solana programs + Anchor tests
├─ rizq-backend/       # API server, Prisma schema, coaching job
├─ rizq-app/           # React Native app
├─ DESIGN.md
├─ UI-ENHANCEMENTS.md
└─ README.md
```

---

## Tech Stack

- **Blockchain:** Solana + Anchor (Rust)
- **Backend:** Node.js, Express, Prisma, Neon PostgreSQL
- **Mobile:** React Native CLI, React Navigation, Zustand, React Query
- **AI:** Anthropic (weekly coaching generation)

---

## Prerequisites

- Node.js `>=22`
- npm
- Android Studio (for Android)
- Rust + Solana CLI + Anchor (for on-chain programs)
- Neon database URL (for backend)

---

## Quick Start (Local)

### 1) Backend

```bash
cd rizq-backend
npm install
cp .env.example .env
# set DATABASE_URL, ANTHROPIC_API_KEY, RPC/program IDs
npm run prisma:generate
npm run dev
```

Backend health check:

- `http://localhost:3000/health`

### 2) Mobile App

```bash
cd rizq-app
npm install
npm run android
```

Set app env in `rizq-app/.env`:

- `RIZQ_API_URL`
- `RIZQ_SOLANA_RPC_URL`
- `RIZQ_DAPP_URL`

> For Android emulator, local backend is typically `http://10.0.2.2:3000`.

### 3) Smart Contracts (optional for app UI testing)

```bash
cd rizq
npm install
anchor build
anchor test
```

---

## Core API Endpoints

- `GET /health`
- `POST /api/users/register`
- `GET /api/goals/wallet/:wallet`
- `POST /api/goals`
- `POST /api/goals/:id/stake`
- `GET /api/goals/:id/coaching`
- `GET /api/rates/pkr-usdc`

---

## Publish Checklist

Before publishing this repo:

1. Ensure no secrets are committed (`.env`, keys, credentials).
2. Keep `rizq-backend/.env.example` and `rizq-app/.env.example` updated.
3. Run:
   - `rizq-backend`: `npm run build`
   - `rizq-app`: `npm run lint` and app launch check
   - `rizq`: `anchor build`
4. Verify README commands work from a fresh clone.

---

## Documentation

- `DESIGN.md` — product + architecture baseline
- `UI-ENHANCEMENTS.md` — premium UI upgrade spec
- `rizq-app-tech-guide.md` — mobile technical guide
- `CLAUDE.md` — contributor/agent implementation context
