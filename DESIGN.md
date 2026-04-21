# Rizq — Design Documentation

> Save Together. Win Together. On Solana.
> Colosseum Frontier Hackathon 2026 | Superteam Pakistan Track

---

## 1. Design Philosophy

Rizq sits at the intersection of three worlds: Pakistani cultural savings traditions (kameti/committee), modern fintech, and blockchain. The design must feel trustworthy enough for real money, warm enough for social sharing, and simple enough that a first-time crypto user in Lahore can navigate it without confusion.

### Core Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **Cultural first** | Use familiar concepts (kameti, Eid, Hajj) before technical ones (USDC, PDAs). Never show a wallet address where a name will do. |
| **Social over solo** | Every screen should remind the user that friends are watching. Accountability is the product. |
| **Trust through transparency** | Show on-chain data (tx links, vault balances) where it builds confidence. Hide it where it creates noise. |
| **Bilingual by default** | UI labels are English. Coaching text and motivational copy mix Urdu/English naturally — never a formal translation. |
| **Celebrate progress** | Small deposits deserve feedback. Animations and milestone toasts keep users coming back. |

---

## 2. Visual Identity

### 2.1 Color Palette

```
Primary Green     #1DB954   — progress bars, CTAs, success states
                            (evokes growth, wealth, Islamic tradition)

Deep Navy         #0A1628   — primary background (dark mode default)
Surface Card      #112240   — card backgrounds, bottom sheets
Elevated Surface  #1A3356   — modals, input fields

Accent Gold       #F5C842   — celebration, achievement, Eid-related goals
Accent Coral      #FF6B6B   — warning states, "no" prediction side
Accent Purple     #7B61FF   — AI coaching feature, Phantom brand alignment

Text Primary      #FFFFFF   — headings, primary labels
Text Secondary    #8899AA   — captions, metadata, timestamps
Text Muted        #445566   — placeholder text, disabled states

USDC Blue         #2775CA   — USDC amounts, wallet balance displays
Solana Gradient   #9945FF → #14F195   — used sparingly for Solana-specific moments
```

### 2.2 Typography

```
Display / Hero      Inter Bold 32px        — goal amounts, celebration screens
Heading 1           Inter SemiBold 24px    — screen titles
Heading 2           Inter SemiBold 18px    — section headers, card titles
Body                Inter Regular 16px     — primary content, descriptions
Body Small          Inter Regular 14px     — secondary content, metadata
Caption             Inter Regular 12px     — timestamps, footnotes
Coaching Text       Inter Regular 17px     — AI coaching messages (slightly larger for readability)
Monospace           JetBrains Mono 13px    — wallet addresses, tx signatures
```

Urdu text (in coaching messages) renders via system font fallback — do not attempt to force a Latin font on Nastaliq script.

### 2.3 Spacing & Grid

- Base unit: `8px`
- Screen horizontal padding: `20px`
- Card inner padding: `16px`
- Section gap: `24px`
- Bottom tab bar height: `64px` + safe area inset
- Status bar: transparent, light content (white icons)

### 2.4 Border Radius

```
Cards & sheets    16px
Buttons           12px
Chips & badges    20px (pill)
Input fields      10px
Avatars           50% (circle)
```

### 2.5 Iconography

Use **Phosphor Icons** (phosphor-react-native) — consistent weight, works well at small sizes. Icon weight: `regular` for navigation, `bold` for CTAs.

Goal type icons are custom illustrated — larger, culturally specific:

| Goal Type | Icon concept |
|-----------|-------------|
| Eid | Crescent moon + star |
| Wedding | Simple rings / henna motif |
| Hajj | Kaaba silhouette |
| Education | Mortar board |
| Emergency | Shield with checkmark |
| Custom | Pencil / star |

---

## 3. Navigation Structure

