# Rizq — Cursor Development Prompt
## Complete Build Instructions for AI-Assisted Development

---

## WHAT YOU ARE BUILDING

You are building **Rizq** — a Shariah-compliant digital committee (kameti/beesee) mobile app on Solana. It is a React Native / reactnative app that lets groups of 2–50 people pool USDC contributions on a fixed schedule, with one member receiving the full pool each cycle in a pre-agreed order. Smart contracts hold all funds in escrow — no human organiser can touch the pool. The app includes an AI coaching layer (Anthropic Claude API) that speaks to users in bilingual Urdu/English.

**No gambling. No prediction markets. No staking on outcomes. This is purely a Shariah-compliant rotating savings tool.**

---

## TECH STACK — USE EXACTLY THESE

```
Mobile:      React Native with reactnative (SDK 51+), TypeScript
Navigation:  reactnative Router (file-based routing)
State:       Zustand (global), React Query (server state)
Blockchain:  Solana Web3.js + @coral-xyz/anchor (Anchor client)
Wallet:      Phantom deeplink (mobile) + embedded wallet fallback
Token:       USDC SPL Token (6 decimals — 1 USDC = 1_000_000 units)
RPC:         Helius (free tier — 1M credits/month)
Backend:     Node.js + Express (separate repo or /backend folder)
Database:    neondb (PostgreSQL + Auth + Realtime)
AI:          Anthropic Claude API (claude-sonnet-4-20250514)
Push:        reactnative Push Notifications
Rates:       CoinGecko API (PKR/USDC live rate)
Styling:     NativeWind (Tailwind for React Native) + custom design tokens
```

---

## PROJECT STRUCTURE — CREATE THIS EXACTLY

```
rizq/
├── app/                          # reactnative Router screens
│   ├── (auth)/                   # Unauthenticated screens
│   │   ├── splash.tsx
│   │   ├── welcome.tsx           # 3-slide carousel
│   │   ├── phone.tsx
│   │   ├── otp.tsx
│   │   ├── kyc.tsx
│   │   ├── kyc-pending.tsx
│   │   ├── nominee.tsx
│   │   ├── wallet-setup.tsx
│   │   ├── profile-setup.tsx
│   │   └── start-path.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home dashboard
│   │   ├── committees.tsx        # My committees list
│   │   ├── ai.tsx                # Rizq AI coach
│   │   ├── wallet.tsx            # USDC wallet
│   │   └── profile.tsx           # Profile + settings entry
│   ├── committee/
│   │   ├── create/
│   │   │   ├── step-1.tsx        # Name + purpose
│   │   │   ├── step-2.tsx        # Contribution rules
│   │   │   ├── step-3.tsx        # Member settings
│   │   │   ├── step-4.tsx        # Payout order
│   │   │   ├── step-5.tsx        # Safety rules
│   │   │   └── step-6-review.tsx # Review + launch
│   │   ├── join/
│   │   │   ├── preview.tsx       # From invite link
│   │   │   ├── rules.tsx
│   │   │   ├── kyc-check.tsx
│   │   │   └── confirm.tsx
│   │   ├── [id]/
│   │   │   ├── index.tsx         # Member dashboard
│   │   │   ├── manager.tsx       # Manager dashboard
│   │   │   ├── pay.tsx           # Make contribution
│   │   │   ├── payout.tsx        # Claim payout
│   │   │   ├── members.tsx       # Members list
│   │   │   ├── schedule.tsx      # Payout schedule
│   │   │   └── history.tsx       # Transaction history
│   ├── edge/
│   │   ├── nominee-claim.tsx     # Nominee claiming funds
│   │   └── welfare-pool.tsx      # Welfare pool transparency
│   ├── ai/
│   │   ├── chat.tsx              # Full AI chat
│   │   └── rizq-score.tsx        # Rizq Score screen
│   ├── wallet/
│   │   ├── deposit.tsx
│   │   └── transaction/[id].tsx  # Transaction detail
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── profile.tsx
│   │   ├── kyc-status.tsx
│   │   ├── nominee.tsx
│   │   ├── wallet-management.tsx
│   │   ├── notifications.tsx
│   │   ├── preferences.tsx
│   │   ├── security.tsx
│   │   ├── community.tsx
│   │   ├── support.tsx
│   │   └── about.tsx
│   ├── pro/
│   │   ├── landing.tsx           # Pro upgrade screen
│   │   └── confirmation.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── StatusDot.tsx
│   │   ├── InfoBox.tsx
│   │   ├── SectionLabel.tsx
│   │   ├── ScreenHeader.tsx
│   │   └── LoadingSpinner.tsx
│   ├── committee/
│   │   ├── CommitteeCard.tsx
│   │   ├── MemberRow.tsx
│   │   ├── PayoutScheduleRow.tsx
│   │   ├── ContributionStatus.tsx
│   │   └── PoolProgress.tsx
│   ├── wallet/
│   │   ├── BalanceCard.tsx
│   │   ├── TransactionRow.tsx
│   │   └── PKRRate.tsx
│   └── ai/
│       ├── CoachingCard.tsx
│       └── ChatBubble.tsx
├── hooks/
│   ├── usePhantomWallet.ts
│   ├── useEmbeddedWallet.ts
│   ├── useUSDCBalance.ts
│   ├── useCommittee.ts
│   ├── useContributions.ts
│   ├── usePKRRate.ts
│   └── usePushNotifications.ts
├── store/
│   ├── useAppStore.ts            # Global Zustand store
│   ├── useWalletStore.ts
│   └── useCommitteeStore.ts
├── lib/
│   ├── solana/
│   │   ├── connection.ts         # Helius RPC connection
│   │   ├── programs.ts           # Anchor program clients
│   │   ├── committee.ts          # Committee program calls
│   │   ├── payout.ts             # Payout program calls
│   │   └── usdc.ts               # USDC token operations
│   ├── neondb/
│   │   ├── client.ts
│   │   ├── committees.ts
│   │   ├── members.ts
│   │   └── auth.ts
│   ├── ai/
│   │   └── coaching.ts           # Claude API calls
│   └── api/
│       └── client.ts             # Backend API client
├── constants/
│   ├── colors.ts                 # Design tokens
│   ├── config.ts                 # App config + env
│   └── programs.ts               # Solana program IDs
├── types/
│   ├── committee.ts
│   ├── member.ts
│   ├── transaction.ts
│   └── user.ts
└── utils/
    ├── format.ts                 # Currency + date formatters
    ├── validation.ts             # CNIC, phone validators
    └── solana.ts                 # PDA derivation helpers
```

