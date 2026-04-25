# Phantom Wallet Flow (Implementation & Connection)

This document explains exactly how Phantom wallet connection works in this codebase.

---

## 1) Where The Flow Is Implemented

Main files:

- `rizq-app/src/hooks/usePhantomWallet.ts` -> deep link connect + callback parsing
- `rizq-app/src/screens/ConnectWalletScreen.tsx` -> UI trigger (`Open Phantom`)
- `rizq-app/src/store/useAppStore.ts` -> wallet state storage (`wallet`)
- `rizq-app/src/hooks/useBackendSync.ts` -> registers connected wallet in backend
- `rizq-backend/src/api/users.ts` -> persists wallet via `POST /api/users/register`

Config inputs:

- `rizq-app/src/config.ts`
  - `DAPP_URL`
  - `PHANTOM_UNIVERSAL`

---

## 2) Flow Summary

1. User taps **Open Phantom** in app.
2. App generates Phantom connect URL (universal link).
3. Phantom opens, user approves connection.
4. Phantom redirects back to app with wallet data in deep link.
5. App extracts wallet public key and stores it in Zustand.
6. App root reacts to wallet presence and switches from Auth to Main flow.
7. Backend sync hook auto-registers wallet in backend DB.

---

## 3) Detailed Step-by-Step Runtime Flow

## Step A: Connect Button

In `ConnectWalletScreen`, pressing the button calls:

- `usePhantomWallet().connect()`

That method:

- Creates redirect URI: `rizq://onConnect`
- Includes:
  - app URL (`DAPP_URL`)
  - redirect link
  - generated dapp encryption public key
- Opens:
  - `${PHANTOM_UNIVERSAL}/connect?...`

## Step B: Deep Link Listener

`usePhantomWallet` registers:

- `Linking.addEventListener("url", ...)`
- `Linking.getInitialURL()` for cold starts

So both cases work:

- app already open
- app opened from Phantom redirect

## Step C: Callback Parsing

When a URL arrives, the hook parses:

- `public_key`
- `wallet`
- `phantom_encryption_public_key`

If a valid key is found, it calls:

- `setWallet(pk)` in Zustand

## Step D: App Auth Gate

In `RootNavigator`:

- if `wallet` is empty -> show Auth stack
- if `wallet` exists -> show Main tabs

So wallet state directly controls app access flow.

## Step E: Backend Registration

`useBackendSync` watches wallet state.

On wallet connect:

- calls `registerUser(wallet)` -> `POST /api/users/register`

Backend route:

- `rizq-backend/src/api/users.ts`
- Upserts user by `wallet_address` using Prisma

Result:

- wallet is connected in app and known by backend.

---

## 4) Data Path (App <-> Phantom <-> Backend)

```text
ConnectWalletScreen
    -> usePhantomWallet.connect()
    -> Phantom Universal Link
    -> User approves in Phantom
    -> Redirect: rizq://onConnect?...public_key=...
    -> usePhantomWallet.handleUrl()
    -> useAppStore.setWallet(publicKey)
    -> RootNavigator switches to Main
    -> useBackendSync.registerUser(wallet)
    -> Backend /api/users/register
    -> Prisma upsert in users table
```

---

## 5) Security Notes

- Private keys are never handled by app/backend.
- App only consumes public wallet identity from callback.
- Signing remains in Phantom.
- Current hook comment already notes partial implementation and that production-grade encrypted payload handling should fully follow Phantom docs.

---

## 6) Current Limitations / Production Hardening

Current implementation is practical and functional for connect identity flow, but you should harden:

1. Strict validation of callback origin/state parameter.
2. Full Phantom encrypted payload/decryption flow.
3. Replay protection and nonce verification.
4. Better error UI for reject/cancel cases.
5. Session lifecycle handling (disconnect/expiry).

---

## 7) How To Test The Flow

1. Launch backend (`rizq-backend`) and app (`rizq-app`).
2. Open app Auth screen.
3. Tap **Open Phantom**.
4. Approve in Phantom.
5. Verify:
   - app enters Main tabs
   - backend receives user registration (`/api/users/register`)
   - wallet-based goal sync starts via `useBackendSync`

---

This is the complete connection path for Phantom wallet in the current monorepo implementation.