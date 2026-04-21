# Rizq — UI Enhancement Guide
### From Functional → Premium & Irresistible

> This document supersedes the visual identity and screen layout sections of `DESIGN.md`.
> It addresses what makes the current design feel flat and prescribes specific upgrades
> for every layer — color, type, components, micro-interactions, and screen-by-screen layouts.

---

## The Problem with the Current Design

The original design uses solid flat cards on a navy background. It reads like a generic fintech template — nothing about it feels Pakistani, celebratory, or social. Specific issues:

- **Color** — the greens and blues are muted; they disappear on dark backgrounds
- **Cards** — flat `#112240` rectangles with no depth, no light, no hierarchy
- **Typography** — every heading looks the same weight; nothing pulls the eye
- **Progress bars** — plain filled rectangles; no glow, no milestone marks, no personality
- **Empty states** — placeholder text only; zero emotional engagement
- **No ambient background** — flat `#0A1628` everywhere feels oppressive
- **Goal types look identical** — only an icon label differentiates them
- **The social layer is invisible** — friend avatars are tiny; staking feels like a footnote

The fix is not a redesign from scratch. It's layering **depth**, **light**, **cultural texture**, and **motion** on top of the existing structure.

---

## 1. Upgraded Color System

### 1.1 Replace Flat Colours with a Semantic Token System

```
── Backgrounds ──────────────────────────────────────────────
bg-base          #080E1A    (darker, richer than the old #0A1628)
bg-surface       #0D1B2E    (cards, sheets)
bg-elevated      #132640    (inputs, selected states)
bg-overlay       rgba(8,14,26, 0.85)   (modal scrim)

── Brand ─────────────────────────────────────────────────────
brand-green      #00E676    (brighter, more electric than #1DB954)
brand-green-dim  #00C853    (pressed / secondary green actions)
brand-gold       #FFD740    (warmer gold — feels like actual wealth)
brand-purple     #A78BFA    (AI feature — softer Phantom-adjacent purple)

── Semantic ──────────────────────────────────────────────────
success          #00E676
warning          #FFB300
danger           #FF5252
info             #40C4FF

── Text ──────────────────────────────────────────────────────
text-primary     #F0F4FF    (cooler white, easier on AMOLED)
text-secondary   #7A8FA6
text-muted       #3D5068
text-inverse     #080E1A

── Goal Type Accent Colours (each goal type gets its own palette) ──
Eid:             from #FFD740  to #FF8F00   (gold gradient)
Wedding:         from #F48FB1  to #E91E8C   (rose/magenta)
Hajj:            from #80DEEA  to #00838F   (teal/holy)
Education:       from #80CBC4  to #00796B   (emerald)
Emergency:       from #CE93D8  to #7B1FA2   (deep violet)
Custom:          from #82B1FF  to #1565C0   (sky blue)
```

### 1.2 Ambient Gradient Backgrounds

The base background should never be a flat solid. Apply a radial gradient that shifts per screen context:

```
Dashboard screen:
  radial-gradient(ellipse at 20% 0%, #0D2040 0%, #080E1A 60%)
  + a second subtle radial at bottom-right (20% opacity brand-green glow)

AI Coaching screen:
  radial-gradient(ellipse at 50% 0%, #1A0D40 0%, #080E1A 65%)
  (purple tint — signals AI mode)

Goal Complete screen:
  animated radial burst from center — goal type accent colour
  (Eid = gold burst, Wedding = rose burst, etc.)
```

Implementation: use `LinearGradient` / `RadialGradient` from `expo-linear-gradient` as the screen wrapper. Do not implement in CSS.

---

## 2. Typography Overhaul

### 2.1 Font Pairing

Replace Inter-only with a two-font system:

```
Display / Numbers:  Outfit Bold & SemiBold
  — geometric, modern, financial feel
  — excellent rendering of currency amounts
  — numbers feel crisp at large sizes

Body / UI:          Inter Regular & Medium
  — keeps familiar readability for content
  — works well with Urdu inline text
```

### 2.2 Type Scale (Revised)