---

## DESIGN SYSTEM — USE THESE EXACT TOKENS

```typescript
// constants/colors.ts
reactnativert const colors = {
  brand:     '#1D9E75',
  brandDark: '#085041',
  brandBg:   '#E1F5EE',
  purple:    '#534AB7',
  purpleBg:  '#EEEDFE',
  amber:     '#BA7517',
  amberBg:   '#FAEEDA',
  coral:     '#993C1D',
  coralBg:   '#FAECE7',
  success:   '#1D9E75',
  warning:   '#BA7517',
  danger:    '#E24B4A',
  text: {
    primary:   '#1A1A1A',
    secondary: '#5F5E5A',
    tertiary:  '#888780',
  },
  bg: {
    primary:   '#FFFFFF',
    secondary: '#F7FBF9',
    tertiary:  '#F1EFE8',
  },
  border:    '#CCCCCC',
};

// Typography
reactnativert const typography = {
  h1: { fontSize: 28, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '600' },
  h3: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  small: { fontSize: 14, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
};
```

**UI Rules:**
- Cards: white background, 1px border (#CCCCCC), border-radius 12px, padding 16px
- Buttons: brand green (#1D9E75) primary, full width, border-radius 10px, height 52px
- All monetary values: show in USDC with PKR equivalent in smaller gray text below
- Status colours: green = paid/complete, amber = pending/due soon, red = overdue/error
- Bottom tab bar: 5 tabs — Home, Committees, Rizq AI, Wallet, Profile

---

## ENVIRONMENT VARIABLES

```bash
# .env
reactnative_PUBLIC_neondb_URL=https://xxxx.neondb.co
reactnative_PUBLIC_neondb_ANON_KEY=eyJ...
reactnative_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
reactnative_PUBLIC_API_URL=https://api.rizq.app
reactnative_PUBLIC_SAVINGS_PROGRAM_ID=YOUR_ANCHOR_PROGRAM_ID
reactnative_PUBLIC_COMMITTEE_PROGRAM_ID=YOUR_ANCHOR_PROGRAM_ID
reactnative_PUBLIC_PAYOUT_PROGRAM_ID=YOUR_ANCHOR_PROGRAM_ID
reactnative_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
reactnative_PUBLIC_NETWORK=devnet
```

---

## neondb DATABASE SCHEMA

Run this SQL in neondb SQL editor before building:

```sql
-- Users
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address    TEXT UNIQUE NOT NULL,
  phone_number      TEXT UNIQUE,
  display_name      TEXT,
  username          TEXT UNIQUE,
  avatar_url        TEXT,
  language_pref     TEXT DEFAULT 'mixed',  -- 'english' | 'urdu' | 'mixed'
  reactnative_push_token   TEXT,
  kyc_status        TEXT DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
  kyc_rejected_reason TEXT,
  cnic_number       TEXT,
  is_pro            BOOLEAN DEFAULT false,
  pro_expires_at    TIMESTAMPTZ,
  rizq_score        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Nominees
CREATE TABLE nominees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone_number  TEXT NOT NULL,
  cnic_number   TEXT NOT NULL,
  relationship  TEXT NOT NULL,  -- 'spouse' | 'parent' | 'sibling' | 'child' | 'other'
  is_primary    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Committees
CREATE TABLE committees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  goal_type           TEXT NOT NULL,  -- 'hajj' | 'wedding' | 'education' | 'general' | 'custom'
  manager_id          UUID REFERENCES users(id),
  contribution_amount BIGINT NOT NULL,   -- in USDC micro-units (6 decimals)
  frequency           TEXT NOT NULL,     -- 'weekly' | 'monthly' | 'bi-monthly' | 'quarterly'
  max_members         INT NOT NULL DEFAULT 10,
  current_members     INT DEFAULT 0,
  total_cycles        INT NOT NULL,
  current_cycle       INT DEFAULT 0,
  payout_order_type   TEXT DEFAULT 'manager',  -- 'manager' | 'lottery' | 'joined'
  payout_order_locked BOOLEAN DEFAULT false,
  grace_period_days   INT DEFAULT 3,
  late_penalty_action TEXT DEFAULT 'warning',  -- 'warning' | 'suspend' | 'remove'
  penalty_goes_to     TEXT DEFAULT 'welfare',  -- 'none' | 'redistribute' | 'welfare'
  welfare_opt_in_pct  DECIMAL DEFAULT 0,
  kyc_required        BOOLEAN DEFAULT true,
  nominee_required    BOOLEAN DEFAULT false,
  status              TEXT DEFAULT 'forming',  -- 'forming' | 'active' | 'paused' | 'complete'
  pda_address         TEXT UNIQUE,             -- on-chain program address
  vault_address       TEXT,                    -- on-chain USDC vault
  invite_code         TEXT UNIQUE,
  platform_fee_pct    DECIMAL DEFAULT 1.5,
  next_cycle_date     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Committee members
CREATE TABLE committee_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id    UUID REFERENCES committees(id),
  user_id         UUID REFERENCES users(id),
  payout_position INT,              -- which cycle they receive (1 = first)
  joined_at       TIMESTAMPTZ DEFAULT now(),
  status          TEXT DEFAULT 'active',  -- 'active' | 'suspended' | 'left' | 'deceased'
  has_received    BOOLEAN DEFAULT false,
  received_at     TIMESTAMPTZ,
  received_amount BIGINT,
  UNIQUE(committee_id, user_id),
  UNIQUE(committee_id, payout_position)
);

-- Contributions
CREATE TABLE contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id    UUID REFERENCES committees(id),
  member_id       UUID REFERENCES committee_members(id),
  user_id         UUID REFERENCES users(id),
  cycle_number    INT NOT NULL,
  amount          BIGINT NOT NULL,
  paid_at         TIMESTAMPTZ DEFAULT now(),
  tx_signature    TEXT NOT NULL,    -- Solana tx hash
  is_late         BOOLEAN DEFAULT false,
  penalty_applied BIGINT DEFAULT 0
);

-- Payouts
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id    UUID REFERENCES committees(id),
  recipient_id    UUID REFERENCES users(id),
  cycle_number    INT NOT NULL,
  gross_amount    BIGINT NOT NULL,
  platform_fee    BIGINT NOT NULL,
  net_amount      BIGINT NOT NULL,
  claimed_at      TIMESTAMPTZ,
  tx_signature    TEXT,
  status          TEXT DEFAULT 'pending'  -- 'pending' | 'claimed'
);

-- Nominee claims
CREATE TABLE nominee_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deceased_user_id UUID REFERENCES users(id),
  nominee_id      UUID REFERENCES nominees(id),
  committee_id    UUID REFERENCES committees(id),
  amount          BIGINT NOT NULL,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'claimed' | 'expired' | 'welfare'
  notified_at     TIMESTAMPTZ DEFAULT now(),
  claimed_at      TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  tx_signature    TEXT
);

-- Welfare pool
CREATE TABLE welfare_pool_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,  -- 'unclaimed_nominee' | 'penalty' | 'opt_in_fee'
  source_id   UUID,
  amount      BIGINT NOT NULL,
  tx_signature TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- AI coaching messages
CREATE TABLE coaching_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  committee_id UUID REFERENCES committees(id),
  message     TEXT NOT NULL,
  language    TEXT DEFAULT 'mixed',
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## SCREEN-BY-SCREEN BUILD INSTRUCTIONS

### ONBOARDING FLOW

#### Screen: `app/(auth)/splash.tsx`
```
- Full screen with Rizq logo centered
- Tagline below: "Digital Kameti. On Solana."
- Green brand background (#1D9E75)
- White logo + text
- Auto-navigate to /welcome after 1500ms
- No interaction
```

#### Screen: `app/(auth)/welcome.tsx`
```
- 3-slide horizontal carousel (FlatList with pagingEnabled)
- Each slide:
  Slide 1: Title "What is Rizq?", body "A digital kameti — your group savings circle, now on blockchain. No one can touch the pool except the person whose turn it is."
  Slide 2: Title "How it works", body "Your group agrees on an amount and schedule. Every cycle, one member receives the full pool. Smart contracts guarantee the order."
  Slide 3: Title "Your family is protected", body "If a member passes away, their savings automatically go to their nominee. Unclaimed funds are donated to our transparent zakat welfare pool."
- Pagination dots at bottom
- Skip button top-right (goes to phone screen)
- Next button bottom-right, wraps to Continue on last slide
- Language: English text only on welcome slides
```

#### Screen: `app/(auth)/phone.tsx`
```
- Title: "Enter your phone number"
- Country code picker defaulting to +92 (Pakistan)
- Phone number input (numeric keyboard)
- Validation: Pakistani numbers are 10 digits after +92
- "Continue" button (disabled until valid number)
- On submit: call neondb Auth signInWithOtp({ phone })
- Show loading state on button during API call
- Error handling: show toast if number already registered differently
```

#### Screen: `app/(auth)/otp.tsx`
```
- Title: "Enter the code we sent to [phone number]"
- 6-digit OTP input (individual boxes, auto-advance on input)
- Auto-reads SMS on Android using reactnative-sms-reader
- "Resend code" link (disabled for 60s countdown, shows timer)
- "Edit number" link goes back to phone screen
- On complete: call neondb Auth verifyOtp({ phone, token, type: 'sms' })
- On success: navigate to /kyc
```

#### Screen: `app/(auth)/kyc.tsx`
```
- Title: "Verify your identity"
- Subtitle: "Required to join or create committees. Not stored on blockchain."
- Form fields:
  - Full legal name (text input)
  - CNIC number (formatted input: XXXXX-XXXXXXX-X, 13 digits)
  - CNIC front photo (ImagePicker, shows thumbnail after selection)
  - CNIC back photo (ImagePicker, shows thumbnail after selection)
  - Selfie / liveness check (Camera, shows thumbnail)
- "Submit for verification" button
- On submit: upload photos to neondb Storage, insert into users table with kyc_status='pending'
- Navigate to /kyc-pending
```

#### Screen: `app/(auth)/kyc-pending.tsx`
```
- Title: "Verification in progress"
- Animated progress indicator (circular, looping)
- Body: "Your identity is being verified. This usually takes 1–2 hours."
- "Continue to app" button (proceeds to nominee screen, committee features locked until verified)
- Check kyc_status on neondb real-time subscription — if changes to 'verified', show success toast and enable features
```

#### Screen: `app/(auth)/nominee.tsx`
```
- Title: "Add your nominee"
- Subtitle: "If you are unable to receive your payout, your nominee receives it."
- Info box (green background): "This is your family safety net. Without a nominee, unclaimed funds go to the community welfare pool."
- Form fields:
  - Nominee full legal name
  - Nominee phone number (+92 prefix)
  - Nominee CNIC number
  - Relationship picker: Spouse / Parent / Sibling / Child / Other
- "Save nominee" button (primary)
- "Skip for now" text link below (shows warning: "Your committee savings may go to welfare pool if unclaimed")
- Save to nominees table
```

#### Screen: `app/(auth)/wallet-setup.tsx`
```
- Title: "Set up your wallet"
- Subtitle: "Your USDC lives here. Only you control it."
- Two option cards:
  Card A: "Connect Phantom"
    - Phantom logo
    - "Already have a Solana wallet"
    - On tap: open Phantom deeplink for connection
  Card B: "Create wallet for me"
    - Key icon
    - "New to crypto — create one inside the app"
    - On tap: generate keypair using @solana/web3.js, encrypt with user PIN, store in SecureStore
- Brief explainer below: "Your USDC is stored in your personal blockchain wallet — no one else can access it, including Rizq."
```

#### Screen: `app/(auth)/profile-setup.tsx`
```
- Title: "Set up your profile"
- Avatar picker (camera or gallery, circular crop)
- Display name input (shown to committee members — not legal name)
- Rizq @username input (with availability check — debounced, green check or red X)
- Language preference picker:
  - English
  - اردو (Urdu)
  - Mixed (Urdu + English) — default
- "Complete setup" button
- Update users table with display_name, username, avatar_url, language_pref
```

#### Screen: `app/(auth)/start-path.tsx`
```
- Title: "What would you like to do?"
- Three large cards stacked vertically:
  Card 1 (brand green border):
    Icon: group of people
    Title: "Start a new committee"
    Body: "I want to organise a kameti for my group"
    → navigates to /committee/create/step-1

  Card 2:
    Icon: join symbol
    Title: "Join a committee"
    Body: "I received an invitation from someone"
    → navigates to /committee/join/preview (shows invite code entry)

  Card 3 (gray, smaller):
    Title: "Explore first"
    → navigates to /(tabs)/index
```

---

### HOME DASHBOARD — `app/(tabs)/index.tsx`

```
Component structure (ScrollView, no nesting scroll issues):

1. HEADER (not in scroll, fixed):
   - Rizq logo (left)
   - Notification bell with unread badge (right)
   - On bell tap: notification centre modal

2. BALANCE CARD:
   - Large USDC amount: "$247.50"
   - PKR equivalent: "≈ Rs 69,300" (smaller, gray, live rate)
   - Three row stats below divider:
     Available | In committees | Pending payouts
   - Tap card → navigates to /wallet
   - Card style: white, 1px border, border-radius 16, padding 20, full width

3. URGENT ACTIONS (only renders if data exists):
   - Red or amber background card
   - Text: "Committee contribution due in 2 days — $30 USDC"
   - Chevron right to navigate to relevant committee
   - If nothing urgent: this component does not render (no empty state here)

4. RIZQ AI WIDGET:
   - Card with small "Rizq AI" label badge (top-left, brand green pill)
   - First 2 lines of latest coaching message
   - "Read full message →" link
   - Tap → navigates to /ai

5. MY COMMITTEES (horizontal scroll):
   - Section header: "My Committees" + "See all" link
   - FlatList horizontal:
     Each CommitteeCard:
       - Committee name (bold)
       - Cycle badge: "Cycle 3 of 10"
       - Payment status (green check / amber clock / red alert)
       - Next due date (small, gray)
     Last card: green "+" card with "New Committee"
   - If empty: single card "Start or join a committee"

6. QUICK ACTIONS (2×2 grid):
   - Pay Now (only if something is due — primary green)
   - New Committee
   - Join Committee
   - Invite Friend
   - Each is icon + label, rounded square button
```

---

### COMMITTEES TAB — `app/(tabs)/committees.tsx`

```
- Two sections with section headers:
  
  "I MANAGE" section:
    - List of committees where user is manager
    - Each row: name, status badge, member count, next cycle date
    - Tap → /committee/[id]/manager

  "I AM A MEMBER" section:
    - List of committees where user is a regular member
    - Each row: name, manager name, my payment status, my payout month
    - Tap → /committee/[id]/index

- FAB button (bottom right): "+" 
  - On tap: bottom sheet with two options:
    "Create committee" → /committee/create/step-1
    "Join with code" → text input for invite code

- Empty state: large illustration, "No committees yet. Start one or ask to be invited."
```

---

### COMMITTEE CREATE WIZARD

Store wizard state in a single Zustand slice `useCreateCommitteeStore`. All steps write to this store. Only deployed on Step 6 confirmation.

#### `app/committee/create/step-1.tsx` — Name & Purpose
```
- Progress indicator: step 1 of 6 (dots or "1/6" text)
- Back button (top left)
- Title: "Name your committee"
- Committee name text input (required, 3–50 chars)
- Optional description textarea
- Goal type grid (tap to select, shows selected state):
  Icons + labels: Hajj/Umrah | Wedding | Education | General savings | Custom
- "Continue" button (disabled until name entered and goal type selected)
- Write to store: { name, description, goalType }
```

#### `app/committee/create/step-2.tsx` — Contribution Rules
```
- Title: "Set the contribution rules"
- Contribution amount input:
  - USDC amount (numeric)
  - PKR equivalent shown live below in gray
  - Minimum: $5 USDC (enforced)
  - Free tier maximum: $100 USDC per cycle (show lock icon + Pro prompt if exceeded)
- Frequency selector (segmented control or pill tabs):
  Weekly | Monthly | Bi-monthly | Quarterly | Custom
- Number of members slider: 2–10 (free) or 2–50 (Pro)
- Auto-calculated preview card (updates live):
  "Each member pays $X per cycle"
  "Each member receives $X × Y members = $Z on their turn"
- "Continue" button
- Write to store: { contributionAmount, frequency, maxMembers }
```

#### `app/committee/create/step-3.tsx` — Member Settings
```
- Title: "Member rules"
- Toggle: "KYC required for all members" (default ON)
- Toggle: "Nominee required for all members" (default OFF)
- Invite method (can select multiple):
  [x] Shareable link
  [ ] Add by phone number
  [ ] Add by Rizq @username
- Info text: "Members can only join if they meet these requirements"
- "Continue" button
- Write to store: { kycRequired, nomineeRequired, inviteMethods }
```

#### `app/committee/create/step-4.tsx` — Payout Order
```
- Title: "How is payout order decided?"
- Three large radio option cards:
  
  Option A: "I set the order"
    Body: "You drag-sort members after they join. You can change it later with member approval."
    
  Option B: "Random lottery"
    Body: "On-chain verifiable randomness decides the order at committee start. Fairest option."
    
  Option C: "First joined = first paid"
    Body: "Members who join earliest receive the pool first."

- Toggle below: "Allow order changes after launch?" 
  ON = requires 2/3 member approval to change
  OFF = locked forever

- "Continue" button
- Write to store: { payoutOrderType, payoutOrderLocked }
```

#### `app/committee/create/step-5.tsx` — Safety Rules
```
- Title: "Payment safety rules"
- Grace period picker: 1 day | 3 days | 7 days
- If missed after grace: segmented control
  Warning only | Suspend payout turn | Remove from committee
- Penalty funds go to (only if not 'warning only'):
  No penalty | Redistribute to members | Rizq Welfare Pool
- Welfare opt-in section:
  Toggle: "Donate % of platform fees to zakat welfare pool"
  If ON: slider 0.5% to 5%
  Small info box: "These funds go to a transparent on-chain welfare pool. You can see every transaction."
- "Continue" button
- Write to store: { gracePeriodDays, latePenaltyAction, penaltyGoesTo, welfareOptInPct }
```

#### `app/committee/create/step-6-review.tsx` — Review & Launch
```
- Title: "Review your committee"
- Summary card showing ALL settings:
  Name, goal type, contribution amount ($X USDC / Rs Y), frequency,
  max members, payout order, grace period, penalty rule, welfare opt-in
- Large highlighted box:
  "Each member will receive: $[contribution × members] USDC on their turn"
- "Launch Committee" button (large, brand green)
- On tap:
  1. Show loading modal "Deploying to Solana..."
  2. Call Anchor program to deploy committee_vault PDA
  3. Insert committee record in neondb with pda_address
  4. Generate invite_code (random 8 chars, stored in DB)
  5. Navigate to share screen (inline, not separate route):
     Shows: "Committee created! Share the invite link."
     Copy link button, WhatsApp share, Telegram share
     "Go to my committee" button → /committee/[id]/manager
```

---

### COMMITTEE JOIN FLOW

#### `app/committee/join/preview.tsx`
```
- Triggered by deep link: rizq://join/[invite_code]
  OR from manual code entry on committees tab
- Fetch committee data from neondb using invite_code
- Show preview card:
  Committee name (large)
  Manager: [display_name] (avatar + name)
  Contribution: $X USDC every [frequency]
  Your payout position: Month Y of Z
  KYC required: Yes/No badge
  Nominee required: Yes/No badge
- "Join this committee" button → /committee/join/rules
- "Not interested" link (goes back)
- If not logged in: "Sign up first" flow, returns here after
```

#### `app/committee/join/rules.tsx`
```
- Title: "Understand the rules"
- Plain language summary of the committee rules in a scrollable card
  Use this template:
  "You will pay $[amount] USDC every [frequency].
   Your payout is in Month [position] — you will receive $[total pool].
   If you miss a payment and do not pay within [grace] days, [penalty consequence].
   Leaving the committee means you lose your future payout turns."
- Checkbox at bottom: "I have read and understood the rules" (required)
- "I agree — continue" button (disabled until checkbox checked)
```

#### `app/committee/join/kyc-check.tsx`
```
- Check user's KYC status and nominee status
- If committee requires KYC and user is not verified:
  Show blocker: "This committee requires identity verification. Complete KYC to join."
  "Complete KYC" button → kyc flow, returns here
- If committee requires nominee and user has none:
  Show blocker: "This committee requires a nominee. Add one to join."
  "Add nominee" button → nominee settings, returns here
- If all requirements met: auto-advance to confirm screen
```

#### `app/committee/join/confirm.tsx`
```
- Title: "Confirm joining [committee name]"
- Summary: commitment amount, frequency, payout month
- First payment due date (calculated from committee's next_cycle_date)
- "Join committee" button → Phantom sign → on-chain member registration
  On success: insert into committee_members table
  Navigate to /committee/[id]/index with success toast
```

---

### COMMITTEE DASHBOARD — MEMBER VIEW
#### `app/committee/[id]/index.tsx`

```
Data to fetch on mount:
  - Committee record from neondb
  - Current user's committee_members record
  - All members with their payment status for current cycle
  - Contributions for this cycle
  - On-chain vault balance via Helius

Screen layout (ScrollView):

1. HEADER CARD:
   Committee name (large, bold)
   Goal type icon (small, color-coded)
   "Cycle [X] of [Y]" badge
   Your payout: "You receive in Month [Z] — [N] days away" (green if future, amber if this cycle, green "CLAIM NOW" if ready)

2. MY CONTRIBUTION STATUS (most prominent card):
   If NOT paid this cycle:
     Large: "Your contribution"
     Amount: "$30.00 USDC"
     Due date: "[Date] — X days remaining"
     "Pay Now" button (full width, primary green)
   If PAID this cycle:
     Green check icon
     "Paid — Cycle [X]"
     Amount paid, date paid, Solana Explorer link (small)

3. POOL STATUS:
   "This cycle's pool: $[X] of $[total]"
   Progress bar (green fill, rounded)
   "[N] of [M] members have paid"
   On-chain balance shown: "Verified on Solana"

4. MEMBERS LIST (horizontal scroll or vertical list with show/hide):
   Each member shown as avatar + name chip
   Green check = paid | amber clock = pending | red X = overdue
   Tap member chip → shows their payment history in a bottom sheet

5. PAYOUT SCHEDULE:
   List of all cycles:
   Month 1: [Member A] — [date] — ✓ Complete
   Month 2: [Member B] — [date] — ✓ Complete
   Month 3: [You] — [date] — 🔮 Upcoming (highlighted)
   Month 4+: [other members]
   Show 5 rows, "Show all" expands

6. RECENT TRANSACTIONS (last 5):
   Each: type icon, amount, date, member name
   "View all" → /committee/[id]/history
```

---

### COMMITTEE DASHBOARD — MANAGER VIEW
#### `app/committee/[id]/manager.tsx`

```
Shows everything in the member view PLUS a collapsible "Manager Panel" section:

MANAGER PANEL:

1. PAYMENT STATUS GRID:
   Table view: rows = members, columns = cycle numbers
   Each cell: green ✓ (paid) | amber ⏳ (pending) | red ✗ (overdue)
   Tap any cell → bottom sheet: payment detail + "Send reminder" button

2. SEND ANNOUNCEMENT:
   "Message all members" text area
   "Send" button → push notification to all members + stored in committee feed

3. MEMBER ACTIONS:
   Member list with action button per row
   On tap: bottom sheet with options:
     "View payment history" / "Send reminder" / 
     "Flag as left voluntarily" / "Flag as deceased" /
     "Suspend payout turn" / "Remove from committee"
   All destructive actions require confirmation dialog

4. PAYOUT ORDER (if not locked or if manager-type):
   DragSortableView of member names
   "Lock order" button (requires all members to have joined first)
   If locked: shows lock icon, "Unlock requires 2/3 member vote"

5. EMERGENCY CONTROLS (bottom, red section):
   "Pause committee" (amber) — modal confirmation required
   "reactnativert full history" (gray) — generates PDF via backend API
```

---

### PAYMENT SCREEN — `app/committee/[id]/pay.tsx`

```
- Header: "Pay your contribution"
- Committee name below header
- Large card showing:
  "Cycle [X] contribution"
  Amount: "$30.00 USDC" (large, bold)
  Due date, days remaining
- Your current wallet balance: "Available: $[X] USDC"
- If balance < contribution: show warning + "Deposit USDC" button
- If paying late but within grace:
  Amber warning banner: "This payment is late. No penalty yet — pay before [date]."
- If paying after grace period:
  Red banner: "Your payout turn is currently suspended. Paying now allows you to request reinstatement."
- "Pay $30.00 USDC" button (full width, primary):
  1. Open Phantom deeplink with transaction
  2. Transaction: transfer USDC from user wallet to committee vault PDA
  3. On confirmation: insert contributions record with tx_signature
  4. Update on-chain state via Anchor program
  5. Show success screen inline: "Paid! ✓ Solana Explorer [link]"
```

---

### PAYOUT CLAIM SCREEN — `app/committee/[id]/payout.tsx`

```
Triggered when: current_cycle === user's payout_position in committee_members

- Celebration animation (confetti or particle effect — use Lottie or React Native Reanimated)
- "It's your month! 🎉" heading
- Committee name
- Large amount: "You receive $[gross] USDC"
- Fee breakdown card:
  Gross pool:    $[gross]
  Platform fee:  -$[fee] (1.0% Pro / 1.5% Free)
  You receive:   $[net] (highlighted green)
- "Claim $[net] USDC" button:
  1. Call Anchor payout program — resolve_payout instruction
  2. USDC transferred to user wallet automatically
  3. Update payouts table with claimed_at + tx_signature
  4. Update committee_members has_received = true
- After claim: show "Received! ✓" with Solana Explorer link
- Share milestone card: "reactnativert achievement image" → generates shareable PNG with Rizq branding
- "Back to committee" button
```

---

### EDGE CASE: NOMINEE CLAIM — `app/edge/nominee-claim.tsx`

```
Access: via deep link sent to nominee phone number

- If nominee not a Rizq user: redirect to onboarding, return here after
- Show: "You have been nominated to receive funds"
- Deceased member name + relationship
- Committee name
- Amount available: "$[X] USDC"
- Claim window countdown: "X days remaining to claim"
- "Verify identity to claim" button:
  - Nominee must complete KYC with their own CNIC
  - Their CNIC is cross-checked against nominee_claims record
  - On match: "Claim funds" → Phantom sign → USDC transferred → nominee_claims updated
- If expired: "This claim has expired. Funds have been donated to the Rizq Welfare Pool."
```

---

### RIZQ AI SCREENS

#### `app/(tabs)/ai.tsx` — AI Coach Main Tab

```
Data: fetch latest coaching_message for current user, all active committees

- Header: "Rizq AI" + Pro badge if applicable
- Weekly message card (large, readable):
  Message text (full, not truncated)
  Date generated (small, gray)
  Auto-generated in user's language preference (English/Urdu/Mixed)
- Committee health summary:
  For each active committee: name + status indicator
  Green = on track | Amber = payment due soon | Red = overdue
- Chat input at bottom: "Ask Rizq anything..."
- Suggested prompt pills above input:
  "When is my next payment?" | "How much will I receive?" | "Am I behind?"
- Each suggestion tap: sends directly to chat
```

#### `app/ai/chat.tsx` — Full AI Chat

```
- Full screen chat interface
- Message bubbles: user (right, brand green) | AI (left, light gray)
- AI messages support bilingual text rendering (Urdu right-to-left wrapped in RTL container if detected)
- On send:
  1. Add user message to local state
  2. POST to backend /api/ai/chat with:
     { message, userId, committeeIds, walletBalance, language }
  3. Backend calls Claude API with full context:
     - All user's active committees and their status
     - Next payment dates and amounts
     - Current wallet balance
     - PKR/USDC rate
     - User's payout schedule
  4. Stream response back (or single response for simplicity)
  5. Store in coaching_messages table
- Show typing indicator while waiting
- Persist last 20 messages in neondb
- "Clear chat" option in top-right menu
```

#### System prompt for Claude (used in backend):

```
You are Rizq, an AI savings coach embedded in a Shariah-compliant 
digital committee app used by Pakistani users.

Speak warmly. Use the user's language preference:
- 'english': respond fully in English
- 'urdu': respond fully in Urdu (use Nastaliq-style Roman Urdu if not sure of rendering)
- 'mixed': mix naturally as educated Pakistanis speak — English with Urdu phrases

User's financial context:
- Active committees: {committeesSummary}
- Next payment due: {nextPaymentInfo}
- Current USDC balance: {balance}
- Upcoming payout: {payoutInfo}
- PKR/USDC rate today: {pkrRate}
- Rizq Score: {rizqScore}

Rules:
1. Only discuss the user's actual data — never make up numbers
2. Never suggest haram financial products (interest, gambling, speculation)
3. Always remind of prayer times for payments (e.g. "do it before Jummah")
4. Keep answers concise — under 120 words unless explaining something complex
5. For questions you cannot answer from context, say "I don't have that information — check the committee details screen"
6. Never give investment advice
```

#### `app/ai/rizq-score.tsx` — Rizq Score

```
- Score displayed as large number (0–1000) with colored ring
  0–299: red | 300–599: amber | 600–799: green | 800–1000: brand green with animation
- Score breakdown (tap each to see detail):
  Payments on time: X points
  Committees completed: X points
  Nominee added: X points
  Account age: X points
- History graph: line chart of score over last 6 months
- Info section: "Your Rizq Score is built from your on-chain payment history. It cannot be faked."
- Share button: "Share my score" → generates image card with name, score, and Rizq branding
```

---

### WALLET SCREENS

#### `app/(tabs)/wallet.tsx`
```
- Balance card (same as home but larger)
- Balance breakdown:
  Available to spend: $X USDC
  Locked in committees: $X USDC (sum of all vault contributions pending payout)
  Pending payouts: $X USDC (unclaimed payouts)
- Two action buttons: "Deposit USDC" | "Send USDC"
- Transaction list (React Query, paginated):
  Contribution to [committee]: -$X | [date]
  Payout received from [committee]: +$X | [date]
  Deposit: +$X | [date]
  Each has type icon, color-coded amount, date
- Pull to refresh
```

#### `app/wallet/deposit.tsx`
```
- "Add USDC to your wallet"
- Your Solana wallet address in a large QR code (reactnative-qrcode or react-native-qrcode-svg)
- Address text below QR (copyable, show checkmark on copy)
- Step-by-step instructions card:
  1. Go to your exchange (Binance, OKX, Kraken)
  2. Withdraw USDC, select Solana network
  3. Paste the address above
  4. Wait ~1 second for Solana to confirm
- "I've sent USDC" button → polls Helius for balance change → auto-refreshes when detected
- Recent deposits list at bottom
```

---

### RIZQ PRO

#### `app/pro/landing.tsx`
```
- Header: "Rizq Pro"
- Tagline: "For serious committee organisers"
- Toggle: Monthly ($4.99) | Annual ($44.99 — "Save 25%")
- Feature comparison table:
  Use a FlatList with two columns (Free vs Pro)
  Key features to highlight:
  - Committee size (10 vs 50 members)
  - Platform fee (1.5% vs 1.0%)
  - AI coaching (weekly vs full chat + daily)
  - Payout order (lottery/joined vs custom ordering)
  - reactnativert history (not available vs PDF + CSV)
  - Priority support (48h vs 4h WhatsApp)
- "Subscribe with USDC" button:
  Deduct from wallet balance
  Update users table: is_pro = true, pro_expires_at = now() + 30/365 days
  Show confirmation screen
- "Pro is paid in USDC directly from your wallet. No card required."
```

---

### SETTINGS SCREENS

#### `app/settings/index.tsx`
```
Grouped list (like iOS Settings):

Account:
  Profile → /settings/profile
  Rizq @username
  
Identity & Safety:
  KYC Status → /settings/kyc-status
  Nominee Information → /settings/nominee
  
Wallet:
  Wallet Management → /settings/wallet-management
  Rizq Pro → /pro/landing (or "Pro Active" if subscribed)
  
App:
  Notifications → /settings/notifications
  Language & Display → /settings/preferences
  Security → /settings/security
  
Community:
  Rizq Welfare Pool → /edge/welfare-pool
  
Help:
  Support → /settings/support
  About & Legal → /settings/about

Sign out (red, bottom)
```

All settings screens are standard form screens. Build them as simple lists of toggles, pickers, and text inputs using a consistent `SettingsRow` component.

---

## SOLANA / BLOCKCHAIN INTEGRATION

### Connection setup — `lib/solana/connection.ts`
```typescript
import { Connection } from '@solana/web3.js';

const HELIUS_RPC = process.env.reactnative_PUBLIC_HELIUS_RPC!;

reactnativert const connection = new Connection(HELIUS_RPC, {
  commitment: 'confirmed',
  wsEndpoint: HELIUS_RPC.replace('https', 'wss'),
});
```

### Phantom deeplink — `hooks/usePhantomWallet.ts`
```typescript
import * as Linking from 'reactnative-linking';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

reactnativert function usePhantomWallet() {
  const connect = async () => {
    const dappKeyPair = nacl.box.keyPair();
    const redirectUrl = Linking.createURL('/onConnect');
    
    const params = new URLSearchParams({
      app_url: 'https://rizq.app',
      redirect_link: redirectUrl,
      dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
      cluster: 'devnet',
    });
    
    await Linking.openURL(`https://phantom.app/ul/v1/connect?${params}`);
  };

  const signTransaction = async (transaction: Transaction) => {
    // Encode transaction, open Phantom deeplink for signing
    // Handle redirect back with signed transaction
  };

  return { connect, signTransaction };
}
```

### USDC balance fetch — `hooks/useUSDCBalance.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { connection } from '@/lib/solana/connection';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const USDC_MINT = new PublicKey(process.env.reactnative_PUBLIC_USDC_MINT!);

reactnativert function useUSDCBalance(walletAddress: string | null) {
  return useQuery({
    queryKey: ['usdc-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return 0;
      const tokenAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        new PublicKey(walletAddress)
      );
      const balance = await connection.getTokenAccountBalance(tokenAccount);
      return balance.value.uiAmount ?? 0; // Returns in USDC units (not micro-units)
    },
    refetchInterval: 30_000, // Refresh every 30 seconds
    enabled: !!walletAddress,
  });
}
```

---

## BACKEND API (Express) — KEY ENDPOINTS

Build a simple Express server in `/backend`. Key routes:

```
POST   /api/auth/verify-kyc         — KYC document verification
GET    /api/rates/pkr-usdc          — CoinGecko PKR rate
POST   /api/ai/chat                 — Claude API proxy with user context
POST   /api/ai/coaching/generate    — Weekly coaching message generation
POST   /api/committees/:id/announce — Send push notification to all members
POST   /api/nominees/notify         — Trigger nominee notification SMS
GET    /api/committees/:id/reactnativert   — Generate PDF reactnativert
POST   /api/welfare/transfer        — Move unclaimed funds to welfare pool
```

Weekly cron job (node-cron, every Sunday 10am PKT = 05:00 UTC):
```typescript
cron.schedule('0 5 * * 0', async () => {
  const activeMembers = await neondb
    .from('committee_members')
    .select('*, committees(*), users(*)')
    .eq('status', 'active');
    
  for (const member of activeMembers.data) {
    const context = await buildUserContext(member);
    const message = await generateCoaching(context, member.users.language_pref);
    await neondb.from('coaching_messages').insert({ 
      user_id: member.user_id,
      committee_id: member.committee_id,
      message
    });
    await sendPushNotification(member.users.reactnative_push_token, 'Rizq weekly update', message);
  }
});
```

---

## UTILITY FUNCTIONS — `utils/format.ts`

```typescript
// Always use these — never format currencies inline

reactnativert const formatUSDC = (microUnits: number): string => {
  return `$${(microUnits / 1_000_000).toFixed(2)} USDC`;
};

reactnativert const formatPKR = (usdcAmount: number, pkrRate: number): string => {
  const pkr = usdcAmount * pkrRate;
  return `≈ Rs ${Math.round(pkr).toLocaleString('en-PK')}`;
};

reactnativert const formatCNIC = (raw: string): string => {
  // XXXXX-XXXXXXX-X
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0,5)}-${digits.slice(5)}`;
  return `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12,13)}`;
};

reactnativert const formatDaysLeft = (deadline: Date): string => {
  const days = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
};

reactnativert const formatCycleOrdinal = (n: number): string => {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return `${n}${s[(v-20)%10] || s[v] || s[0]}`;
};
```

