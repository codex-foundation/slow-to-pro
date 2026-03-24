import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export const STRIPE_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID ?? '';

export function isStripeConfigured(): boolean {
  return Platform.OS === 'web' && STRIPE_PRICE_ID.length > 0;
}

export async function createCheckoutSession(
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null; error?: string }> {
  if (!supabase) return { url: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceId: STRIPE_PRICE_ID, successUrl, cancelUrl },
  });
  if (error) return { url: null, error: error.message };
  return { url: (data as { url: string }).url };
}
