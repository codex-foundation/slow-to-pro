import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useEntitlementStore } from '@/stores/entitlementStore';

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const STRIPE_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID ?? '';

async function syncProStatusToDb(isPro: boolean): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_profiles')
    .upsert(
      { user_id: user.id, is_pro: isPro, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
}

export async function readProStatusFromDb(): Promise<boolean> {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('user_profiles')
    .select('is_pro')
    .eq('user_id', user.id)
    .single();
  return data?.is_pro === true;
}

export function isStripeConfigured(): boolean {
  if (Platform.OS === 'web') return false;
  return STRIPE_PUBLISHABLE_KEY.length > 0 && STRIPE_PRICE_ID.length > 0;
}

export async function initializePurchases(): Promise<void> {
  if (isStripeConfigured()) {
    await initStripe({ publishableKey: STRIPE_PUBLISHABLE_KEY });
  }
  const dbIsPro = await readProStatusFromDb();
  useEntitlementStore.getState().setIsPro(dbIsPro);
  useEntitlementStore.getState().setLoading(false);
}

export async function refreshProStatus(): Promise<void> {
  const dbIsPro = await readProStatusFromDb();
  useEntitlementStore.getState().setIsPro(dbIsPro);
  useEntitlementStore.getState().setLoading(false);
}

export async function purchase(): Promise<{ success: boolean; error?: string }> {
  if (!isStripeConfigured()) return { success: false, error: 'Stripe not configured.' };
  if (!supabase) return { success: false, error: 'Supabase not configured.' };

  try {
    const { data, error: sessionError } = await supabase.functions.invoke('create-payment-sheet', {
      body: { priceId: STRIPE_PRICE_ID },
    });

    if (sessionError) return { success: false, error: sessionError.message };

    if (data?.alreadySubscribed) {
      await refreshProStatus();
      return { success: true };
    }

    const { paymentIntent, ephemeralKey, customer } = data as {
      paymentIntent: string;
      ephemeralKey: string;
      customer: string;
    };

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Slow to Pro',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret: paymentIntent,
      allowsDelayedPaymentMethods: false,
    });

    if (initError) return { success: false, error: initError.message };

    const { error: presentError } = await presentPaymentSheet();

    if (presentError) {
      if (presentError.code === 'Canceled') return { success: false };
      return { success: false, error: presentError.message };
    }

    // Webhook will sync is_pro asynchronously; poll DB briefly for UX
    await refreshProStatus();
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function restorePurchases(): Promise<{ success: boolean; error?: string }> {
  try {
    await refreshProStatus();
    const isPro = useEntitlementStore.getState().isPro;
    if (!isPro) void syncProStatusToDb(false);
    return { success: isPro };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
