# Spec: Replace RevenueCat with Stripe (Issue #20)

## Objective

Remove `react-native-purchases` (RevenueCat) from the codebase and use Stripe as the
single payment provider for both mobile (React Native) and web. The web side already
uses Stripe; this spec covers extending that to native iOS/Android via
`@stripe/stripe-react-native` Payment Sheet.

**Success criteria:**

- `react-native-purchases` is gone from `package.json` and source
- iOS/Android users see a native Stripe Payment Sheet when they tap "Get Pro"
- Subscription creation is handled server-side; `user_profiles.is_pro` is updated via
  the existing webhook
- All existing Pro-gating still works (`isPro` from entitlementStore)
- All tests pass with no RC mocks

---

## Assumptions

1. Mobile uses the **native Payment Sheet** (not a WebView redirect)
2. Same **subscription** model as web (monthly/annual Stripe subscription)
3. The existing `stripe-webhook` handles `customer.subscription.*` — no changes needed
4. `isRcPro` field is removed; `isPro` (DB-backed) is the single source of truth
5. "Manage Subscription" on iOS/Android links to Stripe Customer Portal instead of Apple/Google
6. Publishable key (`pk_test_...`) already present in `.env` under the wrong variable name

> Correct me on any of these before implementation.

---

## Tech Stack

- `@stripe/stripe-react-native` (new)
- Existing: `@stripe/stripe-js`, Supabase Edge Functions (Deno), Zustand, Expo Router

## Commands

```
Install:  pnpm install
Test:     pnpm jest --coverage
Lint:     pnpm biome check --apply .
Dev:      pnpm start
```

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `supabase/functions/create-payment-sheet/index.ts` |
| Modify | `src/utils/purchases.ts` (replace RC with Stripe native) |
| Modify | `src/stores/entitlementStore.ts` (remove `isRcPro`) |
| Modify | `src/components/ui/PaywallModal.tsx` (native Payment Sheet UI) |
| Modify | `app/_layout.tsx` (wrap with `StripeProvider`) |
| Modify | `app/(tabs)/settings.tsx` (manage subscription via Customer Portal) |
| Modify | `src/utils/__tests__/purchases.test.ts` (replace RC tests) |
| Modify | `src/components/ui/__tests__/PaywallModal.test.tsx` |
| Delete | `__mocks__/react-native-purchases.ts` |
| Modify | `.env` (add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, remove RC keys) |
| Modify | `package.json` (remove `react-native-purchases`, add `@stripe/stripe-react-native`) |

---

## Implementation Plan

### Step 1 — New Supabase Edge Function: `create-payment-sheet`

Creates a Stripe customer (or retrieves existing), ephemeral key, and subscription.
Returns `{ paymentIntent, ephemeralKey, customer }` for the Payment Sheet.

```
POST /functions/v1/create-payment-sheet
Auth: Bearer <user JWT>
Body: { priceId: string }
Response: { paymentIntent: string, ephemeralKey: string, customer: string }
```

Logic:
1. Authenticate user from JWT
2. Look up or create Stripe customer (store `stripe_customer_id` in `user_profiles`)
3. Create ephemeral key for customer
4. Check if active subscription already exists → if so, return existing payment intent
5. Create subscription → return `latest_invoice.payment_intent.client_secret`

> **DB migration needed**: `user_profiles.stripe_customer_id text` column.

### Step 2 — Update `purchases.ts`

Remove all RC imports. New public API:

```typescript
export function isStripeMobileConfigured(): boolean
export async function initializePurchases(): Promise<void>   // init Stripe SDK + read DB
export async function presentPaymentSheet(): Promise<{ success: boolean; error?: string }>
export async function restorePurchases(): Promise<{ success: boolean; error?: string }>
export async function refreshProStatus(): Promise<void>
export async function readProStatusFromDb(): Promise<boolean>  // keep unchanged
```

`initializePurchases()` calls `initStripe({ publishableKey })` then reads DB pro status.
`presentPaymentSheet()` calls `create-payment-sheet`, inits sheet, presents it, then refreshes DB.
`restorePurchases()` = `refreshProStatus()` (webhook already synced DB).

### Step 3 — Update `entitlementStore.ts`

Remove `isRcPro` and `setIsRcPro`. Store shape:

```typescript
interface EntitlementStore {
  isPro: boolean;
  isLoading: boolean;
  setIsPro: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}
```

### Step 4 — Update `PaywallModal.tsx`

Replace package-selection UI with simpler single-CTA sheet:
- Feature list (unchanged)
- "Get Pro" button → calls `presentPaymentSheet()`
- "Restore purchases" button → calls `restorePurchases()`
- Loading/error states

### Step 5 — Update `_layout.tsx`

Wrap app with `<StripeProvider publishableKey={...}>` on non-web platforms.
Keep `initializePurchases()` call in `useEffect`.
Remove RC comments.

### Step 6 — Update `settings.tsx`

Replace `isRcPro`-gated "Manage Subscription" with Stripe Customer Portal URL
(`https://billing.stripe.com/p/login/...`) or use `EXPO_PUBLIC_STRIPE_PORTAL_URL`.

### Step 7 — Tests & Mocks

- Delete `__mocks__/react-native-purchases.ts`
- Rewrite `purchases.test.ts` for Stripe paths
- Update `PaywallModal.test.tsx` to mock `presentPaymentSheet`

---

## Boundaries

- **Always**: Run tests after each file change; match existing code style
- **Ask first**: DB schema changes (adding `stripe_customer_id` column), changing webhook logic
- **Never**: Commit real Stripe secret keys; break existing web Stripe flow

## Open Questions

1. Should "Manage Subscription" link to Stripe Customer Portal or just the Stripe dashboard?
   Defaulting to Customer Portal URL via a new env var `EXPO_PUBLIC_STRIPE_PORTAL_URL`.
2. One-time purchase or subscription for mobile? Defaulting to subscription (same as web).
3. Should we add the `stripe_customer_id` column to `user_profiles` now, or look it up via email?
   Defaulting to look up by email (simpler, no migration needed upfront).