```
App
├── Onboarding Stack (unauthenticated)
│   ├── SplashScreen
│   ├── WelcomeScreen
│   └── ConnectWalletScreen
│
└── Main Tab Navigator (authenticated)
    ├── Tab: Home (Dashboard)
    ├── Tab: Goals  →  GoalDetailScreen
    │                   └── PredictionPoolScreen
    ├── Tab: + (Create Goal — modal, no label)
    ├── Tab: AI Coach
    └── Tab: Wallet
        └── TransactionDetailScreen

Modal Stack (over tabs)
├── CreateGoalModal   (multi-step)
├── DepositModal
├── StakeModal
├── GoalCompleteModal
└── ShareInviteModal
```

The center tab (`+`) is a floating action button style — larger, uses the Primary Green with a subtle glow. Tapping it opens the `CreateGoalModal` as a full-screen bottom sheet.

---

## 4. Screen Designs

### 4.1 Splash Screen
- Full-screen Deep Navy
- Rizq logo centered (Arabic-inspired wordmark + crescent accent)
- Tagline: *"Save Together. Win Together."* in Inter Regular 16px, Text Secondary
- Fade out after 1.5s into Welcome or Dashboard (if wallet already connected)

---

### 4.2 Welcome / Onboarding

**Three onboarding slides** (swipeable):

1. **The Problem** — WhatsApp kameti screenshot mockup. Headline: *"Your committee, on-chain."* Body: *"No more lost money. No more trust issues."*
2. **The Social Layer** — illustration of friends staking. Headline: *"Bet your friends you'll save."* Body: *"They stake USDC. You prove them right."*
3. **The AI Coach** — chat bubble with Urdu/English mix. Headline: *"Weekly coaching in your language."* Body: *"Personalized. Bilingual. Honest."*

Progress dots at bottom. Final slide shows **"Connect Phantom"** CTA button (Primary Green, full width).

**Connect Wallet Screen**
- Phantom logo + "Connect with Phantom" button
- Small footnote: *"Rizq never holds your private keys. All funds are secured by Solana smart contracts."*
- Link: *"Don't have Phantom? Download it →"*

---

### 4.3 Home / Dashboard