```
Hero Amount    Outfit Bold     48px  lh:1.0   — wallet balance, goal total
Display        Outfit SemiBold 36px  lh:1.1   — celebration screen headline
H1             Outfit SemiBold 26px  lh:1.2   — screen titles
H2             Outfit Medium   20px  lh:1.3   — card titles, section headers
H3             Inter SemiBold  16px  lh:1.4   — sub-labels, metadata headers
Body           Inter Regular   15px  lh:1.6   — descriptions, body copy
Body Coaching  Inter Regular   17px  lh:1.7   — AI message (loose for Urdu)
Caption        Inter Regular   12px  lh:1.5   — timestamps, footnotes
Mono           JetBrains Mono  12px  lh:1.4   — addresses, tx hashes
```

### 2.3 Numeric Colour Treatment

Currency amounts deserve individual colour treatment (not just `text-primary`):

- USDC amounts → `brand-green` with slight text-shadow glow `0 0 12px rgba(0,230,118,0.4)`
- PKR equivalent → `text-secondary`, always smaller than USDC
- Negative (withdrawal) → `danger` red
- Positive (received / winnings) → `brand-green`

---

## 3. Card System Redesign

### 3.1 Glassmorphism Cards (Primary Style)

Replace solid `#112240` cards with translucent glass cards. This gives depth without heavy drop shadows on a dark background.

```
Background:   rgba(255,255,255, 0.04)
Border:       1px solid rgba(255,255,255, 0.08)
Blur:         backdrop-filter: blur(12px)   ← use @react-native-community/blur
Border-radius: 20px
```

Add a **"top light" highlight** — a 1px line at the very top of the card that is slightly lighter:

```
borderTopColor: rgba(255,255,255, 0.15)
borderTopWidth: 1
```

This simulates light hitting the glass edge and immediately elevates the card above flat designs.

### 3.2 Goal Type Coloured Cards

Each goal type gets a card with its unique accent gradient bleeding in from one corner:

```
Eid card:
  background: linear-gradient(135deg, rgba(255,215,64,0.12) 0%, transparent 50%)
  border-color: rgba(255,215,64, 0.20)

Wedding card:
  background: linear-gradient(135deg, rgba(244,143,177,0.12) 0%, transparent 50%)
  border-color: rgba(244,143,177, 0.20)
```

The goal type icon sits in a small coloured pill badge (not a plain icon):

```
┌── icon badge ──────────────────┐
│  🌙  gradient-filled circle   │  ← 40×40, Eid gold gradient fill
│      3px glow matching goal    │
└────────────────────────────────┘
```

### 3.3 The "Hero" Wallet Balance Card

The wallet balance card on Dashboard should be the most visually striking element on the screen — it IS the app's value proposition.

```
┌─────────────────────────────────────────┐
│                                         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← frosted glass
│                                         │
│  USDC Balance                           │  ← Inter Medium 13px, text-secondary
│                                         │
│  $248.50                                │  ← Outfit Bold 48px, text-primary
│                                         │
│  ≈ PKR 69,342  ↑ 0.3% today           │  ← Inter Regular 14px
│                                         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← subtle separator
│                                         │
│  2 active goals  ·  $3.50 in stakes    │  ← summary chips
│                                         │
└─────────────────────────────────────────┘
```

Background: a mesh gradient blob animated slowly (2px/s drift) — gives the card a "living" quality.
Use `react-native-skia` `<LinearGradient>` inside a `<Canvas>` for this effect.

---

## 4. Progress Bar Upgrade

The current plain filled bar reads as a loading indicator. Replace with the **Glowing Track** style:

```
Track (empty):  height 10px, border-radius 5px
                background rgba(255,255,255,0.08)
                border 1px solid rgba(255,255,255,0.05)

Fill:           background: goal-type gradient (e.g. Eid: #FFD740 → #FF8F00)
                box-shadow: 0 0 8px rgba(255,215,64, 0.6)   ← glow
                Animated width spring on mount (from 0 to actual %)

Milestone dots: at 25%, 50%, 75% place small white dots on the track
                dot turns gold + pulses when the user crosses it

Percentage label: shown at the right end of the fill
                  Outfit SemiBold 13px, same colour as fill gradient
```

