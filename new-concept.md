# Rizq — Cursor Development Prompt

> **Rizq** | Shariah-Compliant Digital Kameti on Solana  
> Colosseum Frontier Hackathon 2026 | Superteam Pakistan Track  
> Version 1.0 | April 2026

---

## Project Overview

You are building **Rizq** — a Shariah-compliant digital committee (kameti/beesee) mobile app built on **Solana**. The app digitises the $5 billion informal savings group culture of Pakistan using trustless smart contracts (Anchor framework), USDC stablecoin, and an AI financial coach powered by the Anthropic Claude API.

The product has two interlocking components:

1. **Digital Committee (Kameti)** — A group of 2–50 people pool USDC contributions on a fixed schedule. One member receives the full pool each cycle in a pre-set order. Smart contracts hold all funds in escrow. Fully permissionless and trustless.
2. **Rizq AI Coach** — An on-chain-aware AI coach that speaks Urdu/English, sends weekly savings insights, answers committee-related questions, and builds a financial health score over time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile Frontend** | React Native (Expo) |
| **Blockchain** | Solana (Anchor framework, Devnet for development) |
| **Smart Contracts** | Three Anchor programs: `committee_vault`, `payout_schedule`, `safety_rules` |
| **Stablecoin** | USDC (SPL token) |
| **Wallet** | Phantom deeplink (external) + embedded Solana wallet (in-app) |
| **AI** | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| **Database** | Supabase (user profiles, AI chat history, off-chain metadata) |
| **Blockchain Events** | Helius webhooks (transaction detection, balance refresh) |
| **KYC** | Third-party CNIC verification API (Pakistani identity) |
| **Randomness** | Solana VRF (verifiable random function for lottery payout order) |
| **Price Feed** | CoinGecko API (live USDC/PKR rate) |
| **Notifications** | Push notifications (Expo Notifications) + SMS (for nominee alerts) |
| **Exports** | PDF + CSV generation (committee history) |

---

## Shariah Compliance Rules (Non-Negotiable)

These constraints must be respected in every feature you build:

- **No riba (interest):** Funds deposited and returned are the exact USDC amounts. The platform fee (1.0–1.5%) is a transparent service charge only.
- **No maysir (gambling):** No prediction markets, no staking on outcomes. The committee is a pure savings rotation with a defined schedule agreed by all members upfront.
- **No gharar (uncertainty):** Every member must know the contribution amount, payment schedule, payout order, and total pool size before joining. No hidden terms.
- **Zakat-compatible welfare pool:** Unclaimed nominee funds and voluntary opt-in platform fee percentages flow to a transparent on-chain welfare fund.

---

## Project Structure

```
rizq/
├── app/                        # React Native Expo app
│   ├── onboarding/             # Screens 01–12
│   ├── home/                   # Home Dashboard (H1–H6)
│   ├── committees/
│   │   ├── create/             # Create wizard (C1–C7)
│   │   ├── join/               # Join flow (J1–J4)
│   │   ├── member-dashboard/   # Member view (D1–D6)
│   │   └── manager-dashboard/  # Manager view (M1–M6)
│   ├── payments/               # Payment & payout (P1–P3, R1–R3)
│   ├── edge-cases/             # Edge case flows (E1–E12)
│   ├── ai-coach/               # Rizq AI (A1–A4)
│   ├── wallet/                 # Wallet screens (W1–W4)
│   ├── settings/               # Settings (S1–S11)
│   └── pro/                    # Rizq Pro upgrade (PR1–PR4)
├── programs/                   # Anchor smart contracts (Solana)
│   ├── committee_vault/
│   ├── payout_schedule/
│   └── safety_rules/
├── supabase/                   # Supabase schema, functions, RLS policies
├── api/                        # Claude AI backend integration
└── scripts/                    # Deployment, devnet setup scripts
```

---

## Section 1 — Onboarding (Screens 01–12)

Build a one-time onboarding flow. Progress is saved at every step so users can resume if interrupted.