```
┌─────────────────────────────────┐
│  Good morning, Muhammad  👋      │  ← first name from username
│  Apr 20, 2026                   │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  USDC Balance             │  │  ← wallet balance card
│  │  $248.50                  │  │
│  │  ≈ PKR 69,342  ↑ 0.3%    │  │  ← live CoinGecko rate
│  └───────────────────────────┘  │
├─ Active Goals ──────────────────┤
│  ┌───────────────────────────┐  │
│  │ 🌙 Eid Outfit 2026        │  │  ← goal card
│  │ ████████░░░░  68%         │  │
│  │ $68 / $100 USDC           │  │
│  │ 14 days left              │  │
│  │ 3 believers · 1 doubter   │  │  ← prediction summary
│  │              [Deposit]    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📚 Uni Fund               │  │
│  │ ███░░░░░░░░░  24%         │  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
├─ This Week's Coaching ──────────┤
│  ┌───────────────────────────┐  │
│  │ 💬  "Bhai, 68% ho gaya… │  │  ← truncated AI message
│  │      [Read full →]        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Goal Card** states:
- **On track** (≥ weekly pace): green progress bar
- **Behind** (< weekly pace): amber progress bar, subtle warning label
- **Critical** (< 50% with < 25% time remaining): coral progress bar, "You need to catch up" label

---

### 4.4 Create Goal (Multi-Step Modal)

Bottom sheet that expands to full screen. Three steps with a segmented progress bar at the top.

**Step 1 — Goal Type**
- 2×3 grid of goal type cards (icon + label)
- Selected state: Primary Green border + background tint
- "What are you saving for?" headline in Heading 1

**Step 2 — Amount & Deadline**
- Amount: horizontal slider ($10 → $10,000) + manual text input
- PKR equivalent shown in real time below the USDC amount
- Deadline: calendar date picker (custom styled, Deep Navy theme)
- Weekly deposit required: auto-calculated, shown as a chip: *"≈ $12.50/week to stay on track"*

**Step 3 — Preview & Confirm**
- Goal summary card (same style as dashboard goal card)
- Goal name: editable text field (auto-suggested based on goal type + year)
- Estimated Solana tx fee shown: *"~0.000005 SOL"*
- **"Create Goal"** CTA → triggers Phantom deeplink → on-chain tx
- After tx confirms: confetti burst, "Goal Created!" toast, navigate to Goal Detail

---

### 4.5 Goal Detail Screen

```
┌─────────────────────────────────┐
│  ← Back          🌙 Eid Outfit  │
├─────────────────────────────────┤
│  ████████████░░░░░░  68%        │  ← large progress bar
│  $68 saved of $100 target       │
│  14 days · 3 weeks remaining    │
├─ Deposit ───────────────────────┤
│  [  $10  ] [  $25  ] [  $50  ] │  ← quick-amount chips
│  [     Custom Amount     ]      │
│  [   Deposit via Phantom  ]     │
├─ Your Friends ──────────────────┤
│  👤 Ali Hassan     $5  YES ✓    │
│  👤 Sara Ahmed     $10 YES ✓    │
│  👤 Unknown        $3  NO  ✗    │
│  [+ Invite More Friends]        │
├─ Activity ──────────────────────┤
│  Apr 18  Deposited $20          │
│  Apr 12  Goal created           │
└─────────────────────────────────┘
```

Deposit quick-amount chips are pre-set at $10, $25, $50. Custom opens a number input bottom sheet. All deposit actions go through Phantom deeplink.

---

### 4.6 Prediction Pool Screen

```
┌─────────────────────────────────┐
│  ← Back       Prediction Pool   │
│  🌙 Eid Outfit 2026             │
├─────────────────────────────────┤
│  Total Pool: $18 USDC           │
│                                 │
│  YES ████████████░░░  78%  $14  │  ← green side
│  NO  ████░░░░░░░░░░░  22%  $4   │  ← coral side
│                                 │
│  If the goal is achieved:       │
│  YES stakers share the NO pool  │
│  + get their stake back         │
├─ Believers ─────────────────────┤
│  👤 Ali       $5 YES            │
│  👤 Sara      $10 YES           │  ← avatar + truncated address
├─ Doubters ──────────────────────┤
│  👤 0x3f…9a   $3 NO             │
├─────────────────────────────────┤
│  [ Stake YES — I believe! ]     │  ← Primary Green
│  [ Stake NO  — I doubt it ]     │  ← Coral / outlined
└─────────────────────────────────┘
```

The YES/NO bar animates when new stakes come in (Supabase real-time). Stake buttons open a bottom sheet with amount input and Phantom signing confirmation.

---

### 4.7 AI Coaching Screen

```
┌─────────────────────────────────┐
│  AI Coaching    ✨ Powered by   │
│                   Claude        │
├─ This Week ─────────────────────┤
│  ┌───────────────────────────┐  │
│  │ "Bhai, 68% ho gaya —      │  │
│  │  solid progress! Your     │  │
│  │  3 friends cheering you   │  │
│  │  on (1 bet against you,   │  │
│  │  so prove them wrong).    │  │
│  │  This week: skip one      │  │
│  │  lunch out. PKR rate is   │  │
│  │  decent — agar remittance │  │
│  │  aa rahi hai, convert     │  │
│  │  today. Eid pe khush      │  │
│  │  rahein! 🌙"              │  │  ← 17px, line-height 1.6
│  └───────────────────────────┘  │
│  Sunday, Apr 20 · Goal Health ●●●●○  │  ← 4/5 dots
├─ Ask a follow-up ───────────────┤
│  [  Ask the coach anything…  ] │  ← text input
│                       [Send →] │
│                                 │
│  Past: Apr 13 · Apr 6           │  ← previous coaching messages
└─────────────────────────────────┘
```

Coaching message uses a slightly warmer card background (subtle green tint) to differentiate from data cards. The "Goal Health" score is 1–5 dots, derived from progress % vs expected weekly pace.

Follow-up chat calls Claude API in real time (streaming preferred). Messages styled as standard chat bubbles — user right (Primary Green), AI left (Surface Card).

---

### 4.8 Wallet Screen

```
┌─────────────────────────────────┐
│  Wallet                         │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  USDC Balance             │  │
│  │  $248.50                  │  │  ← large, USDC Blue color
│  │  ≈ PKR 69,342             │  │
│  │  1 USDC = 278.3 PKR  ↑   │  │  ← live rate + 24h trend arrow
│  │  [Get USDC via exchange →]│  │
│  └───────────────────────────┘  │
│  Address: Abcd…xyz7  [Copy]     │
├─ Transactions ──────────────────┤
│  Apr 18  Goal Deposit   −$20   │
│  Apr 14  Stake (YES)    −$5    │
│  Apr 06  Received USDC  +$100  │
│          [View on Solana →]     │  ← Solana Explorer deeplink
└─────────────────────────────────┘
```

The exchange link opens a browser to a supported on-ramp (not part of Rizq). Transaction history is pulled from Helius API, filtered to USDC transfers involving the user's wallet.

---

### 4.9 Goal Complete Screen

Full-screen celebration modal with:

1. **Lottie animation** — confetti burst using goal type color (gold for Eid, etc.)
2. **Achievement headline** — *"Mubarak ho! 🎉"* / *"Goal Achieved!"*
3. **Stats card**:
   - Days taken vs. deadline
   - Total saved
   - Friends who bet YES (won) / NO (lost)
   - Winnings breakdown: *"Your 3 believers earned $3.50 profit"*
4. **Achievement card** — shareable image (generated via `react-native-view-shot`):
   - Rizq logo + goal type icon
   - *"I saved $100 USDC for Eid in 28 days"*
   - Social prompt: *"Can you beat that?"*
5. **Actions**:
   - [Share Achievement Card] — native share sheet
   - [Start New Goal] — navigates to Create Goal
   - [Back to Dashboard] — subtle text link

---

### 4.10 Share / Invite Screen

```
┌─────────────────────────────────┐
│  Invite Friends                 │
│  🌙 Eid Outfit 2026             │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  rizq.app/goal/xK8m…     │  │  ← deep link
│  │                  [Copy]   │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │        [ QR Code ]        │  │  ← for in-person sharing
│  └───────────────────────────┘  │
│  Share via:                     │
│  [WhatsApp]  [Telegram]  [More] │
├─ Preview ───────────────────────┤
│  What your friend will see:     │
│  ┌───────────────────────────┐  │
│  │ Muhammad is saving for    │  │
│  │ Eid Outfit 2026 on Rizq   │  │
│  │ Stake USDC on whether     │  │
│  │ they'll make it! 🌙       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