**Behind state** (amber): the fill turns `#FFB300` + the glow shifts to amber.
**Critical state** (red): fill turns `#FF5252`, glow shifts to red, the bar border pulses with a subtle red glow every 3s.

---

## 5. Screen-by-Screen Upgrades

### 5.1 Home / Dashboard

**Top section — personalised header**
```
[  Avatar circle (initials or Phantom pfp)   ]
   Good morning, Muhammad 🌤
   Tuesday, Apr 21

[  Notifications bell  ]  ← top-right, badge count
```

Avatar: 44×44 circle. Gradient background matching the day's first goal type colour if wallet connected.

**Goal cards — "live" feel**
Add a real-time pulse dot next to *"X believers"* if there has been a stake in the last 24 hours:
```
  ● 3 believers · 1 doubter        ← ● is an animated green pulse dot
```

Add a **"streak" chip** on the card if the user deposited last week:
```
  🔥 3-week streak
```
This chip uses a warm orange gradient and drives retention.

**Section header upgrade**
Replace plain section text with a divider-label style:
```
── Active Goals ──────────────────────────────
```
Use `text-secondary` 11px ALL-CAPS with tracking `1.2px`. Subtle left accent bar (2×14px brand-green).

**Quick actions row (new)**
Between the balance card and goal list, add a horizontal scroll row of quick-action pills:
```
[ ⚡ Deposit ]  [ 📨 Invite ]  [ 📊 Pool ]  [ 🤖 Coach ]
```
Each pill: glassmorphism background, icon + label, 36px height, horizontal scroll. This gives power users a fast path without navigating to tabs.

---

### 5.2 Create Goal — Multi-Step Modal

**Step 1 — Goal Type Picker (Redesigned)**

Replace the plain 2×3 grid with **large illustrated cards** in a 2-column layout. Each card is taller (120px), shows the goal icon large (48px), and uses the goal type's gradient as a background wash:

```
┌─────────────────┐  ┌─────────────────┐
│                 │  │                 │
│   🌙  48px     │  │  💍  48px      │
│                 │  │                 │
│     Eid         │  │    Wedding      │
│  "Celebrate     │  │  "Your big day" │
│   in style"     │  │                 │
└─────────────────┘  └─────────────────┘
```

Selected card: full accent gradient border (2px) + subtle inner glow. Non-selected: muted border.

**Step 2 — Amount & Deadline**

Replace the plain slider with a **large number input** as the primary element:

```
   How much do you want to save?

         $  [ 1 0 0 ]
                               USDC
   ≈ PKR 27,830 at today's rate

   ────────────────────────────────
   $10        $100      $500    $1k+
                  ↑ (common presets as chips)
```

Below that, show a **"What it means" panel** — makes the goal feel real:
```
┌────────────────────────────────────┐
│  💡 At $100 USDC, you'd need to   │
│     save $12.50 each week.         │
│     That's one less lunch out.     │
└────────────────────────────────────┘
```
This copy adapts based on amount and deadline.

**Step 3 — Preview**

The preview card should look identical to how it will appear on the Dashboard — not a simplified summary. Give the user a real "wow, this is what my friends will see" moment.

---

### 5.3 Goal Detail Screen

**Hero section upgrade**

Replace the plain progress bar with a full-width visual:

```
┌────────────────────────────────────────┐
│   🌙  Eid Outfit 2026                  │
│                                        │
│   ████████████░░░░░░░░  68%           │  ← glowing fill bar, full width
│   $68 saved                   $100    │
│                                        │
│   ⏰  14 days left                     │
│   💰  $10.50 more each week to hit it  │
└────────────────────────────────────────┘
```

Background of the hero section: goal type gradient at 8% opacity as a wash.

**Friends section — social proof upgrade**

Make the friend list feel like a live leaderboard, not a static table:

```
  Your Squad                   [+ Invite]

  ● Ali Hassan   $10   YES ✅  "I believe!"
  ● Sara Ahmed   $5    YES ✅
  ● 0xAb…4f     $3    NO  ❌  Betting against you 👀

  2 believe in you · 1 doubter
  If you succeed: believers each earn +50% profit
```

Add the doubter with a playful antagonist framing (*"Betting against you 👀"*). This creates tension that drives deposits.

---

### 5.4 Prediction Pool Screen