**Screens 01–04: Introduction**
- `01` Splash screen: Rizq logo + tagline "Digital Kameti. On Solana." Auto-advances after 1.5 seconds.
- `02` Welcome slide 1: Two-sentence app explainer. Skip button top-right. Next arrow bottom-right.
- `03` Welcome slide 2: Explain how the committee works (group saves together, one person receives each cycle, no organiser can touch funds, all on blockchain).
- `04` Welcome slide 3: Explain the safety net (deceased member → nominee → welfare pool).

**Screens 05–08: Identity & KYC**
- `05` Phone number entry: Country code (+92 pre-selected, changeable). Pakistani mobile number field. Continue button.
- `06` OTP verification: 6-digit code input. Auto-reads SMS on Android. Resend link after 60-second cooldown. Edit phone link.
- `07` KYC screen (required): Full legal name, CNIC number (13 digits, formatted `XXXXX-XXXXXXX-X`), CNIC front photo upload, CNIC back photo upload, selfie liveness check. Note: "Required to join or create a committee. Stored securely and never shared."
- `08` KYC pending screen: Progress indicator. "You can explore the app while you wait." Continue to home — committee features locked until verified.

**Screens 09–10: Nominee & Wallet**
- `09` Nominee information: Nominee full legal name, phone number, CNIC, relationship (Spouse / Parent / Sibling / Child / Other). "Why this matters" expandable section. Can skip (incomplete badge shown until added).
- `10` Wallet setup: Two card options — (A) Connect Phantom (deeplink), (B) Create embedded wallet in-app. Single-sentence explainer: "Your USDC lives in your personal blockchain wallet — no one else can access it."

**Screens 11–12: Profile & Start**
- `11` Profile setup: Display name, optional profile photo, optional Rizq @username. Language preference: English / Urdu / Both.
- `12` Start screen: Three large cards — (A) Start a new committee, (B) Join a committee, (C) Explore first. All paths lead to the home dashboard.

---

## Section 2 — Home Dashboard (H1–H6)

The home dashboard is shown on every app open after onboarding. Bottom navigation bar: **Home / Committees / Rizq AI / Wallet / Profile**.

- `H1` Header: Rizq logo left, notification bell right with red badge (unread count).
- `H2` Balance card: Total USDC (large), PKR equivalent below (live CoinGecko rate, auto-refresh every 60 seconds). Sub-figures: Available / In committees / Pending payouts. Tap opens Wallet.
- `H3` Urgent actions card: Only shown if time-sensitive action exists (payment due in X days, payout ready to claim). Red or amber badge. Tap goes directly to relevant committee screen.
- `H4` Rizq AI coaching widget: First two lines of this week's AI message. Language adapts to user preference. Tap opens full AI Coach screen.
- `H5` My committees strip: Horizontal-scroll row of committee cards (name, type icon, current cycle, next payment due). Last card is "+" to create or join.
- `H6` Quick action buttons: Four icon+label buttons — Pay Now (if due), New Committee, Join Committee, Invite Friend. Greyed out if not applicable.
- **Empty state:** When no active committees, H5 replaced with full-width prompt card + two buttons (Create / Enter invite code).

---

## Section 3 — Committee (Kameti) Flows

### 3.1 Create Committee — Manager Flow (C1–C7)

A 6-step wizard. Auto-saved after each step. Smart contract only deployed on-chain at Step 6.