WhatsApp and Telegram use `react-native`'s `Share` API with a pre-formatted message. QR code rendered with `react-native-qrcode-svg`.

---

## 5. Component Library

### 5.1 GoalCard
```
Props: goal, onDeposit, onPress
Variants: active | behind | critical | resolved
```
Used on Dashboard and Goals tab. Contains: goal type icon, name, progress bar, USDC amounts, days remaining, friend count summary, deposit CTA.

### 5.2 ProgressBar
```
Props: value (0–1), variant ('success' | 'warning' | 'danger'), animated
```
Animated width transition on mount and on value change. Color automatically derived from variant.

### 5.3 USDCAmount
```
Props: lamports, showPKR, size ('sm' | 'md' | 'lg')
```
Handles USDC decimal conversion (`lamports / 1_000_000`). Optionally shows PKR equivalent below in Text Secondary.

### 5.4 PredictionBar
```
Props: yesTotal, noTotal, animated
```
Horizontal split bar. YES side green, NO side coral. Percentages update via Supabase real-time.

### 5.5 CoachingCard
```
Props: message, date, goalHealthScore (1–5)
```
Displays AI coaching text with health score dots. Handles Urdu right-to-left character rendering inline.

### 5.6 WalletAddressChip
```
Props: address, onCopy
```
Truncates to first 4 + last 4 characters (e.g., `Abcd…xyz7`). Monospace font. Copy icon triggers Clipboard API + toast.

### 5.7 PhantomButton
```
Props: label, txBuilder, onSuccess, onError
```
Wraps the Phantom deeplink flow. Shows loading spinner while awaiting redirect. Shows error bottom sheet on failure. Calls `onSuccess(txSignature)` after confirmation.