**Visualise YES vs NO as a face-off, not a progress bar**

```
┌────────────────────────────────────────┐
│  YES ─────────────────── NO           │
│                                        │
│  78%  ██████████████░░░░  22%         │  ← green / coral split
│  $14                         $4       │
│                                        │
│  Pool total: $18 USDC                  │
│  If goal achieves → YES wins +$3.50   │
│  If goal fails   → NO  wins +$14      │
└────────────────────────────────────────┘
```

**Staker avatars row** — instead of a plain list, show stacker avatar circles overlapping like a group photo:

```
  Believers:  👤👤👤  +1 more
  Doubters:   👤
```

Tapping the row expands to the full list.

**The stake CTA** — make it feel like a game:

```
┌──────────────────────────────────┐
│   I believe Muhammad will        │
│   hit this goal 🙌               │
│                                  │
│   [ Stake YES — I'm in! ]        │  ← full-width, brand-green gradient
│   [ Stake NO  — prove me wrong ] │  ← outlined, coral
└──────────────────────────────────┘
```

---

### 5.5 AI Coaching Screen

The AI Coaching screen needs to feel distinct from the rest of the app — entering a different mode. Apply the purple ambient background and use a unique card style for the message.

**Weekly message card — "coach letter" style**

```
┌────────────────────────────────────────┐
│ ✨  Your Weekly Coaching               │
│     Sunday, Apr 20                     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │  ← gradient border (purple → teal)
│  │  "Bhai, 68% ho gaya — solid      │  │
│  │   progress! Your 3 friends are   │  │
│  │   cheering you on (2 bet YES,    │  │
│  │   1 bet against you — prove      │  │
│  │   them wrong). This week: skip   │  │
│  │   one lunch out and deposit the  │  │
│  │   difference. PKR rate decent    │  │
│  │   right now — convert today if   │  │
│  │   remittances aa rahi hain.      │  │
│  │   Eid pe khush rahein! 🌙"       │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Goal Health  ●●●●○  Good              │
└────────────────────────────────────────┘
```

The message card border is a **gradient stroke** (CSS: `border-image`; RN: wrap with a `LinearGradient` background + inner view). The coaching text line-height is 1.8 — generous whitespace makes the Urdu phrases comfortable.

**Goal Health visualisation (upgrade)**

Replace 5 dots with a small radial gauge:

```
        ╭──────╮
    ╭───  ████  ───╮
   ╭  █ 4/5 Good █  ╮
    ╰───  ████  ───╯
        ╰──────╯
```

Gauge fill uses goal type colour. Score label shows the text descriptor: Excellent / Good / Watch Out / Critical.

**Follow-up chat (upgrade)**

Style the input bar like iMessage dark — floating above a blurred bottom edge:

```
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Ask the coach anything…        │  │  ← blur backdrop
│  │                          [Send] │  │
│  └──────────────────────────────────┘  │
```

Chat bubbles: user messages right-aligned (`brand-purple` background), AI messages left-aligned (glassmorphism card, thin gradient border).

---

### 5.6 Wallet Screen

**Balance hero — make the number feel large and important**

```
  ╔══════════════════════════════════════╗
  ║                                      ║
  ║   Total Balance                      ║
  ║   $248.50 USDC                       ║  ← Outfit Bold 44px, brand-green
  ║                                      ║
  ║   ≈ PKR 69,342                       ║  ← 18px text-secondary
  ║   1 USDC = 278.3 PKR  ↑ 0.3%  today ║  ← live rate pill
  ║                                      ║
  ╚══════════════════════════════════════╝
```

Live rate pill: small chip, white text on a dark green pill. The arrow is animated — flips direction when rate changes.

**PKR rate warning banner** (conditional, PKR > 280):

```
╔══════════════════════════════════════╗
║  💡 Good week to convert remittances  ║
║  PKR/USDC rate is above 280          ║
╚══════════════════════════════════════╝
```
Uses the `brand-gold` colour with 10% opacity background and a left accent bar. Auto-dismisses.

**Transaction history — timeline style**

Replace the plain list with a vertical timeline:

