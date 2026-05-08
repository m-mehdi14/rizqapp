# Rizq Play Store Compliance Pack

Use this checklist while completing Google Play Console submission.

## 1) Policy URLs (required)

- Privacy policy URL: `https://<your-domain>/privacy`
- Terms and conditions URL: `https://<your-domain>/terms`
- Account deletion instructions URL: `https://<your-domain>/account-deletion`
- Support URL: `https://<your-domain>/support`

In-app legal screens (already linked):
- Settings -> About & Legal -> Terms & Conditions
- Settings -> About & Legal -> Privacy Policy
- Settings -> About & Legal -> Data Safety
- Settings -> About & Legal -> Account Deletion

## 2) Contact details (required)

- Support email: `support@rizqapp.com`
- Privacy contact email: `privacy@rizqapp.com`
- Company/organization name: `Rizq`

## 3) Data safety form answers (baseline)

Fill Play Console Data safety using this baseline:

- Personal info
  - Name (optional profile display name): collected
  - Email address (auth/session): collected
  - Phone number (profile/nominee): collected
- Financial info / financial activity
  - Committee contribution and payout records: collected
- App activity
  - In-app interactions (committee actions, AI prompts): collected
- Device/app identifiers
  - Push token: collected
- Diagnostics
  - Error details and reliability logs: collected

Data handling declarations:
- Data encrypted in transit: **Yes**
- Data deletion request supported: **Yes** (Settings -> About & Legal -> Account Deletion + Support)
- Data sold to third parties: **No**
- Data shared with service providers only for core operations: **Yes**

## 4) Sensitive permissions and declarations

- Camera/media permissions (if KYC capture enabled): declare clear purpose in console + in-app prompt.
- Notifications permission: used for contribution reminders, payout readiness, and nominee updates.
- Financial features declaration: describe that funds move via user-signed Solana transactions.

## 5) App content declarations

- Target audience: not for children.
- Financial features disclosure: "No lending, no interest products, no gambling."
- Regional compliance note (if applicable): KYC required for committee participation.

## 6) Release QA before submission

- Legal screens open and readable on Android + iOS.
- Policy URLs reachable (200 OK, no auth wall).
- Account deletion request path works end-to-end.
- Payout CTA remains locked until all readiness checks pass.
- Wallet balances show backend-synced values with refresh and stale indicators.