---

## 6. User Flows

### 6.1 First-Time User Flow
```
Splash → Welcome (3 slides) → Connect Phantom → 
  [Phantom app] → Redirect back → Register (username optional) → 
  Dashboard (empty state with "Create your first goal" CTA)
```

### 6.2 Create Goal & Invite Flow
```
Dashboard [+] → CreateGoalModal Step 1 (type) → Step 2 (amount/deadline) → 
  Step 3 (preview) → Phantom deeplink → Tx confirmed → 
  GoalDetail → ShareInviteModal → WhatsApp/Telegram → 
  Friend opens deep link → PredictionPool → StakeModal → Phantom
```

### 6.3 Weekly Deposit Flow
```
Push notification (Sunday coaching) → App opens to AICoachingScreen → 
  Read message → [Go to Goal] → GoalDetail → Deposit chip → 
  Phantom deeplink → Tx confirmed → Progress bar animates → Toast
```

### 6.4 Goal Resolution Flow
```
Deadline passes → Backend detects (or permissionless resolver called) → 
  Helius webhook → Supabase updated → Push notification sent → 
  App opens → GoalCompleteModal (achieved) or failure screen → 
  Share achievement or start new goal
```

---

## 7. States & Edge Cases

| Scenario | UI Behaviour |
|----------|-------------|
| Wallet not connected | Redirect to ConnectWalletScreen, preserve deep link intent |
| Phantom not installed | Show install prompt with App Store / Play Store link |
| No active goals | Dashboard shows illustrated empty state: *"Your first goal is waiting."* + CTA |
| Goal has 0 stakers | Prediction Pool shows *"Be the first to stake"* empty state |
| Tx pending | PhantomButton shows spinner; disable all other deposit actions |
| Tx failed | Bottom sheet with error code, "Try again" button, Solana Explorer link |
| Network offline | Toast: *"No connection — showing last saved data"*; disable tx actions |
| Behind on savings | Progress bar turns amber; dashboard card shows *"You need $X more this week"* |
| PKR rate > 280 | Wallet screen shows subtle banner: *"Good week to convert remittances"* |
| Goal deadline today | Countdown shows *"Last chance — deadline today"* in Accent Coral |
| Coaching not generated yet | AICoachingScreen shows skeleton loading, then *"Your coaching message arrives every Sunday"* |

---

## 8. Motion & Animation

| Element | Animation |
|---------|-----------|
| Progress bars | Spring ease-in on mount, immediate on deposit |
| PredictionBar update | Smooth width transition over 400ms |
| Goal card tap | Scale 0.97 on press-in, spring back on release |
| Goal complete confetti | Lottie, 2.5s, non-interruptible |
| Screen transitions | React Navigation stack: slide from right (push), slide down (modal) |
| Coaching card appearance | Fade in + translate up 12px over 300ms |
| Toast notifications | Slide in from top, auto-dismiss after 3s |
| Skeleton loading | Shimmer effect (left-to-right), Surface Card → Elevated Surface gradient |

---

## 9. Dark Mode

Dark mode is the default and primary design target (Deep Navy background). The app does not implement a light mode for the hackathon — dark mode is consistent with Phantom's design language and makes the Accent Gold/Green colors pop against financial data.

---

## 10. Accessibility

- Minimum touch target: 44×44px for all interactive elements
- Color contrast: all text meets WCAG AA against its background
- `accessibilityLabel` on all icon-only buttons
- USDC amounts always include the currency unit in the accessible label (*"248 USDC"*, not just *"248"*)
- Coaching messages: Urdu text rendered at 17px minimum; do not reduce font size

---

## 11. Deep Link Schema

```
rizq.app/goal/:goalId          → Opens GoalDetail (unauthenticated: shows preview + stake CTA)
rizq.app/onConnect             → Phantom wallet callback handler
rizq.app/onSignAndSendTransaction → Phantom tx callback handler
```

Friends who open a goal deep link without Phantom installed see a web preview page (static share metadata). Once Phantom is connected, the app opens the GoalDetail and PredictionPool automatically.