---

## GLOBAL ZUSTAND STORE — `store/useAppStore.ts`

```typescript
import { create } from 'zustand';

interface AppState {
  // Auth
  userId: string | null;
  walletAddress: string | null;
  walletType: 'phantom' | 'embedded' | null;
  
  // User profile
  displayName: string;
  username: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  isPro: boolean;
  languagePref: 'english' | 'urdu' | 'mixed';
  
  // Balances (in USDC, not micro-units)
  availableBalance: number;
  lockedBalance: number;
  pendingPayouts: number;
  pkrRate: number;
  
  // Active data
  committees: Committee[];
  latestCoachingMessage: string | null;
  rizqScore: number;
  
  // Actions
  setUser: (user: Partial<AppState>) => void;
  setBalance: (available: number, locked: number, pending: number) => void;
  setPKRRate: (rate: number) => void;
  updateCommittee: (id: string, updates: Partial<Committee>) => void;
  logout: () => void;
}

reactnativert const useAppStore = create<AppState>((set) => ({
  userId: null,
  walletAddress: null,
  walletType: null,
  displayName: '',
  username: '',
  kycStatus: 'pending',
  isPro: false,
  languagePref: 'mixed',
  availableBalance: 0,
  lockedBalance: 0,
  pendingPayouts: 0,
  pkrRate: 280,
  committees: [],
  latestCoachingMessage: null,
  rizqScore: 0,
  setUser: (user) => set((s) => ({ ...s, ...user })),
  setBalance: (available, locked, pending) => set({ availableBalance: available, lockedBalance: locked, pendingPayouts: pending }),
  setPKRRate: (rate) => set({ pkrRate: rate }),
  updateCommittee: (id, updates) => set((s) => ({
    committees: s.committees.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  logout: () => set({ userId: null, walletAddress: null, committees: [] }),
}));
```