```
  ── Today ──────────────────────────────

  ●  Goal Deposit              − $20.00
     🌙 Eid Outfit 2026
     2:34 PM  ·  [View on Solana ↗]

  ── Apr 14 ──────────────────────────────

  ●  Stake (YES)               − $5.00
     📊 Eid Outfit Pool
     10:12 AM
```

The timeline dot uses the transaction type colour (deposit = green, stake = purple, received = gold).

---

### 5.7 Goal Complete Screen

This is the app's most viral moment — it must be stunning.

**Full-screen celebration layout:**

```
  [LOTTIE — full screen behind everything, 3s]

  ╔══════════════════════════════╗
  ║                              ║
  ║    Mubarak ho! 🎉            ║  ← Display 36px
  ║    Goal Achieved             ║
  ║                              ║
  ║  🌙  Eid Outfit 2026         ║
  ║                              ║
  ║   $100 saved in 28 days     ║  ← Outfit SemiBold 22px, brand-gold
  ║                              ║
  ╠══════════════════════════════╣
  ║  Your squad:                 ║
  ║  ✅ 3 believers earned +50%  ║  ← staker results
  ║  ❌ 1 doubter lost their bet ║
  ║                              ║
  ║  Platform fee: $0.27 (1.5%) ║
  ╠══════════════════════════════╣
  ║                              ║
  ║  [ 🎨 Share Achievement Card ]  ← full-width, brand-gold gradient
  ║  [ Start New Goal ]          ║  ← outlined, brand-green
  ║                              ║
  ╚══════════════════════════════╝
```

Lottie animation: coins falling + confetti in the goal type's accent colour. Behind the card, not on top of text.

**Shareable achievement card** (generated image):

```
╔══════════════════════════════════════╗
║   ✦ RIZQ                    🌙      ║
║                                      ║
║   Muhammad saved $100 USDC           ║
║   for Eid Outfit 2026                ║
║   in 28 days  ·  On Solana          ║
║                                      ║
║   "Can you beat that? 👀"            ║
║                                      ║
║   rizq.app                           ║
╚══════════════════════════════════════╝
```

Card background: goal type gradient (gold for Eid). Text: white. This image auto-populates the WhatsApp/Instagram share sheet.

---

## 6. Micro-interactions & Haptics

These are the details that make an app feel premium vs. prototype-level.

| Trigger | Animation | Haptic |
|---------|-----------|--------|
| Deposit confirmed | Progress bar springs to new % + milestone dot pulses gold | `Haptics.notificationAsync(SUCCESS)` |
| New stake arrives (real-time) | YES/NO bar animates + staker avatar pops in | None (background event) |
| Goal type selected | Card scales 1.04 → 1.0 + border animates in | `Haptics.selectionAsync()` |
| CTA button press | Scale 0.96 on press, spring back | `Haptics.impactAsync(MEDIUM)` |
| Achievement unlocked (50% milestone) | Toast slides in with a coin icon + brief shimmer on progress bar | `Haptics.notificationAsync(SUCCESS)` |
| Behind on goal | Progress bar border slowly pulses coral every 4s | None |
| Wallet balance loads | Number counts up from 0 to actual value over 600ms | None |
| Coaching message arrives | Card fades in + text appears word by word (streaming effect) | `Haptics.impactAsync(LIGHT)` |
| Goal complete | Full screen flash (white 80ms) → Lottie starts | `Haptics.notificationAsync(SUCCESS)` × 3 |
| Copy wallet address | Brief green flash on chip + "Copied!" tooltip | `Haptics.selectionAsync()` |

All haptics use `expo-haptics`. Never trigger haptics for destructive or error-state actions — reserve them for positive moments.

---

## 7. Onboarding — Upgraded Slides

The three onboarding slides need visuals, not just text.

### Slide 1 — The Familiar Problem
```
Background: Deep Navy with a warm amber glow from top-right

Visual: A stylised WhatsApp chat mockup (vector illustration):
  > "Kameti ka paisay kahan hain? 😡"
  > "Bhai trust karo..."
  > "3 months se nahi mila..."

Headline: "Your committee, on-chain."
Sub:      "No more lost money. No more trust issues. Smart contracts hold it all."
```

