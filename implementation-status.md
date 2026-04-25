# Rizq implementation status (React Native + NeonDB)

This report aligns the current repository against `full-app-prompt.md` with your constraints:
- React Native (no Expo dependency assumptions)
- NeonDB (no Supabase dependency assumptions)
- Shariah-compliant committee product (no prediction/staking behavior)

## Frontend (rizq-app)

### Already implemented / mostly present
- Core navigation shell with auth flow, tab flow, committee flow, AI, wallet, and profile stacks.
- Committee create wizard screens and join wizard screens.
- Committee dashboard component suite (`committeeDashboard/components/*`).
- Home screen and major section components (`home/components/*`).
- AI screens, wallet screens, payment screens, profile/settings entry screens.
- Zustand global app store and API client integration for backend calls.

### Needs upgrade to match prompt exactly
- Existing data layer still maps to `goals` semantics in parts of app state/API client.
- Some prompt paths are Router-style while app currently uses React Navigation stack structure.
- Push registration and token naming still need unification with `device_push_token`.
- Remaining edge flows need full backend wiring (nominee notify, welfare transfer, committee contract export).
- Legacy screens have now been converted to committee semantics (no prediction/betting copy), with compatibility aliases left in place while final route cleanup is pending.

## Backend (rizq-backend)

### Already implemented / now upgraded
- Existing Express server, health route, rates route, background weekly scheduler.
- Added committee-first API endpoints:
  - `POST /api/auth/verify-kyc`
  - `POST /api/ai/chat`
  - `POST /api/ai/coaching/generate`
  - `POST /api/committees/:id/announce`
  - `GET /api/committees/:id/contract`
  - `GET /api/committees/:id/reactnativert` (typo-compatible alias)
  - `POST /api/nominees/notify`
  - `POST /api/welfare/transfer`
- Weekly coaching job migrated to committee-member iteration model.
- AI coaching prompt refocused to committee contributions (removed betting/prediction framing).
- Config now supports Neon/Helius-style env aliases.
- Added Neon schema at `rizq-backend/neondb/schema.sql`.
- Prisma schema upgraded to committee-first typed models (`Committee`, `CommitteeMember`, `Nominee`, `WelfareTransfer`) while preserving old goal models for compatibility.
- New committee APIs and weekly coaching paths now use typed Prisma queries instead of raw SQL.
- Added committee transaction persistence and sync:
  - `CommitteeContribution` / `CommitteePayout` Prisma + Neon tables.
  - Backend endpoints for contribution create, payout claim, and committee history.
  - Solana webhook sync now normalizes committee contribution/payout events and writes them to NeonDB.

### Needs upgrade
- Old `goals` endpoints are still present for backward compatibility and should be phased out.
- Push sending currently logs delivery attempts; production provider wiring (FCM/APNs) is still pending.
- Webhook handler currently logs payloads only; needs real chain-event-to-Neon sync.

## Blockchain (rizq Anchor workspace)

### Current status
- First committee refactor pass is now implemented:
  - `prediction_pool` models committee cycles (`create_pool`, `join_committee`, `pay_contribution`, `claim_cycle_payout`, `finalize_committee`).
  - `payout` forwards resolution to `prediction_pool::finalize_committee`.
  - `savings_goal` linkage is kept for compatibility in this phase.
- Rust workspace compiles successfully (`cargo check --manifest-path rizq/Cargo.toml`) with warnings only.

### Required upgrade direction
- Replace goal/prediction semantics with committee/account-cycle semantics:
  - Committee creation with cycle/frequency/member constraints.
  - Contribution escrow per cycle.
  - Deterministic payout order handling and claim flows.
  - Late payment and grace rule support.
  - Welfare transfer path for unclaimed payouts.
- Keep all amounts in USDC micro-units and enforce minimum contribution.
- Preserve permissionless verification and server-side non-custodial model.

## Suggested next implementation order
1. Introduce committee-first Prisma schema + migrations and switch new routes from raw SQL to typed Prisma.
2. Wire app API client/store from `goals` to `committees` entities.
3. Implement Solana webhook sync into committee/contribution tables.
4. Start Anchor committee program refactor from `prediction_pool` to `committee_pool`.
5. Add integration tests across app -> backend -> chain simulation.