---

## PUSH NOTIFICATIONS SETUP

```typescript
// hooks/usePushNotifications.ts
import * as Notifications from 'reactnative-notifications';
import * as Device from 'reactnative-device';

reactnativert async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') return null;
  
  const token = (await Notifications.getreactnativePushTokenAsync()).data;
  
  // Save to neondb
  await neondb
    .from('users')
    .update({ reactnative_push_token: token })
    .eq('id', userId);
    
  return token;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## BUILD ORDER — FOLLOW THIS SEQUENCE

Build in this exact order to always have a working demo:

```
Week 1: Foundation
  [ ] React Native project setup with all dependencies
  [ ] neondb project created with schema applied
  [ ] Environment variables configured
  [ ] Design tokens and base UI components (Button, Card, Badge)
  [ ] Splash + Welcome + Phone + OTP screens (auth flow working)
  [ ] Phantom wallet deeplink connect working
  [ ] Home screen shell (static data, no real data yet)

Week 2: Committee Core
  [ ] Create Committee wizard (Steps 1–6, Zustand store)
  [ ] Committee dashboard — member view (D1–D6 screens)
  [ ] Pay contribution screen with Phantom signing (even if devnet mock)
  [ ] Join committee from invite link
  [ ] Committees tab with list

Week 3: AI + Real Data
  [ ] neondb queries replacing all static data
  [ ] Helius RPC for USDC balance
  [ ] Rizq AI tab with coaching message display
  [ ] Claude API backend endpoint
  [ ] AI chat screen