### Slide 2 — The Bet
```
Background: Deep Navy with a brand-green glow from bottom-left

Visual: Two facing avatars with a USDC amount floating between them
        YES side glows green, NO side glows coral
        Connecting arc animates (drawing itself)

Headline: "Your friends bet on you."
Sub:      "They stake USDC. Winners paid automatically. No middleman."
```

### Slide 3 — The Coach
```
Background: Deep Navy with purple AI glow

Visual: A phone notification card floating at the top of the illustration:
  ┌─────────────────────────┐
  │ ✨ Rizq  9:00 AM        │
  │ "Bhai, Eid aa rahi hai  │
  │  — 3 baar coffee skip  │
  │  karo is hafta. 🌙"    │
  └─────────────────────────┘

Headline: "Your personal savings coach."
Sub:      "Bilingual. Weekly. Reads your on-chain data. Knows your squad."
```

---

## 8. Empty States — Illustrated, Not Placeholder Text

Every empty state needs an illustration and a feeling, not just a grey message.

| Screen | Empty state design |
|--------|-------------------|
| Dashboard — no goals | Illustrated crescent moon + empty piggy bank. Headline: *"Your first goal is waiting."* CTA: **Create a Goal** |
| Prediction Pool — no stakes | Illustrated pair of hands about to shake. Headline: *"No one's staked yet."* Sub: *"Share the link — first stake always counts double in your head."* |
| Wallet — no transactions | Illustrated USDC coin with a door. Headline: *"No transactions yet."* Sub: *"Deposit USDC to start saving."* |
| AI Coaching — no message | Illustrated sleeping robot. Headline: *"Coach is preparing your message."* Sub: *"Next coaching drop: Sunday 10 AM PKT"* with a countdown timer |

Illustration style: flat vector, monoline, goal-type accent colour on deep navy. Not photographs.

---

## 9. Bottom Tab Bar Upgrade

Replace a standard tab bar with a **floating island style**:

```
        ╭─────────────────────────────────────╮
        │  🏠    🎯    ⊕    🤖    👛          │
        ╰─────────────────────────────────────╯
```

- Floating: `marginHorizontal: 20`, `marginBottom: 16`, `borderRadius: 32`
- Background: glassmorphism (`rgba(13,27,46,0.92)` + `blur(20)`)
- Border: `1px solid rgba(255,255,255,0.08)`
- Active tab: icon + label in `brand-green`, small dot indicator below icon
- Centre `⊕` button: 52×52, brand-green radial gradient, slight shadow glow `0 0 16px rgba(0,230,118,0.5)`. Elevated 8px above the bar.

---

## 10. Loading & Skeleton States

Replace bare spinner with content-aware skeletons for every screen:

**Goal Card Skeleton:**
```
┌────────────────────────────────┐
│  ░░░  ████████████  shimmer   │  ← icon + title bar
│  ░░░░░░░░░░░░░░░░░░░  shimmer │  ← progress bar
│  ░░░░░░  ░░░░░░  shimmer      │  ← amount row
└────────────────────────────────┘
```

Shimmer direction: left to right, 1.2s loop, `rgba(255,255,255,0.04)` → `rgba(255,255,255,0.10)` → `rgba(255,255,255,0.04)`.

Use `react-native-skeleton-content` or implement manually with `Animated` + `LinearGradient`.

---

## 11. Implementation Priority

Build these upgrades in order — each layer has higher visual impact per hour of work than the next.

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Glassmorphism cards + top-light border | Huge | Low |
| 2 | Colour token upgrade (brighter greens, goal-type gradients) | Huge | Low |
| 3 | Outfit font for numbers + green glow on currency amounts | High | Low |
| 4 | Glowing progress bar with milestone dots | High | Medium |
| 5 | Floating tab bar (island style) | High | Medium |
| 6 | Ambient gradient backgrounds per screen | Medium | Low |
| 7 | Goal Complete celebration screen (Lottie + achievement card) | High | High |
| 8 | Onboarding illustrated slides | Medium | High |
| 9 | Haptics on deposit / milestone | High | Low |
| 10 | Skeleton loading states | Medium | Medium |
| 11 | Prediction pool face-off bar + staker avatars | Medium | Medium |
| 12 | Illustrated empty states | Medium | High |