- `C1` My Committees tab: "Committees I manage" + "Committees I am a member of." Tap "+" to start wizard.
- `C2` Step 1 — Name & purpose: Committee name, optional description, purpose type (Hajj/Umrah, Wedding fund, Education, General savings, Custom).
- `C3` Step 2 — Contribution rules: Amount per member per cycle (USDC, min $5). Payment frequency (Weekly / Monthly / Bi-monthly / Quarterly / Custom day). Number of cycles = number of members (auto-linked with tooltip). Auto-preview of contribution and payout amounts.
- `C4` Step 3 — Member settings: Max members (2–50 slider). KYC required toggle (default: Yes). Nominee required toggle. Invite method (shareable link / phone number / Rizq @username).
- `C5` Step 4 — Payout order: Three options — (A) Manager sets order (drag-sort after members join), (B) Random lottery (Solana VRF), (C) First joined = first paid. Toggle: can the manager change order after launch? (Requires 2/3 member approval if unlocked.)
- `C6` Step 5 — Rules & safety: Late payment grace period (1 / 3 / 7 days). Action on missed payment after grace (Warning / Suspend payout turn / Remove). Penalty USDC goes to (No penalty / Redistribute to members / Rizq Welfare Pool). Community welfare opt-in (toggle to donate 0.5%–5% of this committee's platform fee to welfare pool).
- `C7` Step 6 — Review & launch: Full summary of all settings. Estimated payout per member shown prominently. "Launch Committee" button → Phantom wallet signing → deploy three Anchor programs (`committee_vault`, `payout_schedule`, `safety_rules`) on Solana devnet → shareable invite link generated.

### 3.2 Join Committee — Member Flow (J1–J4)

- `J1` Entry from invite link: Deep link opens app. Shows committee preview (name, manager, contribution amount, frequency, assigned payout position, KYC/nominee requirements). If not registered, directs to onboarding first.
- `J2` Rules review: Full rules in plain language. Checkbox: "I have read and understood the rules." Cannot proceed without checking.
- `J3` KYC & nominee check: If either is required and not done, redirect to respective flow.
- `J4` Confirm join: Shows first contribution due date. Confirm → Phantom signs → member registered in smart contract on-chain. Notification sent to manager.

### 3.3 Committee Dashboard — Member View (D1–D6)

- `D1` Header: Committee name, type icon, cycle badge ("Cycle 3 of 10"), payout position ("You receive in Month 5 — 62 days away"). Status badge (green/amber/red).
- `D2` My contribution status: Next payment amount, due date, days remaining, "Pay Now" button. If paid: green check with timestamp and Solana Explorer link.
- `D3` Pool status: Total USDC in committee vault (live on-chain). Progress bar of how full this cycle's pool is (X of Y members paid).
- `D4` Members list: Avatar + name cards. Green check = paid. Clock = pending within grace. Red = overdue. Gray = future cycle. Tap to see member's payment history.
- `D5` Payout schedule: Full list of payout turns with dates. Completed turns show green check + date paid. Your row highlighted.
- `D6` Transaction history: Every on-chain event (contributions, payouts, penalties, member changes). Each row: type, amount, date, Solana Explorer link.

### 3.4 Committee Dashboard — Manager View (M1–M6)

Manager sees everything in D1–D6 plus:

- `M1` Manager panel: Header "Manager controls." Visible only to committee creator.
- `M2` Payment status grid: All members × all cycles matrix. Cells: paid (green) / pending (amber) / overdue (red) / future (gray). Tap cell to view payment or send reminder.
- `M3` Send announcement: Text field to message all members simultaneously. Delivered as push notification + stored in committee chat.
- `M4` Member actions: Tap any member → View payment history / Send reminder / Flag as left voluntarily / Flag as deceased (requires CNIC confirmation) / Remove from committee (with confirmation and consequences warning).
- `M5` Payout order management: Drag-and-drop reorder if manager-controlled and unlocked. Changes requiring approval send an approval request to all members — shows approval status per member.
- `M6` Emergency controls: "Pause committee" (stops new contributions and payouts, funds remain in escrow). "Export full history" (PDF + CSV).

---

## Section 4 — Payment & Payout Screens (P1–P3, R1–R3)

### Making a Contribution
- `P1` Pay contribution screen: Committee name, this cycle's fixed amount, current wallet balance, due date. "Pay $X USDC" → Phantom deeplink → on-chain transfer to committee vault. Confirmation with Solana Explorer link. Push notification to manager.
- `P2` Late payment screen (within grace): Amber warning with days remaining before suspension. Pay button still functional.
- `P3` Overdue screen (grace expired): Red warning. Payout turn suspended. Pay button still present. "Contact manager" button below.

### Receiving a Payout
- `R1` Payout notification: Push notification with payout amount. Opens claim screen.
- `R2` Payout claim screen: Large celebration visual. Amount breakdown: Gross pool / Platform fee (1.0–1.5%) / Net to you. "Claim $X USDC" → Phantom signs → USDC transferred to wallet. Confirmation with Solana Explorer link.
- `R3` Post-payout screen: Balance updated. Running totals (contributed total, received today). Remaining cycles shown. Share milestone card option (image export with Rizq branding for WhatsApp/Instagram).

---

## Section 5 — Edge Case Flows (E1–E12)

These are Rizq's most important differentiator. Implement all of them.

### Missed Payment (E1–E3)
- `E1` Day 1 overdue: Automated push to member ("pay within X days to avoid suspension"). Manager notified. Yellow flag in manager grid.
- `E2` Grace period expiry: Member gets red alert. Manager gets decision prompt with three options (Extend grace / Suspend payout turn / Remove). All actions logged on-chain.
- `E3` Suspension state: Red banner on member's dashboard. Pay button still active. After paying, "Request reinstatement" button appears. Manager approves/rejects.

### Member Left Voluntarily (E4–E5)
- `E4` Leave request: Warning shows contributed amount and consequences (future turns forfeited, future deposits refunded minus deductions). Requires typing "CONFIRM" to proceed.
- `E5` Leave confirmed — settlement: Future payout slots removed. Future-cycle USDC returned to wallet. Remaining cycles recalculated. Manager notified. Committee continues.

### Member Deceased — Nominee Process (E6–E9)
- `E6` Manager marks as deceased: Requires entering deceased member's CNIC for confirmation. Irreversible confirmation dialog. Funds held in escrow. Nominee contacted.
- `E7` Nominee notification: SMS + in-app message sent to nominee phone number (in both Urdu and English). 30-day claim window begins.
- `E8` Nominee claim flow: If not a Rizq user, guided registration. Shows amount and source. Identity verified against CNIC on file. "Claim funds" → Phantom signs → USDC to nominee wallet. Audit log stored on-chain.
- `E9` Unclaimed funds: Automated reminders at Day 7, 14, and 25. If unclaimed at Day 30 → auto-transfer to Rizq Welfare Pool smart contract. On-chain transaction recorded. Manager notified. Transfer is permanent and publicly visible.

### Welfare Pool Transparency (E10)
- `E10` Welfare pool screen: Total USDC in pool (live on-chain). Source breakdown (nominee funds / platform fee opt-ins / penalties). Distribution log (all outgoing transfers with category, amount, date, on-chain proof). Link to wallet on Solana Explorer. Toggle to opt your own platform fee into the pool.

### Manager Removal by Group Vote (E11–E12)
- `E11` Vote to remove manager: Any member can initiate. Requires 2/3 of active members. One vote per wallet address. Live vote status shown.
- `E12` Manager removed — autonomous mode: Manager access revoked. Smart contract continues running autonomously (payout schedule proceeds as programmed). New manager can be elected by a second majority vote. All funds remain in escrow. No human can halt or redirect the committee.

---

## Section 6 — Rizq AI Coach (A1–A4)

Powered by the **Anthropic Claude API**. Every message is generated fresh with live on-chain context injected. Response time must be under 3 seconds. Bilingual: English / Urdu / mixed (Hinglish) based on user preference.

**Claude API integration:**
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You are Rizq AI, a warm and knowledgeable financial coach for Pakistani users. 
You speak in a natural Urdu/English mix unless the user prefers English only.
You have full context of the user's committee memberships, contribution history, 
upcoming payout dates, wallet balance, and the live PKR/USDC rate.
You are Shariah-compliant and never suggest riba-based products.
Keep responses friendly, brief, and actionable.

User context: ${JSON.stringify(userOnChainContext)}`,
    messages: conversationHistory
  })
});
```

**Screens:**
- `A1` Rizq AI main tab: Weekly coaching message (full text, large readable font). "Committee health summary" status indicators for each active committee (on track / payment due / overdue). Chat input at the bottom. Suggested prompts: "When is my next committee payment?" / "How much will I receive this cycle?" / "Am I on track with my Hajj goal?"
- `A2` AI chat screen: Full conversational chat interface. User on-chain context injected into every request. Message history stored in Supabase.
- `A3` Sample weekly message format: Warm, bilingual, committee-specific. References current cycle, PKR rate context, and personal goal (e.g. Hajj). See app flow doc for full example.
- `A4` Rizq Score screen: Score 0–1000. Factors: on-time payments (major weight), committees completed, nominee info complete, account age. Score history graph (12 months). Explanation of scoring factors. Future use note (shareable with employers/landlords). Share score card button with Rizq branding.

---

## Section 7 — Wallet Screens (W1–W4)

- `W1` Wallet main: USDC balance (large, prominent). PKR equivalent below (live, auto-refreshes every 60 seconds). Balance breakdown: Available / Locked in committee vaults / Pending payouts. Deposit and Send buttons. Full transaction history.
- `W2` Deposit USDC: Solana wallet address as QR code + copyable text. Exchange instructions (Binance / OKX / Kraken). "I have sent it" button — polls Helius webhook for incoming transaction and refreshes balance.
- `W3` Transaction history: Filterable list (All / Contributions / Payouts / Deposits / Withdrawals). Each row: type icon, name, amount (±), date/time. Tap to open detail.
- `W4` Transaction detail: Type, amount, timestamp, committee name, cycle number, from/to wallet addresses, Solana transaction hash, Solana Explorer link. Label: "This is your on-chain proof of payment."

---

## Section 8 — Settings Screens (S1–S11)

- `S1` Settings main: Grouped sections — Account / Identity & Safety / Wallet / Notifications / App Preferences / Community / Support / About.
- `S2` Account — profile: Edit display name, photo, @username. View wallet address (read-only). Delete account (requires typing "DELETE").
- `S3` Identity — KYC status: Verified (green) / Pending (amber) / Rejected (red). CNIC masked. Document thumbnails. If rejected: rejection reason + Resubmit button.
- `S4` Identity — nominee: Current nominee details (masked CNIC). Edit / Remove buttons. Warning on removal: "Without a nominee, your savings will go to the Rizq Welfare Pool."
- `S5` Wallet management: Connected wallets (Phantom / embedded). Set primary payout wallet. Add / disconnect wallet with active-committee warning.
- `S6` Notifications: Granular toggles (payment due with advance warning preference, payout available, missed payment [manager only], new member [manager only], AI coaching message, welfare pool activity, system announcements). Delivery time preference (8am / 7pm).
- `S7` App preferences: Language (English / Urdu / Mixed). AI coach language. Currency display (USDC / USDC+PKR / PKR). Theme (Light / Dark / System).
- `S8` Community — welfare pool: Link to E10 transparency screen. Opt-in for donating % of platform fees. History of personal contributions to pool.
- `S9` Security: 4 or 6-digit PIN. Biometric login (Face ID / fingerprint). Auto-lock timer (immediately / 1 min / 5 min). Require biometric/PIN for every USDC movement.
- `S10` Support: WhatsApp support button. Email. In-app ticket form. FAQ search. "Report a committee dispute" fast-track button (committee details pre-filled).
- `S11` About & legal: App version, What is Rizq, Privacy policy, Terms of service, Shariah compliance note, GitHub link to open-source Anchor programs.

---

## Section 9 — Rizq Pro (PR1–PR4)

Freemium model. Free tier is fully functional for small to medium committees.

**Platform fee:** 1.5% (Free) / 1.0% (Pro) deducted automatically by smart contract at payout time.

**Fee allocation:** 70% operating costs → 20% Rizq Welfare Pool → 10% Rizq treasury.

**Rizq Pro pricing:** $4.99/month or $44.99/year. Payable in USDC from in-app wallet. No bank card required.

**Key Pro limits unlocked:**
- Committee creation: 2 active (Free) → Unlimited (Pro)
- Committee size: 10 members (Free) → 50 members (Pro)
- Contribution amount: Up to $100/cycle (Free) → Unlimited (Pro)
- AI coach: Weekly message only (Free) → Full chat + daily insights (Pro)
- AI language: English only (Free) → English + Urdu + Hinglish (Pro)
- Export: Not available (Free) → PDF + CSV (Pro)
- Support: 48h standard (Free) → 4h WhatsApp priority (Pro)

**Screens:**
- `PR1` Upgrade prompt (contextual): Shown when free user hits a Pro limit. Two options: "Upgrade now" / keep at current limit.
- `PR2` Pro landing screen: Full Free vs Pro comparison table. Monthly/Annual toggle ("Save 25%" badge on annual). "Subscribe with USDC" button.
- `PR3` Pro payment confirmation: "Rizq Pro activated." Receipt with next renewal date. Pro badge on profile. All features unlocked immediately.
- `PR4` Renewal & cancellation: Auto-renews from USDC wallet. 7-day advance push notification. 7-day grace period if balance insufficient. Cancel in settings — Pro remains active until end of billing period.

---

## Smart Contract Architecture (Anchor Programs)

### Program 1: `committee_vault`
- Holds all USDC contributions in escrow per committee
- Accepts contributions from verified member wallet addresses only
- Releases payout to the scheduled recipient for the current cycle
- Applies platform fee (1.0% or 1.5%) before payout
- Emits events for every deposit and withdrawal (consumed by Helius webhooks)

### Program 2: `payout_schedule`
- Stores the ordered list of member wallet addresses
- Tracks which cycle is current
- Determines who receives the payout this cycle
- Supports three ordering methods: manager-set, Solana VRF lottery, first-joined order
- Can be updated with 2/3 member approval (if unlocked at committee creation)

### Program 3: `safety_rules`
- Tracks payment status per member per cycle
- Enforces grace period countdown
- Handles suspension logic (suspends payout turn on grace expiry)
- Handles voluntary leave settlement (future contributions returned, future payout slots removed)
- Handles deceased member flow (locks funds in escrow, triggers nominee notification)
- Handles unclaimed nominee funds (auto-transfers to welfare pool at Day 30)
- Handles 2/3 manager removal vote and autonomous committee continuation
- All actions are logged as on-chain transactions

### Welfare Pool Contract
- Receives unclaimed nominee funds, voluntary opt-in fees, and removal penalties
- All distributions are publicly visible on Solana Explorer
- No admin key can withdraw without governance approval

---

## Supabase Schema (Off-Chain Data)

```sql
-- Users (off-chain profile data)
users (id, phone, display_name, username, language_pref, kyc_status, kyc_submitted_at, profile_photo_url, wallet_address, created_at)

-- Nominees
nominees (id, user_id, full_name, phone, cnic, relationship, created_at)

-- Committees (metadata only — financial data is on-chain)
committees (id, on_chain_address, name, description, purpose_type, created_by, created_at, status)

-- Committee members
committee_members (id, committee_id, user_id, wallet_address, joined_at, payout_position, status)

-- AI chat history
ai_conversations (id, user_id, messages jsonb, created_at, updated_at)

-- Rizq Score history
rizq_scores (id, user_id, score, calculated_at, breakdown jsonb)

-- Notifications
notifications (id, user_id, type, title, body, read, committee_id, created_at)
```

---

## Key Implementation Notes

1. **KYC gating:** All committee features (create, join, contribute, receive payout) must be locked until KYC is verified. Check `users.kyc_status = 'verified'` before allowing any committee action.

2. **Phantom deeplink pattern:** Use the standard Phantom mobile deeplink (`https://phantom.app/ul/v1/signTransaction`) for all on-chain transaction signing. The embedded wallet uses `@solana/web3.js` directly.

3. **Helius webhook setup:** Register webhooks for the committee vault program address. On receiving a deposit event, refresh the member's contribution status and the pool progress bar in real time.

4. **Claude API context injection:** For every AI chat message, inject the following on-chain context into the system prompt:
   - Active committees (name, cycle, payout position, days to payout)
   - Contribution history (paid/missed per cycle per committee)
   - Wallet balance (available, locked, pending)
   - Live PKR/USDC rate
   - User's language preference

5. **Bilingual text:** All user-facing strings must have Urdu translations. Store translations in a `i18n` directory. The AI coach handles bilingual responses natively via the Claude API.

6. **Solana VRF for lottery:** Use Switchboard VRF (available on Solana) to generate verifiable randomness for lottery payout order. The randomness request and fulfillment are both on-chain and publicly verifiable.

7. **Deep link structure:**
   - Committee invite: `rizq://join/{committee_on_chain_address}`
   - Nominee claim: `rizq://claim/{committee_on_chain_address}/{nominee_claim_token}`

8. **Security:** Every USDC movement must require biometric or PIN confirmation (configurable in S9). Never store private keys — use Phantom deeplink or the secure enclave for embedded wallet key management.

9. **Platform fee deduction:** Fee is applied by the `committee_vault` program at payout time, not at contribution time. The payout screen must show the fee breakdown clearly (Gross pool / Platform fee / Net to you) before the user signs.

10. **Error handling:** All Solana transaction failures must surface clearly to the user with a retry option and the failure reason. Never silently fail a payment.

---

## Screen Map Reference (57 Total Screens)

| Code | Section | Screen name |
|---|---|---|
| 01–04 | Onboarding | Splash, Welcome ×3 |
| 05–08 | Onboarding | Phone, OTP, KYC, KYC pending |
| 09–12 | Onboarding | Nominee, Wallet setup, Profile, Start path |
| H1–H6 | Home | Header, Balance, Urgent actions, AI widget, Committees strip, Quick actions |
| C1–C7 | Create committee | Entry, Steps 1–6 wizard |
| J1–J4 | Join committee | Invite link, Rules, KYC check, Confirm join |
| D1–D6 | Member dashboard | Header, My contribution, Pool status, Members, Payout schedule, Tx history |
| M1–M6 | Manager dashboard | Panel, Payment grid, Announcement, Member actions, Order management, Emergency |
| P1–P3 | Payment | Pay contribution, Late payment, Overdue |
| R1–R3 | Payout | Notification, Claim, Post-payout |
| E1–E3 | Edge: missed payment | Warning, Grace expiry, Suspension |
| E4–E5 | Edge: left voluntarily | Leave request, Settlement |
| E6–E9 | Edge: deceased member | Manager action, Nominee notification, Claim flow, Unclaimed→welfare |
| E10 | Edge: welfare pool | Transparency screen |
| E11–E12 | Edge: manager removal | Vote, Autonomous mode |
| A1–A4 | Rizq AI | Main tab, Chat, Sample message, Rizq Score |
| W1–W4 | Wallet | Main, Deposit, Tx history, Tx detail |
| S1–S11 | Settings | Profile, KYC, Nominee, Wallet mgmt, Notifications, Preferences, Community, Security, Support, About, Legal |
| PR1–PR4 | Rizq Pro | Upgrade prompt, Landing, Payment confirmation, Renewal |

---

## Revenue Model Summary

| Tier | Platform Fee | Price |
|---|---|---|
| Free | 1.5% per payout cycle | Free forever |
| Rizq Pro | 1.0% per payout cycle | $4.99/mo or $44.99/yr |

**Fee allocation:** 70% ops → 20% welfare pool → 10% treasury (all on-chain).

**Year 1 target:** 5,000 active users, 800 committees, ~$6,100/month revenue.
**Year 3 target:** 100,000 active users, 16,000 committees, ~$194,000/month revenue.

---

> Built for the Colosseum Frontier Hackathon 2026 | Superteam Pakistan Track  
> Shariah-compliant · On Solana · Pakistan  
> *"Rizq is built on the oldest savings tradition in South Asia — the community circle of trust. Blockchain makes that trust verifiable. AI makes it personal. The nominee system makes it just."*