Week 4: Edge Cases + Payout
  [ ] Payout claim screen with Anchor program call
  [ ] Manager dashboard with management panel
  [ ] Nominee flow (mark deceased, nominee notification)
  [ ] Welfare pool screen
  [ ] KYC and nominee screens

Week 5: Polish + Demo
  [ ] Rizq Pro landing and subscription flow
  [ ] Wallet deposit + transaction history
  [ ] Settings screens (all 11)
  [ ] Push notifications working end to end
  [ ] PKR rate widget
  [ ] Fix all edge cases, empty states, loading states
  [ ] Record demo video
```

---

## DEMO SCRIPT — FOR SUBMISSION VIDEO

Use this exact flow for the 3-minute demo video:

```
0:00–0:20  Show the problem — open a WhatsApp group chat where people are 
           manually tracking a kameti. "This is how 41% of Pakistanis save. 
           This is what we are fixing."

0:20–0:45  Create a committee — show Step 1–6 wizard in real time.
           Committee: "Hajj Fund", $50/month, 8 members, monthly.
           Launch and show the Solana transaction confirming.

0:45–1:30  Show member view — another device joins via invite link.
           Member makes a contribution — show USDC leaving wallet, 
           confirm on Solana Explorer in real time.

1:30–2:00  Show AI coach — open AI tab.
           Show bilingual Urdu/English message.
           Ask the AI "Mera next payment kab hai?" — show bilingual response.

2:00–2:20  Show payout claim — advance to payout cycle.
           Hit "Claim $400 USDC" — show transaction confirming.
           Show PKR equivalent appearing.

2:20–2:40  Show nominee safety — manager marks member as deceased.
           Show nominee notification screen.
           Show welfare pool if unclaimed.

2:40–3:00  Market + vision — one slide: $5B Pakistan, 
           "Global south has $1T in informal savings groups. 
           Rizq is the infrastructure layer."
```

---

## IMPORTANT CONSTRAINTS

1. **No prediction markets, no staking, no gambling mechanics** — this is explicitly excluded from the product.
2. **All monetary amounts are in USDC** — always show PKR equivalent in gray below, never as primary.
3. **USDC uses 6 decimal places** — 1 USDC = 1,000,000 in smart contract. Always convert before displaying.
4. **Minimum contribution is $5 USDC** — enforced at smart contract and UI level.
5. **Free tier maximum: 10 members** — show Pro prompt when user tries to exceed.
6. **KYC is required for committee participation** — gates are enforced in the join flow.
7. **All Solana transactions require Phantom signature** — never sign server-side.
8. **Deploy to devnet for the hackathon** — mainnet after.
9. **The welfare pool address must be a public on-chain address** — anyone can verify it on Solana Explorer.
10. **Language must adapt to user preference** — Urdu text may need RTL wrapping (use `I18nManager.forceRTL` selectively for Urdu-only strings, not the whole app).

---

*Rizq — Digital Kameti. Shariah-compliant. On Solana.*
*Colosseum Frontier Hackathon 2026 | Superteam Pakistan Track*